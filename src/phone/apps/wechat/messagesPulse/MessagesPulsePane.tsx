import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import {
  LUMI_SHELL,
  LUMI_SHELL_FONT,
  LUMI_SHELL_NUM_STYLE,
  LUMI_THREAD_CAPSULE,
  lumiThreadCapsuleStyle,
} from '../lumiShellTheme'
import { loadCharacterPsycheState } from '../characterPsyche/characterPsycheStore'
import { personaDb } from '../newFriendsPersona/idb'
import { buildFriendPulseRow, buildHourBuckets, synthesizeMoodHistory } from './buildFriendPulse'
import { StatusComicBubble } from './StatusComicBubble'
import { MoodMonthCalendar } from './MoodMonthCalendar'
import { MurmurPane } from './MurmurPane'
import { UserPulseStatusEditor } from './UserPulseStatusEditor'
import type { FriendMoodLevel, FriendPresence, FriendPulseContact, FriendPulseRow } from './types'
import { loadUserPulseStatus, formatPresenceLabel, type UserPulseStatus } from './userPulseStatusStorage'
import {
  loadPeerPresenceThought,
  PEER_PRESENCE_THOUGHT_UPDATED_EVENT,
} from '../chatRoom/peerPresenceThoughtStorage'

const SELF_PULSE_ID = '__self__'

const softCardStyle: CSSProperties = {
  background: LUMI_SHELL.card,
  borderRadius: LUMI_SHELL.cardRadiusPx,
  border: `1px solid ${LUMI_SHELL.hairline}`,
  boxShadow: '0 8px 28px rgba(16,16,18,0.045)',
}

const stripPanelStyle: CSSProperties = {
  ...softCardStyle,
  background: 'rgba(255,255,255,0.72)',
  boxShadow: '0 4px 18px rgba(16,16,18,0.04)',
}

type DetailTab = 'status' | 'mood' | 'schedule' | 'murmur'

const MOOD_LABEL: Record<FriendMoodLevel, string> = {
  0: '生气',
  1: '哭泣',
  2: '难过',
  3: '平静',
  4: '微笑',
  5: '大笑',
}

const PRESENCE_LABEL: Record<FriendPresence, string> = {
  online: '在线',
  away: '离开',
  offline: '离线',
}

function Avatar({
  url,
  name,
  size = 44,
  ring,
}: {
  url?: string
  name: string
  size?: number
  ring?: boolean
}) {
  const src = resolveCharacterAvatarUrl({ avatarUrl: url }) || ''
  const initial = name.trim().slice(0, 1) || '?'
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(145deg, #f0eeea 0%, #e8e6e2 100%)',
        border: ring ? `2.5px solid ${LUMI_SHELL.card}` : `1px solid ${LUMI_SHELL.hairline}`,
        boxShadow: ring ? '0 4px 14px rgba(16,16,18,0.1)' : '0 1px 3px rgba(16,16,18,0.04)',
      }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[14px] font-medium"
          style={{ color: LUMI_SHELL.mist }}
        >
          {initial}
        </span>
      )}
    </div>
  )
}

function PresenceDot({
  presence,
  variant = 'avatar',
}: {
  presence: FriendPresence
  /** avatar：头像角标；inline：时间线条目前置圆点 */
  variant?: 'avatar' | 'inline'
}) {
  const color =
    presence === 'online' ? '#34C759' : presence === 'away' ? '#F5A623' : 'rgba(139,139,143,0.55)'
  if (variant === 'inline') {
    return (
      <span
        className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
        style={{
          background: color,
          boxShadow:
            presence === 'online'
              ? '0 0 0 3px rgba(52,199,89,0.16)'
              : presence === 'away'
                ? '0 0 0 3px rgba(245,166,35,0.16)'
                : '0 0 0 3px rgba(139,139,143,0.1)',
        }}
        aria-label={PRESENCE_LABEL[presence]}
        title={PRESENCE_LABEL[presence]}
      />
    )
  }
  return (
    <span
      className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full"
      style={{
        background: color,
        border: `2px solid ${LUMI_SHELL.card}`,
        boxShadow:
          presence === 'online'
            ? '0 0 0 1px rgba(52,199,89,0.2)'
            : presence === 'away'
              ? '0 0 0 1px rgba(245,166,35,0.2)'
              : undefined,
      }}
      aria-label={PRESENCE_LABEL[presence]}
    />
  )
}

function formatStatusTime(ms: number): string {
  if (!ms || ms <= 0) return '—'
  const d = new Date(ms)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return `今天 ${hm}`
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  const isYest =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate()
  if (isYest) return `昨天 ${hm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

function DetailTabBar({
  value,
  onChange,
}: {
  value: DetailTab
  onChange: (t: DetailTab) => void
}) {
  const items: Array<{ id: DetailTab; label: string }> = [
    { id: 'status', label: '状态' },
    { id: 'mood', label: '心情' },
    { id: 'schedule', label: '行程' },
    { id: 'murmur', label: '碎碎念' },
  ]
  return (
    <div
      className="flex w-full items-center gap-1 p-1"
      style={{ ...lumiThreadCapsuleStyle(), borderRadius: 999 }}
      role="tablist"
    >
      {items.map((it) => {
        const on = value === it.id
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            className="relative flex-1 rounded-full py-2 text-center text-[12px] font-medium transition-colors"
            style={{
              color: on ? LUMI_SHELL.ink : LUMI_SHELL.mist,
              background: on ? LUMI_THREAD_CAPSULE.foreground : 'transparent',
              boxShadow: on ? '0 2px 8px rgba(16,16,18,0.06)' : undefined,
            }}
            onClick={() => onChange(it.id)}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

function PulsePersonTile({
  row,
  onOpen,
}: {
  row: FriendPulseRow
  onOpen: () => void
}) {
  const showBubble = !!(row.statusEmoji?.trim() || row.statusText?.trim())
  const label = formatPresenceLabel(row.presence, row.presenceLabel)
  return (
    <button
      type="button"
      className="group flex flex-col items-center outline-none"
      onClick={onOpen}
    >
      <div className="relative flex w-full flex-col items-center">
        <div className="flex min-h-[28px] w-full items-end justify-center px-0.5">
          {showBubble ? (
            <StatusComicBubble
              emoji={row.statusEmoji}
              text={row.statusText}
              placement="above"
              maxWidth={72}
            />
          ) : (
            <span className="mb-1 h-[6px] w-[6px] rounded-full opacity-0" aria-hidden />
          )}
        </div>
        <div className="relative transition-transform duration-200 group-active:scale-[0.96]">
          <Avatar url={row.avatarUrl} name={row.remarkName} size={56} ring />
          <PresenceDot presence={row.presence} />
        </div>
      </div>
      <span
        className="mt-2 w-full truncate text-center text-[12px] font-medium leading-tight"
        style={{ color: LUMI_SHELL.ink }}
      >
        {row.isSelf ? '我' : row.remarkName}
      </span>
      <span
        className="mt-0.5 w-full truncate text-center text-[10px] leading-tight"
        style={{ color: LUMI_SHELL.mist }}
      >
        {label}
      </span>
    </button>
  )
}

function SelfPulseCard({
  row,
  onOpen,
  onEdit,
}: {
  row: FriendPulseRow
  onOpen: () => void
  onEdit: () => void
}) {
  const hasThought = !!(row.statusEmoji?.trim() || row.statusText?.trim())
  const presence = formatPresenceLabel(row.presence, row.presenceLabel)
  return (
    <div className="relative w-full overflow-hidden" style={softCardStyle}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, rgba(16,16,18,0.035) 0%, transparent 55%)',
        }}
      />
      <div className="relative flex items-start justify-between gap-2 px-4 pb-2 pt-3">
        <p className="text-[13px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
          我的状态
        </p>
        <button
          type="button"
          className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium"
          style={{ background: LUMI_SHELL.ink, color: '#fff' }}
          onClick={onEdit}
        >
          编辑
        </button>
      </div>

      <button
        type="button"
        className="relative flex w-full flex-col items-center px-4 pb-5 pt-1 outline-none transition-transform active:scale-[0.992]"
        onClick={onOpen}
      >
        <div className="flex min-h-[36px] w-full items-end justify-center">
          {hasThought ? (
            <StatusComicBubble
              emoji={row.statusEmoji}
              text={row.statusText}
              placement="above"
              maxWidth={160}
            />
          ) : (
            <StatusComicBubble emoji="✏️" text="点编辑写想法" placement="above" maxWidth={140} />
          )}
        </div>
        <div className="relative mt-0.5">
          <Avatar url={row.avatarUrl} name={row.remarkName} size={72} ring />
          <PresenceDot presence={row.presence} />
        </div>
        <p className="mt-2.5 text-[14px] font-medium" style={{ color: LUMI_SHELL.ink }}>
          {presence}
        </p>
        {row.statusUpdatedAt ? (
          <p
            className="mt-1 text-[11px] tabular-nums"
            style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
          >
            更新于 {formatStatusTime(row.statusUpdatedAt)}
          </p>
        ) : (
          <p className="mt-1 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
            点头像查看详情
          </p>
        )}
      </button>
    </div>
  )
}

export function MessagesPulsePane({
  contacts,
  lastActiveByCharacterId,
  playerIdentityId,
  selfName = '我',
  selfAvatarUrl,
  onOpenFriend,
}: {
  contacts: FriendPulseContact[]
  lastActiveByCharacterId?: Record<string, number>
  playerIdentityId?: string | null
  selfName?: string
  selfAvatarUrl?: string
  onOpenFriend?: (characterId: string) => void
}) {
  const [rows, setRows] = useState<FriendPulseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('status')
  const [editorOpen, setEditorOpen] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  const applyUserStatusToRows = useCallback(
    (list: FriendPulseRow[], status: UserPulseStatus) => {
      const moodHistory = synthesizeMoodHistory(SELF_PULSE_ID, 28, (status.moodToday / 5) * 100)
      moodHistory[moodHistory.length - 1] = status.moodToday
      const selfRow: FriendPulseRow = {
        characterId: SELF_PULSE_ID,
        remarkName: selfName.trim() || '我',
        avatarUrl: selfAvatarUrl,
        presence: status.presence,
        moodToday: status.moodToday,
        moodHistory,
        slots: status.published ? status.slots : [],
        isSelf: true,
        statusEmoji: status.published ? status.statusEmoji : '',
        statusText: status.published ? status.statusText : '',
        presenceLabel: status.published ? status.presenceLabel : '',
        statusPublished: status.published,
        statusUpdatedAt: status.updatedAt || undefined,
        statusHistory: status.history,
      }
      return [selfRow, ...list.filter((r) => !r.isSelf)]
    },
    [selfAvatarUrl, selfName],
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      const built: FriendPulseRow[] = []
      for (const c of contacts) {
        const cid = c.characterId.trim()
        if (!cid) continue
        try {
          const ch = await personaDb.getCharacter(cid)
          let psycheMood: number | undefined
          if (playerIdentityId) {
            try {
              const psyche = await loadCharacterPsycheState({
                conversationCharacterId: cid,
                playerIdentityId,
                characterFullName: c.remarkName,
              })
              if (psyche.state && typeof psyche.state.mood === 'number') psycheMood = psyche.state.mood
            } catch {
              /* ignore */
            }
          }
          const row = buildFriendPulseRow({
            contact: c,
            schedule: ch?.schedule ?? null,
            psycheMood,
            lastActiveMs: lastActiveByCharacterId?.[cid],
          })
          const peerStatus = await loadPeerPresenceThought(cid)
          const hasAiStatus = peerStatus.updatedAt > 0
          built.push({
            ...row,
            presence: hasAiStatus ? peerStatus.presence : 'offline',
            presenceLabel: hasAiStatus ? peerStatus.presenceLabel : '',
            statusEmoji: hasAiStatus ? peerStatus.thoughtEmoji : '',
            statusText: hasAiStatus ? peerStatus.thoughtText : '',
            statusUpdatedAt: hasAiStatus ? peerStatus.updatedAt : lastActiveByCharacterId?.[cid],
          })
        } catch {
          const peerStatus = await loadPeerPresenceThought(cid).catch(() => null)
          const hasAiStatus = !!(peerStatus && peerStatus.updatedAt > 0)
          built.push({
            ...buildFriendPulseRow({
              contact: c,
              lastActiveMs: lastActiveByCharacterId?.[cid],
            }),
            presence: hasAiStatus ? peerStatus!.presence : 'offline',
            presenceLabel: hasAiStatus ? peerStatus!.presenceLabel : '',
            statusEmoji: hasAiStatus ? peerStatus!.thoughtEmoji : '',
            statusText: hasAiStatus ? peerStatus!.thoughtText : '',
            statusUpdatedAt: hasAiStatus ? peerStatus!.updatedAt : lastActiveByCharacterId?.[cid],
          })
        }
      }
      const status = await loadUserPulseStatus(playerIdentityId)
      if (!cancelled) {
        setRows(applyUserStatusToRows(built, status))
        setLoading(false)
      }
    }
    void run()
    const onPeerPresence = () => setReloadTick((n) => n + 1)
    window.addEventListener(PEER_PRESENCE_THOUGHT_UPDATED_EVENT, onPeerPresence)
    return () => {
      cancelled = true
      window.removeEventListener(PEER_PRESENCE_THOUGHT_UPDATED_EVENT, onPeerPresence)
    }
  }, [
    contacts.map((c) => c.characterId).join('|'),
    JSON.stringify(lastActiveByCharacterId ?? {}),
    playerIdentityId,
    applyUserStatusToRows,
    reloadTick,
  ])

  const detail = useMemo(
    () => (detailId ? rows.find((r) => r.characterId === detailId) ?? null : null),
    [detailId, rows],
  )

  const detailBuckets = useMemo(
    () => (detail ? buildHourBuckets([detail], detail.characterId) : []),
    [detail],
  )

  const selfRow = useMemo(() => rows.find((r) => r.isSelf) ?? null, [rows])
  const friendRows = useMemo(() => rows.filter((r) => !r.isSelf), [rows])

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailTab('status')
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <p className="text-[13px]" style={{ color: LUMI_SHELL.mist }}>
          整理联系人…
        </p>
      </div>
    )
  }

  return (
    <div className="relative mx-auto w-full max-w-[520px] pb-2" style={{ fontFamily: LUMI_SHELL_FONT }}>
      <AnimatePresence mode="wait" initial={false}>
        {!detail ? (
          <motion.div
            key="avatar-grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-5"
          >
            <div className="px-0.5">
              <p
                className="text-[22px] font-semibold tracking-tight"
                style={{ color: LUMI_SHELL.ink, letterSpacing: '-0.02em' }}
              >
                动态
              </p>
              <p className="mt-1 text-[13px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
                看看谁在线、写了什么想法
              </p>
            </div>

            {selfRow ? (
              <SelfPulseCard
                row={selfRow}
                onOpen={() => openDetail(selfRow.characterId)}
                onEdit={() => setEditorOpen(true)}
              />
            ) : null}

            {friendRows.length === 0 && !selfRow ? (
              <p className="py-16 text-center text-[13px]" style={{ color: LUMI_SHELL.mist }}>
                暂无联系人
              </p>
            ) : friendRows.length === 0 ? (
              <div className="px-1 py-6 text-center">
                <p className="text-[13px]" style={{ color: LUMI_SHELL.mist }}>
                  还没有好友可看动态
                </p>
              </div>
            ) : (
              <section style={softCardStyle} className="overflow-hidden">
                <div className="flex items-baseline justify-between px-4 pt-4 pb-1">
                  <p className="text-[13px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
                    好友
                  </p>
                  <p
                    className="text-[11px] tabular-nums"
                    style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
                  >
                    {friendRows.length}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-5 px-3 pb-5 pt-3 sm:grid-cols-4">
                  {friendRows.map((r) => (
                    <PulsePersonTile
                      key={r.characterId}
                      row={r}
                      onOpen={() => openDetail(r.characterId)}
                    />
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        ) : detail ? (
          <motion.div
            key={`detail-${detail.characterId}`}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 14 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ color: LUMI_SHELL.ink, background: 'rgba(16,16,18,0.04)' }}
                aria-label="返回"
                onClick={() => setDetailId(null)}
              >
                <ChevronLeft size={20} strokeWidth={1.75} />
              </button>
              <div className="min-w-0 flex-1 px-1">
                <p className="truncate text-[15px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
                  {detail.isSelf ? '我' : detail.remarkName}
                </p>
              </div>
              {detail.isSelf ? (
                <button
                  type="button"
                  className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium"
                  style={{ background: LUMI_SHELL.ink, color: '#fff' }}
                  onClick={() => setEditorOpen(true)}
                >
                  编辑
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-[12px] font-medium"
                  style={{
                    background: 'rgba(16,16,18,0.04)',
                    color: LUMI_SHELL.ink,
                  }}
                  onClick={() => onOpenFriend?.(detail.characterId)}
                >
                  资料
                  <ChevronRight size={14} strokeWidth={2} aria-hidden />
                </button>
              )}
            </div>

            <div className="relative overflow-hidden px-2 pb-1 pt-2" style={softCardStyle}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-24"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(16,16,18,0.035) 0%, transparent 100%)',
                }}
              />
              <div className="relative flex flex-col items-center gap-2.5 pb-5 pt-6">
                {(detail.statusEmoji || detail.statusText) && detail.statusPublished !== false ? (
                  <StatusComicBubble
                    emoji={detail.statusEmoji}
                    text={detail.statusText}
                    placement="above"
                    maxWidth={180}
                    onClick={detail.isSelf ? () => setEditorOpen(true) : undefined}
                  />
                ) : detail.isSelf ? (
                  <StatusComicBubble
                    emoji="✏️"
                    text="编辑状态 / 想法"
                    placement="above"
                    maxWidth={160}
                    onClick={() => setEditorOpen(true)}
                  />
                ) : (
                  <div className="h-2" aria-hidden />
                )}
                <div className="relative">
                  <Avatar url={detail.avatarUrl} name={detail.remarkName} size={80} ring />
                  <PresenceDot presence={detail.presence} />
                </div>
                <div className="text-center">
                  <p className="text-[16px] font-semibold tracking-tight" style={{ color: LUMI_SHELL.ink }}>
                    {detail.isSelf ? '我' : detail.remarkName}
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: LUMI_SHELL.mist }}>
                    {formatPresenceLabel(detail.presence, detail.presenceLabel)}
                    {detail.statusUpdatedAt ? ` · ${formatStatusTime(detail.statusUpdatedAt)}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <DetailTabBar value={detailTab} onChange={setDetailTab} />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={detailTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {detailTab === 'status' ? (
                  <div className="px-4 py-4" style={stripPanelStyle}>
                    <div className="mb-4 flex items-baseline justify-between gap-2">
                      <p className="text-[15px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
                        {formatPresenceLabel(detail.presence, detail.presenceLabel)}
                      </p>
                      <p
                        className="text-[11px] tabular-nums"
                        style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
                      >
                        {detail.statusUpdatedAt
                          ? `更新于 ${formatStatusTime(detail.statusUpdatedAt)}`
                          : '暂无更新时间'}
                      </p>
                    </div>
                    <div
                      className="mt-4 rounded-[14px] px-3.5 py-3"
                      style={{ background: 'rgba(16,16,18,0.03)' }}
                    >
                      <p className="mb-1.5 text-[11px] font-medium" style={{ color: LUMI_SHELL.mist }}>
                        想法
                      </p>
                      <p className="text-[14px] leading-relaxed" style={{ color: LUMI_SHELL.ink }}>
                        {detail.statusEmoji || detail.statusText
                          ? `${detail.statusEmoji || ''} ${detail.statusText || ''}`.trim()
                          : detail.isSelf
                            ? '还没写想法气泡，点右上角编辑。'
                            : '对方暂未公开想法。'}
                      </p>
                    </div>

                    <p className="mb-2 mt-5 text-[12px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
                      状态时间点
                    </p>
                    {detail.isSelf && detail.statusHistory && detail.statusHistory.length > 0 ? (
                      <ul className="flex flex-col">
                        {detail.statusHistory.map((h, i) => (
                          <li
                            key={`${h.at}-${i}`}
                            className="flex items-start gap-2.5 border-t py-2.5"
                            style={{ borderColor: LUMI_SHELL.hairline }}
                          >
                            <PresenceDot presence={h.presence} variant="inline" />
                            <span
                              className="w-[64px] shrink-0 pt-px text-right text-[11px] tabular-nums leading-snug"
                              style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
                            >
                              {formatStatusTime(h.at)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px]" style={{ color: LUMI_SHELL.ink }}>
                                {formatPresenceLabel(h.presence, h.presenceLabel)}
                                {h.statusEmoji || h.statusText
                                  ? ` · 想法 ${[h.statusEmoji, h.statusText].filter(Boolean).join(' ')}`
                                  : ''}
                              </p>
                              <p className="text-[11px]" style={{ color: LUMI_SHELL.mist }}>
                                心情 {MOOD_LABEL[h.moodToday]}
                                {` · ${PRESENCE_LABEL[h.presence]}`}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div
                        className="rounded-[14px] px-3.5 py-3.5 text-[12px] leading-relaxed"
                        style={{ background: 'rgba(16,16,18,0.03)', color: LUMI_SHELL.mist }}
                      >
                        {detail.isSelf
                          ? '每次点「完成」保存状态后，这里会留下时间点记录。'
                          : detail.lastActiveMs
                            ? `最近活跃：${formatStatusTime(detail.lastActiveMs)}`
                            : '暂无状态时间线。'}
                      </div>
                    )}
                  </div>
                ) : null}

                {detailTab === 'mood' ? (
                  <div className="px-3 py-3" style={stripPanelStyle}>
                    <MoodMonthCalendar
                      characterId={detail.characterId}
                      todayMood={detail.moodToday}
                      onEditToday={detail.isSelf ? () => setEditorOpen(true) : undefined}
                    />
                  </div>
                ) : null}

                {detailTab === 'schedule' ? (
                  <div className="overflow-hidden py-1" style={stripPanelStyle}>
                    {detailBuckets.every((b) => b.entries.length === 0) ? (
                      <div className="px-4 py-10 text-center">
                        <p className="text-[13px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
                          {detail.isSelf
                            ? '还没有今日行程，可编辑添加时间段。'
                            : '对方人设日程表未填写今日行程。'}
                        </p>
                        {detail.isSelf ? (
                          <button
                            type="button"
                            className="mt-3 rounded-full px-4 py-2 text-[13px] font-medium"
                            style={{ background: LUMI_SHELL.ink, color: '#fff' }}
                            onClick={() => setEditorOpen(true)}
                          >
                            编辑行程
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <ul className="flex flex-col">
                        {detailBuckets.map((b) => {
                          const isNow = b.hour === new Date().getHours()
                          return (
                            <li
                              key={b.hour}
                              className="grid grid-cols-[52px_1fr] gap-2 px-3.5 py-2.5"
                              style={{
                                borderTop: `1px solid ${LUMI_SHELL.hairline}`,
                                background: isNow ? 'rgba(16,16,18,0.03)' : undefined,
                              }}
                            >
                              <div className="pt-0.5 text-right">
                                <span
                                  className="text-[12px] tabular-nums"
                                  style={{
                                    color: isNow ? LUMI_SHELL.ink : LUMI_SHELL.mist,
                                    ...LUMI_SHELL_NUM_STYLE,
                                    fontWeight: isNow ? 600 : 400,
                                  }}
                                >
                                  {b.label}
                                </span>
                              </div>
                              <div className="min-w-0 flex flex-col gap-1.5">
                                {b.entries.length === 0 ? (
                                  <span className="text-[12px]" style={{ color: LUMI_SHELL.mist }}>
                                    此刻 · 暂无安排
                                  </span>
                                ) : (
                                  b.entries.map((e, idx) => (
                                    <div
                                      key={`${e.timeLabel}-${idx}`}
                                      className="rounded-r-[10px] border-l-2 px-2.5 py-1.5"
                                      style={{
                                        borderColor: LUMI_SHELL.ink,
                                        background: 'rgba(16,16,18,0.02)',
                                      }}
                                    >
                                      <p className="text-[13px] font-medium" style={{ color: LUMI_SHELL.ink }}>
                                        {e.activity}
                                      </p>
                                      <p
                                        className="text-[11px] tabular-nums"
                                        style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
                                      >
                                        {e.timeLabel}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}

                {detailTab === 'murmur' ? (
                  <MurmurPane
                    mode="profile"
                    isSelf={!!detail.isSelf}
                    authorId={detail.characterId}
                    authorName={detail.isSelf ? selfName : detail.remarkName}
                    authorAvatarUrl={detail.avatarUrl}
                    playerIdentityId={playerIdentityId}
                    contacts={contacts}
                    selfName={selfName}
                    selfAvatarUrl={selfAvatarUrl}
                    stripPanelStyle={stripPanelStyle}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <UserPulseStatusEditor
        open={editorOpen}
        playerIdentityId={playerIdentityId ?? null}
        selfName={selfName}
        selfAvatarUrl={selfAvatarUrl}
        onClose={() => setEditorOpen(false)}
        onSaved={(status) => {
          setRows((prev) => applyUserStatusToRows(prev.filter((r) => !r.isSelf), status))
          setReloadTick((n) => n + 1)
        }}
      />
    </div>
  )
}
