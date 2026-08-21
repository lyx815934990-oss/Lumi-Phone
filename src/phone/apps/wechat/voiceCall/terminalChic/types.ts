export type VoiceLogMessage = {
  id: string
  role: 'user' | 'character'
  /** @deprecated 终端前缀，新 UI 不再展示 */
  prefix: string
  /** 文字内容；语音条时为展示用短标或转录备用 */
  text: string
  /** voice = 语音条；text = 纯文字气泡 */
  kind?: 'voice' | 'text'
  /** 用户语音原音频（对象 URL）；角色侧可为空（合成播放） */
  audioUrl?: string
  audioMime?: string
  /** 语音时长（秒） */
  durationSec?: number
  /** 转录文本 */
  asrText?: string
  voiceEmotion?: string
  /** 是否已手动/自动播放过（未听圆点） */
  listened?: boolean
  createdAt: number
}

export function isVoiceKind(msg: VoiceLogMessage): boolean {
  if (msg.kind === 'voice') return true
  if (msg.kind === 'text') return false
  return !!msg.audioUrl
}
