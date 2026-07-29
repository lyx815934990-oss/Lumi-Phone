import { existsSync } from 'node:fs'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
} from 'discord.js'
import {
  cacheAttachmentLocally,
  createResourceId,
  getResource,
  listDownloadsForAuthor,
  listDownloadsForResource,
  listResourcesByAuthor,
  recordDownload,
  upsertResource,
} from './resourceStore.js'

const GET_PREFIX = 'resource:get:'

/** @param {import('discord.js').GuildTextBasedChannel | null} channel */
async function isForumPostThread(channel) {
  if (!channel?.isThread?.()) return false
  if (channel.type !== ChannelType.PublicThread && channel.type !== ChannelType.PrivateThread) {
    return false
  }
  let parent = channel.parent
  if (!parent && channel.parentId && channel.guild) {
    parent = await channel.guild.channels.fetch(channel.parentId).catch(() => null)
  }
  return parent?.type === ChannelType.GuildForum
}

function formatTime(ts) {
  return `<t:${Math.floor(ts / 1000)}:f>`
}

function describeResourceKinds(resource) {
  const kinds = []
  if (resource.link) kinds.push('链接')
  if (resource.file) kinds.push(`文件(${resource.file.name})`)
  return kinds.join(' + ') || '未指定'
}

/**
 * 只要用户给首条消息添加过任意反应即可。
 * @param {import('discord.js').Message} message
 * @param {string} userId
 */
async function userHasAnyReactionOnMessage(message, userId) {
  const fresh = message.partial ? await message.fetch() : message
  const reactions = fresh.reactions.cache
  if (reactions.size === 0) return false

  for (const reaction of reactions.values()) {
    try {
      let after
      for (;;) {
        const batch = await reaction.users.fetch({ limit: 100, ...(after ? { after } : {}) })
        if (batch.has(userId)) return true
        if (batch.size < 100) break
        after = batch.last()?.id
        if (!after) break
      }
    } catch (error) {
      console.warn('读取反应用户失败：', error)
    }
  }
  return false
}

function buildSharePanelEmbed(resource, authorTag) {
  const lines = [
    `**发帖人**：${authorTag}`,
    `**类型**：${describeResourceKinds(resource)}`,
  ]
  if (resource.note) lines.push(`**说明**：${resource.note}`)
  lines.push('')
  lines.push('获取前请先给本帖**首条消息**添加任意反应（表情），再点击下方按钮。')
  lines.push('资源链接/文件将**仅你可见**下发。')

  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(resource.title.slice(0, 256))
    .setDescription(lines.join('\n'))
    .setFooter({ text: `资源 ID：${resource.id}` })
}

function buildGetButton(resourceId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${GET_PREFIX}${resourceId}`)
      .setLabel('获取资源')
      .setStyle(ButtonStyle.Primary),
  )
}

export async function handleShareResourceCommand(interaction) {
  if (
    !interaction.isChatInputCommand() ||
    (interaction.commandName !== '分享资源' && interaction.commandName !== 'share-resource')
  ) {
    return false
  }

  const channel = interaction.channel
  if (!channel || !(await isForumPostThread(channel))) {
    await interaction.reply({
      content: '请在**论坛帖子**内使用此命令（进入某个帖子线程后再输入 `/分享资源`）。',
      ephemeral: true,
    })
    return true
  }

  const title = (
    interaction.options.getString('标题') ||
    interaction.options.getString('title') ||
    ''
  ).trim()
  const link = (
    interaction.options.getString('链接') ||
    interaction.options.getString('link') ||
    ''
  ).trim() || null
  const note = (
    interaction.options.getString('说明') ||
    interaction.options.getString('note') ||
    ''
  ).trim()
  const attachment =
    interaction.options.getAttachment('文件') || interaction.options.getAttachment('file')

  if (!title) {
    await interaction.reply({
      content: '请填写「标题」。',
      ephemeral: true,
    })
    return true
  }

  if (!link && !attachment) {
    await interaction.reply({
      content: '请至少提供 **链接** 或 **文件** 其中一项。',
      ephemeral: true,
    })
    return true
  }

  if (link && !/^https?:\/\//i.test(link)) {
    await interaction.reply({
      content: '链接必须以 `http://` 或 `https://` 开头。',
      ephemeral: true,
    })
    return true
  }

  await interaction.deferReply({ ephemeral: true })

  let starterMessage
  try {
    starterMessage = await channel.fetchStarterMessage()
  } catch {
    await interaction.editReply({
      content: '无法读取本帖首条消息，请确认机器人有「查看消息历史」权限后重试。',
    })
    return true
  }

  if (!starterMessage) {
    await interaction.editReply({ content: '未找到本帖首条消息，无法挂载资源。' })
    return true
  }

  const id = createResourceId()
  /** @type {import('./resourceStore.js').ResourceRecord['file']} */
  let file = null
  if (attachment) {
    try {
      const localPath = await cacheAttachmentLocally(id, {
        url: attachment.url,
        name: attachment.name || 'file',
      })
      file = {
        url: attachment.url,
        name: attachment.name || 'file',
        contentType: attachment.contentType || 'application/octet-stream',
        size: attachment.size || 0,
        localPath,
      }
    } catch (error) {
      console.error('缓存附件失败：', error)
      await interaction.editReply({
        content: '上传文件保存失败，请稍后重试，或改用 link 分享网盘链接。',
      })
      return true
    }
  }

  const resource = {
    id,
    authorId: interaction.user.id,
    guildId: interaction.guildId,
    channelId: channel.id,
    panelMessageId: '',
    starterMessageId: starterMessage.id,
    title,
    note,
    link,
    file,
    createdAt: Date.now(),
  }

  const panelMsg = await channel.send({
    embeds: [buildSharePanelEmbed(resource, interaction.user.tag)],
    components: [buildGetButton(id)],
  })

  resource.panelMessageId = panelMsg.id
  upsertResource(resource)

  await interaction.editReply({
    content: [
      `已挂载资源 **${title}**（ID：\`${id}\`）。`,
      '下载者需先给本帖首条消息添加任意反应，再点「获取资源」。',
      '你可用 `/查看资源下载记录` 查看谁下载了你的资源（仅自己可见）。',
    ].join('\n'),
  })
  return true
}

export async function handleMyDownloadsCommand(interaction) {
  if (
    !interaction.isChatInputCommand() ||
    (interaction.commandName !== '查看资源下载记录' &&
      interaction.commandName !== 'my-downloads')
  ) {
    return false
  }

  const resourceId = (
    interaction.options.getString('资源编号') ||
    interaction.options.getString('resource_id') ||
    ''
  ).trim()
  const myResources = listResourcesByAuthor(interaction.user.id)

  if (myResources.length === 0) {
    await interaction.reply({
      content: '你还没有用 `/分享资源` 分享过资源。',
      ephemeral: true,
    })
    return true
  }

  if (resourceId) {
    const resource = getResource(resourceId)
    if (!resource || resource.authorId !== interaction.user.id) {
      await interaction.reply({
        content: '找不到该资源，或它不属于你。',
        ephemeral: true,
      })
      return true
    }

    const downloads = listDownloadsForResource(resourceId)
    const lines =
      downloads.length === 0
        ? ['暂无下载记录。']
        : downloads.slice(0, 30).map((d, i) => {
            return `${i + 1}. <@${d.downloaderId}>（${d.downloaderTag}）· ${formatTime(d.downloadedAt)}`
          })

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`下载名单 · ${resource.title}`.slice(0, 256))
      .setDescription(lines.join('\n'))
      .setFooter({ text: `共 ${downloads.length} 人 · 资源 ID：${resource.id}` })

    await interaction.reply({ embeds: [embed], ephemeral: true })
    return true
  }

  const downloads = listDownloadsForAuthor(interaction.user.id).slice(0, 40)
  const resourceTitle = new Map(myResources.map((r) => [r.id, r.title]))

  const summary = myResources
    .slice(0, 15)
    .map((r) => {
      const count = listDownloadsForResource(r.id).length
      return `• **${r.title}**（\`${r.id}\`）· ${describeResourceKinds(r)} · ${count} 次下载`
    })
    .join('\n')

  const recent =
    downloads.length === 0
      ? '暂无下载记录。'
      : downloads
          .map((d, i) => {
            const title = resourceTitle.get(d.resourceId) || d.resourceId
            return `${i + 1}. <@${d.downloaderId}> ← **${title}** · ${formatTime(d.downloadedAt)}`
          })
          .join('\n')

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('我的资源下载情况')
    .setDescription(`**你分享的资源**\n${summary}\n\n**最近下载**\n${recent}`)
    .setFooter({ text: '指定某条：/查看资源下载记录 资源编号:xxx' })

  await interaction.reply({ embeds: [embed], ephemeral: true })
  return true
}

export async function handleResourceButton(interaction) {
  if (!interaction.isButton()) return false
  if (!interaction.customId.startsWith(GET_PREFIX)) return false

  const resourceId = interaction.customId.slice(GET_PREFIX.length)
  const resource = getResource(resourceId)
  if (!resource) {
    await interaction.reply({
      content: '该资源不存在或已被移除。请让发帖人重新挂载。',
      ephemeral: true,
    })
    return true
  }

  await interaction.deferReply({ ephemeral: true })

  const channel = interaction.channel
  if (!channel?.isTextBased?.()) {
    await interaction.editReply({ content: '无法在此频道获取资源。' })
    return true
  }

  let starterMessage
  try {
    if (channel.isThread?.()) {
      starterMessage = await channel.fetchStarterMessage()
    }
    if (!starterMessage && resource.starterMessageId) {
      starterMessage = await channel.messages.fetch(resource.starterMessageId)
    }
  } catch {
    await interaction.editReply({
      content: '无法读取帖子首条消息，请确认机器人权限后重试。',
    })
    return true
  }

  if (!starterMessage) {
    await interaction.editReply({ content: '找不到帖子首条消息，无法校验反应。' })
    return true
  }

  const isAuthor = interaction.user.id === resource.authorId
  if (!isAuthor) {
    const reacted = await userHasAnyReactionOnMessage(starterMessage, interaction.user.id)
    if (!reacted) {
      await interaction.editReply({
        content:
          '请先给本帖**首条消息**添加任意一个反应（表情），然后再点「获取资源」。\n（点赞、爱心或其他表情均可）',
      })
      return true
    }
  }

  const lines = [`**${resource.title}**`, '']
  if (resource.note) {
    lines.push(resource.note, '')
  }
  if (resource.link) {
    lines.push(`链接：${resource.link}`)
  }
  if (resource.file) {
    lines.push(`文件：\`${resource.file.name}\`（见下方附件）`)
  }

  /** @type {import('discord.js').InteractionEditReplyOptions} */
  const payload = { content: lines.join('\n').slice(0, 2000) }

  if (resource.file) {
    const fromLocal = resource.file.localPath && existsSync(resource.file.localPath)
    const attachmentSource = fromLocal ? resource.file.localPath : resource.file.url
    if (attachmentSource) {
      try {
        payload.files = [{ attachment: attachmentSource, name: resource.file.name }]
      } catch (error) {
        console.warn('附加文件失败：', error)
        if (resource.file.url) {
          payload.content = `${payload.content}\n备用链接：${resource.file.url}`
        }
      }
    }
  }

  await interaction.editReply(payload)

  recordDownload({
    resourceId: resource.id,
    downloaderId: interaction.user.id,
    downloaderTag: interaction.user.tag,
  })

  return true
}

export async function handleResourceInteraction(interaction) {
  if (await handleShareResourceCommand(interaction)) return true
  if (await handleMyDownloadsCommand(interaction)) return true
  if (await handleResourceButton(interaction)) return true
  return false
}
