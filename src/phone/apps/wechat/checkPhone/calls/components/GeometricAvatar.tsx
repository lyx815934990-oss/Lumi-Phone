import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { resolveCharacterAvatarUrl } from '../../../../../utils/characterAvatarUrl'
import type { CallRecord, PhoneContact } from '../types'

const FALLBACK_TONE = '#d8d8dc'
const FALLBACK_LETTER = '#6e6e73'

type PhoneAvatarCtxValue = {
  playerAvatarUrl: string
  playerNames: string[]
}

const PhoneAvatarCtx = createContext<PhoneAvatarCtxValue>({
  playerAvatarUrl: '',
  playerNames: [],
})

export function PhoneAvatarProvider({
  playerAvatarUrl,
  playerNames,
  children,
}: {
  playerAvatarUrl: string
  playerNames: string[]
  children: ReactNode
}) {
  const value = useMemo(
    () => ({
      playerAvatarUrl: playerAvatarUrl.trim(),
      playerNames: playerNames.map((n) => n.trim()).filter(Boolean),
    }),
    [playerAvatarUrl, playerNames],
  )
  return <PhoneAvatarCtx.Provider value={value}>{children}</PhoneAvatarCtx.Provider>
}

function normName(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

export function isPhoneUserParty(
  party: { remarkName?: string; displayName?: string; isUser?: boolean } | null | undefined,
  playerNames: string[],
  extraRemark?: string,
): boolean {
  if (party?.isUser) return true
  const names = playerNames.map(normName).filter(Boolean)
  if (!names.length) return false
  const candidates = [party?.remarkName, party?.displayName, extraRemark]
    .map((x) => normName(String(x || '')))
    .filter(Boolean)
  return candidates.some((c) => names.some((n) => c === n || c.includes(n) || n.includes(c)))
}

export function GeometricAvatar({
  contact,
  remarkName,
  size = 40,
  blocked,
  glyph,
  tone: _tone,
  url,
}: {
  contact?: Pick<PhoneContact, 'avatarTone' | 'avatarGlyph' | 'remarkName' | 'displayName' | 'avatarUrl' | 'isUser'> | null
  /** 通话备注（联系人不在通讯录时用） */
  remarkName?: string
  size?: number
  blocked?: boolean
  glyph?: string
  tone?: string
  url?: string
}) {
  void _tone
  const { playerAvatarUrl, playerNames } = useContext(PhoneAvatarCtx)
  const isUser = isPhoneUserParty(contact, playerNames, remarkName)
  const fromProp = url?.trim()
  const fromContact = contact?.avatarUrl?.trim()
  const resolvedUser = isUser && playerAvatarUrl ? resolveCharacterAvatarUrl({ avatarUrl: playerAvatarUrl }) : ''
  const resolvedContact = fromContact ? resolveCharacterAvatarUrl({ avatarUrl: fromContact }) : ''
  // 用户 → 只用玩家微信头像（本聊天单独 > 全局）；禁止用联系人上的随机/网友图
  const src = fromProp || (isUser ? resolvedUser : resolvedContact) || ''
  const letterSource =
    glyph ||
    contact?.avatarGlyph ||
    remarkName?.replace(/\s+/g, '') ||
    contact?.remarkName?.replace(/\s+/g, '') ||
    '通'
  const letter = letterSource.slice(0, 1)
  // 占位头像统一浅灰，不用彩色渐变
  const bg = FALLBACK_TONE

  return (
    <div
      className={`phone-avatar${blocked ? ' phone-avatar--blocked' : ''}`}
      style={{
        width: size,
        height: size,
        background: src ? '#d1d1d6' : bg,
        color: FALLBACK_LETTER,
        fontSize: Math.max(12, Math.round(size * 0.38)),
      }}
      aria-hidden
    >
      {src ? <img src={src} alt="" draggable={false} /> : letter}
    </div>
  )
}

export function formatDuration(sec?: number): string {
  if (sec == null || sec <= 0) return '未接通'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatStamp(sec?: number): string {
  if (sec == null || sec < 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function directionLabel(d: 'incoming' | 'outgoing' | 'missed'): string {
  if (d === 'outgoing') return '呼出'
  if (d === 'missed') return '未接'
  return '呼入'
}

export function mediaLabel(m?: 'voice' | 'video'): string {
  return m === 'video' ? '视频' : '语音'
}

/** 列表/标题只显示备注（角色视角叫法），不拼接来电名/微信昵称括号 */
export function displayCallTitle(remarkName: string, _displayName?: string): string {
  void _displayName
  return remarkName.trim()
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function extractHm(timeLabel: string): string {
  const m = String(timeLabel || '').match(/(\d{1,2})\s*[:：]\s*(\d{2})/)
  if (!m) return ''
  return `${pad2(Number(m[1]))}:${m[2]}`
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 从通话字段还原本地时间；缺日期时用 group 相对「锚点日」推断 */
export function resolveCallDate(
  call: Pick<CallRecord, 'timeLabel' | 'group' | 'dateLabel' | 'dateFull'>,
  /** 缺少年份 / 相对分组时的参照日（应为剧情「今天」或列表最晚通话日） */
  anchor = new Date(),
): Date | null {
  const hm = String(call.timeLabel || '').match(/(\d{1,2})\s*[:：]\s*(\d{2})/)
  const hh = hm ? Number(hm[1]) : 12
  const mm = hm ? Number(hm[2]) : 0

  const full = String(call.dateFull || '')
  const fm = full.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (fm) {
    return new Date(Number(fm[1]), Number(fm[2]) - 1, Number(fm[3]), hh, mm, 0, 0)
  }

  const label = String(call.dateLabel || '')
  const lm = label.match(/(\d{1,2})\s*月\s*(\d{1,2})/)
  if (lm) {
    let y = anchor.getFullYear()
    const mo = Number(lm[1])
    const day = Number(lm[2])
    let dt = new Date(y, mo - 1, day, hh, mm, 0, 0)
    // 相对锚点若偏到「未来」太远，回退一年（跨年列表）
    if (dt.getTime() - anchor.getTime() > 12 * 3600 * 1000) {
      y -= 1
      dt = new Date(y, mo - 1, day, hh, mm, 0, 0)
    }
    return dt
  }

  if (/今天|今日/.test(label) || call.group === 'today') {
    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), hh, mm, 0, 0)
  }
  if (/昨天|昨日/.test(label) || call.group === 'yesterday') {
    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 1, hh, mm, 0, 0)
  }
  return null
}

/**
 * 列表「今天」锚点：取通话里最晚的日历日（剧情时间往往超前本机时钟）。
 * 若仍用本机 Date.now()，未来剧情日会被当成今天，列表只剩时分。
 */
export function inferCallListAnchor(
  calls: Array<Pick<CallRecord, 'timeLabel' | 'group' | 'dateLabel' | 'dateFull'>>,
  fallback = new Date(),
): Date {
  let bestMs = Number.NEGATIVE_INFINITY
  let best: Date | null = null
  for (const c of calls) {
    const d = resolveCallDate(c, fallback)
    if (!d) continue
    const day = startOfLocalDay(d).getTime()
    if (day >= bestMs) {
      bestMs = day
      best = d
    }
  }
  return best ? startOfLocalDay(best) : startOfLocalDay(fallback)
}

/**
 * 列表时间展示（相对「锚点今天」）：
 * - 今天：时分
 * - 昨天：昨天 + 时分
 * - 一周内：星期几 + 时分
 * - 超过一周：年月日 + 时分
 */
export function formatCallWhen(
  call: Pick<CallRecord, 'timeLabel' | 'group' | 'dateLabel' | 'dateFull'>,
  nowOrOpts: Date | { now?: Date; anchor?: Date } = new Date(),
): string {
  const opts =
    nowOrOpts instanceof Date
      ? { now: nowOrOpts, anchor: nowOrOpts }
      : { now: nowOrOpts.now ?? new Date(), anchor: nowOrOpts.anchor }
  const now = opts.now ?? new Date()
  const anchor = opts.anchor ?? now
  const hm = extractHm(call.timeLabel) || String(call.timeLabel || '').trim() || '--:--'
  const dt = resolveCallDate(call, anchor)

  if (!dt) {
    if (call.group === 'today' || /今天|今日/.test(String(call.dateLabel || ''))) return hm
    if (call.group === 'yesterday' || /昨天|昨日/.test(String(call.dateLabel || ''))) return `昨天 ${hm}`
    if (call.group === 'earlier') {
      const fallbackDate = String(call.dateFull || call.dateLabel || '').trim()
      return fallbackDate ? `${fallbackDate} ${hm}` : `更早 ${hm}`
    }
    const fallbackDate = String(call.dateFull || call.dateLabel || '').trim()
    return fallbackDate ? `${fallbackDate} ${hm}` : hm
  }

  const diffDays = Math.round(
    (startOfLocalDay(anchor).getTime() - startOfLocalDay(dt).getTime()) / 86400000,
  )

  if (diffDays <= 0) return hm
  if (diffDays === 1) return `昨天 ${hm}`
  if (diffDays < 7) return `${WEEKDAYS[dt.getDay()]} ${hm}`

  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${hm}`
}
