/** 通话合成：语气词 / 情绪标签（功能面板独立开关，默认均关） */

const LEGACY_KEY = 'wechat:voiceCall:synthToneEmotion'
const TONE_KEY = 'wechat:voiceCall:synthToneTokens'
const EMOTION_KEY = 'wechat:voiceCall:synthEmotion'

function readFlag(key: string): boolean | null {
  try {
    const v = localStorage.getItem(key)
    if (v === '1') return true
    if (v === '0') return false
    return null
  } catch {
    return null
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function migrateFromLegacy(): boolean {
  const legacy = readFlag(LEGACY_KEY)
  if (legacy == null) return false
  if (readFlag(TONE_KEY) == null) writeFlag(TONE_KEY, legacy)
  if (readFlag(EMOTION_KEY) == null) writeFlag(EMOTION_KEY, legacy)
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
  return legacy
}

/** 是否允许合成官方英文语气词（laughs / sighs 等） */
export function readVoiceCallSynthToneTokens(): boolean {
  migrateFromLegacy()
  return readFlag(TONE_KEY) === true
}

export function writeVoiceCallSynthToneTokens(on: boolean): void {
  writeFlag(TONE_KEY, on)
}

/** 是否允许合成情绪标签 / voice_setting.emotion */
export function readVoiceCallSynthEmotion(): boolean {
  migrateFromLegacy()
  return readFlag(EMOTION_KEY) === true
}

export function writeVoiceCallSynthEmotion(on: boolean): void {
  writeFlag(EMOTION_KEY, on)
}

/** @deprecated 兼容：任一开启即 true */
export function readVoiceCallSynthToneEmotion(): boolean {
  return readVoiceCallSynthToneTokens() || readVoiceCallSynthEmotion()
}
