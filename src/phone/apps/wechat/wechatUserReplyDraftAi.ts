/**
 * 加号「生成回复」：以用户口吻拟草稿（非角色回复）。
 * 输出换行分隔，一行 = 一条待发送气泡。
 * 须贴合用户人设，并承接角色侧已有线上语境。
 */

import type { ApiConfig } from '../api/types'
import { openAiCompatibleChat } from './newFriendsPersona/ai'
import type { ChatTranscriptTurn } from './wechatChatAi'

function formatTranscriptForUserDraft(transcript: ChatTranscriptTurn[], peerLabel: string): string {
  const peer = peerLabel.trim() || '对方'
  const lines: string[] = []
  for (const t of transcript.slice(-48)) {
    const text = String(t.text ?? '').trim()
    if (!text) continue
    const who =
      t.from === 'self'
        ? '用户'
        : t.speakerLabel?.trim()
          ? t.speakerLabel.trim()
          : peer
    lines.push(`${who}：${text}`)
  }
  return lines.join('\n') || '（暂无聊天记录）'
}

/** 最近对方气泡（用户必须优先承接） */
function formatLatestPeerFocus(transcript: ChatTranscriptTurn[], peerLabel: string, maxTurns = 6): string {
  const peer = peerLabel.trim() || '对方'
  const peerTurns = [...transcript]
    .reverse()
    .filter((t) => t.from !== 'self' && String(t.text ?? '').trim())
    .slice(0, maxTurns)
    .reverse()
  if (!peerTurns.length) return '（近期暂无对方可见气泡；仍须贴合用户人设与下方上下文，勿无端开新话题。）'
  return peerTurns
    .map((t) => {
      const who = t.speakerLabel?.trim() || peer
      return `${who}：${String(t.text ?? '').trim()}`
    })
    .join('\n')
}

function parseDraftBubbles(raw: string, expectedCount: number): string[] {
  const lines = String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) =>
      l
        .replace(/^\s*(?:[-*•]|\d+[.)、]|气泡\s*\d+\s*[:：])\s*/u, '')
        .replace(/^["「『]|["」』]$/g, '')
        .trim(),
    )
    .filter(Boolean)
  if (!lines.length) return []
  if (lines.length === expectedCount) return lines
  if (lines.length > expectedCount) return lines.slice(0, expectedCount)
  return lines
}

function clipBlock(text: string | undefined, maxChars: number): string {
  const t = String(text ?? '').trim()
  if (!t) return ''
  if (t.length <= maxChars) return t
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`
}

/** 将输入框草稿按换行拆成多条待发气泡（空行忽略） */
export function splitWeChatComposerIntoBubbles(raw: string): string[] {
  return String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

export async function requestWeChatUserReplyDraftBubbles(params: {
  apiConfig: ApiConfig | null
  transcript: ChatTranscriptTurn[]
  /** 对方展示名（私聊角色 / 群聊可写「群友」） */
  peerDisplayName: string
  /** 用户侧称呼参考 */
  playerDisplayName: string
  bubbleCount: number
  tone?: string
  bias?: string
  minChars?: number
  maxChars?: number
  /** 群聊时略改提示 */
  isGroup?: boolean
  /** 玩家身份档案 + 身份世界书（buildWeChatPlayerIdentityPromptBlock） */
  playerIdentityBlock?: string
  /** 对方角色卡片 + 角色世界书摘要 */
  characterPersonaBlock?: string
  /** 线上上下文：未总结私聊、长期记忆片段、剧情时间轴等 */
  onlineContextNotes?: string
}): Promise<string> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    throw new Error('请先配置聊天 API')
  }

  const n = Math.max(1, Math.min(12, Math.floor(params.bubbleCount) || 3))
  const peer = params.peerDisplayName.trim() || '对方'
  const userName = params.playerDisplayName.trim() || '用户'
  const history = formatTranscriptForUserDraft(params.transcript, peer)
  const peerFocus = formatLatestPeerFocus(params.transcript, peer)
  const identityBlock = clipBlock(params.playerIdentityBlock, 4500)
  const characterBlock = clipBlock(params.characterPersonaBlock, 4200)
  const onlineBlock = clipBlock(params.onlineContextNotes, 5000)

  const lengthHint = (() => {
    const hasMin = typeof params.minChars === 'number' && params.minChars > 0
    const hasMax = typeof params.maxChars === 'number' && params.maxChars > 0
    if (!hasMin && !hasMax) return ''
    let lo = hasMin ? Math.max(1, Math.floor(params.minChars!)) : 1
    let hi = hasMax ? Math.max(1, Math.floor(params.maxChars!)) : Math.max(lo, 40)
    if (hi < lo) {
      const t = lo
      lo = hi
      hi = t
    }
    return `【字数】每条气泡约 ${lo}～${hi} 字（汉字估算），宁短勿水。`
  })()

  const system = [
    '你是微信聊天「用户侧」回复代写助手：只拟用户本人准备发出的话，绝不扮演对方角色。',
    params.isGroup
      ? `场景：群聊。用户展示名参考「${userName}」。`
      : `场景：与「${peer}」的私聊。用户展示名参考「${userName}」。`,
    '硬性规则：',
    `1. 只输出恰好 ${n} 行纯文本；每一行 = 一条独立微信气泡。`,
    '2. 禁止编号、引号、角色名冒号前缀、解释、Markdown；禁止空行。',
    '3. 禁止替对方发言；禁止系统旁白；禁止表情包指令行（除非用户偏向明确要求）。',
    '4. 语气像真人微信：短句、口语；须贴合【玩家身份档案】里的性格、说话习惯、身份与关系设定；若档案与近期用户气泡口吻冲突，以近期用户气泡为主、档案为辅。',
    '5. 【承接线上语境｜最高优先级】草稿必须接住【对方最近气泡】与【最近聊天记录】末尾话题：回答对方的问题/接梗/顺着情绪往下聊；禁止跳到无关新话题、禁止复读对方原句、禁止装作没看见对方刚说的话。',
    '6. 可参考【线上补充上下文】（未总结片段/记忆/时间轴）理解关系与前情，但不要把记忆里的旧事当作本轮正在发生；也不要替对方发明其未说过的新设定。',
    '7. 多条气泡之间要有推进，勿同义复读。',
    '8. 每条气泡必须是完整一句/完整话轮，禁止在句中截断、禁止半截话收尾。',
    params.tone?.trim() ? `【语气风格】${params.tone.trim()}（仍须服从用户人设与语境承接）` : '',
    params.bias?.trim() ? `【内容偏向】${params.bias.trim()}（若与对方刚说的话冲突，优先承接对方，再柔和融入偏向）` : '',
    lengthHint,
  ]
    .filter(Boolean)
    .join('\n')

  const user = [
    identityBlock ? `【玩家身份档案｜拟稿须贴合】\n${identityBlock}` : '【玩家身份档案】（未注入；仍按近期用户气泡口吻。）',
    '',
    characterBlock
      ? `【对方角色档案｜理解对方是谁、如何互动；勿替对方说话】\n${characterBlock}`
      : '',
    '',
    onlineBlock ? `【线上补充上下文】\n${onlineBlock}` : '',
    '',
    '【对方最近气泡｜必须优先承接】',
    peerFocus,
    '',
    '【最近聊天记录】',
    history,
    '',
    `请以用户「${userName}」本人口吻，生成恰好 ${n} 条待发送气泡（每行一条），紧接对方最近话头。每条须写完整，勿中途截断。`,
  ]
    .filter((line, i, arr) => {
      // 去掉连续空行造成的大块空白，但保留单空行分隔
      if (line !== '') return true
      return i > 0 && arr[i - 1] !== ''
    })
    .join('\n')

  // 与线上角色一轮回复一致：不传 max_tokens，由模型/线路自行决定输出长度
  const raw = await openAiCompatibleChat(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.85 },
  )

  const bubbles = parseDraftBubbles(raw, n)
  if (!bubbles.length) throw new Error('模型未返回可用草稿')
  return bubbles.join('\n')
}
