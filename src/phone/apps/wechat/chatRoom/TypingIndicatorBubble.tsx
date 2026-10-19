import { memo } from 'react'

import { WeChatAvatarChromeWrap } from '../WeChatAvatarChromeWrap'
import { WECHAT_CLASSIC_AVATAR_SIZE_PX } from '../wechatBubbleWechatUi'
import '../chatRoomMotion.css'

export type TypingIndicatorBubbleProps = {
  /** 对方头像 URL；空则灰色占位 */
  avatarUrl?: string
  /** 是否显示头像列 */
  showAvatar?: boolean
  avatarRadiusPx?: number
  /** 头像边长；缺省时微信主题 42，其它 40 */
  avatarSizePx?: number
  /**
   * 气泡尾巴风格。微信主题头像无描边、边长 42（与文字气泡一致）。
   */
  bubbleTailStyle?: 'wechat' | 'imessage' | 'telegram' | 'talkmaker' | string
}

/**
 * 底部「对方正在输入」气泡：三个点纯 CSS 动画，零 JS 帧循环。
 */
function TypingIndicatorBubbleInner({
  avatarUrl,
  showAvatar = true,
  avatarRadiusPx = 6,
  avatarSizePx,
  bubbleTailStyle = 'wechat',
}: TypingIndicatorBubbleProps) {
  const src = avatarUrl?.trim()
  const isWechat = bubbleTailStyle === 'wechat'
  const avatarPx = avatarSizePx ?? (isWechat ? WECHAT_CLASSIC_AVATAR_SIZE_PX : 40)
  const avatarBorder = isWechat
    ? 'none'
    : '1px solid color-mix(in oklab, var(--wx-border) 70%, transparent)'
  const avatarStyle = {
    width: avatarPx,
    height: avatarPx,
    borderRadius: `${avatarRadiusPx}px`,
    border: avatarBorder,
    boxSizing: 'border-box' as const,
  }

  return (
    <div
      className="mt-4 flex w-full max-w-full shrink-0 justify-start overflow-x-hidden"
      aria-live="polite"
      aria-label="对方正在输入"
    >
      <div className="ml-[24px] mr-auto flex max-w-full flex-row items-end gap-[12px]">
        {showAvatar ? (
          <WeChatAvatarChromeWrap side="other" sizePx={avatarPx}>
            {src ? (
              <img
                src={src}
                alt=""
                width={avatarPx}
                height={avatarPx}
                className="shrink-0 object-cover"
                style={avatarStyle}
                aria-hidden
              />
            ) : (
              <div
                className="shrink-0"
                style={{
                  ...avatarStyle,
                  background: 'rgba(0,0,0,0.06)',
                }}
                aria-hidden
              />
            )}
          </WeChatAvatarChromeWrap>
        ) : null}
        <div
          className="wx-chat-typing-bubble inline-flex items-center gap-[3px] rounded-lg bg-[#ededed] px-3 py-2"
          style={{ minHeight: avatarPx }}
          aria-hidden
        >
          <span className="wx-chat-typing-dot" />
          <span className="wx-chat-typing-dot" />
          <span className="wx-chat-typing-dot" />
        </div>
      </div>
    </div>
  )
}

export const TypingIndicatorBubble = memo(TypingIndicatorBubbleInner)
