import {
  buildGetButton,
  buildSharePanelEmbed,
  ButtonStyle,
  createChannelMessage,
  editInteractionResponse,
  editInteractionResponseWithFiles,
  isForumPostThread,
  TextInputStyle,
  userHasAnyReaction,
} from './discord'
import {
  getFileBytes,
  getResource,
  insertResource,
  listResourcesByAuthor,
  putFileBytes,
  queryDownloadsForAuthor,
  recordDownload,
  updatePanelMessageId,
} from './store'
import {
  createResourceId,
  formatDiscordTime,
  MAX_FILE_BYTES,
  MAX_FILES,
  parseStoredFiles,
  type Env,
  type ResourceRow,
  type StoredFileMeta,
} from './types'

type AttachmentResolved = {
  id: string
  filename: string
  url: string
  content_type?: string | null
  size: number
}

type Interaction = {
  id: string
  token: string
  application_id?: string
  type: number
  guild_id?: string
  channel_id?: string
  member?: { user: { id: string; username: string; global_name?: string | null } }
  user?: { id: string; username: string; global_name?: string | null }
  data?: {
    name?: string
    custom_id?: string
    options?: Array<{
      name: string
      type: number
      value?: string | number
    }>
    components?: Array<{
      type: number
      components?: Array<{
        type: number
        custom_id?: string
        value?: string
      }>
    }>
    resolved?: {
      attachments?: Record<string, AttachmentResolved>
    }
  }
}

const FILE_OPTION_NAMES = ['文件1', '文件2', '文件3', '文件4', '文件5', '文件', 'file']

export const DOWNLOADS_MODAL_ID = 'downloads:query'

/** 斜杠命令触发：弹出查询条件弹窗（必须在 3 秒内直接返回 Modal，不能 deferred） */
export function buildDownloadsQueryModal() {
  return {
    custom_id: DOWNLOADS_MODAL_ID,
    title: '查询下载溯源',
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: 'resource_id',
            label: '资源编号（可选，留空=全部）',
            style: TextInputStyle.Short,
            required: false,
            max_length: 32,
            placeholder: '例如 84be965da3a8',
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: 'date_start',
            label: '开始日期（可选）',
            style: TextInputStyle.Short,
            required: false,
            max_length: 16,
            placeholder: '2026-07-01',
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: 'date_end',
            label: '结束日期（可选）',
            style: TextInputStyle.Short,
            required: false,
            max_length: 16,
            placeholder: '2026-07-28',
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: 'keyword',
            label: '用户名 / Discord ID 关键词（可选）',
            style: TextInputStyle.Short,
            required: false,
            max_length: 64,
            placeholder: '昵称关键字或数字 ID',
          },
        ],
      },
    ],
  }
}

function modalValue(interaction: Interaction, customId: string): string {
  const rows = interaction.data?.components || []
  for (const row of rows) {
    for (const comp of row.components || []) {
      if (comp.custom_id === customId) return (comp.value || '').trim()
    }
  }
  return ''
}

function parseDayBound(dateStr: string, endOfDay: boolean): number | null {
  const raw = dateStr.trim().replace(/\//g, '-')
  const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const ms = Date.parse(endOfDay ? `${iso}T23:59:59.999+08:00` : `${iso}T00:00:00.000+08:00`)
  return Number.isFinite(ms) ? ms : null
}

function buildDmLinkButtons(
  rows: Array<{ downloader_id: string; downloader_tag: string }>,
) {
  const unique: Array<{ id: string; tag: string }> = []
  const seen = new Set<string>()
  for (const r of rows) {
    if (seen.has(r.downloader_id)) continue
    seen.add(r.downloader_id)
    unique.push({ id: r.downloader_id, tag: r.downloader_tag || r.downloader_id })
  }

  const components: Array<{ type: number; components: unknown[] }> = []
  const slice = unique.slice(0, 10)
  for (let i = 0; i < slice.length; i += 5) {
    const chunk = slice.slice(i, i + 5)
    components.push({
      type: 1,
      components: chunk.map((u) => ({
        type: 2,
        style: ButtonStyle.Link,
        label: `私信 ${u.tag}`.slice(0, 80),
        url: `https://discord.com/users/${u.id}`,
      })),
    })
  }
  return components
}

function appIdOf(interaction: Interaction, env: Env) {
  return interaction.application_id || env.DISCORD_APPLICATION_ID
}

async function replyEdit(
  env: Env,
  interaction: Interaction,
  body: Record<string, unknown>,
) {
  await editInteractionResponse(env, interaction.token, body, appIdOf(interaction, env))
}

function actor(interaction: Interaction) {
  const user = interaction.member?.user || interaction.user
  if (!user) throw new Error('缺少用户信息')
  const tag = user.global_name || user.username
  return { id: user.id, tag }
}

function optionString(interaction: Interaction, ...names: string[]): string | null {
  for (const name of names) {
    const opt = interaction.data?.options?.find((o) => o.name === name)
    if (typeof opt?.value === 'string') return opt.value.trim()
  }
  return null
}

function collectAttachments(interaction: Interaction): AttachmentResolved[] {
  const resolved = interaction.data?.resolved?.attachments || {}
  const out: AttachmentResolved[] = []
  const seen = new Set<string>()
  for (const name of FILE_OPTION_NAMES) {
    const opt = interaction.data?.options?.find((o) => o.name === name)
    if (typeof opt?.value !== 'string') continue
    const att = resolved[opt.value]
    if (!att || seen.has(att.id)) continue
    seen.add(att.id)
    out.push(att)
  }
  return out.slice(0, MAX_FILES)
}

export async function handleShareResource(env: Env, interaction: Interaction) {
  const channelId = interaction.channel_id
  if (!channelId) {
    await replyEdit(env, interaction, { content: '无法识别频道。' })
    return
  }

  // 先回一枪，避免一直「正在响应 / 未响应」
  await replyEdit(env, interaction, { content: '⏳ 正在挂载资源，请稍候…' }).catch(() => {})

  try {
    let isForum = false
    try {
      isForum = await isForumPostThread(env, channelId)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await replyEdit(env, interaction, {
        content: [
          `无法读取本频道信息：${msg}`,
          '',
          '请给 Bot 打开该**论坛频道**权限：查看频道、阅读消息历史。',
          '（服务器设置 → 频道 → 该论坛 → 权限 → 勾选 Lumi大大大人 / 其身份组）',
        ].join('\n'),
      })
      return
    }

    if (!isForum) {
      await replyEdit(env, interaction, {
        content: '请在**论坛帖子**内使用此命令（进入某个帖子线程后再输入 `/分享资源`）。',
      })
      return
    }

    const title = optionString(interaction, '标题', 'title')
    const link = optionString(interaction, '链接', 'link')
    const note = optionString(interaction, '说明', 'note') || ''
    const attachments = collectAttachments(interaction)

    if (!title) {
      await replyEdit(env, interaction, { content: '请填写「标题」。' })
      return
    }
    if (!link && attachments.length === 0) {
      await replyEdit(env, interaction, {
        content: '请至少提供 **链接** 或 **文件1～文件5** 其中一项（可多项一起填）。',
      })
      return
    }
    if (link && !/^https?:\/\//i.test(link)) {
      await replyEdit(env, interaction, {
        content: '链接必须以 `http://` 或 `https://` 开头。',
      })
      return
    }

    for (const att of attachments) {
      if (att.size > MAX_FILE_BYTES) {
        await replyEdit(env, interaction, {
          content: `文件「${att.filename}」超过 ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB 上限，请压缩或改用网盘链接。`,
        })
        return
      }
    }

    const { id: authorId, tag: authorTag } = actor(interaction)
    const id = createResourceId()
    const storedFiles: StoredFileMeta[] = []

    for (const att of attachments) {
      const fileRes = await fetch(att.url)
      if (!fileRes.ok) {
        await replyEdit(env, interaction, {
          content: `下载上传文件「${att.filename}」失败，请重试。`,
        })
        return
      }
      const bytes = await fileRes.arrayBuffer()
      const safeName = att.filename.replace(/[^\w.\u4e00-\u9fff()-]+/g, '_')
      const kvKey = `${id}/${safeName}-${storedFiles.length}`
      const contentType = att.content_type || 'application/octet-stream'
      await putFileBytes(env, kvKey, bytes, contentType)
      storedFiles.push({
        name: att.filename,
        contentType,
        size: att.size,
        kvKey,
      })
    }

    const starterMessageId = channelId
    const row: ResourceRow = {
      id,
      author_id: authorId,
      author_tag: authorTag,
      guild_id: interaction.guild_id || env.DISCORD_GUILD_ID,
      channel_id: channelId,
      panel_message_id: '',
      starter_message_id: starterMessageId,
      title,
      note,
      link,
      file_name: storedFiles[0]?.name || null,
      file_content_type: storedFiles[0]?.contentType || null,
      file_r2_key: storedFiles[0]?.kvKey || null,
      file_size: storedFiles[0]?.size || null,
      files_json: storedFiles.length ? JSON.stringify(storedFiles) : null,
      created_at: Date.now(),
    }

    await insertResource(env, row)

    let panel: { id: string }
    try {
      panel = await createChannelMessage(env, channelId, {
        embeds: [buildSharePanelEmbed(row, authorTag)],
        components: [buildGetButton(id)],
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await replyEdit(env, interaction, {
        content: [
          `无法在本帖发「获取资源」面板：${msg}`,
          '',
          '请给 Bot 在该论坛勾选：',
          '• 查看频道',
          '• 发送消息',
          '• **在子区中发送消息**（最关键）',
          '• 嵌入链接',
          '• 阅读消息历史',
          '• 附加文件',
          '',
          '改完后重试 `/分享资源`。也可重新生成邀请链接把 Bot 再拉一次（勾上上述权限）。',
        ].join('\n'),
      })
      return
    }
    await updatePanelMessageId(env, id, panel.id)

    await replyEdit(env, interaction, {
      content: [
        `已挂载资源 **${title}**（ID：\`${id}\`）。`,
        storedFiles.length ? `已保存 ${storedFiles.length} 个文件。` : '',
        '下载者需先给本帖首条消息添加任意反应，再点「获取资源」。',
        '你可用 `/查看资源下载记录` 打开弹窗筛选溯源。',
      ]
        .filter(Boolean)
        .join('\n'),
    })
  } catch (error) {
    console.error('分享资源失败', error)
    await replyEdit(env, interaction, {
      content: `挂载失败：${error instanceof Error ? error.message : '未知错误'}`,
    }).catch(() => {})
  }
}

export async function handleDownloadsModalSubmit(env: Env, interaction: Interaction) {
  await replyEdit(env, interaction, { content: '⏳ 正在按条件查询…' }).catch(() => {})

  try {
    const { id: authorId } = actor(interaction)
    const myResources = await listResourcesByAuthor(env, authorId)
    if (myResources.length === 0) {
      await replyEdit(env, interaction, {
        content: '你还没有用 `/分享资源` 分享过资源。',
      })
      return
    }

    const resourceId = modalValue(interaction, 'resource_id')
    const dateStart = modalValue(interaction, 'date_start')
    const dateEnd = modalValue(interaction, 'date_end')
    const keyword = modalValue(interaction, 'keyword')

    if (resourceId) {
      const resource = await getResource(env, resourceId)
      if (!resource || resource.author_id !== authorId) {
        await replyEdit(env, interaction, {
          content: '找不到该资源编号，或它不属于你。',
        })
        return
      }
    }

    let startAt: number | null = null
    let endAt: number | null = null
    if (dateStart) {
      startAt = parseDayBound(dateStart, false)
      if (startAt == null) {
        await replyEdit(env, interaction, {
          content: '开始日期格式不对，请用 `2026-07-01`。',
        })
        return
      }
    }
    if (dateEnd) {
      endAt = parseDayBound(dateEnd, true)
      if (endAt == null) {
        await replyEdit(env, interaction, {
          content: '结束日期格式不对，请用 `2026-07-28`。',
        })
        return
      }
    }
    if (startAt != null && endAt != null && startAt > endAt) {
      await replyEdit(env, interaction, {
        content: '开始日期不能晚于结束日期。',
      })
      return
    }

    const downloads = await queryDownloadsForAuthor(env, {
      authorId,
      resourceId: resourceId || null,
      keyword: keyword || null,
      startAt,
      endAt,
      limit: 20,
    })

    const filterBits = [
      resourceId ? `资源 \`${resourceId}\`` : '全部资源',
      dateStart || dateEnd ? `日期 ${dateStart || '…'} ~ ${dateEnd || '…'}` : '不限日期',
      keyword ? `关键词「${keyword}」` : '不限用户',
    ]

    if (downloads.length === 0) {
      await replyEdit(env, interaction, {
        embeds: [
          {
            title: '下载溯源查询结果',
            description: `筛选：${filterBits.join(' · ')}\n\n没有符合条件的记录。`,
            color: 0xfaa61a,
          },
        ],
      })
      return
    }

    const lines = downloads.map((d, i) => {
      return `${i + 1}. **${d.downloader_tag || '未知用户'}**（\`${d.downloader_id}\`）← **${d.resource_title}** · ${formatDiscordTime(d.downloaded_at)}`
    })

    await replyEdit(env, interaction, {
      embeds: [
        {
          title: '下载溯源查询结果',
          description: [
            `筛选：${filterBits.join(' · ')}`,
            `共 ${downloads.length} 条（最多显示 20）`,
            '',
            lines.join('\n'),
            '',
            '下方按钮可打开对方资料页并发起私信（需对方允许服务器成员私信）。',
          ].join('\n'),
          color: 0x5865f2,
        },
      ],
      components: buildDmLinkButtons(downloads),
    })
  } catch (error) {
    console.error('下载溯源查询失败', error)
    await replyEdit(env, interaction, {
      content: `查询失败：${error instanceof Error ? error.message : '未知错误'}`,
    }).catch(() => {})
  }
}

export function isDownloadsModalSubmit(interaction: Interaction): boolean {
  return interaction.data?.custom_id === DOWNLOADS_MODAL_ID
}

export async function handleGetResourceButton(env: Env, interaction: Interaction) {
  const customId = interaction.data?.custom_id || ''
  const resourceId = customId.slice('resource:get:'.length)
  const channelId = interaction.channel_id

  await replyEdit(env, interaction, { content: '⏳ 正在校验并准备资源…' }).catch(() => {})

  try {
    const resource = await getResource(env, resourceId)
    if (!resource) {
      await replyEdit(env, interaction, {
        content: '该资源不存在或已被移除。请让发帖人重新挂载。',
      })
      return
    }
    if (!channelId) {
      await replyEdit(env, interaction, { content: '无法识别频道。' })
      return
    }

    const { id: userId, tag } = actor(interaction)
    const isAuthor = userId === resource.author_id
    if (!isAuthor) {
      const reacted = await userHasAnyReaction(
        env,
        channelId,
        resource.starter_message_id,
        userId,
      )
      if (!reacted) {
        await replyEdit(env, interaction, {
          content:
            '请先给本帖**首条消息**添加任意一个反应（表情），然后再点「获取资源」。\n（点赞、爱心或其他表情均可）',
        })
        return
      }
    }

    const filesMeta = parseStoredFiles(resource)
    const lines = [`**${resource.title}**`, '']
    if (resource.note) lines.push(resource.note, '')
    if (resource.link) lines.push(`链接：${resource.link}`)
    if (filesMeta.length) {
      lines.push(`文件（${filesMeta.length}）：${filesMeta.map((f) => `\`${f.name}\``).join('、')}`)
    }

    const payload = { content: lines.join('\n').slice(0, 2000) }
    const filePayloads: Array<{ name: string; bytes: ArrayBuffer; contentType: string }> = []
    for (const meta of filesMeta) {
      const got = await getFileBytes(env, meta)
      if (got) filePayloads.push(got)
    }

    if (filePayloads.length > 0) {
      await editInteractionResponseWithFiles(
        appIdOf(interaction, env),
        interaction.token,
        payload,
        filePayloads,
      )
    } else {
      await replyEdit(env, interaction, payload)
    }

    await recordDownload(env, {
      resourceId: resource.id,
      downloaderId: userId,
      downloaderTag: tag,
    })
  } catch (error) {
    console.error('get-resource failed', error)
    await replyEdit(env, interaction, {
      content: `获取失败：${error instanceof Error ? error.message : '未知错误'}`,
    }).catch(() => {})
  }
}

export function isGetResourceButton(interaction: Interaction): boolean {
  return (interaction.data?.custom_id || '').startsWith('resource:get:')
}
