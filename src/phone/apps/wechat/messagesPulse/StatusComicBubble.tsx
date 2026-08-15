import type { ReactNode } from 'react'
import { LUMI_SHELL, LUMI_SHELL_FONT } from '../lumiShellTheme'
import { WeChatChatMixedText } from '../WeChatChatMixedText'

/**
 * 漫画云朵气泡：多层纯白圆叠成一体，
 * 只用外层 drop-shadow，圆与圆之间无描边、无各自阴影。
 */
export function StatusComicBubble({
  emoji,
  text,
  placement = 'above',
  maxWidth = 120,
  onClick,
  className,
}: {
  emoji?: string
  text?: string
  placement?: 'above' | 'below'
  maxWidth?: number
  onClick?: () => void
  className?: string
}) {
  const e = (emoji || '').trim()
  const t = (text || '').trim()
  if (!e && !t) return null

  const label: ReactNode = (
    <span className="inline-flex max-w-full items-center gap-1 text-[12px]" style={{ lineHeight: 1.25 }}>
      {e ? (
        <span
          className="inline-flex shrink-0 items-center justify-center leading-none [&_img]:h-[22px] [&_img]:w-[22px]"
          style={{ fontSize: e.startsWith('[') && e.endsWith(']') ? undefined : 20 }}
        >
          {/* Unicode / 微信黄脸 token 均走混排，保证黄脸图完整显示 */}
          <WeChatChatMixedText text={e} />
        </span>
      ) : null}
      {t ? (
        <span className="min-w-0 truncate font-medium [&_img]:h-[18px] [&_img]:w-[18px]">
          <WeChatChatMixedText text={t} />
        </span>
      ) : null}
    </span>
  )

  const cloudBody = (
    <span
      className="relative inline-flex max-w-full"
      style={{
        // 整朵云一个阴影，避免圆与圆之间出现「描边感」
        filter: 'drop-shadow(0 3px 8px rgba(16, 16, 18, 0.12))',
        color: LUMI_SHELL.ink,
        fontFamily: LUMI_SHELL_FONT,
      }}
    >
      {/* 主体胶囊（内容撑开） */}
      <span
        className="relative z-[1] inline-flex max-w-full items-center rounded-full bg-white px-3 py-[7px]"
      >
        {label}
      </span>
      {/* 云朵隆起：纯白、无边、无阴影，叠进主体 */}
      <span
        aria-hidden
        className="pointer-events-none absolute bg-white"
        style={{ left: '6%', top: -5, width: 15, height: 15, borderRadius: '50%' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bg-white"
        style={{ left: '22%', top: -9, width: 22, height: 22, borderRadius: '50%' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bg-white"
        style={{ left: '42%', top: -7, width: 18, height: 18, borderRadius: '50%' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bg-white"
        style={{ right: '16%', top: -8, width: 20, height: 20, borderRadius: '50%' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bg-white"
        style={{ right: '2%', top: 1, width: 14, height: 14, borderRadius: '50%' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bg-white"
        style={{ left: '10%', bottom: -4, width: 14, height: 14, borderRadius: '50%' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bg-white"
        style={{ right: '12%', bottom: -5, width: 16, height: 16, borderRadius: '50%' }}
      />
    </span>
  )

  const thoughtDots =
    placement === 'above' ? (
      <span
        aria-hidden
        className="absolute left-1/2 top-full flex -translate-x-1/2 flex-col items-center gap-[3px] pt-0.5"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(16,16,18,0.1))' }}
      >
        <span className="block h-[7px] w-[7px] rounded-full bg-white" />
        <span className="block h-[4px] w-[4px] rounded-full bg-white" />
      </span>
    ) : (
      <span
        aria-hidden
        className="absolute bottom-full left-1/2 flex -translate-x-1/2 flex-col-reverse items-center gap-[3px] pb-0.5"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(16,16,18,0.1))' }}
      >
        <span className="block h-[7px] w-[7px] rounded-full bg-white" />
        <span className="block h-[4px] w-[4px] rounded-full bg-white" />
      </span>
    )

  const wrapCls = `relative inline-flex max-w-full ${placement === 'above' ? 'mb-2.5' : 'mt-2.5'} ${className || ''}`

  if (onClick) {
    return (
      <button type="button" className={wrapCls} style={{ maxWidth }} onClick={onClick}>
        {cloudBody}
        {thoughtDots}
      </button>
    )
  }

  return (
    <div className={wrapCls} style={{ maxWidth }}>
      {cloudBody}
      {thoughtDots}
    </div>
  )
}
