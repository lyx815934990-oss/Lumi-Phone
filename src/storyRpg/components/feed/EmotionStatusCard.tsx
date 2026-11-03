import { useState } from 'react'

type Props = {
  title: string
  body: string
  defaultOpen?: boolean
}

/**
 * 多维情感状态栏：同页 React 渲染（不依赖 dangerouslySetInnerHTML），
 * 对齐酒馆楼层里 details+zen 视觉，避免 HTML 被旁白层转义成纯文字。
 */
export function EmotionStatusCard({ title, body, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const t = String(title || '').trim() || '多维情感状态'
  const b = String(body || '').trim()

  return (
    <div className="lumi-emotion-status-card my-3.5 w-full text-center text-[color:var(--sr-text,#2C3E2D)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="inline-block cursor-pointer border-b border-dotted border-current/50 px-3.5 py-1.5 text-[13px] font-bold tracking-[0.14em] opacity-90 transition hover:tracking-[0.18em] hover:opacity-100"
      >
        {t}
      </button>
      {open ? (
        <div className="mt-3">
          <div className="mx-auto mb-3 h-px w-10 bg-current opacity-30" aria-hidden />
          <div className="whitespace-pre-wrap px-3 text-left text-[14px] leading-[1.75] opacity-90">
            {b}
          </div>
          <div className="mx-auto mt-3 h-px w-2.5 bg-current opacity-30" aria-hidden />
        </div>
      ) : null}
    </div>
  )
}
