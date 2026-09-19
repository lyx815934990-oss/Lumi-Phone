import {
  isBuiltinSiliconflowProxyUrl,
  readBuiltinSiliconflowProxyBase,
} from '../../api/builtinSiliconflow'
import type { ApiConfig, ApiPreset, SubApiConfig } from '../../api/types'

export const VOICE_ASR_MODEL_ID = 'FunAudioLLM/SenseVoiceSmall'

export const VOICE_ASR_CUSTOM_URL_PLACEHOLDER = 'https://api.siliconflow.cn/v1'

export function normalizeVoiceAsrBuiltinFlag(raw: unknown): boolean {
  return raw !== false
}

export function voiceAsrUsesBuiltin(flag: boolean | undefined): boolean {
  return normalizeVoiceAsrBuiltinFlag(flag)
}

export function editableVoiceAsrUrl(url: string | undefined): string {
  const trimmed = url?.trim() || ''
  if (!trimmed || isBuiltinSiliconflowProxyUrl(trimmed)) return ''
  return trimmed
}

export function buildVoiceAsrApiConfig(
  sub: Pick<SubApiConfig, 'useBuiltinKey' | 'apiConfig'> | null | undefined,
): ApiConfig {
  if (voiceAsrUsesBuiltin(sub?.useBuiltinKey)) {
    return {
      apiUrl: readBuiltinSiliconflowProxyBase(),
      apiKey: '',
      modelId: VOICE_ASR_MODEL_ID,
      modelList: [VOICE_ASR_MODEL_ID],
    }
  }
  return {
    apiUrl: editableVoiceAsrUrl(sub?.apiConfig?.apiUrl),
    apiKey: sub?.apiConfig?.apiKey?.trim() || '',
    modelId: VOICE_ASR_MODEL_ID,
    modelList: [VOICE_ASR_MODEL_ID],
  }
}

export function patchPresetVoiceAsr(
  preset: ApiPreset,
  patch: { useBuiltinKey?: boolean; apiUrl?: string; apiKey?: string },
): ApiPreset {
  const prev = preset.sub.voiceAsr
  const apiConfig: ApiConfig = { ...prev.apiConfig }
  if (patch.apiUrl !== undefined) apiConfig.apiUrl = patch.apiUrl
  if (patch.apiKey !== undefined && patch.apiKey.trim()) apiConfig.apiKey = patch.apiKey.trim()
  return {
    ...preset,
    updatedAt: Date.now(),
    sub: {
      ...preset.sub,
      voiceAsr: {
        ...prev,
        enabled: true,
        useMainApi: false,
        useBuiltinKey: patch.useBuiltinKey ?? prev.useBuiltinKey !== false,
        apiConfig,
      },
    },
  }
}
