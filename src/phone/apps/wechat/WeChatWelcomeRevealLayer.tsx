import { motion } from 'framer-motion'
import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { useWeChatWelcomeReveal, useWeChatWelcomeRevealMotion } from './weChatWelcomeRevealContext'

type Slot = 'header' | 'body' | 'tabbar'

export const WeChatWelcomeRevealLayer = forwardRef<
  HTMLDivElement,
  {
    slot: Slot
    children: ReactNode
    className?: string
    style?: CSSProperties
    /** 聊天顶栏键盘钉位：flow | absolute */
    'data-wx-chat-header-pin'?: 'flow' | 'absolute'
  }
>(function WeChatWelcomeRevealLayer(
  { slot, children, className, style, 'data-wx-chat-header-pin': headerPin },
  ref,
) {
  const { active, phase } = useWeChatWelcomeReveal()
  const motionProps = useWeChatWelcomeRevealMotion(slot)
  const blockPointer = active && phase === 'under-mask'
  const pinAttr = headerPin ? { 'data-wx-chat-header-pin': headerPin } : undefined

  if (!active) {
    return (
      <div ref={ref} className={className} style={style} {...pinAttr}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={`${className ?? ''}${blockPointer ? ' pointer-events-none' : ''}`}
      style={style}
      {...pinAttr}
      {...motionProps}
      initial={false}
    >
      {children}
    </motion.div>
  )
})
