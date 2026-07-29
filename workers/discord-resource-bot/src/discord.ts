import type { Env, ResourceRow } from './types'

const API = 'https://discord.com/api/v10'

export const ChannelType = {
  PublicThread: 11,
  PrivateThread: 12,
  GuildForum: 15,
} as const

export const InteractionType = {
  Ping: 1,
  ApplicationCommand: 2,
  MessageComponent: 3,
  ModalSubmit: 5,
} as const

export const InteractionResponseType = {
  Pong: 1,
  ChannelMessageWithSource: 4,
  DeferredChannelMessageWithSource: 5,
  Modal: 9,
} as const

export const MessageFlags = {
  Ephemeral: 1 << 6,
} as const

export const ButtonStyle = {
  Primary: 1,
  Link: 5,
} as const

export const ComponentType = {
  ActionRow: 1,
  Button: 2,
  TextInput: 4,
  Label: 18, // not needed - use modal text inputs
} as const

export const TextInputStyle = {
  Short: 1,
  Paragraph: 2,
} as const

type DiscordError = { message?: string; code?: number }

async function discordFetch(env: Env, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bot ${env.DISCORD_BOT_TOKEN}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const res = await fetch(`${API}${path}`, { ...init, headers })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as DiscordError
    throw new Error(err.message || `Discord API ${res.status} ${path}`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * 交互后续回复：只用 interaction token，不要带 Bot Authorization。
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding
 */
async function interactionFollowupFetch(
  applicationId: string,
  interactionToken: string,
  method: 'PATCH' | 'POST',
  body: Record<string, unknown>,
  path: string,
) {
  const res = await fetch(`${API}/webhooks/${applicationId}/${interactionToken}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as DiscordError
    throw new Error(err.message || `Interaction webhook ${res.status} ${path}`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function getChannel(env: Env, channelId: string) {
  return discordFetch(env, `/channels/${channelId}`) as Promise<{
    id: string
    type: number
    parent_id?: string | null
    guild_id?: string
    owner_id?: string
  }>
}

export async function getMessage(env: Env, channelId: string, messageId: string) {
  return discordFetch(env, `/channels/${channelId}/messages/${messageId}`) as Promise<{
    id: string
    content?: string
    reactions?: Array<{
      count: number
      emoji: { id: string | null; name: string | null }
    }>
  }>
}

export async function listReactionUsers(
  env: Env,
  channelId: string,
  messageId: string,
  emoji: string,
  after?: string,
) {
  const q = new URLSearchParams({ limit: '100' })
  if (after) q.set('after', after)
  const encoded = encodeURIComponent(emoji)
  return discordFetch(
    env,
    `/channels/${channelId}/messages/${messageId}/reactions/${encoded}?${q}`,
  ) as Promise<Array<{ id: string }>>
}

/** 当前用户是否对该 emoji 做过反应 */
async function userReactedWithEmoji(
  env: Env,
  channelId: string,
  messageId: string,
  emoji: string,
  userId: string,
  reactionCount: number,
): Promise<boolean> {
  let after: string | undefined
  // 最多翻 10 页（1000 人），避免热门帖拖死请求
  const maxPages = Math.min(10, Math.max(1, Math.ceil(reactionCount / 100)))
  for (let page = 0; page < maxPages; page += 1) {
    const users = await listReactionUsers(env, channelId, messageId, emoji, after)
    if (users.some((u) => u.id === userId)) return true
    if (users.length < 100) break
    after = users[users.length - 1]?.id
    if (!after) break
  }
  return false
}

/** 检查用户是否给消息添加过任意反应 */
export async function userHasAnyReaction(
  env: Env,
  channelId: string,
  messageId: string,
  userId: string,
): Promise<boolean> {
  const message = await getMessage(env, channelId, messageId)
  const reactions = message.reactions || []
  for (const reaction of reactions) {
    const emoji =
      reaction.emoji.id && reaction.emoji.name
        ? `${reaction.emoji.name}:${reaction.emoji.id}`
        : reaction.emoji.name
    if (!emoji) continue
    try {
      if (
        await userReactedWithEmoji(
          env,
          channelId,
          messageId,
          emoji,
          userId,
          reaction.count || 1,
        )
      ) {
        return true
      }
    } catch (error) {
      console.warn('检查反应失败：', error)
    }
  }
  return false
}

export async function createChannelMessage(
  env: Env,
  channelId: string,
  body: Record<string, unknown>,
) {
  return discordFetch(env, `/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  }) as Promise<{ id: string }>
}

export async function editInteractionResponse(
  env: Env,
  interactionToken: string,
  body: Record<string, unknown>,
  applicationId?: string,
) {
  const appId = applicationId || env.DISCORD_APPLICATION_ID
  try {
    return await interactionFollowupFetch(
      appId,
      interactionToken,
      'PATCH',
      body,
      '/messages/@original',
    )
  } catch (error) {
    console.warn('PATCH @original 失败，改用 followup：', error)
    return interactionFollowupFetch(appId, interactionToken, 'POST', body, '')
  }
}

export async function editInteractionResponseWithFiles(
  applicationId: string,
  interactionToken: string,
  payload: Record<string, unknown>,
  files: Array<{ name: string; bytes: ArrayBuffer; contentType: string }>,
) {
  const form = new FormData()
  const attachments = files.map((f, i) => ({ id: i, filename: f.name }))
  form.set('payload_json', JSON.stringify({ ...payload, attachments }))
  for (let i = 0; i < files.length; i += 1) {
    const f = files[i]
    form.set(
      `files[${i}]`,
      new Blob([new Uint8Array(f.bytes)], {
        type: f.contentType || 'application/octet-stream',
      }),
      f.name,
    )
  }

  const res = await fetch(
    `${API}/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    { method: 'PATCH', body: form },
  )
  if (!res.ok) {
    // 回退 followup
    const res2 = await fetch(`${API}/webhooks/${applicationId}/${interactionToken}`, {
      method: 'POST',
      body: form,
    })
    if (!res2.ok) {
      const err = (await res2.json().catch(() => ({}))) as DiscordError
      throw new Error(err.message || `带附件回复失败 ${res2.status}`)
    }
    return res2.json().catch(() => null)
  }
  return res.json().catch(() => null)
}

export function buildGetButton(resourceId: string) {
  return {
    type: 1,
    components: [
      {
        type: 2,
        style: ButtonStyle.Primary,
        label: '获取资源',
        custom_id: `resource:get:${resourceId}`,
      },
    ],
  }
}

export function buildSharePanelEmbed(row: ResourceRow, authorTag: string) {
  const kinds: string[] = []
  if (row.link) kinds.push('链接')
  let fileCount = 0
  if (row.files_json) {
    try {
      const arr = JSON.parse(row.files_json) as unknown[]
      if (Array.isArray(arr)) fileCount = arr.length
    } catch {
      fileCount = 0
    }
  }
  if (fileCount === 1) kinds.push('1 个文件')
  else if (fileCount > 1) kinds.push(`${fileCount} 个文件`)

  const lines = [
    `**发帖人**：${authorTag}`,
    `**类型**：${kinds.join(' + ') || '未指定'}`,
  ]
  if (row.note) lines.push(`**说明**：${row.note}`)
  lines.push('')
  lines.push('获取前请先给本帖**首条消息**添加任意反应（表情），再点击下方按钮。')
  lines.push('资源链接/文件将**仅你可见**下发。')

  return {
    title: row.title.slice(0, 256),
    description: lines.join('\n'),
    color: 0x57f287,
    footer: { text: `资源 ID：${row.id}` },
  }
}

export async function isForumPostThread(env: Env, channelId: string): Promise<boolean> {
  const channel = await getChannel(env, channelId)
  if (
    channel.type !== ChannelType.PublicThread &&
    channel.type !== ChannelType.PrivateThread
  ) {
    return false
  }
  if (!channel.parent_id) return false
  const parent = await getChannel(env, channel.parent_id)
  // 论坛帖；也兼容部分客户端把父频道识别异常的情况（只要是子区且父频道存在）
  return parent.type === ChannelType.GuildForum || parent.type === 15
}
