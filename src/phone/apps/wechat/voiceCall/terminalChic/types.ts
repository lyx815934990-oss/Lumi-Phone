export type VoiceLogSource = 'user_voice' | 'user_text' | 'char_voice'

export type VoiceAudioStatus = 'idle' | 'pending' | 'ready' | 'failed'

export type VoiceLogMessage = {
  id: string
  role: 'user' | 'character'
  /** @deprecated 终端前缀，新 UI 不再展示 */
  prefix: string
  /** 文字内容；语音条时为展示用短标或转录备用 */
  text: string
  /** voice = 语音条；text = 纯文字（通话内用于「文字转述」） */
  kind?: 'voice' | 'text'
  /** 通话通道来源：真人录音 / 文字转述 / 角色合成 */
  source?: VoiceLogSource
  /** 用户语音原音频（对象 URL）；角色侧为 MiniMax 合成 URL */
  audioUrl?: string
  audioMime?: string
  /** 角色 TTS：未合成 / 合成中 / 完成 / 失败 */
  audioStatus?: VoiceAudioStatus
  /** 语音时长（秒） */
  durationSec?: number
  /** 转录 / 文稿文本 */
  asrText?: string
  voiceEmotion?: string
  /**
   * 用户录音已上屏、ASR 尚未跑（催回复 / 挂断时再识别语气与文稿）。
   * 会话内存标记，不持久化。
   */
  asrPending?: boolean
  /** 是否已手动/自动播放过（未听圆点） */
  listened?: boolean
  createdAt: number
}

export function isVoiceKind(msg: VoiceLogMessage): boolean {
  if (msg.source === 'user_text') return false
  if (msg.source === 'user_voice' || msg.source === 'char_voice') return true
  if (msg.kind === 'voice') return true
  if (msg.kind === 'text') return false
  return !!msg.audioUrl
}

export function resolveVoiceLogSource(msg: VoiceLogMessage): VoiceLogSource {
  if (msg.source) return msg.source
  if (msg.role === 'character') return 'char_voice'
  if (msg.kind === 'voice' || msg.audioUrl) return 'user_voice'
  return 'user_text'
}

/** 将文稿拆成台词 vs 半角 () 听觉旁白 */
export function splitAuditoryNarration(
  text: string,
): Array<{ kind: 'speech' | 'sfx'; text: string }> {
  const raw = String(text ?? '')
    .replace(/（([^）]*)）/g, '($1)')
    .trim()
  if (!raw) return []
  const out: Array<{ kind: 'speech' | 'sfx'; text: string }> = []
  const re = /\(([^)]*)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      const speech = raw.slice(last, m.index).trim()
      if (speech) out.push({ kind: 'speech', text: speech })
    }
    const sfx = (m[1] ?? '').trim()
    if (sfx) out.push({ kind: 'sfx', text: sfx })
    last = m.index + m[0].length
  }
  if (last < raw.length) {
    const speech = raw.slice(last).trim()
    if (speech) out.push({ kind: 'speech', text: speech })
  }
  return out.length ? out : [{ kind: 'speech', text: raw }]
}
