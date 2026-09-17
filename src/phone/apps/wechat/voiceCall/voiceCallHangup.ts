/**
 * 语音通话挂断指令解析（模型输出，非本地剧情启发式）。
 */

const HANGUP_ONLY_RE =
  /^(?:语音通话\s*(?:挂断|结束|结束通话)|挂断通话|结束通话|\[VOICECALL_HANGUP\])\s*$/iu

const HANGUP_INLINE_RE = /(?:^|\s)(?:语音通话\s*(?:挂断|结束|结束通话)|挂断通话|结束通话|\[VOICECALL_HANGUP\])\s*$/iu

/** 从模型通话回复中拆出「最后要说的话」与是否主动挂断 */
export function splitVoiceCallHangupDirective(raw: string): {
  speech: string
  hangup: boolean
} {
  const cleaned = String(raw ?? '').replace(/\r\n/g, '\n').trim()
  if (!cleaned) return { speech: '', hangup: false }

  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean)
  const kept: string[] = []
  let hangup = false
  for (const line of lines) {
    if (HANGUP_ONLY_RE.test(line)) {
      hangup = true
      continue
    }
    if (HANGUP_INLINE_RE.test(line)) {
      hangup = true
      const speechPart = line.replace(HANGUP_INLINE_RE, '').trim()
      if (speechPart) kept.push(speechPart)
      continue
    }
    kept.push(line)
  }
  return { speech: kept.join('\n').trim(), hangup }
}

/**
 * 估算本批角色台词在公屏打字机 / 字幕推进全部显示完所需毫秒。
 * 与 CallVisualizer Typewriter(speedMs=40) + VoiceCallPanel captionParade 节奏对齐。
 */
export function estimateVoiceCallCaptionRevealMs(
  segments: string[],
  opts?: { autoPlay?: boolean },
): number {
  const lines = (segments ?? []).map((s) => String(s ?? '').trim()).filter(Boolean)
  if (!lines.length) return 0
  const TYPEWRITER_MS = 40
  let total = 0
  if (lines.length === 1) {
    // 单条不走字幕推进定时器，只等打字机打完
    const len = Math.max(1, lines[0]!.length)
    total = Math.max(500, len * TYPEWRITER_MS + 280)
  } else {
    // 多条：每条都按 captionParade 的 waitMs 推进（末条也会等满一轮再结束）
    for (const text of lines) {
      const len = Math.max(1, text.length)
      total += Math.min(4200, Math.max(1200, len * 70))
    }
  }
  if (opts?.autoPlay) {
    // 自动播时字幕跟音频走，按语速再取一个下限，避免音还没播完就挂
    let audioMs = 0
    for (const text of lines) {
      const sec = Math.max(1.2, Math.min(12, text.length / 4.2))
      audioMs += sec * 1000 + 220
    }
    total = Math.max(total, audioMs)
  }
  return total
}

/** 整通文稿压成「一轮」上下文（写入通话气泡，供后续私聊注入） */
export function formatVoiceCallTranscriptForContext(params: {
  messages: Array<{ role: 'user' | 'character'; text?: string; asrText?: string }>
  durationSec?: number
  endedBy?: 'user' | 'character'
  initiator?: 'self' | 'other'
}): string {
  const body: string[] = []
  for (const m of params.messages) {
    const text = String(m.asrText ?? m.text ?? '').trim()
    if (!text || text === '（语音）' || text === '(语音)') continue
    body.push(`${m.role === 'user' ? '用户' : '对方'}：${text}`)
  }
  if (!body.length) return ''
  const dur =
    typeof params.durationSec === 'number' && Number.isFinite(params.durationSec)
      ? Math.max(0, Math.floor(params.durationSec))
      : null
  const headBits = ['【语音通话记录·整通算一轮】']
  if (params.initiator === 'self') headBits.push('用户拨出')
  else if (params.initiator === 'other') headBits.push('对方拨来')
  if (dur != null) headBits.push(`约${dur}秒`)
  if (params.endedBy === 'character') headBits.push('对方挂断')
  else if (params.endedBy === 'user') headBits.push('用户挂断')
  return `${headBits.join(' · ')}\n${body.join('\n')}`
}

/** 本通进行中的消息 → 聊天 transcript 轮次（供通话 AI 注入上下文） */
export function voiceCallMessagesToChatTurns(
  messages: Array<{
    role: 'user' | 'character'
    text?: string
    asrText?: string
    voiceEmotion?: string
    source?: string
  }>,
): Array<{ from: 'self' | 'other'; text: string }> {
  const out: Array<{ from: 'self' | 'other'; text: string }> = []
  for (const m of messages) {
    let text = String(m.asrText ?? m.text ?? '').trim()
    if (!text || text === '（语音）' || text === '(语音)') continue
    const emo = String(m.voiceEmotion ?? '').trim()
    if (m.role === 'user' && emo && m.source === 'user_voice') {
      text = `（这是一条用户语音转写；识别到的情绪倾向：${emo}。请先按该情绪理解用户状态，再给出有情绪承接的回复。）\n${text}`
    }
    out.push({
      from: m.role === 'user' ? 'self' : 'other',
      text,
    })
  }
  return out
}
