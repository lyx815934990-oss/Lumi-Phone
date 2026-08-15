import { ChevronLeft, ChevronRight, MessageCircle, Plus, Settings2, SmilePlus } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Pressable } from '../../../components/Pressable'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import {
  LUMI_SHELL,
  LUMI_SHELL_FONT,
  LUMI_SHELL_NUM_STYLE,
} from '../lumiShellTheme'
import type { FriendPulseContact } from './types'
import {
  loadCharacterMurmurs,
  loadMurmurBoardFeed,
  loadUserMurmurs,
  murmurDayKey,
  MURMUR_REACT_EMOJIS,
  patchMurmurInStore,
  saveCharacterMurmurs,
  saveUserMurmurs,
  visibilityLabel,
  type MurmurEntry,
  type MurmurSticker,
  type MurmurVisibility,
} from './murmurStorage'
import { canMurmurEngage } from './murmurRelation'
import { MurmurPublishSettingsSheet } from './MurmurPublishSettingsSheet'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const
const SELF_PULSE_ID = '__self__'

const softCardStyle: CSSProperties = {
  background: LUMI_SHELL.card,
  borderRadius: LUMI_SHELL.cardRadiusPx,
  border: `1px solid ${LUMI_SHELL.hairline}`,
  boxShadow: '0 8px 28px rgba(16,16,18,0.045)',
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function buildMonthCells(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<Date | null> = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  while (cells.length < 42) cells.push(null)
  return cells
}

function formatHm(ms: number) {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function TinyAvatar({ url, name, size = 22 }: { url?: string; name: string; size?: number }) {
  const src = resolveCharacterAvatarUrl({ avatarUrl: url }) || ''
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(145deg, #f0eeea 0%, #e8e6e2 100%)',
        border: `1px solid ${LUMI_SHELL.hairline}`,
        boxShadow: '0 1px 3px rgba(16,16,18,0.04)',
      }}
      title={name}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[9px] font-medium"
          style={{ color: LUMI_SHELL.mist }}
        >
          {name.slice(0, 1)}
        </span>
      )}
    </span>
  )
}

function stickerKey(emoji: string) {
  return emoji
}

type StickerGroup = {
  key: string
  emoji: string
  reactors: Array<{ id: string; name: string; avatarUrl?: string; at: number }>
}

function aggregateStickers(stickers: MurmurEntry['stickers']): StickerGroup[] {
  const map = new Map<string, StickerGroup>()
  for (const s of stickers) {
    const emoji = s.emoji.trim()
    if (!emoji) continue
    const key = stickerKey(emoji)
    const cur = map.get(key)
    const reactor = {
      id: s.authorId,
      name: s.authorName,
      avatarUrl: s.authorAvatarUrl,
      at: s.at,
    }
    if (!cur) {
      map.set(key, { key, emoji, reactors: [reactor] })
      continue
    }
    if (!cur.reactors.some((r) => r.id === reactor.id)) cur.reactors.push(reactor)
  }
  return [...map.values()].sort((a, b) => (b.reactors[0]?.at || 0) - (a.reactors[0]?.at || 0))
}

function WhoMarkedPopover({
  open,
  title,
  reactors,
  anchor,
  onClose,
}: {
  open: boolean
  title: string
  reactors: Array<{ id: string; name: string; avatarUrl?: string }>
  anchor: { left: number; top: number; bottom: number; width: number } | null
  onClose: () => void
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPortalRoot(document.querySelector('[data-phone-page="wechat"]'))
  }, [open])
  if (!portalRoot || !open || !anchor) return null

  const rootRect = portalRoot.getBoundingClientRect()
  const panelW = Math.min(220, rootRect.width - 24)
  let left = anchor.left + anchor.width / 2 - panelW / 2 - rootRect.left
  left = Math.max(12, Math.min(left, rootRect.width - panelW - 12))
  const spaceBelow = rootRect.bottom - anchor.bottom
  const placeBelow = spaceBelow > 160
  const top = placeBelow
    ? anchor.bottom - rootRect.top + 8
    : Math.max(12, anchor.top - rootRect.top - 8 - Math.min(200, 44 + reactors.length * 36))

  return createPortal(
    <div className="absolute inset-0 z-[5300]" style={{ fontFamily: LUMI_SHELL_FONT }}>
      <button type="button" className="absolute inset-0 bg-transparent" aria-label="关闭" onClick={onClose} />
      <div
        className="absolute overflow-hidden rounded-[14px]"
        style={{
          left,
          top,
          width: panelW,
          maxHeight: 200,
          background: 'rgba(255,255,255,0.96)',
          border: `1px solid ${LUMI_SHELL.hairline}`,
          boxShadow: '0 12px 36px rgba(16,16,18,0.16)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="border-b px-3 py-2" style={{ borderColor: LUMI_SHELL.hairline }}>
          <p className="truncate text-[13px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
            {title}
          </p>
          <p className="text-[11px]" style={{ color: LUMI_SHELL.mist }}>
            {reactors.length} 人
          </p>
        </div>
        <ul className="max-h-[148px] overflow-y-auto py-1">
          {reactors.map((r) => (
            <li key={r.id} className="px-3 py-2 text-[13px]" style={{ color: LUMI_SHELL.ink }}>
              {r.name}
            </li>
          ))}
        </ul>
      </div>
    </div>,
    portalRoot,
  )
}

function ReactPickerPopover({
  open,
  myEmojiKeys,
  stickerGroups,
  onClose,
  onToggleSticker,
}: {
  open: boolean
  myEmojiKeys: Set<string>
  stickerGroups: StickerGroup[]
  onClose: () => void
  onToggleSticker: (emoji: string) => void
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPortalRoot(document.querySelector('[data-phone-page="wechat"]'))
  }, [open])
  if (!portalRoot || !open) return null

  return createPortal(
    <div className="absolute inset-0 z-[5250] flex items-center justify-center px-4" style={{ fontFamily: LUMI_SHELL_FONT }}>
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="关闭" onClick={onClose} />
      <div
        className="relative z-[1] flex w-full max-w-[340px] flex-col overflow-hidden rounded-[18px]"
        style={{
          maxHeight: 'min(68vh, 520px)',
          background: 'rgba(255,255,255,0.97)',
          border: `1px solid ${LUMI_SHELL.hairline}`,
          boxShadow: '0 18px 48px rgba(16,16,18,0.18)',
        }}
      >
        <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
          <p className="text-[15px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
            添加反应
          </p>
          <button
            type="button"
            className="rounded-full px-2.5 py-1 text-[12px]"
            style={{ color: LUMI_SHELL.mist, background: 'rgba(16,16,18,0.04)' }}
            onClick={onClose}
          >
            关闭
          </button>
        </div>
        <p className="px-3.5 pt-2 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
          再点可取消 · 点已有反应可追加
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
          <div className="grid grid-cols-8 gap-1">
            {MURMUR_REACT_EMOJIS.map((emoji) => {
              const key = stickerKey(emoji)
              const mine = myEmojiKeys.has(key)
              const group = stickerGroups.find((g) => g.key === key)
              const count = group?.reactors.length || 0
              return (
                <button
                  key={key}
                  type="button"
                  title={count > 0 ? `${emoji} · ${count}` : emoji}
                  className="relative flex aspect-square items-center justify-center rounded-[10px] text-[20px] transition-transform active:scale-90"
                  style={{
                    background: mine ? 'rgba(16,16,18,0.12)' : 'rgba(16,16,18,0.03)',
                    boxShadow: mine ? `inset 0 0 0 1px ${LUMI_SHELL.ink}` : undefined,
                  }}
                  onClick={() => onToggleSticker(emoji)}
                >
                  <span className="leading-none">{emoji}</span>
                  {count > 0 ? (
                    <span
                      className="absolute bottom-0.5 right-0.5 min-w-[12px] rounded-full px-0.5 text-center text-[9px] tabular-nums leading-none"
                      style={{
                        color: LUMI_SHELL.mist,
                        ...LUMI_SHELL_NUM_STYLE,
                        background: 'rgba(255,255,255,0.85)',
                      }}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    portalRoot,
  )
}

function usePressActions(onClick: () => void, onLongPress: () => void, ms = 450) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longFiredRef = useRef(false)
  const clear = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }
  return {
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== 0) return
      longFiredRef.current = false
      clear()
      timerRef.current = setTimeout(() => {
        longFiredRef.current = true
        onLongPress()
      }, ms)
    },
    onPointerUp: () => {
      const long = longFiredRef.current
      clear()
      if (!long) onClick()
    },
    onPointerCancel: () => {
      clear()
    },
    onPointerLeave: () => {
      clear()
    },
    onContextMenu: (e: ReactMouseEvent) => {
      e.preventDefault()
    },
  }
}

function StickerChip({
  emoji,
  count,
  mine,
  onToggle,
  onShowWho,
}: {
  emoji: string
  count: number
  mine: boolean
  onToggle: () => void
  onShowWho: (anchor: DOMRect) => void
}) {
  const ref = useRef<HTMLButtonElement | null>(null)
  const press = usePressActions(onToggle, () => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) onShowWho(rect)
  })
  return (
    <button
      ref={ref}
      type="button"
      className="inline-flex touch-manipulation select-none items-center gap-1 rounded-[8px] px-2 py-[5px] text-[13px] transition-transform active:scale-95"
      style={{
        background: mine ? 'rgba(16,16,18,0.1)' : 'rgba(16,16,18,0.045)',
        color: LUMI_SHELL.ink,
        boxShadow: mine ? `inset 0 0 0 1px rgba(16,16,18,0.35)` : undefined,
      }}
      {...press}
    >
      <span className="leading-none">{emoji}</span>
      <span
        className="min-w-[0.75rem] text-center text-[12px] tabular-nums leading-none"
        style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}
      >
        {count}
      </span>
    </button>
  )
}

function EngagementBlock({
  entry,
  selfId,
  selfName,
  selfAvatarUrl,
  onAddComment,
  onToggleSticker,
}: {
  entry: MurmurEntry
  selfId: string
  selfName: string
  selfAvatarUrl?: string
  onAddComment: (text: string) => void
  onToggleSticker: (emoji: string) => void
}) {
  const [commentDraft, setCommentDraft] = useState('')
  const [showComments, setShowComments] = useState(entry.comments.length > 0)
  const [showReactPicker, setShowReactPicker] = useState(false)
  const [whoSheet, setWhoSheet] = useState<{
    title: string
    reactors: Array<{ id: string; name: string; avatarUrl?: string }>
    anchor: { left: number; top: number; bottom: number; width: number }
  } | null>(null)
  const stickerGroups = useMemo(() => aggregateStickers(entry.stickers), [entry.stickers])
  const myEmojiKeys = useMemo(
    () => new Set(entry.stickers.filter((s) => s.authorId === selfId).map((s) => stickerKey(s.emoji))),
    [entry.stickers, selfId],
  )

  const openWho = (
    title: string,
    reactors: Array<{ id: string; name: string; avatarUrl?: string }>,
    rect: DOMRect,
  ) => {
    setWhoSheet({
      title,
      reactors,
      anchor: { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width },
    })
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {stickerGroups.map((g) => (
          <StickerChip
            key={g.key}
            emoji={g.emoji}
            count={g.reactors.length}
            mine={g.reactors.some((x) => x.id === selfId)}
            onToggle={() => onToggleSticker(g.emoji)}
            onShowWho={(rect) =>
              openWho(
                g.emoji,
                g.reactors.map((x) => ({
                  id: x.id,
                  name: x.name,
                  avatarUrl: x.avatarUrl,
                })),
                rect,
              )
            }
          />
        ))}
        <button
          type="button"
          className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[8px] transition-transform active:scale-95"
          style={{
            color: showReactPicker ? LUMI_SHELL.ink : LUMI_SHELL.mist,
            background: showReactPicker ? 'rgba(16,16,18,0.1)' : 'rgba(16,16,18,0.045)',
            boxShadow: showReactPicker ? 'inset 0 0 0 1px rgba(16,16,18,0.35)' : undefined,
          }}
          aria-label="添加反应"
          onClick={() => {
            setShowReactPicker((v) => !v)
            setShowComments(false)
          }}
        >
          <SmilePlus size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 rounded-[8px] px-2 py-[5px] text-[12px] font-medium"
          style={{
            color: LUMI_SHELL.mist,
            background: 'rgba(16,16,18,0.045)',
          }}
          onClick={() => {
            setShowComments((v) => !v)
            setShowReactPicker(false)
          }}
        >
          <MessageCircle size={13} strokeWidth={2} />
          <span className="tabular-nums" style={{ ...LUMI_SHELL_NUM_STYLE }}>
            {entry.comments.length || '评论'}
          </span>
        </button>
      </div>

      <ReactPickerPopover
        open={showReactPicker}
        myEmojiKeys={myEmojiKeys}
        stickerGroups={stickerGroups}
        onClose={() => setShowReactPicker(false)}
        onToggleSticker={onToggleSticker}
      />

      {showComments ? (
        <div
          className="mt-2.5 space-y-2 rounded-[14px] px-3 py-2.5"
          style={{ background: 'rgba(16,16,18,0.03)' }}
        >
          {entry.comments.length === 0 ? (
            <p className="py-1 text-[12px]" style={{ color: LUMI_SHELL.mist }}>
              还没有评论
            </p>
          ) : (
            entry.comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <TinyAvatar url={c.authorAvatarUrl} name={c.authorName} size={22} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px]" style={{ color: LUMI_SHELL.mist }}>
                    <span className="font-medium" style={{ color: LUMI_SHELL.ink }}>
                      {c.authorName}
                    </span>
                    <span className="ml-1.5 tabular-nums" style={{ ...LUMI_SHELL_NUM_STYLE }}>
                      {formatHm(c.at)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug" style={{ color: LUMI_SHELL.ink }}>
                    {c.text}
                  </p>
                </div>
              </div>
            ))
          )}
          <div className="flex items-center gap-2 pt-1">
            <TinyAvatar url={selfAvatarUrl} name={selfName} size={22} />
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value.slice(0, 200))}
              placeholder="写评论…"
              className="min-w-0 flex-1 rounded-full px-3 py-1.5 text-[12px] outline-none"
              style={{
                background: LUMI_SHELL.card,
                border: `1px solid ${LUMI_SHELL.hairline}`,
                color: LUMI_SHELL.ink,
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const t = commentDraft.trim()
                if (!t) return
                onAddComment(t)
                setCommentDraft('')
              }}
            />
            <button
              type="button"
              className="shrink-0 rounded-full px-2.5 py-1.5 text-[12px] font-medium"
              style={{
                color: commentDraft.trim() ? '#fff' : LUMI_SHELL.mist,
                background: commentDraft.trim() ? LUMI_SHELL.ink : 'transparent',
              }}
              disabled={!commentDraft.trim()}
              onClick={() => {
                const t = commentDraft.trim()
                if (!t) return
                onAddComment(t)
                setCommentDraft('')
              }}
            >
              发送
            </button>
          </div>
        </div>
      ) : null}

      <WhoMarkedPopover
        open={!!whoSheet}
        title={whoSheet?.title || ''}
        reactors={whoSheet?.reactors || []}
        anchor={whoSheet?.anchor || null}
        onClose={() => setWhoSheet(null)}
      />
    </div>
  )
}

function MurmurCard({
  entry,
  contactNames,
  selfId,
  selfName,
  selfAvatarUrl,
  onAddComment,
  onToggleSticker,
}: {
  entry: MurmurEntry
  contactNames?: Map<string, string>
  selfId: string
  selfName: string
  selfAvatarUrl?: string
  onAddComment: (text: string) => void
  onToggleSticker: (emoji: string) => void
}) {
  return (
    <article className="px-4 py-3.5" style={softCardStyle}>
      <div className="mb-2.5 flex items-center gap-2.5">
        <TinyAvatar url={entry.authorAvatarUrl} name={entry.authorName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold tracking-tight" style={{ color: LUMI_SHELL.ink }}>
            {entry.authorName}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: LUMI_SHELL.mist, ...LUMI_SHELL_NUM_STYLE }}>
            {formatHm(entry.createdAt)}
            <span className="mx-1 opacity-40">·</span>
            {visibilityLabel(entry.visibility, contactNames)}
          </p>
        </div>
      </div>
      <p
        className="whitespace-pre-wrap break-words text-[15px] leading-[1.65]"
        style={{ color: LUMI_SHELL.ink }}
      >
        {entry.text}
      </p>
      <EngagementBlock
        entry={entry}
        selfId={selfId}
        selfName={selfName}
        selfAvatarUrl={selfAvatarUrl}
        onAddComment={onAddComment}
        onToggleSticker={onToggleSticker}
      />
    </article>
  )
}

function MurmurComposerSheet({
  open,
  contacts,
  title = '写随手记',
  showVisibility = true,
  onClose,
  onSubmit,
}: {
  open: boolean
  contacts: FriendPulseContact[]
  title?: string
  showVisibility?: boolean
  onClose: () => void
  onSubmit: (text: string, visibility: MurmurVisibility) => void
}) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<MurmurVisibility['mode']>('public')
  const [picked, setPicked] = useState<string[]>([])
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setPortalRoot(document.querySelector('[data-phone-page="wechat"]'))
  }, [open])

  useEffect(() => {
    if (!open) return
    setText('')
    setMode('public')
    setPicked([])
  }, [open])

  if (!portalRoot || !open) return null

  const submit = () => {
    const t = text.trim()
    if (!t) return
    const visibility: MurmurVisibility =
      mode === 'allowlist' || mode === 'blocklist' ? { mode, characterIds: picked } : { mode }
    onSubmit(t, visibility)
    onClose()
  }

  const pickTitle =
    mode === 'allowlist' ? '选择可见好友' : mode === 'blocklist' ? '选择不可见好友' : ''

  return createPortal(
    <div className="absolute inset-0 z-[5200] flex flex-col justify-end" style={{ fontFamily: LUMI_SHELL_FONT }}>
      <button type="button" className="absolute inset-0 bg-black/35" aria-label="关闭" onClick={onClose} />
      <div
        className="relative z-[1] flex max-h-[82%] flex-col overflow-hidden rounded-t-[22px]"
        style={{
          background: LUMI_SHELL.paper,
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <Pressable type="button" className="py-2 text-[15px]" style={{ color: LUMI_SHELL.mist }} onClick={onClose}>
            取消
          </Pressable>
          <p className="text-[16px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
            {title}
          </p>
          <Pressable
            type="button"
            className="py-2 text-[15px] font-medium"
            style={{ color: text.trim() ? LUMI_SHELL.ink : LUMI_SHELL.mist }}
            disabled={!text.trim()}
            onClick={submit}
          >
            发布
          </Pressable>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="烦、累、无语、太阳也太大了吧！想记什么写什么"
            className="min-h-[110px] w-full resize-none rounded-[14px] px-3 py-2.5 text-[15px] outline-none"
            style={{
              background: '#fff',
              border: `1px solid ${LUMI_SHELL.hairline}`,
              color: LUMI_SHELL.ink,
            }}
            autoFocus
          />
          {showVisibility ? (
            <>
              <p className="mb-2 mt-3 text-[12px]" style={{ color: LUMI_SHELL.mist }}>
                谁可见
              </p>
              <div className="mb-3 grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'public' as const, label: '全部好友' },
                    { id: 'allowlist' as const, label: '仅指定可见' },
                    { id: 'blocklist' as const, label: '指定不可见' },
                    { id: 'private' as const, label: '仅自己' },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="rounded-full py-2 text-[12px]"
                    style={{
                      background: mode === o.id ? LUMI_SHELL.ink : '#fff',
                      color: mode === o.id ? '#fff' : LUMI_SHELL.ink,
                      border: `1px solid ${LUMI_SHELL.hairline}`,
                    }}
                    onClick={() => {
                      setMode(o.id)
                      if (o.id !== 'allowlist' && o.id !== 'blocklist') setPicked([])
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {mode === 'allowlist' || mode === 'blocklist' ? (
                <>
                  <p className="mb-1.5 text-[12px]" style={{ color: LUMI_SHELL.mist }}>
                    {pickTitle}
                  </p>
                  <div
                    className="mb-2 max-h-[180px] space-y-1 overflow-y-auto rounded-[14px] bg-white p-2"
                    style={{ border: `1px solid ${LUMI_SHELL.hairline}` }}
                  >
                    {contacts.length === 0 ? (
                      <p className="px-2 py-3 text-center text-[12px]" style={{ color: LUMI_SHELL.mist }}>
                        暂无好友可选
                      </p>
                    ) : (
                      contacts.map((c) => {
                        const on = picked.includes(c.characterId)
                        return (
                          <button
                            key={c.characterId}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left"
                            style={{ background: on ? 'rgba(16,16,18,0.06)' : 'transparent' }}
                            onClick={() =>
                              setPicked((prev) =>
                                on ? prev.filter((id) => id !== c.characterId) : [...prev, c.characterId],
                              )
                            }
                          >
                            <TinyAvatar url={c.avatarUrl} name={c.remarkName} size={28} />
                            <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: LUMI_SHELL.ink }}>
                              {c.remarkName}
                            </span>
                            <span className="text-[12px]" style={{ color: on ? LUMI_SHELL.ink : LUMI_SHELL.mist }}>
                              {on ? '✓' : ''}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              ) : null}
              <p className="text-[11px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
                仅有人脉关系的联系人可反应/评论；无关系角色不会互动。
              </p>
            </>
          ) : (
            <p className="mt-3 text-[11px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
              将作为该角色的公开随手记；仅有人脉关系的联系人可反应和评论。
            </p>
          )}
        </div>
      </div>
    </div>,
    portalRoot,
  )
}

export function MurmurPane({
  mode = 'profile',
  isSelf,
  authorId,
  authorName,
  authorAvatarUrl,
  playerIdentityId,
  contacts,
  stripPanelStyle,
  selfName = '我',
  selfAvatarUrl,
  onBack,
}: {
  mode?: 'profile' | 'board'
  isSelf?: boolean
  authorId?: string
  authorName?: string
  authorAvatarUrl?: string
  playerIdentityId?: string | null
  contacts: FriendPulseContact[]
  stripPanelStyle?: CSSProperties
  selfName?: string
  selfAvatarUrl?: string
  onBack?: () => void
}) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  }, [])
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }))
  const [picked, setPicked] = useState<Date>(today)
  const [list, setList] = useState<MurmurEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [engageBlockedHint, setEngageBlockedHint] = useState<string | null>(null)
  const listRef = useRef(list)
  listRef.current = list
  const contactsRef = useRef(contacts)
  contactsRef.current = contacts

  const selfViewerId = (playerIdentityId || '').trim() || 'me'
  const canComposeAsSelf = mode === 'board' || !!isSelf
  const canComposeAsChar = mode === 'profile' && !isSelf && !!authorId

  const contactsKey = useMemo(
    () => contacts.map((c) => `${c.characterId}:${c.remarkName}`).join('|'),
    [contacts],
  )

  const contactNames = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of contacts) m.set(c.characterId, c.remarkName)
    return m
  }, [contactsKey])

  const loadList = useCallback(async (): Promise<MurmurEntry[]> => {
    if (mode === 'board') {
      return loadMurmurBoardFeed({ playerIdentityId, contacts: contactsRef.current })
    }
    if (isSelf) return loadUserMurmurs(playerIdentityId)
    const cid = (authorId || '').trim()
    return loadCharacterMurmurs(cid, { name: authorName, avatarUrl: authorAvatarUrl })
  }, [authorAvatarUrl, authorId, authorName, isSelf, mode, playerIdentityId])

  // 仅在身份/模式变化时拉数；不在每次父组件重渲染时闪「加载中」
  useEffect(() => {
    let cancelled = false
    const soft = listRef.current.length > 0
    if (!soft) setLoading(true)
    void (async () => {
      try {
        const next = await loadList()
        if (!cancelled) setList(next)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadList, contactsKey])

  useEffect(() => {
    const reload = () => {
      void loadList().then(setList)
    }
    window.addEventListener('wechat-murmur-published', reload)
    return () => window.removeEventListener('wechat-murmur-published', reload)
  }, [loadList])

  useEffect(() => {
    if (!engageBlockedHint) return
    const t = window.setTimeout(() => setEngageBlockedHint(null), 1800)
    return () => window.clearTimeout(t)
  }, [engageBlockedHint])

  const cells = useMemo(() => buildMonthCells(cursor.y, cursor.m), [cursor.y, cursor.m])
  const dayCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of list) m.set(e.dayKey, (m.get(e.dayKey) || 0) + 1)
    return m
  }, [list])

  const dayKey = murmurDayKey(picked)
  const dayEntries = useMemo(
    () => list.filter((e) => e.dayKey === dayKey).sort((a, b) => b.createdAt - a.createdAt),
    [list, dayKey],
  )

  const isUserAuthor = (entry: MurmurEntry) =>
    entry.authorId === SELF_PULSE_ID ||
    entry.authorId === selfViewerId ||
    (!!playerIdentityId && entry.authorId === playerIdentityId)

  const replaceEntry = (updated: MurmurEntry) => {
    setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
  }

  const publishAsSelf = async (text: string, visibility: MurmurVisibility) => {
    if (!canComposeAsSelf) return
    const now = Date.now()
    const id = `m-${now}-${Math.random().toString(36).slice(2, 7)}`
    const entry: MurmurEntry = {
      id,
      authorId: SELF_PULSE_ID,
      authorName: selfName.trim() || '我',
      authorAvatarUrl: selfAvatarUrl,
      text,
      createdAt: now,
      dayKey: murmurDayKey(new Date(now)),
      visibility,
      likes: [],
      reactions: [],
      stickers: [],
      comments: [],
    }
    const prev = await loadUserMurmurs(playerIdentityId)
    await saveUserMurmurs(playerIdentityId, [entry, ...prev])
    setList((cur) => [entry, ...cur.filter((x) => x.id !== entry.id)])
    const jump = new Date()
    jump.setHours(12, 0, 0, 0)
    setPicked(jump)
    setCursor({ y: jump.getFullYear(), m: jump.getMonth() })
  }

  const publishAsCharacter = async (text: string) => {
    if (!canComposeAsChar || !authorId) return
    const now = Date.now()
    const id = `m-char-${now}-${Math.random().toString(36).slice(2, 7)}`
    const visibility: MurmurVisibility = { mode: 'public' }
    const entry: MurmurEntry = {
      id,
      authorId,
      authorName: authorName || 'TA',
      authorAvatarUrl,
      text,
      createdAt: now,
      dayKey: murmurDayKey(new Date(now)),
      visibility,
      likes: [],
      reactions: [],
      stickers: [],
      comments: [],
    }
    const prev = await loadCharacterMurmurs(authorId, { name: authorName, avatarUrl: authorAvatarUrl })
    await saveCharacterMurmurs(authorId, [entry, ...prev.filter((x) => x.id !== entry.id)])
    setList((cur) => [entry, ...cur.filter((x) => x.id !== entry.id)])
    const jump = new Date()
    jump.setHours(12, 0, 0, 0)
    setPicked(jump)
    setCursor({ y: jump.getFullYear(), m: jump.getMonth() })
  }

  const addComment = async (entry: MurmurEntry, text: string) => {
    const ok = await canMurmurEngage({
      authorId: entry.authorId,
      reactorId: selfViewerId,
      playerIdentityId,
      isUserAuthor: isUserAuthor(entry),
    })
    if (!ok) {
      setEngageBlockedHint('仅有人脉关系的联系人可评论')
      return
    }
    const optimistic: MurmurEntry = {
      ...entry,
      comments: [
        ...entry.comments,
        {
          id: `cm-me-${Date.now()}`,
          authorId: selfViewerId,
          authorName: selfName.trim() || '我',
          authorAvatarUrl: selfAvatarUrl,
          text,
          at: Date.now(),
        },
      ],
    }
    replaceEntry(optimistic)
    const saved = await patchMurmurInStore({
      entryId: entry.id,
      authorId: entry.authorId,
      isUserAuthor: isUserAuthor(entry),
      playerIdentityId,
      patch: () => optimistic,
    })
    if (saved) replaceEntry(saved)
  }

  const toggleSticker = async (entry: MurmurEntry, emoji: string) => {
    const already = entry.stickers.some(
      (s) => s.authorId === selfViewerId && s.emoji === emoji,
    )
    if (!already) {
      const ok = await canMurmurEngage({
        authorId: entry.authorId,
        reactorId: selfViewerId,
        playerIdentityId,
        isUserAuthor: isUserAuthor(entry),
      })
      if (!ok) {
        setEngageBlockedHint('仅有人脉关系的联系人可反应')
        return
      }
    }
    let stickers: MurmurSticker[]
    if (already) {
      stickers = entry.stickers.filter(
        (s) => !(s.authorId === selfViewerId && s.emoji === emoji),
      )
    } else {
      const sticker: MurmurSticker = {
        id: `st-me-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        emoji,
        text: '',
        authorId: selfViewerId,
        authorName: selfName.trim() || '我',
        authorAvatarUrl: selfAvatarUrl,
        at: Date.now(),
      }
      stickers = [...entry.stickers, sticker].slice(0, 40)
    }
    const optimistic: MurmurEntry = { ...entry, stickers }
    replaceEntry(optimistic)
    const saved = await patchMurmurInStore({
      entryId: entry.id,
      authorId: entry.authorId,
      isUserAuthor: isUserAuthor(entry),
      playerIdentityId,
      patch: () => optimistic,
    })
    if (saved) replaceEntry(saved)
  }

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const titleHint =
    mode === 'board' ? '随手记广场' : isSelf ? '我的随手记' : `${authorName || 'TA'} 的碎碎念`

  const isBoard = mode === 'board'
  const dayLabel = `${picked.getMonth() + 1}月${picked.getDate()}日 · 周${WEEKDAYS[picked.getDay()]}`

  return (
    <div
      className={isBoard ? 'relative mx-auto w-full max-w-[520px] pb-2' : 'mx-[-1rem] px-4 py-3'}
      style={{
        ...(isBoard ? undefined : stripPanelStyle),
        fontFamily: LUMI_SHELL_FONT,
      }}
    >
      <div className={isBoard ? 'flex flex-col gap-5' : 'flex flex-col gap-3'}>
        {isBoard && onBack ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ color: LUMI_SHELL.ink, background: 'rgba(16,16,18,0.04)' }}
              aria-label="返回"
              onClick={onBack}
            >
              <ChevronLeft size={20} strokeWidth={1.75} />
            </button>
            <p className="min-w-0 flex-1 text-[15px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
              碎碎念
            </p>
            <button
              type="button"
              className="flex h-9 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium"
              style={{ color: LUMI_SHELL.ink, background: 'rgba(16,16,18,0.04)' }}
              aria-label="主动发布设置"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={15} strokeWidth={1.75} />
              设置
            </button>
            {canComposeAsSelf || canComposeAsChar ? (
              <button
                type="button"
                className="ml-0.5 flex h-9 items-center gap-1 rounded-full px-3 text-[12px] font-medium"
                style={{ background: LUMI_SHELL.ink, color: '#fff' }}
                onClick={() => setComposerOpen(true)}
              >
                <Plus size={14} strokeWidth={2.25} />
                写
              </button>
            ) : null}
          </div>
        ) : null}

        {isBoard && !onBack ? (
          <div className="flex items-end justify-between gap-3 px-0.5">
            <div className="min-w-0">
              <p
                className="text-[22px] font-semibold tracking-tight"
                style={{ color: LUMI_SHELL.ink, letterSpacing: '-0.02em' }}
              >
                碎碎念
              </p>
              <p className="mt-1 text-[13px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
                右上角「设置」可开角色主动碎碎念
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="flex h-9 items-center gap-1 rounded-full px-3 text-[12px] font-medium"
                style={{ color: LUMI_SHELL.ink, background: 'rgba(16,16,18,0.04)' }}
                aria-label="主动发布设置"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 size={15} strokeWidth={1.75} />
                设置
              </button>
              {canComposeAsSelf || canComposeAsChar ? (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[12px] font-medium"
                  style={{ background: LUMI_SHELL.ink, color: '#fff' }}
                  onClick={() => setComposerOpen(true)}
                >
                  <Plus size={14} strokeWidth={2.25} />
                  写一笔
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="overflow-hidden px-3.5 pb-3.5 pt-3" style={softCardStyle}>
          <div className="mb-2.5 flex items-center gap-1">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ color: LUMI_SHELL.ink, background: 'rgba(16,16,18,0.04)' }}
              onClick={() => shiftMonth(-1)}
              aria-label="上一月"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
            <p
              className="min-w-0 flex-1 text-center text-[14px] font-semibold tabular-nums"
              style={{ color: LUMI_SHELL.ink, ...LUMI_SHELL_NUM_STYLE }}
            >
              {cursor.y}年{cursor.m + 1}月
            </p>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ color: LUMI_SHELL.ink, background: 'rgba(16,16,18,0.04)' }}
              onClick={() => shiftMonth(1)}
              aria-label="下一月"
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
            {!isBoard && (canComposeAsSelf || canComposeAsChar) ? (
              <button
                type="button"
                className="ml-1 flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium"
                style={{ background: LUMI_SHELL.ink, color: '#fff' }}
                onClick={() => setComposerOpen(true)}
              >
                <Plus size={14} /> 写
              </button>
            ) : null}
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="py-1 text-center text-[10px] font-medium tracking-wide"
                style={{ color: LUMI_SHELL.mist }}
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="aspect-square" />
              const key = murmurDayKey(day)
              const count = dayCounts.get(key) || 0
              const isPickedDay = sameDay(day, picked)
              const isToday = sameDay(day, today)
              const future = day.getTime() > today.getTime()
              return (
                <button
                  key={key}
                  type="button"
                  disabled={future}
                  className="relative flex aspect-square flex-col items-center justify-center rounded-full"
                  style={{
                    background: isPickedDay
                      ? LUMI_SHELL.ink
                      : count
                        ? 'rgba(16,16,18,0.06)'
                        : 'transparent',
                    opacity: future ? 0.28 : 1,
                    boxShadow:
                      isToday && !isPickedDay ? `inset 0 0 0 1px ${LUMI_SHELL.hairline}` : undefined,
                  }}
                  onClick={() => setPicked(day)}
                >
                  <span
                    className="text-[12px] font-medium tabular-nums"
                    style={{
                      color: isPickedDay ? '#fff' : LUMI_SHELL.ink,
                      ...LUMI_SHELL_NUM_STYLE,
                    }}
                  >
                    {day.getDate()}
                  </span>
                  {count > 0 && !isPickedDay ? (
                    <span
                      className="absolute bottom-1 h-1 w-1 rounded-full"
                      style={{ background: LUMI_SHELL.ink }}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-2.5 flex items-baseline justify-between gap-2 px-1">
            <div>
              <p className="text-[13px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
                {dayLabel}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: LUMI_SHELL.mist }}>
                {titleHint}
                {dayEntries.length > 0 ? ` · ${dayEntries.length} 条` : ''}
              </p>
            </div>
          </div>

          {loading && list.length === 0 ? (
            <p className="py-12 text-center text-[13px]" style={{ color: LUMI_SHELL.mist }}>
              加载中…
            </p>
          ) : dayEntries.length === 0 ? (
            <div className="px-4 py-10 text-center" style={softCardStyle}>
              <p className="text-[13px] leading-relaxed" style={{ color: LUMI_SHELL.mist }}>
                {canComposeAsSelf || canComposeAsChar
                  ? '这天还没有随手记，点右上角写一笔。'
                  : '这天还没有碎碎念。'}
              </p>
              {canComposeAsSelf || canComposeAsChar ? (
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1 rounded-full px-4 py-2 text-[12px] font-medium"
                  style={{ background: LUMI_SHELL.ink, color: '#fff' }}
                  onClick={() => setComposerOpen(true)}
                >
                  <Plus size={14} />
                  写一笔
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 12 }}>
              {dayEntries.map((e) => (
                <MurmurCard
                  key={e.id}
                  entry={e}
                  contactNames={contactNames}
                  selfId={selfViewerId}
                  selfName={selfName}
                  selfAvatarUrl={selfAvatarUrl}
                  onAddComment={(text) => void addComment(e, text)}
                  onToggleSticker={(emoji) => void toggleSticker(e, emoji)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <MurmurComposerSheet
        open={composerOpen}
        contacts={contacts}
        title={canComposeAsSelf ? '写随手记' : `以 ${authorName || 'TA'} 发布`}
        showVisibility={canComposeAsSelf}
        onClose={() => setComposerOpen(false)}
        onSubmit={(text, visibility) => {
          if (canComposeAsSelf) void publishAsSelf(text, visibility)
          else void publishAsCharacter(text)
        }}
      />

      {isBoard ? (
        <MurmurPublishSettingsSheet
          open={settingsOpen}
          contacts={contacts}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {engageBlockedHint ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[5400] flex justify-center px-4"
          style={{ fontFamily: LUMI_SHELL_FONT }}
        >
          <p
            className="max-w-[280px] rounded-full px-4 py-2 text-center text-[12px] font-medium"
            style={{
              background: 'rgba(16,16,18,0.88)',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(16,16,18,0.18)',
            }}
          >
            {engageBlockedHint}
          </p>
        </div>
      ) : null}
    </div>
  )
}
