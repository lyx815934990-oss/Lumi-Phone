/**
 * 内置预设：简约液态玻璃（纯 CSS 皮肤）
 * 覆盖文字气泡、顶栏、输入栏、加号功能面板，以及红包 / 转账 / 语音 / 位置 / 通话 / 收藏 / 听一听。
 *
 * 注意：scopedCss 会经 normalize 去掉 `[data-wx-chat-skin-scope]` 前缀再包进 `@scope`，
 * 因此变量必须写在 `:scope { }`，禁止再写 `[data-wx-chat-skin-scope] { --x }`（会变成非法孤立块）。
 */

import type { WeChatBubblePreset } from '../wechatBubblePresets'
import { LUMI_BUBBLE_PACK_FORMAT, LUMI_BUBBLE_PACK_VERSION, type LumiWeChatBubblePack } from './types'

export const LIQUID_GLASS_MINIMAL_PRESET_ID = 'lumi-liquid-glass' as const

const ROOM_BG = '#E8EAEF'
const INK = '#101012'
const MIST = '#6B6B70'
/** iOS 液态玻璃：半透明底 + 轻量模糊（过重 blur 滚动会闪，过轻则看不出玻璃） */
const GLASS = 'rgba(255, 255, 255, 0.34)'
const GLASS_STRONG = 'rgba(255, 255, 255, 0.42)'
const GLASS_SELF = 'rgba(255, 255, 255, 0.40)'
const GLASS_BORDER = 'rgba(255, 255, 255, 0.72)'
/** 外阴影抬升 + 顶/左侧高光描边（曲面玻璃反光） */
const GLASS_SHADOW =
  '0 12px 40px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -0.5px 0 rgba(255, 255, 255, 0.22), inset 1px 0 0 rgba(255, 255, 255, 0.4)'
/** 气泡专用：边缘只留一丢丢高光，不抢戏 */
const BUBBLE_SHADOW =
  '0 8px 22px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.78), inset 1px 0 0 rgba(255, 255, 255, 0.3)'
/** 顶栏/输入栏：较强模糊 */
const BLUR = 'blur(28px) saturate(175%)'
/** 列表气泡：中等模糊，保留透底玻璃感，又比 40px 稳得多 */
const BLUR_BUBBLE = 'blur(16px) saturate(165%)'
const CAPSULE = '999px'
const CARD_R = '999px'
const SPECULAR =
  'linear-gradient(155deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.18) 34%, rgba(255,255,255,0.04) 52%, rgba(255,255,255,0) 68%)'
/** 气泡高光：极轻顶部反光 */
const BUBBLE_SPECULAR =
  'linear-gradient(158deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.14) 24%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0) 70%)'
const ACCENT_RP = '#E5484D'
const ACCENT_TF = '#2F6FED'
const ACCENT_LISTEN = '#1C1C1E'

/** 模版卡片预览用（套用时 CSS 引擎会强制气泡透明） */
export const LIQUID_GLASS_MINIMAL_BUBBLE_PRESET: WeChatBubblePreset = {
  id: LIQUID_GLASS_MINIMAL_PRESET_ID,
  name: '液态玻璃',
  description:
    '对标 iOS 液态玻璃：全胶囊磨砂气泡、顶栏 iMessage 式渐隐过渡、输入栏高光描边与强背景模糊。',
  bubble: {
    selfBubbleBg: 'rgba(255,255,255,0.40)',
    otherBubbleBg: 'rgba(255,255,255,0.34)',
    selfBubbleRadiusPx: 28,
    otherBubbleRadiusPx: 28,
    showAvatar: true,
    avatarRadiusPx: 999,
    showBubbleTail: false,
    showBubbleTailSelf: true,
    showBubbleTailOther: true,
    glassBubbleStyleSelf: true,
    glassBubbleStyleOther: true,
    mergeConsecutiveAvatarGroup: true,
  },
  selfBubbleText: INK,
  otherBubbleText: INK,
  chatRoomDefaultBg: { mode: 'solid', color: ROOM_BG },
  wechatThemePatch: {
    // 不写 chatRoomDefaultBg：套用皮肤时保留用户已设的默认聊天壁纸 / 上传图
    chatInputBg: 'transparent',
    chatInputBorder: 'transparent',
  },
  chatThemePatch: {
    inputBar: {
      layout: 'lumi',
      borderRadius: 999,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      buttonColor: INK,
      buttonSize: 22,
    },
  },
}

/** 完整 scopedCss（写入后会进 @scope；变量用 :scope） */
export const LIQUID_GLASS_MINIMAL_SCOPED_CSS = `/* lumi-liquid-glass — iOS liquid glass v2 (lumi-liquid-glass-ios-v14) */

:scope {
  --lg-ink: ${INK};
  --lg-mist: ${MIST};
  --lg-glass: ${GLASS};
  --lg-glass-strong: ${GLASS_STRONG};
  --lg-glass-self: ${GLASS_SELF};
  --lg-border: ${GLASS_BORDER};
  --lg-shadow: ${GLASS_SHADOW};
  --lg-bubble-shadow: ${BUBBLE_SHADOW};
  --lg-blur: ${BLUR};
  --lg-bubble-blur: ${BLUR_BUBBLE};
  --lg-capsule: ${CAPSULE};
  --lg-card-r: ${CARD_R};
  --lg-specular: ${SPECULAR};
  --lg-bubble-specular: ${BUBBLE_SPECULAR};
  --lg-rp: ${ACCENT_RP};
  --lg-tf: ${ACCENT_TF};
  --lg-listen: ${ACCENT_LISTEN};
}

/* —— 顶区：长距柔和渐隐（上磨砂 + 下纯渐变，避免硬切） —— */
[data-wx-liquid-header-fade] {
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  top: 0 !important;
  height: calc(env(safe-area-inset-top, 0px) + 168px) !important;
  pointer-events: none !important;
  z-index: 0 !important;
  overflow: hidden !important;
  background: transparent !important;
}
/* 磨砂层：透明度很长、很慢地衰减，不在中段突然没掉 */
[data-wx-liquid-header-fade]::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  pointer-events: none !important;
  backdrop-filter: blur(22px) saturate(165%) !important;
  -webkit-backdrop-filter: blur(22px) saturate(165%) !important;
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 0%,
    rgba(0, 0, 0, 0.96) 12%,
    rgba(0, 0, 0, 0.82) 28%,
    rgba(0, 0, 0, 0.58) 44%,
    rgba(0, 0, 0, 0.32) 60%,
    rgba(0, 0, 0, 0.14) 74%,
    rgba(0, 0, 0, 0.05) 88%,
    transparent 100%
  ) !important;
  mask-image: linear-gradient(
    to bottom,
    #000 0%,
    rgba(0, 0, 0, 0.96) 12%,
    rgba(0, 0, 0, 0.82) 28%,
    rgba(0, 0, 0, 0.58) 44%,
    rgba(0, 0, 0, 0.32) 60%,
    rgba(0, 0, 0, 0.14) 74%,
    rgba(0, 0, 0, 0.05) 88%,
    transparent 100%
  ) !important;
}
/* 色雾层：纯渐变托底，把 blur 硬边柔化成连续溶入 */
[data-wx-liquid-header-fade]::after {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  pointer-events: none !important;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.52) 0%,
    rgba(255, 255, 255, 0.38) 16%,
    rgba(255, 255, 255, 0.24) 34%,
    rgba(255, 255, 255, 0.12) 52%,
    rgba(255, 255, 255, 0.055) 70%,
    rgba(255, 255, 255, 0.018) 86%,
    rgba(255, 255, 255, 0) 100%
  ) !important;
}
[data-phone-page="wechat"][data-wx-liquid-glass] [data-wx-liquid-header-fade],
[data-wx-liquid-glass] [data-wx-liquid-header-fade] {
  background: transparent !important;
}

/* —— 顶栏：悬浮胶囊（落在渐隐层之上） —— */
[data-wx-chat-header] {
  position: relative !important;
  z-index: 1 !important;
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  isolation: isolate !important;
  width: calc(100% - 24px) !important;
  max-width: calc(100% - 24px) !important;
  margin: max(10px, calc(env(safe-area-inset-top, 0px) + 8px)) 12px 0 !important;
  padding: 6px 8px !important;
  min-height: 48px !important;
  height: auto !important;
  border-radius: 999px !important;
  border: 0.5px solid ${GLASS_BORDER} !important;
  border-bottom: 0.5px solid ${GLASS_BORDER} !important;
  background: rgba(255, 255, 255, 0.36) !important;
  background-color: rgba(255, 255, 255, 0.36) !important;
  backdrop-filter: blur(32px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(180%) !important;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -0.5px 0 rgba(255, 255, 255, 0.2),
    inset 1px 0 0 rgba(255, 255, 255, 0.36) !important;
  color: ${INK} !important;
  overflow: hidden !important;
  gap: 4px !important;
  transform: translateZ(0) !important;
}
[data-wx-chat-header]::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  z-index: 1 !important;
  background: ${SPECULAR} !important;
}
[data-phone-page="wechat"][data-wx-liquid-glass] [data-wx-chat-header],
[data-wx-liquid-glass] [data-wx-chat-header] {
  background: rgba(255, 255, 255, 0.36) !important;
  background-color: rgba(255, 255, 255, 0.36) !important;
  border-radius: 999px !important;
  border: 0.5px solid ${GLASS_BORDER} !important;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -0.5px 0 rgba(255, 255, 255, 0.2),
    inset 1px 0 0 rgba(255, 255, 255, 0.36) !important;
}
/* 背景层必须保持 absolute，切勿被改成 relative（会把标题挤出胶囊） */
[data-wx-chat-header-surface="image"],
[data-wx-chat-header-surface="overlay"] {
  position: absolute !important;
  inset: 0 !important;
  z-index: 0 !important;
  opacity: 0 !important;
  background: transparent !important;
  border-radius: inherit !important;
  pointer-events: none !important;
}
[data-wx-chat-header-title-wrap] {
  position: relative !important;
  z-index: 2 !important;
  flex: 1 1 0% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
  padding-left: 2px !important;
  padding-right: 2px !important;
}
[data-wx-chat-header-title] {
  color: ${INK} !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
[data-wx-chat-header-sub] {
  color: ${MIST} !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
[data-wx-chat-header-btn="back"],
[data-wx-chat-header-btn="time"],
[data-wx-chat-header-btn="psyche"],
[data-wx-chat-header-btn="more"] {
  position: relative !important;
  z-index: 2 !important;
  color: ${INK} !important;
  width: 36px !important;
  height: 36px !important;
  flex-shrink: 0 !important;
  border-radius: 999px !important;
  background: rgba(255, 255, 255, 0.28) !important;
  background-color: rgba(255, 255, 255, 0.28) !important;
  border: 0.5px solid rgba(255, 255, 255, 0.5) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 2px 8px rgba(0, 0, 0, 0.05) !important;
  backdrop-filter: blur(20px) saturate(170%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(170%) !important;
}
[data-wx-chat-header-avatar] {
  display: inline-flex !important;
  flex-shrink: 0 !important;
  border-radius: 999px !important;
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.85), 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}

/* —— 时间戳 —— */
[data-wx-timestamp] {
  color: ${MIST} !important;
  font-size: 11px !important;
  letter-spacing: 0.04em !important;
  background: rgba(255, 255, 255, 0.28) !important;
  backdrop-filter: blur(24px) saturate(170%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(170%) !important;
  border-radius: 999px !important;
  padding: 4px 11px !important;
  border: 0.5px solid rgba(255, 255, 255, 0.5) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 4px 14px rgba(0, 0, 0, 0.06) !important;
}

/* —— 文字气泡：全胶囊 + 轻量真实磨砂（透出壁纸） —— */
[data-wx-bubble-content] {
  position: relative !important;
  isolation: isolate !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  background: ${GLASS} !important;
  background-color: ${GLASS} !important;
  color: ${INK} !important;
  border: 1px solid rgba(255, 255, 255, 0.52) !important;
  border-radius: 999px !important;
  box-shadow: ${BUBBLE_SHADOW} !important;
  backdrop-filter: ${BLUR_BUBBLE} !important;
  -webkit-backdrop-filter: ${BLUR_BUBBLE} !important;
  padding: 11px 17px !important;
}
[data-wx-bubble-content]::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  z-index: 1 !important;
  background: ${BUBBLE_SPECULAR} !important;
}
[data-wx-bubble-content]::after {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  z-index: 1 !important;
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.24),
    inset 0 1px 2px rgba(255, 255, 255, 0.18) !important;
}
[data-wx-bubble-side="self"] [data-wx-bubble-content],
[data-wx-bubble-side="self"][data-wx-bubble-content] {
  background: ${GLASS_SELF} !important;
  background-color: ${GLASS_SELF} !important;
  border-color: rgba(255, 255, 255, 0.58) !important;
  box-shadow:
    0 8px 22px rgba(0, 0, 0, 0.1),
    0 1px 4px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    inset 1px 0 0 rgba(255, 255, 255, 0.34) !important;
}
[data-wx-bubble-text] {
  position: relative !important;
  z-index: 3 !important;
  color: ${INK} !important;
}
[data-wx-bubble-content] [data-wx-bubble-face],
[data-wx-bubble-content] [data-wx-bubble-edge-stickers],
[data-wx-bubble-content] [data-wx-bubble-frame] {
  z-index: 2 !important;
}

/* 分侧关闭玻璃表面 → 实心浅底（颜色仍可被主题变量微调） */
:scope[data-wx-lg-glass-other="0"] [data-wx-bubble-side="other"] [data-wx-bubble-content],
:scope[data-wx-lg-glass-other="0"] [data-wx-bubble-side="other"][data-wx-bubble-content] {
  background: #eeeff2 !important;
  background-color: #eeeff2 !important;
  border: 1px solid rgba(16, 16, 18, 0.06) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:scope[data-wx-lg-glass-other="0"] [data-wx-bubble-side="other"] [data-wx-bubble-content]::before,
:scope[data-wx-lg-glass-other="0"] [data-wx-bubble-side="other"] [data-wx-bubble-content]::after {
  display: none !important;
}
:scope[data-wx-lg-glass-self="0"] [data-wx-bubble-side="self"] [data-wx-bubble-content],
:scope[data-wx-lg-glass-self="0"] [data-wx-bubble-side="self"][data-wx-bubble-content] {
  background: #ffffff !important;
  background-color: #ffffff !important;
  border: 1px solid rgba(16, 16, 18, 0.06) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:scope[data-wx-lg-glass-self="0"] [data-wx-bubble-side="self"] [data-wx-bubble-content]::before,
:scope[data-wx-lg-glass-self="0"] [data-wx-bubble-side="self"] [data-wx-bubble-content]::after {
  display: none !important;
}

/* 尾巴：默认隐藏；data-wx-lg-tail=1 时显示玻璃色三角 */
[data-wx-bubble-tail] {
  display: none !important;
  opacity: 0 !important;
}
:scope[data-wx-lg-tail="1"] [data-wx-bubble-tail] {
  display: block !important;
  opacity: 1 !important;
  filter: drop-shadow(0 2px 8px rgba(16, 16, 18, 0.1));
}
:scope[data-wx-lg-tail="1"] [data-wx-bubble-side="other"] [data-wx-bubble-tail] {
  color: ${GLASS} !important;
}
:scope[data-wx-lg-tail="1"] [data-wx-bubble-side="self"] [data-wx-bubble-tail] {
  color: ${GLASS_SELF} !important;
}
:scope[data-wx-lg-tail="1"][data-wx-lg-glass-other="0"] [data-wx-bubble-side="other"] [data-wx-bubble-tail] {
  color: #eeeff2 !important;
}
:scope[data-wx-lg-tail="1"][data-wx-lg-glass-self="0"] [data-wx-bubble-side="self"] [data-wx-bubble-tail] {
  color: #ffffff !important;
}

/* —— 输入区：无固定底栏，仅悬浮组件 —— */
[data-wx-chat-input-bar],
[data-wx-chat-input-bar][data-wx-liquid-input] {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border: 0 !important;
  border-top: 0 !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-wx-chat-input-bar]::before,
[data-wx-chat-input-bar]::after {
  content: none !important;
  display: none !important;
}
[data-wx-chat-input-shell] {
  position: relative !important;
  isolation: isolate !important;
  overflow: hidden !important;
  background: ${GLASS_STRONG} !important;
  background-color: ${GLASS_STRONG} !important;
  border: 0.5px solid ${GLASS_BORDER} !important;
  border-radius: ${CAPSULE} !important;
  box-shadow: ${GLASS_SHADOW} !important;
  backdrop-filter: ${BLUR} !important;
  -webkit-backdrop-filter: ${BLUR} !important;
  color: ${INK} !important;
  min-height: 44px !important;
  transform: translateZ(0) !important;
}
[data-wx-chat-input-shell]::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  z-index: 0 !important;
  background: ${SPECULAR} !important;
}
[data-wx-chat-input-shell] input,
[data-wx-chat-input-shell] textarea {
  position: relative !important;
  z-index: 1 !important;
  color: ${INK} !important;
  background: transparent !important;
}
[data-wx-chat-input-shell] input::placeholder,
[data-wx-chat-input-shell] textarea::placeholder {
  color: ${MIST} !important;
}
[data-wx-chat-input-btn="voice"],
[data-wx-chat-input-btn="emoji"],
[data-wx-chat-input-btn="plus"],
[data-wx-chat-input-btn="send"] {
  position: relative !important;
  isolation: isolate !important;
  overflow: hidden !important;
  color: ${INK} !important;
  border-radius: 999px !important;
  background: ${GLASS_STRONG} !important;
  border: 0.5px solid ${GLASS_BORDER} !important;
  box-shadow: ${GLASS_SHADOW} !important;
  backdrop-filter: ${BLUR} !important;
  -webkit-backdrop-filter: ${BLUR} !important;
  width: 40px !important;
  height: 40px !important;
  transform: translateZ(0) !important;
}
[data-wx-chat-input-btn="voice"]::before,
[data-wx-chat-input-btn="emoji"]::before,
[data-wx-chat-input-btn="plus"]::before,
[data-wx-chat-input-btn="send"]::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  background: ${SPECULAR} !important;
  z-index: 0 !important;
}
[data-wx-chat-input-btn="voice"] > *,
[data-wx-chat-input-btn="emoji"] > *,
[data-wx-chat-input-btn="plus"] > *,
[data-wx-chat-input-btn="send"] > * {
  position: relative !important;
  z-index: 1 !important;
}
/* 发送键：可按 = 亮磨砂高光；不可按 = 淡磨砂 + 雾色图标（勿实心黑） */
[data-wx-chat-input-btn="send"]:not(:disabled) {
  background: rgba(255, 255, 255, 0.72) !important;
  background-color: rgba(255, 255, 255, 0.72) !important;
  color: ${INK} !important;
  border-color: rgba(255, 255, 255, 0.92) !important;
  box-shadow:
    0 10px 28px rgba(16, 16, 18, 0.12),
    0 2px 8px rgba(16, 16, 18, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 1),
    inset 0 -0.5px 0 rgba(255, 255, 255, 0.35),
    inset 1px 0 0 rgba(255, 255, 255, 0.55) !important;
  opacity: 1 !important;
}
[data-wx-chat-input-btn="send"]:not(:disabled)::before {
  background: linear-gradient(
    155deg,
    rgba(255, 255, 255, 0.78) 0%,
    rgba(255, 255, 255, 0.22) 36%,
    rgba(255, 255, 255, 0.04) 58%,
    transparent 72%
  ) !important;
}
[data-wx-chat-input-btn="send"]:disabled {
  background: rgba(255, 255, 255, 0.28) !important;
  background-color: rgba(255, 255, 255, 0.28) !important;
  color: ${MIST} !important;
  border-color: rgba(255, 255, 255, 0.48) !important;
  box-shadow:
    0 6px 16px rgba(16, 16, 18, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
  opacity: 0.78 !important;
  pointer-events: none !important;
}
[data-wx-chat-input-btn="send"]:disabled::before {
  background: linear-gradient(
    155deg,
    rgba(255, 255, 255, 0.32) 0%,
    rgba(255, 255, 255, 0.08) 42%,
    transparent 68%
  ) !important;
}
[data-wx-chat-input-btn="send"] svg {
  stroke: currentColor !important;
  color: inherit !important;
}

/* —— 加号功能面板（与输入栏同款毛玻璃；关闭时整块卸载，勿留边） —— */
[data-wx-chat-plus-panel] {
  background: transparent !important;
  background-color: transparent !important;
  border: 0 !important;
  border-top: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  padding: 0 !important;
  margin: 0 !important;
}
[data-wx-chat-plus-panel][data-wx-plus-open] {
  padding: 0 2px 6px !important;
}
[data-wx-chat-plus-panel][data-wx-plus-open] [data-wx-plus-menu-surface] {
  position: relative !important;
  isolation: isolate !important;
  background: ${GLASS_STRONG} !important;
  background-color: ${GLASS_STRONG} !important;
  backdrop-filter: ${BLUR} !important;
  -webkit-backdrop-filter: ${BLUR} !important;
  border: 0.5px solid ${GLASS_BORDER} !important;
  border-radius: 28px !important;
  box-shadow: ${GLASS_SHADOW} !important;
  overflow: hidden !important;
  transform: translateZ(0) !important;
}
[data-wx-chat-plus-panel][data-wx-plus-open] [data-wx-plus-menu-surface]::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  z-index: 0 !important;
  background: ${SPECULAR} !important;
}
[data-wx-plus-menu-surface] {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}
[data-wx-chat-plus-panel][data-wx-plus-open] [data-wx-plus-tile] {
  position: relative !important;
  z-index: 1 !important;
  background: rgba(255, 255, 255, 0.34) !important;
  background-color: rgba(255, 255, 255, 0.34) !important;
  border: 0.5px solid rgba(255, 255, 255, 0.55) !important;
  border-radius: 18px !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(24px) saturate(170%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(170%) !important;
  color: ${INK} !important;
}
[data-wx-chat-plus-panel] [data-wx-plus-label],
[data-wx-plus-menu-surface] [data-wx-plus-label] {
  position: relative !important;
  z-index: 1 !important;
  color: ${MIST} !important;
}
[data-wx-chat-plus-panel] [data-wx-plus-dot="active"],
[data-wx-plus-menu-surface] [data-wx-plus-dot="active"] {
  background-color: ${INK} !important;
}
[data-wx-chat-plus-panel] [data-wx-plus-dot="idle"],
[data-wx-plus-menu-surface] [data-wx-plus-dot="idle"] {
  background-color: rgba(16, 16, 18, 0.22) !important;
}
[data-wx-chat-plus-panel] svg,
[data-wx-plus-menu-surface] svg {
  color: ${INK} !important;
  stroke: ${INK} !important;
}

/* —— 特殊卡通用玻璃底（圆角卡片，非全胶囊以免地图卡变形） —— */
[data-wx-msg-kind="transfer"][data-wx-special-card],
[data-wx-msg-kind="red-packet"][data-wx-special-card],
[data-wx-msg-kind="location"][data-wx-special-card],
[data-wx-msg-kind="favorite"][data-wx-special-card],
[data-wx-msg-kind="voice"][data-wx-special-card],
[data-wx-msg-kind="voice-call"][data-wx-special-card],
[data-wx-msg-kind="listen-together"][data-wx-special-card] {
  position: relative !important;
  isolation: isolate !important;
  box-sizing: border-box !important;
  background: ${GLASS_STRONG} !important;
  background-color: ${GLASS_STRONG} !important;
  border: 0.5px solid ${GLASS_BORDER} !important;
  border-radius: 24px !important;
  box-shadow: ${GLASS_SHADOW} !important;
  backdrop-filter: ${BLUR_BUBBLE} !important;
  -webkit-backdrop-filter: ${BLUR_BUBBLE} !important;
  color: ${INK} !important;
  overflow: hidden !important;
}
[data-wx-msg-kind="transfer"][data-wx-special-card]::before,
[data-wx-msg-kind="red-packet"][data-wx-special-card]::before,
[data-wx-msg-kind="location"][data-wx-special-card]::before,
[data-wx-msg-kind="favorite"][data-wx-special-card]::before,
[data-wx-msg-kind="voice"][data-wx-special-card]::before,
[data-wx-msg-kind="voice-call"][data-wx-special-card]::before,
[data-wx-msg-kind="listen-together"][data-wx-special-card]::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  pointer-events: none !important;
  z-index: 0 !important;
  background: ${SPECULAR} !important;
}
[data-wx-msg-kind="transfer"][data-wx-special-card] > *,
[data-wx-msg-kind="red-packet"][data-wx-special-card] > *,
[data-wx-msg-kind="location"][data-wx-special-card] > *,
[data-wx-msg-kind="favorite"][data-wx-special-card] > *,
[data-wx-msg-kind="voice"][data-wx-special-card] > *,
[data-wx-msg-kind="voice-call"][data-wx-special-card] > *,
[data-wx-msg-kind="listen-together"][data-wx-special-card] > * {
  position: relative !important;
  z-index: 1 !important;
}

/* —— 语音 —— */
[data-wx-msg-kind="voice"][data-wx-special-card] {
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 10px 14px !important;
  min-width: 112px !important;
  border-radius: ${CAPSULE} !important;
}
[data-wx-msg-kind="voice"] [data-wx-special-part="play"] {
  display: inline-flex !important;
  width: 28px !important;
  height: 28px !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 999px !important;
  background: rgba(16, 16, 18, 0.08) !important;
  color: ${INK} !important;
  flex-shrink: 0 !important;
}
[data-wx-msg-kind="voice"] [data-wx-special-part="wave"] {
  display: block !important;
  flex: 1 1 auto !important;
  height: 14px !important;
  min-width: 48px !important;
  border-radius: 999px !important;
  background:
    repeating-linear-gradient(
      90deg,
      rgba(16, 16, 18, 0.28) 0 2px,
      transparent 2px 5px
    ) !important;
  opacity: 0.7 !important;
}
[data-wx-msg-kind="voice"] [data-wx-special-part="status"] {
  font-size: 12px !important;
  color: ${MIST} !important;
  font-variant-numeric: tabular-nums !important;
  flex-shrink: 0 !important;
}
[data-wx-msg-kind="voice"][data-wx-bubble-side="self"] {
  background: ${GLASS_SELF} !important;
}
[data-wx-special-part="transcript-toggle"] {
  border: 0.5px solid rgba(255, 255, 255, 0.55) !important;
  background: rgba(255, 255, 255, 0.42) !important;
  backdrop-filter: blur(12px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(160%) !important;
  color: ${MIST} !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7) !important;
}
/* 语音转文字：独立圆角卡片 */
[data-wx-voice-transcript] {
  border-radius: 22px !important;
  border: 0.5px solid rgba(255, 255, 255, 0.55) !important;
  background: rgba(255, 255, 255, 0.4) !important;
  backdrop-filter: ${BLUR_BUBBLE} !important;
  -webkit-backdrop-filter: ${BLUR_BUBBLE} !important;
  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.75) !important;
  overflow: hidden !important;
}
/* 气泡内引用条：同气泡胶囊圆角 */
[data-wx-bubble-reply] {
  border-radius: 999px !important;
  background: rgba(16, 16, 18, 0.06) !important;
  border: 0.5px solid rgba(255, 255, 255, 0.35) !important;
  padding: 7px 12px !important;
}

/* —— 红包 —— */
[data-wx-msg-kind="red-packet"][data-wx-special-card] {
  padding: 14px 14px 0 !important;
  width: min(240px, 72vw) !important;
}
[data-wx-msg-kind="red-packet"] [data-wx-special-part="icon"] {
  display: block !important;
  width: 36px !important;
  height: 36px !important;
  border-radius: 12px !important;
  background: linear-gradient(145deg, #ff6b6b, ${ACCENT_RP}) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
  margin-bottom: 10px !important;
  position: relative !important;
}
[data-wx-msg-kind="red-packet"] [data-wx-special-part="icon"]::after {
  content: "¥" !important;
  position: absolute !important;
  inset: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #fff !important;
  font-size: 16px !important;
  font-weight: 700 !important;
}
[data-wx-msg-kind="red-packet"] [data-wx-special-part="label"] {
  margin: 0 !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  color: ${INK} !important;
  line-height: 1.35 !important;
}
[data-wx-msg-kind="red-packet"] [data-wx-special-part="status"] {
  margin: 4px 0 12px !important;
  font-size: 12px !important;
  color: ${MIST} !important;
}
[data-wx-msg-kind="red-packet"] [data-wx-special-part="footer"] {
  margin: 0 -14px !important;
  padding: 8px 14px !important;
  font-size: 11px !important;
  letter-spacing: 0.08em !important;
  color: ${MIST} !important;
  border-top: 1px solid rgba(16, 16, 18, 0.06) !important;
  background: rgba(255, 255, 255, 0.28) !important;
}
[data-wx-msg-kind="red-packet"][data-wx-special-status="claimed"],
[data-wx-msg-kind="red-packet"][data-wx-special-status="expired"] {
  opacity: 0.78 !important;
}

/* —— 转账 —— */
[data-wx-msg-kind="transfer"][data-wx-special-card] {
  padding: 14px 14px 0 !important;
  width: min(230px, 72vw) !important;
}
[data-wx-msg-kind="transfer"] [data-wx-special-part="icon"] {
  display: block !important;
  width: 36px !important;
  height: 36px !important;
  border-radius: 999px !important;
  background: linear-gradient(145deg, #5b8cff, ${ACCENT_TF}) !important;
  margin-bottom: 10px !important;
  position: relative !important;
}
[data-wx-msg-kind="transfer"] [data-wx-special-part="icon"]::after {
  content: "⇄" !important;
  position: absolute !important;
  inset: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #fff !important;
  font-size: 15px !important;
  font-weight: 600 !important;
}
[data-wx-msg-kind="transfer"] [data-wx-special-part="amount"] {
  margin: 0 !important;
  font-size: 22px !important;
  font-weight: 650 !important;
  letter-spacing: -0.02em !important;
  color: ${INK} !important;
  font-variant-numeric: tabular-nums !important;
}
[data-wx-msg-kind="transfer"] [data-wx-special-part="label"] {
  margin: 4px 0 0 !important;
  font-size: 13px !important;
  color: ${MIST} !important;
}
[data-wx-msg-kind="transfer"] [data-wx-special-part="status"] {
  margin: 6px 0 12px !important;
  font-size: 12px !important;
  color: ${ACCENT_TF} !important;
  font-weight: 500 !important;
}
[data-wx-msg-kind="transfer"][data-wx-special-status="accepted"] [data-wx-special-part="status"] {
  color: #1f8a4c !important;
}
[data-wx-msg-kind="transfer"][data-wx-special-status="returned"] [data-wx-special-part="status"] {
  color: ${MIST} !important;
}
[data-wx-msg-kind="transfer"] [data-wx-special-part="footer"] {
  margin: 0 -14px !important;
  padding: 8px 14px !important;
  font-size: 11px !important;
  letter-spacing: 0.08em !important;
  color: ${MIST} !important;
  border-top: 1px solid rgba(16, 16, 18, 0.06) !important;
  background: rgba(255, 255, 255, 0.28) !important;
}

/* —— 位置 —— */
[data-wx-msg-kind="location"][data-wx-special-card] {
  padding: 0 !important;
  width: 15rem !important;
}
[data-wx-msg-kind="location"] [data-wx-special-part="label"] {
  margin: 0 !important;
  padding: 12px 14px 2px !important;
  font-size: 14px !important;
  font-weight: 650 !important;
  color: ${INK} !important;
}
[data-wx-msg-kind="location"] [data-wx-special-part="status"] {
  margin: 0 !important;
  padding: 0 14px 10px !important;
  font-size: 12px !important;
  color: ${MIST} !important;
}
[data-wx-msg-kind="location"] [data-wx-special-part="map"] {
  display: block !important;
  border-top: 1px solid rgba(16, 16, 18, 0.06) !important;
}
[data-wx-msg-kind="location"] [data-wx-special-part="map"] img {
  display: block !important;
  width: 100% !important;
  height: 7rem !important;
  object-fit: cover !important;
}

/* —— 通话 —— */
[data-wx-msg-kind="voice-call"][data-wx-special-card] {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 10px 14px !important;
  border-radius: ${CAPSULE} !important;
}
[data-wx-msg-kind="voice-call"] [data-wx-special-part="icon"] {
  display: inline-flex !important;
  width: 22px !important;
  height: 22px !important;
  align-items: center !important;
  justify-content: center !important;
  color: ${INK} !important;
}
[data-wx-msg-kind="voice-call"] [data-wx-special-part="label"] {
  font-size: 14px !important;
  color: ${INK} !important;
  font-weight: 500 !important;
}

/* —— 收藏 —— */
[data-wx-msg-kind="favorite"][data-wx-special-card] {
  padding: 12px 14px !important;
  min-width: 160px !important;
  max-width: min(260px, 78vw) !important;
}
[data-wx-msg-kind="favorite"] [data-wx-special-part="label"] {
  margin: 0 !important;
  font-size: 14px !important;
  font-weight: 650 !important;
  color: ${INK} !important;
}
[data-wx-msg-kind="favorite"] [data-wx-special-part="status"] {
  margin: 6px 0 0 !important;
  font-size: 12px !important;
  color: ${MIST} !important;
  line-height: 1.4 !important;
}

/* —— 听一听 —— */
[data-wx-msg-kind="listen-together"][data-wx-special-card] {
  padding: 12px 14px !important;
  min-width: 180px !important;
  max-width: min(280px, 80vw) !important;
}
[data-wx-msg-kind="listen-together"] [data-wx-special-part="cover"],
[data-wx-msg-kind="listen-together"] [data-wx-special-part="icon"] {
  display: block !important;
  width: 44px !important;
  height: 44px !important;
  border-radius: 12px !important;
  background: rgba(16, 16, 18, 0.08) !important;
  flex-shrink: 0 !important;
  overflow: hidden !important;
}
[data-wx-msg-kind="listen-together"] [data-wx-special-part="label"],
[data-wx-msg-kind="listen-together"] [data-wx-special-part="title"] {
  margin: 0 !important;
  font-size: 14px !important;
  font-weight: 650 !important;
  color: ${INK} !important;
}
[data-wx-msg-kind="listen-together"] [data-wx-special-part="status"],
[data-wx-msg-kind="listen-together"] [data-wx-special-part="muted"] {
  margin: 4px 0 0 !important;
  font-size: 12px !important;
  color: ${MIST} !important;
}
[data-wx-msg-kind="listen-together"] [data-wx-special-part="action"] {
  display: inline-flex !important;
  margin-top: 10px !important;
  padding: 6px 12px !important;
  border-radius: 999px !important;
  background: ${ACCENT_LISTEN} !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}
`

export const LIQUID_GLASS_MINIMAL_BUBBLE_PACK: LumiWeChatBubblePack = {
  format: LUMI_BUBBLE_PACK_FORMAT,
  version: LUMI_BUBBLE_PACK_VERSION,
  meta: {
    id: LIQUID_GLASS_MINIMAL_PRESET_ID,
    name: '液态玻璃',
    description: LIQUID_GLASS_MINIMAL_BUBBLE_PRESET.description,
    author: 'Lumi',
  },
  preset: LIQUID_GLASS_MINIMAL_BUBBLE_PRESET,
  skinEngine: 'css',
  scopedCss: LIQUID_GLASS_MINIMAL_SCOPED_CSS,
  skinOverrides: {
    '--wx-chat-header-bg': GLASS_STRONG,
    '--wx-chat-header-text': INK,
    '--wx-chat-header-muted': MIST,
    '--wx-chat-header-border': GLASS_BORDER,
    '--wx-chat-input-bar-bg': 'transparent',
    '--wx-chat-input-bar-border': 'transparent',
    '--wx-chat-input-shell-bg': GLASS_STRONG,
    '--wx-chat-input-shell-border': GLASS_BORDER,
    '--wx-chat-input-shell-radius': CAPSULE,
    '--wx-chat-input-btn-color': INK,
    '--wx-chat-input-text-color': INK,
    '--wx-chat-input-placeholder': MIST,
  },
}

export function isLiquidGlassMinimalPackActive(wechatTheme: {
  chatSkinEngine?: string | null
  chatSkinScopedCss?: string | null
}): boolean {
  // 以 CSS 标记为准：历史版本 hydrate 曾丢掉 chatSkinEngine，仅凭 engine===css 会在刷新后失效
  return Boolean(wechatTheme.chatSkinScopedCss?.includes('lumi-liquid-glass'))
}

export function isLiquidGlassCssPackPresetId(id: string): boolean {
  return id === LIQUID_GLASS_MINIMAL_PRESET_ID
}

export function liquidGlassBubblePackForPresetId(id: string): LumiWeChatBubblePack | null {
  if (id === LIQUID_GLASS_MINIMAL_PRESET_ID) return LIQUID_GLASS_MINIMAL_BUBBLE_PACK
  return null
}
