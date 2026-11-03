/**
 * 通讯社私信：对方按人格回多条气泡（JSON），下游按字数逐条露出。
 */

import type { ApiConfig } from '../api/types'
import {
  FORUM_COMMUNITY_RULES,
  FORUM_PROSE_SHORT_BAN,
  extractJsonObject,
  forumChat,
  requireForumApi,
} from './forumAiShared'
import type { ForumDmBubble } from './forumDmSample'
import { getNetizenPersona } from './netizenPersonas'
import { getResidentWriter } from './residentWriters'

function resolvePeerPrompt(fromId: string): {
  id: string
  username: string
  personaPrompt: string
  chatStyle: string
} {
  const writer = getResidentWriter(fromId)
  if (writer) {
    return {
      id: writer.id,
      username: writer.username,
      personaPrompt: writer.personaPrompt,
      chatStyle: `${writer.commentStylePrompt}；私信里也可以偏写手口吻：${writer.replyStylePrompt}`,
    }
  }
  const nz = getNetizenPersona(fromId)
  return {
    id: fromId,
    username: nz?.username ?? '网友',
    personaPrompt: nz?.personaPrompt ?? '你是同人论坛里的普通网友，口语、友善。',
    chatStyle: nz?.commentStylePrompt ?? '短、口语、像微信私聊。',
  }
}

function formatHistory(messages: ForumDmBubble[], peerName: string, selfName: string): string {
  return messages
    .slice(-16)
    .map((m) => `${m.fromMe ? selfName || '我' : peerName}：${m.text}`)
    .join('\n')
}

/**
 * 生成对方私信回复：1～4 条短气泡（按行拆）。
 */
export async function aiGenerateForumDmReply(params: {
  apiConfig: ApiConfig | null
  peerId: string
  selfName: string
  messages: ForumDmBubble[]
}): Promise<string[]> {
  const apiConfig = requireForumApi(params.apiConfig)
  const peer = resolvePeerPrompt(params.peerId)
  const selfName = params.selfName.trim() || '我'
  const history = formatHistory(params.messages, peer.username, selfName)
  const lastFromMe = [...params.messages].reverse().find((m) => m.fromMe)?.text?.trim() ?? ''

  const system = `你是同人创作论坛（通讯社）里的用户「${peer.username}」（id=${peer.id}），正在与「${selfName}」微信式私信聊天。
${FORUM_COMMUNITY_RULES}
${peer.personaPrompt}
【私信口吻】${peer.chatStyle}
${FORUM_PROSE_SHORT_BAN}

硬性规则：
1. 只扮演 ${peer.username}，用私信短句回；禁止自称 AI。
2. 输出 JSON：{"bubbles":["气泡1","气泡2",...]}，bubbles 为 1～4 条，多数宜短（约 4～36 字），能拆则拆，禁止一整段长文。
3. 承接最近对话；若对方刚说了具体事，先答事再闲聊。
4. 禁止空壳：「哈哈」「嗯嗯」「好的呢」单独成条凑数。
5. 禁止 Unicode emoji；可用「……」「？」等。`

  const user = `【近期私信】
${history || '（暂无历史，对方刚打开会话想聊）'}
${lastFromMe ? `\n【对方刚发】${lastFromMe}\n` : ''}
请以「${peer.username}」身份回 1～4 条私信气泡。`

  const raw = await forumChat({
    apiConfig,
    system,
    user,
    temperature: 0.92,
    max_tokens: 2400,
    json: true,
  })
  const obj = extractJsonObject(raw)
  const list = obj && Array.isArray(obj.bubbles) ? obj.bubbles : null
  const bubbles: string[] = []
  if (list) {
    for (const item of list) {
      if (typeof item !== 'string') continue
      const t = item.trim()
      if (!t) continue
      bubbles.push(t.slice(0, 120))
      if (bubbles.length >= 4) break
    }
  }
  if (!bubbles.length) {
    // 兜底：从原文按行拆
    const lines = raw
      .split(/\n+/)
      .map((l) => l.replace(/^[-*•\d.、]+\s*/, '').trim())
      .filter((l) => l && !l.startsWith('{') && !l.startsWith('['))
    for (const l of lines.slice(0, 3)) bubbles.push(l.slice(0, 120))
  }
  if (!bubbles.length) throw new Error('私信回复生成失败，请重试')
  return bubbles
}
