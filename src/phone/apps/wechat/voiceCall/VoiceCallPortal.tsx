import { useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** 通话全屏层：挂到手机壳，避免 ChatRoom 停靠 opacity-0 / 微信 hidden 时看不见 */
export function VoiceCallPortal({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const el =
      (document.querySelector('[data-phone-shell="true"]') as HTMLElement | null) ||
      (document.querySelector('[data-phone-shell]') as HTMLElement | null) ||
      document.body
    setRoot(el)
  }, [])

  if (!root) return null
  return createPortal(children, root)
}
