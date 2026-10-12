import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

import { bubbleSideFontFamilyCss } from './wechatBubbleSideFonts'

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

/**
 * 气泡下方译文：交互对齐语音「转文字」
 * - 旁侧灰底「翻译」按钮切换展开
 * - 若传入 children（气泡本体），展开面板贴在气泡下方且宽度不超过气泡
 * - `chrome="neutral"`：不吃主微信皮肤变量（镜像微信浅底场景，避免按钮看不见）
 */
export function MessageTranslationUnderBubble({
  open,
  text,
  isSelf,
  onToggle,
  bottomRadiusPx = 8,
  chrome = 'wechat',
  children,
}: {
  open: boolean
  text: string
  isSelf: boolean
  onToggle: () => void
  bottomRadiusPx?: number
  chrome?: 'wechat' | 'neutral'
  /** 气泡本体；传入时译文面板贴在气泡下方，按钮在旁侧 */
  children?: ReactNode
}) {
  const trimmed = text.trim()
  if (!trimmed) return null
  const firstChar = trimmed.charAt(0)
  const restText = trimmed.slice(1)
  const neutral = chrome === 'neutral'
  const panelClassName = neutral
    ? isSelf
      ? 'border-[#2a2b2e] bg-[#16171a] text-white'
      : 'border-[#e4e6ea] bg-[#f0f1f3] text-[#1c1d20]'
    : isSelf
      ? 'border-[color:var(--wx-special-voice-panel-border-self,#7ed957)] bg-[var(--wx-self-bubble-bg,#95EC69)] text-[color:var(--wx-self-bubble-text,#191919)]'
      : 'border-[color:var(--wx-special-voice-panel-border-other,#ececec)] bg-[var(--wx-other-bubble-bg,#ffffff)] text-[color:var(--wx-other-bubble-text,#191919)]'
  const fontFamily = neutral ? undefined : bubbleSideFontFamilyCss(isSelf ? 'self' : 'other')
  const panelColor: CSSProperties['color'] = neutral
    ? isSelf
      ? '#ffffff'
      : '#1c1d20'
    : isSelf
      ? 'var(--wx-self-bubble-text, #191919)'
      : 'var(--wx-other-bubble-text, #191919)'
  const toggleStyle: CSSProperties = neutral
    ? {
        background: 'rgba(22, 23, 26, 0.06)',
        color: '#6B6E76',
      }
    : {
        background: 'var(--wx-special-voice-toggle-bg, #E5E5E5)',
        color: 'var(--wx-special-voice-toggle-text, #4B5563)',
      }

  const panel = (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="wx-translation-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={SPRING}
          className={`w-full max-w-full min-w-0 overflow-hidden border ${children ? 'border-t-0' : ''} ${panelClassName}`}
          style={{
            borderWidth: 0.5,
            borderRadius: children
              ? `0 0 ${bottomRadiusPx}px ${bottomRadiusPx}px`
              : bottomRadiusPx,
            fontFamily,
            color: panelColor,
          }}
        >
          <div
            className={`border-t border-dashed px-3 py-2.5 text-[13px] leading-[1.7] break-words [overflow-wrap:anywhere] [word-break:break-word] ${
              neutral
                ? isSelf
                  ? 'border-white/20'
                  : 'border-black/10'
                : 'border-[color:var(--wx-special-voice-panel-divider,rgba(0,0,0,0.1))]'
            }`}
          >
            {firstChar ? (
              <span className="mr-[1px] text-[17px] leading-none">{firstChar}</span>
            ) : null}
            <span>{restText}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  /** 贴在气泡内侧底边；与气泡同一行，展开译文时位置不变；必须横向「翻译」 */
  const toggle = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`w-max shrink-0 self-end whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] leading-none active:opacity-70 ${
        neutral ? 'font-normal tracking-[0.02em]' : 'font-medium'
      }`}
      style={toggleStyle}
    >
      翻译
    </button>
  )

  // 无气泡本体时：按钮顶对齐，展开面板增高也不挤按钮
  if (!children) {
    return (
      <div className={`inline-flex max-w-full ${isSelf ? 'items-end' : 'items-start'}`}>
        <div className={`flex min-w-0 items-start gap-1 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="min-w-0 max-w-full">{panel}</div>
          {toggle}
        </div>
      </div>
    )
  }

  /**
   * 气泡+译文同列：外层 inline-block 限宽换行（勿用 w-max，长文会撑出屏外）；
   * 展开时 stretch 同宽，译文短也拉满。旁侧「翻译」横向不换行。
   */
  return (
    <div className={`inline-flex max-w-full gap-x-1 ${isSelf ? 'flex-row-reverse items-end' : 'flex-row items-end'}`}>
      <div className="inline-block max-w-[calc(100%-2.75rem)] align-top">
        <div className={`flex max-w-full flex-col ${open ? 'w-full items-stretch' : isSelf ? 'items-end' : 'items-start'}`}>
          <div className={open ? 'w-full min-w-0 max-w-full' : 'max-w-full'}>{children}</div>
          <div className="w-full min-w-0 max-w-full">{panel}</div>
        </div>
      </div>
      {toggle}
    </div>
  )
}
