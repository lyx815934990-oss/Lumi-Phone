import { Pressable } from '../../components/Pressable'
import { resolvePublicImageUrl } from '../../../publicAssetUrl'
import type { WeChatBubbleTheme, WeChatTheme } from '../../types'
import { wechatChatRoomBgToStyle } from './wechatChatRoomBg'
import {
  type WeChatBubblePreset,
  isTwitterXNightMode,
  isTwitterXPresetActive,
  isWechatClassicNightMode,
  isWechatClassicPresetActive,
  resolveTwitterXPreset,
  resolveWechatClassicPreset,
  wechatBubblePresetMatchesActive,
} from './wechatBubblePresets'
import { bubbleTemplateFontFamily } from './wechatBubbleTemplateFonts'

function MiniBubbleSwatch({
  selfBg,
  otherBg,
  selfText,
  otherText,
  chatRoomDefaultBg,
  fontFamily,
}: {
  selfBg: string
  otherBg: string
  selfText: string
  otherText: string
  chatRoomDefaultBg: WeChatBubblePreset['chatRoomDefaultBg']
  fontFamily?: string
}) {
  return (
    <div
      className="overflow-hidden rounded-[10px]"
      style={wechatChatRoomBgToStyle(chatRoomDefaultBg, resolvePublicImageUrl)}
    >
      <div
        className="flex items-end justify-center gap-2 px-1 py-2"
        style={fontFamily ? { fontFamily } : undefined}
      >
        <span
          className="inline-block max-w-[72px] rounded-[6px] px-2 py-1 text-[10px] leading-snug"
          style={{ background: otherBg, color: otherText, boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          对方
        </span>
        <span
          className="inline-block max-w-[72px] rounded-[6px] px-2 py-1 text-[10px] leading-snug"
          style={{ background: selfBg, color: selfText }}
        >
          我方
        </span>
      </div>
    </div>
  )
}

export function WeChatBubblePresetCards({
  presets,
  activeBubble,
  selfBubbleText,
  otherBubbleText,
  wechatTheme,
  bubbleScope,
  onApply,
  onTwitterNightChange,
  onWechatNightChange,
}: {
  presets: WeChatBubblePreset[]
  activeBubble: WeChatBubbleTheme
  selfBubbleText: string
  otherBubbleText: string
  wechatTheme: WeChatTheme
  bubbleScope: 'global' | 'role'
  onApply: (preset: WeChatBubblePreset) => void
  /** Twitter / X 卡片上的夜间模式勾选 */
  onTwitterNightChange?: (night: boolean) => void
  /** 微信 App 卡片上的夜间模式勾选 */
  onWechatNightChange?: (night: boolean) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {presets.map((preset) => {
        const active = wechatBubblePresetMatchesActive(
          preset,
          activeBubble,
          selfBubbleText,
          otherBubbleText,
          wechatTheme,
          bubbleScope,
        )
        const showTwitterNightSwatch =
          preset.id === 'twitter-x' &&
          isTwitterXPresetActive(wechatTheme) &&
          isTwitterXNightMode(wechatTheme)
        const showWechatNightSwatch =
          preset.id === 'wechat-app-classic' &&
          isWechatClassicPresetActive(wechatTheme) &&
          isWechatClassicNightMode(wechatTheme)
        const swatchPreset =
          preset.id === 'twitter-x'
            ? resolveTwitterXPreset(showTwitterNightSwatch)
            : preset.id === 'wechat-app-classic'
              ? resolveWechatClassicPreset(showWechatNightSwatch)
              : preset
        return (
          <Pressable
            key={preset.id}
            type="button"
            onClick={() => onApply(preset)}
            className="rounded-[16px] border p-3 text-left transition-[background-color,box-shadow] duration-150"
            style={{
              borderColor: active ? 'var(--wx-primary)' : 'var(--wx-border)',
              background: active ? 'rgba(0,0,0,0.04)' : 'var(--wx-surface)',
              boxShadow: active ? '0 0 0 1px color-mix(in oklab, var(--wx-primary) 35%, transparent)' : undefined,
            }}
            aria-pressed={active}
          >
            <MiniBubbleSwatch
              selfBg={
                preset.id === 'lumi-liquid-glass'
                  ? 'rgba(255,255,255,0.42)'
                  : swatchPreset.bubble.selfBubbleBg
              }
              otherBg={
                preset.id === 'lumi-liquid-glass'
                  ? 'rgba(255,255,255,0.32)'
                  : swatchPreset.bubble.otherBubbleBg
              }
              selfText={swatchPreset.selfBubbleText}
              otherText={swatchPreset.otherBubbleText}
              chatRoomDefaultBg={swatchPreset.chatRoomDefaultBg}
              fontFamily={
                preset.bubble.bubbleTailStyle
                  ? bubbleTemplateFontFamily(preset.bubble.bubbleTailStyle)
                  : undefined
              }
            />
            <p
              className="mt-1 text-[12px] font-medium"
              style={{
                color: 'var(--wx-text)',
                fontFamily: preset.bubble.bubbleTailStyle
                  ? bubbleTemplateFontFamily(preset.bubble.bubbleTailStyle)
                  : undefined,
              }}
            >
              {preset.name}
              {active ? (
                <span className="ml-1.5 text-[10px] font-normal" style={{ color: 'var(--wx-text-muted)' }}>
                  当前
                </span>
              ) : null}
            </p>
            {preset.id === 'twitter-x' && onTwitterNightChange ? (
              <label
                className="mt-2 flex items-center gap-1.5 text-[11px]"
                style={{ color: 'var(--wx-text-muted)' }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isTwitterXPresetActive(wechatTheme) && isTwitterXNightMode(wechatTheme)}
                  onChange={(e) => {
                    e.stopPropagation()
                    onTwitterNightChange(e.target.checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3.5 w-3.5 accent-[#1DA1F2]"
                />
                夜间模式
              </label>
            ) : null}
            {preset.id === 'wechat-app-classic' && onWechatNightChange ? (
              <label
                className="mt-2 flex items-center gap-1.5 text-[11px]"
                style={{ color: 'var(--wx-text-muted)' }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={
                    isWechatClassicPresetActive(wechatTheme) && isWechatClassicNightMode(wechatTheme)
                  }
                  onChange={(e) => {
                    e.stopPropagation()
                    onWechatNightChange(e.target.checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3.5 w-3.5 accent-[#07C160]"
                />
                夜间模式
              </label>
            ) : null}
          </Pressable>
        )
      })}
    </div>
  )
}
