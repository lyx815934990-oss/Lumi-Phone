/** Twitter / X 私信风：色板、圆角簇、时间戳与已读 */

import { useEffect, useState } from 'react'
import { PhoneMixedLatinNumText } from '../../phoneMixedLatinNumText'

/** X 官方色值（浅色 Default / Lights Out） */
export const TWITTER_X_COLORS = {
  bg: '#FFFFFF',
  bgNight: '#000000',
  text: '#0F1419',
  textNight: '#E7E9EA',
  muted: '#536471',
  mutedNight: '#71767B',
  /** 夜间末条时间戳 / 已读：比 mutedNight 更浅，黑底上更易辨认 */
  metaMutedNight: '#A0A8B0',
  wash: '#EFF3F4',
  washNight: '#16181C',
  blue: '#1D9BF0',
  redPacket: '#E0322A',
  online: '#00BA7C',
  /** 夜间壁纸压暗遮罩 */
  wallpaperDimNight: 'rgba(0, 0, 0, 0.55)',
} as const

export type TwitterBubbleCluster = 'single' | 'first' | 'middle' | 'last'

/**
 * 18px 圆角；发出方向贴边角收窄为 4px（模拟尖角指向）。
 * 组内非末条：贴边角也收窄，仅 last/single 保留完整尖角造型。
 */
export function twitterBubbleCornerRadius(
  isSelf: boolean,
  cluster: TwitterBubbleCluster = 'single',
  radiusPx = 18,
  tipPx = 4,
): string {
  const r = `${radiusPx}px`
  const tip = `${tipPx}px`
  // CSS order: top-left top-right bottom-right bottom-left
  if (isSelf) {
    // 右下为「尖角」侧
    if (cluster === 'middle' || cluster === 'first') return `${r} ${r} ${tip} ${r}`
    return `${r} ${r} ${tip} ${r}`
  }
  // 左下为「尖角」侧
  if (cluster === 'middle' || cluster === 'first') return `${r} ${r} ${r} ${tip}`
  return `${r} ${r} ${r} ${tip}`
}

/** 居中分组时间戳：下午 3:24 */
export function formatTwitterCenteredTimestamp(tsMs: number): string {
  const d = new Date(tsMs)
  if (!Number.isFinite(d.getTime())) return ''
  const h = d.getHours()
  const m = d.getMinutes()
  const period = h < 12 ? '上午' : '下午'
  const h12 = h % 12 || 12
  return `${period} ${h12}:${String(m).padStart(2, '0')}`
}

export function formatTwitterDmTime(tsMs: number): string {
  const d = new Date(tsMs)
  if (!Number.isFinite(d.getTime())) return '00:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 末条消息脚注：时间在前；己方可选「已读」；对方仅时间 */
export function TwitterLastMsgMeta({
  timeLabel,
  showRead = false,
  align = 'end',
  night = false,
}: {
  timeLabel: string
  /** 仅己方：对方正在回复或已有后续回覆时显示「已读」 */
  showRead?: boolean
  /** 己方 end（右），对方 start（左） */
  align?: 'start' | 'end'
  night?: boolean
}) {
  const label = timeLabel.trim()
  if (!label && !showRead) return null
  const muted = night ? TWITTER_X_COLORS.metaMutedNight : TWITTER_X_COLORS.muted
  const aria =
    label && showRead ? `${label} 已读` : showRead ? '已读' : label
  // 边距与气泡行一致：对方 ml/mr 24px，己方 px-4
  const insetCls = align === 'start' ? 'justify-start pl-[24px] pr-[24px]' : 'justify-end px-4'
  return (
    <div
      className={`mt-1 flex w-full items-center gap-1.5 text-[12px] leading-none ${insetCls}`}
      style={{ color: muted }}
      aria-label={aria}
    >
      {label ? <PhoneMixedLatinNumText text={label} /> : null}
      {showRead ? <span>已读</span> : null}
    </div>
  )
}

/** @deprecated 使用 TwitterLastMsgMeta */
export function TwitterLastSelfMeta(props: {
  timeLabel: string
  showRead: boolean
  night?: boolean
}) {
  return <TwitterLastMsgMeta {...props} align="end" />
}

/** 点击气泡后短暂显示在气泡上方的精确时间 */
export function TwitterBubbleTapTime({
  label,
  night = false,
  visible,
}: {
  label: string
  night?: boolean
  visible: boolean
}) {
  if (!visible || !label) return null
  const muted = night ? TWITTER_X_COLORS.metaMutedNight : TWITTER_X_COLORS.muted
  return (
    <div
      className="mb-1 flex w-full justify-center text-[12px] leading-none transition-opacity duration-200"
      style={{ color: muted, opacity: visible ? 1 : 0 }}
      aria-hidden={!visible}
    >
      <PhoneMixedLatinNumText text={label} />
    </div>
  )
}

export function useTwitterTapTimeReveal(timeoutMs = 2000) {
  const [messageId, setMessageId] = useState<string | null>(null)
  useEffect(() => {
    if (!messageId) return
    const t = window.setTimeout(() => setMessageId(null), timeoutMs)
    return () => window.clearTimeout(t)
  }, [messageId, timeoutMs])
  const toggle = (id: string) => {
    setMessageId((prev) => (prev === id ? null : id))
  }
  return { revealedId: messageId, toggleReveal: toggle, clearReveal: () => setMessageId(null) }
}

/** 套用 X 主题时写入的 --wx-special-*（红包保留红，其余黑白蓝） */
export function twitterXSpecialSkinOverrides(night: boolean): Record<string, string> {
  const wash = night ? TWITTER_X_COLORS.washNight : TWITTER_X_COLORS.wash
  const text = night ? TWITTER_X_COLORS.textNight : TWITTER_X_COLORS.text
  const muted = night ? TWITTER_X_COLORS.mutedNight : TWITTER_X_COLORS.muted
  const bg = night ? TWITTER_X_COLORS.bgNight : TWITTER_X_COLORS.bg
  const blue = TWITTER_X_COLORS.blue
  return {
    '--wx-special-rp-bg': TWITTER_X_COLORS.redPacket,
    '--wx-special-rp-border': TWITTER_X_COLORS.redPacket,
    '--wx-special-rp-accent': '#FFFFFF',
    '--wx-special-rp-text': '#FFFFFF',
    '--wx-special-rp-tag': 'rgba(255,255,255,0.7)',
    '--wx-special-tf-bg': wash,
    '--wx-special-tf-accent-pending': blue,
    '--wx-special-tf-accent-accepted': blue,
    '--wx-special-tf-accent-returned': muted,
    '--wx-special-tf-amount': text,
    '--wx-special-tf-muted': muted,
    '--wx-special-voice-bg-self': blue,
    '--wx-special-voice-bg-other': wash,
    '--wx-special-voice-border-self': 'transparent',
    '--wx-special-voice-border-other': 'transparent',
    '--wx-special-voice-play-bg': night ? 'rgba(255,255,255,0.18)' : 'rgba(15,20,25,0.08)',
    '--wx-special-voice-wave-active-self': '#FFFFFF',
    '--wx-special-voice-wave-active-other': text,
    '--wx-special-voice-wave-idle': night ? 'rgba(255,255,255,0.35)' : 'rgba(15,20,25,0.28)',
    '--wx-special-voice-duration': night ? 'rgba(255,255,255,0.85)' : muted,
    '--wx-special-loc-pin': text,
    '--wx-special-loc-title': text,
    '--wx-special-loc-muted': muted,
    '--wx-special-loc-distance': muted,
    '--wx-special-loc-bg': bg,
    '--wx-special-loc-border': wash,
    '--wx-special-call-bg': wash,
    '--wx-special-call-text': text,
    '--wx-special-call-muted': muted,
    '--wx-special-call-border': 'transparent',
    '--wx-special-fav-bg': bg,
    '--wx-special-fav-border': wash,
    '--wx-special-fav-title': text,
    '--wx-special-fav-muted': muted,
    '--wx-timestamp-text': muted,
  }
}

export const TWITTER_X_FONT_STACK =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, -apple-system, sans-serif'
export const TWITTER_X_NUM_FONT_STACK = 'Inter, system-ui, -apple-system, sans-serif'
