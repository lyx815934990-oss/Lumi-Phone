import type { ChatThemePatch } from './ChatThemeContext'
import { DEFAULT_CHAT_THEME, type ChatTheme } from './chatTheme/types'
import type { WeChatBubbleTheme, WeChatChatRoomBg, WeChatTheme } from '../../types'
import {
  DEFAULT_CUSTOMIZATION,
  DEFAULT_WECHAT_CHAT_WALLPAPER_PATH,
  wechatBubbleThemesEqual,
} from '../../types'
import {
  LIQUID_GLASS_MINIMAL_BUBBLE_PRESET,
  isLiquidGlassMinimalPackActive,
} from './bubblePack/liquidGlassMinimalPack'

export type WeChatBubblePreset = {
  id: string
  name: string
  description: string
  bubble: WeChatBubbleTheme
  selfBubbleText: string
  otherBubbleText: string
  /** 套用后写入聊天室默认背景（不影响 Tab 页底图） */
  chatRoomDefaultBg: WeChatChatRoomBg
  /** 全局套用预设时一并写入 wechatTheme（不含 bubbleGlobal / Tab 背景） */
  wechatThemePatch?: Partial<
    Pick<WeChatTheme, 'chatRoomDefaultBg' | 'chatInputBg' | 'chatInputBorder'>
  >
  /** 全局套用预设时一并写入 IndexedDB 聊天输入栏主题 */
  chatThemePatch?: ChatThemePatch
}

/** 高仿官方微信 App 聊天气泡：经典绿 + 白底 + 小圆角 + 指向三角 + 灰底聊天背景 */
export const WECHAT_APP_CLASSIC_BUBBLE_PRESET: WeChatBubblePreset = {
  id: 'wechat-app-classic',
  name: '微信 App',
  description: '经典绿己方、白底对方、指向三角；聊天室背景 #F3F3F3，顶栏 #EDEDED。可勾选夜间模式。',
  bubble: {
    selfBubbleBg: '#95EC69',
    otherBubbleBg: '#FFFFFF',
    selfBubbleRadiusPx: 8,
    otherBubbleRadiusPx: 8,
    showAvatar: true,
    showAvatarSelf: true,
    showAvatarOther: true,
    avatarRadiusPx: 8,
    showBubbleTail: true,
    bubbleTailStyle: 'wechat',
    mergeConsecutiveAvatarGroup: false,
  },
  selfBubbleText: '#191919',
  otherBubbleText: '#191919',
  chatRoomDefaultBg: { mode: 'solid', color: '#F3F3F3' },
  wechatThemePatch: {
    chatRoomDefaultBg: { mode: 'solid', color: '#F3F3F3' },
    chatInputBg: '#F7F7F7',
    chatInputBorder: 'rgba(0, 0, 0, 0.06)',
  },
  chatThemePatch: {
    inputBar: {
      layout: 'wechat',
      borderRadius: 6,
      borderColor: 'rgba(0, 0, 0, 0.06)',
      backgroundColor: '#F7F7F7',
      buttonColor: '#191919',
      buttonSize: 22,
    },
  },
}

/** 微信 App 夜间色板（暗黑模式：黑底 + 深绿灰对方气泡） */
export const WECHAT_APP_CLASSIC_NIGHT_BUBBLE_PRESET: WeChatBubblePreset = {
  ...WECHAT_APP_CLASSIC_BUBBLE_PRESET,
  id: 'wechat-app-classic',
  name: '微信 App',
  description: WECHAT_APP_CLASSIC_BUBBLE_PRESET.description,
  bubble: {
    ...WECHAT_APP_CLASSIC_BUBBLE_PRESET.bubble,
    selfBubbleBg: '#28C445',
    otherBubbleBg: '#2C2C2C',
  },
  selfBubbleText: '#191919',
  otherBubbleText: '#E5E5E5',
  chatRoomDefaultBg: { mode: 'solid', color: '#111111' },
  wechatThemePatch: {
    chatRoomDefaultBg: { mode: 'solid', color: '#111111' },
    chatInputBg: '#1E1E1E',
    chatInputBorder: 'rgba(255,255,255,0.08)',
  },
  chatThemePatch: {
    inputBar: {
      layout: 'wechat',
      borderRadius: 6,
      borderColor: 'rgba(255,255,255,0.08)',
      backgroundColor: '#1E1E1E',
      buttonColor: '#FFFFFF',
      buttonSize: 22,
    },
  },
}

export const WECHAT_CLASSIC_PRESET_MARK = '--wx-wechat-classic-preset'
export const WECHAT_CLASSIC_NIGHT_MARK = '--wx-wechat-classic-night'

export function isWechatClassicPresetActive(wechatTheme?: WeChatTheme): boolean {
  return (wechatTheme?.chatSkinOverrides?.[WECHAT_CLASSIC_PRESET_MARK] ?? '').trim() === '1'
}

export function isWechatClassicNightMode(wechatTheme?: WeChatTheme): boolean {
  return (wechatTheme?.chatSkinOverrides?.[WECHAT_CLASSIC_NIGHT_MARK] ?? '').trim() === '1'
}

export function resolveWechatClassicPreset(night: boolean): WeChatBubblePreset {
  return night ? WECHAT_APP_CLASSIC_NIGHT_BUBBLE_PRESET : WECHAT_APP_CLASSIC_BUBBLE_PRESET
}

/**
 * 套用微信日/夜时合并主题补丁：有壁纸或渐变时不强制改成纯色底，
 * 夜间靠聊天室黑色遮罩压暗；仅纯色底才在灰/黑之间切换。
 */
export function resolveWechatClassicThemePatch(
  night: boolean,
  currentRoomBg?: WeChatChatRoomBg,
): NonNullable<WeChatBubblePreset['wechatThemePatch']> {
  const resolved = resolveWechatClassicPreset(night)
  const base = { ...(resolved.wechatThemePatch ?? {}) }
  const mode = currentRoomBg?.mode
  if (mode === 'image' || mode === 'gradient') {
    const { chatRoomDefaultBg: _keepWallpaper, ...rest } = base
    return rest
  }
  return base
}

/** 高仿 iOS iMessage：苹果蓝 + 浅灰对方 + 切角尾巴 + #f2f2f6 聊天室 */
export const IMESSAGE_BUBBLE_PRESET: WeChatBubblePreset = {
  id: 'imessage-ios',
  name: 'iMessage',
  description:
    '苹果蓝己方、#E5E5EA 对方、20px 圆角与 iOS 切角尾巴；聊天室 #f2f2f6，底部输入栏毛玻璃药丸样式。',
  bubble: {
    selfBubbleBg: '#0B93F6',
    otherBubbleBg: '#E5E5EA',
    selfBubbleRadiusPx: 20,
    otherBubbleRadiusPx: 20,
    showAvatar: false,
    avatarRadiusPx: 0,
    showBubbleTail: true,
    bubbleTailStyle: 'imessage',
    mergeConsecutiveAvatarGroup: true,
  },
  selfBubbleText: '#FFFFFF',
  otherBubbleText: '#000000',
  chatRoomDefaultBg: { mode: 'solid', color: '#F2F2F6' },
  wechatThemePatch: {
    chatRoomDefaultBg: { mode: 'solid', color: '#F2F2F6' },
    chatInputBg: 'rgba(255, 255, 255, 0.8)',
    chatInputBorder: 'rgba(0, 0, 0, 0.08)',
  },
  chatThemePatch: {
    inputBar: {
      layout: 'imessage',
      borderRadius: 999,
      borderColor: '#D1D1D6',
      backgroundColor: '#FFFFFF',
      buttonColor: '#8E8E93',
      buttonSize: 24,
      sendButtonColor: '#0B93F6',
    },
  },
}

/** 高仿 Talkmaker / KakaoTalk：暖黄己方 + 白底对方 + 底角小尾巴 + 暖蓝灰聊天室 */
export const TALKMAKER_BUBBLE_PRESET: WeChatBubblePreset = {
  id: 'talkmaker-kakao',
  name: 'Talkmaker',
  description:
    '暖黄 #FEE500 / 白底、底角小尾巴、时间戳外置；聊天室 #BACEE0，底部 Kakao 风格输入栏。',
  bubble: {
    selfBubbleBg: '#FEE500',
    otherBubbleBg: '#FFFFFF',
    selfBubbleRadiusPx: 12,
    otherBubbleRadiusPx: 12,
    showAvatar: true,
    avatarRadiusPx: 16,
    showBubbleTail: true,
    bubbleTailStyle: 'talkmaker',
    mergeConsecutiveAvatarGroup: true,
  },
  selfBubbleText: '#000000',
  otherBubbleText: '#000000',
  chatRoomDefaultBg: { mode: 'solid', color: '#BACEE0' },
  wechatThemePatch: {
    chatRoomDefaultBg: { mode: 'solid', color: '#BACEE0' },
    chatInputBg: '#FFFFFF',
    chatInputBorder: '#E5E5E5',
  },
  chatThemePatch: {
    inputBar: {
      layout: 'talkmaker',
      borderRadius: 999,
      borderColor: 'transparent',
      backgroundColor: '#F2F2F2',
      buttonColor: '#666666',
      buttonSize: 22,
      sendButtonColor: '#FEE500',
    },
  },
}

/** 高仿 Telegram 移动端：浅绿己方 + 白底对方 + 鸟喙尾巴 + 内嵌时间双勾 */
export const TELEGRAM_BUBBLE_PRESET: WeChatBubblePreset = {
  id: 'telegram-mobile',
  name: 'Telegram',
  description:
    '浅绿 #EEFFDE / 白底、12px 圆角鸟喙尾巴、微阴影与内嵌时间双勾；聊天室 #8CAABF，底部扁平输入栏。',
  bubble: {
    selfBubbleBg: '#EEFFDE',
    otherBubbleBg: '#FFFFFF',
    selfBubbleRadiusPx: 12,
    otherBubbleRadiusPx: 12,
    showAvatar: false,
    avatarRadiusPx: 0,
    showBubbleTail: true,
    bubbleTailStyle: 'telegram',
    mergeConsecutiveAvatarGroup: true,
  },
  selfBubbleText: '#000000',
  otherBubbleText: '#000000',
  chatRoomDefaultBg: { mode: 'solid', color: '#8CAABF' },
  wechatThemePatch: {
    chatRoomDefaultBg: { mode: 'solid', color: '#8CAABF' },
    chatInputBg: '#FFFFFF',
    chatInputBorder: 'transparent',
  },
  chatThemePatch: {
    inputBar: {
      layout: 'telegram',
      borderRadius: 0,
      borderColor: 'transparent',
      backgroundColor: '#FFFFFF',
      buttonColor: '#8E8E93',
      buttonSize: 24,
      sendButtonColor: '#3390EC',
    },
  },
}

/**
 * Twitter / X 私信风：经典蓝己方 + 浅灰对方 + 大圆角无尾巴。
 * 双方消息区不显示头像（顶栏胶囊才带头像）；不绑定 bubbleTailStyle。
 */
export const TWITTER_X_BUBBLE_PRESET: WeChatBubblePreset = {
  id: 'twitter-x',
  name: 'X 风格',
  description:
    '还原 X DM：#1D9BF0 己方 / #EFF3F4 对方、18px 尖角簇；消息区双方无头像；5 分钟居中时间戳、末条已读、顶栏功能钮与 +→触发回复。',
  bubble: {
    selfBubbleBg: '#1D9BF0',
    otherBubbleBg: '#EFF3F4',
    selfBubbleRadiusPx: 18,
    otherBubbleRadiusPx: 18,
    showAvatar: false,
    showAvatarOther: false,
    showAvatarSelf: false,
    avatarRadiusPx: 999,
    showBubbleTail: false,
    mergeConsecutiveAvatarGroup: true,
  },
  selfBubbleText: '#FFFFFF',
  otherBubbleText: '#0F1419',
  chatRoomDefaultBg: { mode: 'solid', color: '#FFFFFF' },
  wechatThemePatch: {
    chatRoomDefaultBg: { mode: 'solid', color: '#FFFFFF' },
    chatInputBg: '#EFF3F4',
    chatInputBorder: 'rgba(15, 20, 25, 0.08)',
  },
  chatThemePatch: {
    inputBar: {
      layout: 'twitter',
      borderRadius: 999,
      borderColor: '#CFD9DE',
      backgroundColor: '#EFF3F4',
      buttonColor: '#536471',
      buttonSize: 20,
      sendButtonColor: '#1D9BF0',
    },
  },
}

/** Twitter / X 夜间色板（勾选夜间模式 / Lights Out） */
export const TWITTER_X_NIGHT_BUBBLE_PRESET: WeChatBubblePreset = {
  ...TWITTER_X_BUBBLE_PRESET,
  id: 'twitter-x',
  name: 'X 风格',
  description: TWITTER_X_BUBBLE_PRESET.description,
  bubble: {
    ...TWITTER_X_BUBBLE_PRESET.bubble,
    selfBubbleBg: '#1D9BF0',
    otherBubbleBg: '#16181C',
  },
  selfBubbleText: '#FFFFFF',
  otherBubbleText: '#E7E9EA',
  chatRoomDefaultBg: { mode: 'solid', color: '#000000' },
  wechatThemePatch: {
    chatRoomDefaultBg: { mode: 'solid', color: '#000000' },
    chatInputBg: '#16181C',
    chatInputBorder: 'rgba(255,255,255,0.12)',
  },
  chatThemePatch: {
    inputBar: {
      layout: 'twitter',
      borderRadius: 999,
      borderColor: 'rgba(255,255,255,0.12)',
      backgroundColor: '#16181C',
      buttonColor: '#71767B',
      buttonSize: 20,
      sendButtonColor: '#1D9BF0',
    },
  },
}

export const TWITTER_X_PRESET_MARK = '--wx-twitter-preset'
export const TWITTER_X_NIGHT_MARK = '--wx-twitter-night'

export function isTwitterXPresetActive(wechatTheme?: WeChatTheme): boolean {
  return (wechatTheme?.chatSkinOverrides?.[TWITTER_X_PRESET_MARK] ?? '').trim() === '1'
}

export function isTwitterXNightMode(wechatTheme?: WeChatTheme): boolean {
  return (wechatTheme?.chatSkinOverrides?.[TWITTER_X_NIGHT_MARK] ?? '').trim() === '1'
}

export function resolveTwitterXPreset(night: boolean): WeChatBubblePreset {
  return night ? TWITTER_X_NIGHT_BUBBLE_PRESET : TWITTER_X_BUBBLE_PRESET
}

/**
 * 套用 X 日/夜主题补丁：有壁纸或渐变时不强制改成纯色底，
 * 夜间靠聊天室黑色遮罩压暗；仅纯色底才在白/黑之间切换。
 */
export function resolveTwitterXThemePatch(
  night: boolean,
  currentRoomBg?: WeChatChatRoomBg,
): NonNullable<WeChatBubblePreset['wechatThemePatch']> {
  const resolved = resolveTwitterXPreset(night)
  const base = { ...(resolved.wechatThemePatch ?? {}) }
  const mode = currentRoomBg?.mode
  if (mode === 'image' || mode === 'gradient') {
    const { chatRoomDefaultBg: _keepWallpaper, ...rest } = base
    return rest
  }
  return base
}

/** 本项目默认气泡样式，便于从预设切回 */
export const WECHAT_APP_DEFAULT_BUBBLE_PRESET: WeChatBubblePreset = {
  id: 'wechat-app-default',
  name: '简约灰蓝',
  description: '低饱和灰蓝己方 + 浅灰对方，无三角；不改聊天室背景图。',
  bubble: {
    ...DEFAULT_CUSTOMIZATION.wechatTheme.bubbleGlobal,
  },
  selfBubbleText: DEFAULT_CUSTOMIZATION.wechatTheme.selfBubbleText,
  otherBubbleText: DEFAULT_CUSTOMIZATION.wechatTheme.otherBubbleText,
  chatRoomDefaultBg: {
    mode: 'image',
    imageUrl: DEFAULT_WECHAT_CHAT_WALLPAPER_PATH,
    fallbackColor: '#EDEDED',
  },
  wechatThemePatch: {
    chatRoomDefaultBg: {
      mode: 'image',
      imageUrl: DEFAULT_WECHAT_CHAT_WALLPAPER_PATH,
      fallbackColor: '#EDEDED',
    },
    chatInputBg: DEFAULT_CUSTOMIZATION.wechatTheme.chatInputBg,
    chatInputBorder: DEFAULT_CUSTOMIZATION.wechatTheme.chatInputBorder,
  },
  chatThemePatch: {
    inputBar: {
      borderRadius: 16,
      borderColor: '#e5e5e5',
      backgroundColor: '#ffffff',
      buttonColor: '#000000',
      buttonSize: 20,
    },
  },
}

/** 与 DEFAULT_CUSTOMIZATION.wechatTheme.bubbleGlobal 形态一致（简约灰蓝） */
export function isLumiDefaultBubbleShape(bubble: WeChatBubbleTheme): boolean {
  const lumi = DEFAULT_CUSTOMIZATION.wechatTheme.bubbleGlobal
  return (
    bubble.selfBubbleBg === lumi.selfBubbleBg &&
    bubble.otherBubbleBg === lumi.otherBubbleBg &&
    bubble.selfBubbleRadiusPx === lumi.selfBubbleRadiusPx &&
    bubble.otherBubbleRadiusPx === lumi.otherBubbleRadiusPx &&
    bubble.showBubbleTail === false &&
    bubble.showAvatar === lumi.showAvatar &&
    bubble.avatarRadiusPx === lumi.avatarRadiusPx &&
    bubble.mergeConsecutiveAvatarGroup === lumi.mergeConsecutiveAvatarGroup
  )
}

/** 套用无 tail 预设或迁移：清掉残留的 Messenger bubbleTailStyle */
export function mergeWeChatBubbleGlobal(
  prev: WeChatBubbleTheme,
  patch: Partial<WeChatBubbleTheme>,
): WeChatBubbleTheme {
  const merged: WeChatBubbleTheme = { ...prev, ...patch }
  if (patch.showBubbleTail === false && !patch.bubbleTailStyle && !('bubbleTailStyle' in patch)) {
    delete merged.bubbleTailStyle
  }
  // 预设写了 showAvatar 但未声明分侧时，清掉 Twitter 等留下的 showAvatarSelf/Other:false
  if ('showAvatar' in patch) {
    if (!('showAvatarSelf' in patch)) delete merged.showAvatarSelf
    if (!('showAvatarOther' in patch)) delete merged.showAvatarOther
  }
  return migrateMislabeledLumiDefaultBubble(merged)
}

/** 旧版「简约灰蓝」误带 Messenger/wechat 尾巴；或切回默认后仍残留 tail 字段 */
export function migrateMislabeledLumiDefaultBubble(bubble: WeChatBubbleTheme): WeChatBubbleTheme {
  const lumi = DEFAULT_CUSTOMIZATION.wechatTheme.bubbleGlobal
  if (!bubble.bubbleTailStyle) return bubble
  if (isLumiDefaultBubbleShape(bubble)) {
    const { bubbleTailStyle: _removed, ...rest } = bubble
    return rest
  }
  // 颜色/圆角已是简约灰蓝，但浅合并遗留 Messenger 尾巴或 showBubbleTail
  const colorsMatchLumi =
    bubble.selfBubbleBg === lumi.selfBubbleBg &&
    bubble.otherBubbleBg === lumi.otherBubbleBg &&
    bubble.selfBubbleRadiusPx === lumi.selfBubbleRadiusPx &&
    bubble.otherBubbleRadiusPx === lumi.otherBubbleRadiusPx
  if (!colorsMatchLumi) return bubble
  // 保留用户已导入的单侧字体
  return {
    ...lumi,
    selfFont: bubble.selfFont ?? null,
    otherFont: bubble.otherFont ?? null,
  }
}

export function lumiDefaultChatInputBar(): ChatTheme['inputBar'] {
  const lumiDefaultInput = WECHAT_APP_DEFAULT_BUBBLE_PRESET.chatThemePatch?.inputBar
  return {
    borderRadius: lumiDefaultInput?.borderRadius ?? DEFAULT_CHAT_THEME.inputBar.borderRadius,
    borderColor: lumiDefaultInput?.borderColor ?? DEFAULT_CHAT_THEME.inputBar.borderColor,
    buttonSize: lumiDefaultInput?.buttonSize ?? DEFAULT_CHAT_THEME.inputBar.buttonSize,
    buttonColor: lumiDefaultInput?.buttonColor ?? DEFAULT_CHAT_THEME.inputBar.buttonColor,
    backgroundColor: lumiDefaultInput?.backgroundColor ?? DEFAULT_CHAT_THEME.inputBar.backgroundColor,
    layout: 'lumi',
  }
}

/** 无 bubbleTailStyle 的色板预设（如 Twitter/X）：靠气泡形态匹配，避免输入栏被打回简约灰蓝 */
function taillessColorPresetForBubble(
  bubble: WeChatBubbleTheme,
  wechatTheme?: WeChatTheme,
): WeChatBubblePreset | null {
  if (isTwitterXPresetActive(wechatTheme)) {
    return resolveTwitterXPreset(isTwitterXNightMode(wechatTheme))
  }
  const effective = migrateMislabeledLumiDefaultBubble(bubble)
  if (effective.bubbleTailStyle) return null
  for (const preset of WECHAT_BUBBLE_PRESETS) {
    if (preset.bubble.bubbleTailStyle) continue
    if (preset.id === 'wechat-app-default' || preset.id === 'lumi-liquid-glass') continue
    if (wechatBubbleThemesEqual(preset.bubble, effective)) return preset
    if (
      preset.id === 'twitter-x' &&
      wechatBubbleThemesEqual(TWITTER_X_NIGHT_BUBBLE_PRESET.bubble, effective)
    ) {
      return TWITTER_X_NIGHT_BUBBLE_PRESET
    }
  }
  return null
}

export const WECHAT_BUBBLE_PRESETS: WeChatBubblePreset[] = [
  WECHAT_APP_DEFAULT_BUBBLE_PRESET,
  WECHAT_APP_CLASSIC_BUBBLE_PRESET,
  IMESSAGE_BUBBLE_PRESET,
  TELEGRAM_BUBBLE_PRESET,
  TALKMAKER_BUBBLE_PRESET,
  TWITTER_X_BUBBLE_PRESET,
  LIQUID_GLASS_MINIMAL_BUBBLE_PRESET,
]

/** 需走气泡包（CSS 皮肤）套用的内置模版 id，勿用会清空 scopedCss 的 applyBubblePreset */
export const WECHAT_BUBBLE_PRESET_CSS_PACK_IDS = ['lumi-liquid-glass'] as const

export function isWeChatBubblePresetCssPackId(id: string): boolean {
  return (WECHAT_BUBBLE_PRESET_CSS_PACK_IDS as readonly string[]).includes(id)
}

export function resolveInputBarLayoutForBubble(
  bubble: WeChatBubbleTheme,
): NonNullable<ChatTheme['inputBar']['layout']> {
  const tail = migrateMislabeledLumiDefaultBubble(bubble).bubbleTailStyle
  if (tail === 'imessage') return 'imessage'
  if (tail === 'telegram') return 'telegram'
  if (tail === 'talkmaker') return 'talkmaker'
  if (tail === 'wechat') return 'wechat'
  return 'lumi'
}

function bubblePresetByTailStyle(tail: WeChatBubbleTheme['bubbleTailStyle']): WeChatBubblePreset | null {
  if (!tail) return null
  return WECHAT_BUBBLE_PRESETS.find((preset) => preset.bubble.bubbleTailStyle === tail) ?? null
}

/** 输入栏与当前气泡模版对齐，避免 Lumi 简约灰蓝气泡仍显示 Messenger 输入栏 */
export function resolveEffectiveChatInputBarForBubble(
  inputBar: ChatTheme['inputBar'],
  bubble: WeChatBubbleTheme,
  wechatTheme?: WeChatTheme,
): ChatTheme['inputBar'] {
  // CSS 液态玻璃等：保留已写入的透明毛玻璃输入栏，不要打回简约灰蓝默认
  if (wechatTheme && isLiquidGlassMinimalPackActive(wechatTheme)) {
    const packInput = LIQUID_GLASS_MINIMAL_BUBBLE_PRESET.chatThemePatch?.inputBar
    return {
      ...inputBar,
      layout: 'lumi',
      borderRadius: packInput?.borderRadius ?? 999,
      borderColor: packInput?.borderColor ?? 'transparent',
      backgroundColor: packInput?.backgroundColor ?? 'transparent',
      buttonColor: packInput?.buttonColor ?? inputBar.buttonColor,
      buttonSize: packInput?.buttonSize ?? inputBar.buttonSize,
      sendButtonColor: undefined,
    }
  }

  if (isTwitterXPresetActive(wechatTheme)) {
    const ti = resolveTwitterXPreset(isTwitterXNightMode(wechatTheme)).chatThemePatch?.inputBar
    return {
      ...inputBar,
      layout: 'twitter',
      borderRadius: ti?.borderRadius ?? 999,
      borderColor: ti?.borderColor ?? inputBar.borderColor,
      backgroundColor: ti?.backgroundColor ?? inputBar.backgroundColor,
      buttonColor: ti?.buttonColor ?? inputBar.buttonColor,
      buttonSize: ti?.buttonSize ?? inputBar.buttonSize,
      sendButtonColor: ti?.sendButtonColor ?? inputBar.sendButtonColor,
    }
  }

  if (isWechatClassicPresetActive(wechatTheme)) {
    const wi = resolveWechatClassicPreset(isWechatClassicNightMode(wechatTheme)).chatThemePatch?.inputBar
    return {
      ...inputBar,
      layout: 'wechat',
      borderRadius: wi?.borderRadius ?? 6,
      borderColor: wi?.borderColor ?? inputBar.borderColor,
      backgroundColor: wi?.backgroundColor ?? inputBar.backgroundColor,
      buttonColor: wi?.buttonColor ?? inputBar.buttonColor,
      buttonSize: wi?.buttonSize ?? inputBar.buttonSize,
      sendButtonColor: undefined,
    }
  }

  const effectiveBubble = migrateMislabeledLumiDefaultBubble(bubble)
  const layout = resolveInputBarLayoutForBubble(effectiveBubble)
  const presetInput = bubblePresetByTailStyle(effectiveBubble.bubbleTailStyle)?.chatThemePatch?.inputBar

  if (!effectiveBubble.bubbleTailStyle) {
    const tailless = taillessColorPresetForBubble(effectiveBubble, wechatTheme)
    const ti = tailless?.chatThemePatch?.inputBar
    if (ti) {
      return {
        ...inputBar,
        layout: ti.layout ?? 'lumi',
        borderRadius: ti.borderRadius ?? inputBar.borderRadius,
        borderColor: ti.borderColor ?? inputBar.borderColor,
        buttonSize: ti.buttonSize ?? inputBar.buttonSize,
        buttonColor: ti.buttonColor ?? inputBar.buttonColor,
        backgroundColor: ti.backgroundColor ?? inputBar.backgroundColor,
        sendButtonColor: ti.sendButtonColor ?? inputBar.sendButtonColor,
      }
    }
    return lumiDefaultChatInputBar()
  }

  return {
    ...inputBar,
    layout,
    borderRadius: presetInput?.borderRadius ?? inputBar.borderRadius,
    borderColor: presetInput?.borderColor ?? inputBar.borderColor,
    buttonSize: presetInput?.buttonSize ?? inputBar.buttonSize,
    buttonColor: presetInput?.buttonColor ?? inputBar.buttonColor,
    backgroundColor: presetInput?.backgroundColor ?? inputBar.backgroundColor,
    sendButtonColor: presetInput?.sendButtonColor ?? inputBar.sendButtonColor,
  }
}

/** 美化预览顶栏/输入栏底色与当前气泡模版一致 */
export function resolvePreviewWechatThemeForBubble(
  wechatTheme: WeChatTheme,
  bubble: WeChatBubbleTheme,
): WeChatTheme {
  if (isLiquidGlassMinimalPackActive(wechatTheme)) {
    return {
      ...wechatTheme,
      ...(LIQUID_GLASS_MINIMAL_BUBBLE_PRESET.wechatThemePatch ?? {}),
    }
  }
  if (isTwitterXPresetActive(wechatTheme)) {
    return {
      ...wechatTheme,
      ...resolveTwitterXThemePatch(
        isTwitterXNightMode(wechatTheme),
        wechatTheme.chatRoomDefaultBg,
      ),
    }
  }
  if (isWechatClassicPresetActive(wechatTheme)) {
    return {
      ...wechatTheme,
      ...resolveWechatClassicThemePatch(
        isWechatClassicNightMode(wechatTheme),
        wechatTheme.chatRoomDefaultBg,
      ),
    }
  }
  const effectiveBubble = migrateMislabeledLumiDefaultBubble(bubble)
  if (!effectiveBubble.bubbleTailStyle) {
    const tailless = taillessColorPresetForBubble(effectiveBubble, wechatTheme)
    if (tailless?.wechatThemePatch) {
      return { ...wechatTheme, ...tailless.wechatThemePatch }
    }
    return {
      ...wechatTheme,
      chatInputBg: DEFAULT_CUSTOMIZATION.wechatTheme.chatInputBg,
      chatInputBorder: DEFAULT_CUSTOMIZATION.wechatTheme.chatInputBorder,
    }
  }
  const presetPatch = bubblePresetByTailStyle(effectiveBubble.bubbleTailStyle)?.wechatThemePatch
  return presetPatch ? { ...wechatTheme, ...presetPatch } : wechatTheme
}

export function wechatBubblePresetMatchesActive(
  preset: WeChatBubblePreset,
  activeBubble: WeChatBubbleTheme,
  selfBubbleText: string,
  otherBubbleText: string,
  wechatTheme?: WeChatTheme,
  _bubbleScope: 'global' | 'role' = 'global',
): boolean {
  // 液态玻璃等 CSS 皮肤：以 CSS 标记为准
  if (preset.id === 'lumi-liquid-glass' && wechatTheme) {
    return Boolean(wechatTheme.chatSkinScopedCss?.includes('lumi-liquid-glass'))
  }
  if (preset.id === 'twitter-x' && wechatTheme) {
    return isTwitterXPresetActive(wechatTheme)
  }
  if (preset.id === 'wechat-app-classic' && wechatTheme) {
    if (isWechatClassicPresetActive(wechatTheme)) return true
    // 兼容未写标记的旧套用：按日/夜色板形态匹配
    if (
      wechatBubbleThemesEqual(WECHAT_APP_CLASSIC_NIGHT_BUBBLE_PRESET.bubble, activeBubble) &&
      WECHAT_APP_CLASSIC_NIGHT_BUBBLE_PRESET.selfBubbleText === selfBubbleText &&
      WECHAT_APP_CLASSIC_NIGHT_BUBBLE_PRESET.otherBubbleText === otherBubbleText
    ) {
      return true
    }
  }
  if (
    !wechatBubbleThemesEqual(preset.bubble, activeBubble) ||
    preset.selfBubbleText !== selfBubbleText ||
    preset.otherBubbleText !== otherBubbleText
  ) {
    return false
  }
  // 套用模版不再改聊天室背景，匹配时也不再要求背景一致
  return true
}
