/** 纯 CSS 皮肤：最原始结构壳（无主题皮、无换色底色），视觉 100% 交给 scopedCss */

import type { ReactNode } from 'react'

function formatAmountLine(amountYuan: number | null): string {
  if (amountYuan == null || !Number.isFinite(amountYuan)) return '¥ —'
  const s = amountYuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `¥ ${s}`
}

export function CssTransferShell({
  status,
  amountYuan,
  remark,
  perspective = 'incoming',
}: {
  status: 'pending' | 'accepted' | 'returned'
  amountYuan: number | null
  remark?: string
  perspective?: 'incoming' | 'outgoing'
}) {
  const outgoing = perspective === 'outgoing'
  let label = '请收款'
  if (status === 'pending') label = outgoing ? '待朋友确认收钱' : '请收款'
  else if (status === 'accepted') label = outgoing ? '已被接收' : '已收款'
  else label = outgoing ? '已被退还' : '已退还'
  const r = (remark ?? '').trim()

  return (
    <div
      data-wx-msg-kind="transfer"
      data-wx-special-card
      data-wx-special-status={status}
      data-wx-bubble-side={outgoing ? 'self' : 'other'}
      className="relative w-[min(230px,72vw)] max-w-full shrink-0 select-none"
    >
      <span data-wx-special-part="icon" aria-hidden />
      <p data-wx-special-part="amount">{formatAmountLine(amountYuan)}</p>
      {r ? <p data-wx-special-part="label">{r}</p> : null}
      <p data-wx-special-part="status">{label}</p>
      <div data-wx-special-part="footer">转账</div>
    </div>
  )
}

export function CssRedPacketShell({
  remark,
  kind,
  isSelf,
}: {
  remark: string
  kind: 'unclaimed' | 'claimed' | 'expired'
  isSelf: boolean
}) {
  const tag = kind === 'unclaimed' ? '红包' : kind === 'claimed' ? '已领取' : '已过期'
  return (
    <div
      data-wx-msg-kind="red-packet"
      data-wx-special-card
      data-wx-special-status={kind}
      data-wx-bubble-side={isSelf ? 'self' : 'other'}
      className="relative w-[min(240px,72vw)] max-w-full shrink-0 select-none"
    >
      <span data-wx-special-part="icon" aria-hidden />
      <p data-wx-special-part="label">{remark}</p>
      <p data-wx-special-part="status">{tag}</p>
      <div data-wx-special-part="footer">红包</div>
    </div>
  )
}

export function CssLocationShell({
  name,
  subtitle,
  mapSrc,
}: {
  name: string
  subtitle?: string
  mapSrc: string
}) {
  return (
    <div
      data-wx-msg-kind="location"
      data-wx-special-card
      className="relative w-60 max-w-full shrink-0 overflow-hidden select-none"
    >
      <p data-wx-special-part="label">{name || '位置'}</p>
      {subtitle ? <p data-wx-special-part="status">{subtitle}</p> : null}
      <div data-wx-special-part="map">
        <img src={mapSrc} alt="" className="block h-28 w-full object-cover" draggable={false} />
      </div>
    </div>
  )
}

export function CssCallStatusShell({
  status,
  text,
  children,
}: {
  status: string
  text: string
  children?: ReactNode
}) {
  return (
    <div
      data-wx-msg-kind="voice-call"
      data-wx-special-card
      data-wx-special-status={status}
      className="inline-flex max-w-full items-center gap-2 select-none"
    >
      <span data-wx-special-part="icon">{children}</span>
      <span data-wx-special-part="label">{text}</span>
    </div>
  )
}

export function CssFavoriteShell({ title, body }: { title: string; body: string }) {
  return (
    <div data-wx-msg-kind="favorite" data-wx-special-card className="relative max-w-full shrink-0 select-none">
      <p data-wx-special-part="label">{title}</p>
      <p data-wx-special-part="status">{body}</p>
    </div>
  )
}

export function CssVoiceShell({
  isUser,
  durationSec,
  children,
}: {
  isUser: boolean
  durationSec: number
  children?: ReactNode
}) {
  const durationLabel = `${Math.max(1, Math.round(durationSec))}"`
  return (
    <div
      data-wx-msg-kind="voice"
      data-wx-special-card
      data-wx-bubble-side={isUser ? 'self' : 'other'}
      className="inline-flex max-w-full items-center gap-2 select-none"
    >
      <span data-wx-special-part="play">{children}</span>
      <span data-wx-special-part="wave" aria-hidden />
      <span data-wx-special-part="status">{durationLabel}</span>
    </div>
  )
}
