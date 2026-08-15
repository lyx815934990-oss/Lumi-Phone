import {
  IMESSAGE_BUBBLE_PRESET,
  WECHAT_APP_CLASSIC_BUBBLE_PRESET,
} from '../wechatBubblePresets'
import { LIQUID_GLASS_MINIMAL_BUBBLE_PACK } from './liquidGlassMinimalPack'
import { LUMI_BUBBLE_PACK_FORMAT, LUMI_BUBBLE_PACK_VERSION, type LumiWeChatBubblePack } from './types'

export function bubblePackFromPreset(
  preset: typeof WECHAT_APP_CLASSIC_BUBBLE_PRESET,
  author = 'Lumi',
): LumiWeChatBubblePack {
  return {
    format: LUMI_BUBBLE_PACK_FORMAT,
    version: LUMI_BUBBLE_PACK_VERSION,
    meta: {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      author,
    },
    preset: {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      bubble: { ...preset.bubble },
      selfBubbleText: preset.selfBubbleText,
      otherBubbleText: preset.otherBubbleText,
      chatRoomDefaultBg: preset.chatRoomDefaultBg,
      ...(preset.wechatThemePatch ? { wechatThemePatch: { ...preset.wechatThemePatch } } : {}),
      ...(preset.chatThemePatch ? { chatThemePatch: { ...preset.chatThemePatch } } : {}),
    },
  }
}

/** 官方样板：微信 App 经典绿 */
export const SAMPLE_WECHAT_CLASSIC_BUBBLE_PACK = bubblePackFromPreset(WECHAT_APP_CLASSIC_BUBBLE_PRESET)

/** 官方样板：iMessage */
export const SAMPLE_IMESSAGE_BUBBLE_PACK = bubblePackFromPreset(IMESSAGE_BUBBLE_PRESET)

export const OFFICIAL_BUBBLE_PACK_SAMPLES: LumiWeChatBubblePack[] = [
  SAMPLE_WECHAT_CLASSIC_BUBBLE_PACK,
  SAMPLE_IMESSAGE_BUBBLE_PACK,
  LIQUID_GLASS_MINIMAL_BUBBLE_PACK,
]
