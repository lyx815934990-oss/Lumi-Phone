import { DEFAULT_STYLE_PRESET_ID } from '../../../components/moments/pollinationsPresets'
import { normalizeImageGenStyleMode } from '../../../components/moments/imageGenStyleMode'
import type { MomentsImageGenSettings } from '../../../components/moments/useMomentsSettingsStore'
import { getPollinationsStylePreset } from '../../../components/moments/pollinationsPresets'
import type { ChatConversationSettingsRow } from './newFriendsPersona/types'
import { personaDb } from './newFriendsPersona/idb'
import { wechatConversationKey } from './wechatConversationKey'

export type ChatImageGenStyleOverrideSource = Pick<
  ChatConversationSettingsRow,
  | 'imageGenStyleOverrideEnabled'
  | 'imageGenStylePrefixMode'
  | 'imageGenStylePresetId'
  | 'imageGenCustomStylePrefix'
>

/** 本聊天开启风格覆盖时，只替换全局 settings 的风格三字段；模型/尺寸等仍用全局 */
export function applyChatImageGenStyleOverride(
  global: MomentsImageGenSettings,
  conv?: ChatImageGenStyleOverrideSource | null,
): MomentsImageGenSettings {
  if (!conv?.imageGenStyleOverrideEnabled) return global
  const stylePrefixMode = normalizeImageGenStyleMode(conv.imageGenStylePrefixMode)
  const stylePresetId =
    conv.imageGenStylePresetId?.trim() ||
    global.stylePresetId?.trim() ||
    DEFAULT_STYLE_PRESET_ID
  const customStylePrefix =
    typeof conv.imageGenCustomStylePrefix === 'string'
      ? conv.imageGenCustomStylePrefix
      : global.customStylePrefix
  return {
    ...global,
    stylePrefixMode,
    stylePresetId,
    customStylePrefix,
  }
}

export async function loadResolvedImageGenSettingsForChat(params: {
  conversationKey?: string | null
  characterId?: string | null
  playerIdentityId?: string | null
  globalSettings: MomentsImageGenSettings
}): Promise<MomentsImageGenSettings> {
  const key =
    params.conversationKey?.trim() ||
    (params.characterId?.trim() && params.playerIdentityId?.trim()
      ? wechatConversationKey(params.characterId.trim(), params.playerIdentityId.trim())
      : '')
  if (!key) return params.globalSettings
  try {
    const conv = await personaDb.getChatConversationSettings(key)
    return applyChatImageGenStyleOverride(params.globalSettings, conv)
  } catch {
    return params.globalSettings
  }
}

/** 设置页摘要：跟随全局 / 本聊天·风格名 */
export function summarizeChatImageGenStyleOverride(
  conv?: ChatImageGenStyleOverrideSource | null,
): string {
  if (!conv?.imageGenStyleOverrideEnabled) return '跟随全局'
  if (conv.imageGenStylePrefixMode === 'custom') {
    const custom = conv.imageGenCustomStylePrefix?.trim()
    return custom ? `本聊天·自定义` : '本聊天·自定义'
  }
  const label = getPollinationsStylePreset(conv.imageGenStylePresetId || DEFAULT_STYLE_PRESET_ID)?.labelZh
  return label ? `本聊天·${label}` : '本聊天·单独设置'
}
