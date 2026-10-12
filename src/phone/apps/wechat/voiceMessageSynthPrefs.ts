/** 聊天语音消息：合成语气词 / 情绪标签（会话设置，默认均关） */

export type VoiceMessageSynthPrefs = {
  allowToneTokens: boolean
  allowEmotion: boolean
}

export function resolveVoiceMessageSynthPrefs(row?: {
  voiceSynthToneTokensEnabled?: boolean
  voiceSynthEmotionEnabled?: boolean
} | null): VoiceMessageSynthPrefs {
  return {
    allowToneTokens: row?.voiceSynthToneTokensEnabled === true,
    allowEmotion: row?.voiceSynthEmotionEnabled === true,
  }
}

export function isVoiceSynthToneTokensEnabled(row?: {
  voiceSynthToneTokensEnabled?: boolean
} | null): boolean {
  return row?.voiceSynthToneTokensEnabled === true
}

export function isVoiceSynthEmotionEnabled(row?: {
  voiceSynthEmotionEnabled?: boolean
} | null): boolean {
  return row?.voiceSynthEmotionEnabled === true
}
