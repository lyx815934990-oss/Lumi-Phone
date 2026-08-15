import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import {
  BellOff,
  CircleDot,
  EyeOff,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Pressable } from '../../components/Pressable'
import { resolveCharacterAvatarUrl } from '../../utils/characterAvatarUrl'
import { personaDb } from './newFriendsPersona/idb'
import { LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM, LUMI_SHELL, LUMI_SHELL_FONT, LUMI_THREAD_CAPSULE, lumiThreadCapsuleStyle } from './lumiShellTheme'
import { MessagesPulsePane, MurmurPane, type FriendPulseContact } from './messagesPulse'
import {
  isFriendThread,
  isGroupThread,
  isServiceThread,
  type MessagesThreadRow,
  type WxActiveChat,
} from './messagesThreadTypes'
import { WeChatThreadPreviewText, WeChatThreadTimeText, WeChatUnreadBadgeText } from './wechatUnreadCountText'

export type { MessagesThreadRow, WxActiveChat } from './messagesThreadTypes'

type MessagesHomeSegment = 'chats' | 'pulse' | 'murmur'

function MessagesHomeSegmentControl({
  value,
  onChange,
}: {
  value: MessagesHomeSegment
  onChange: (v: MessagesHomeSegment) => void
}) {
  return (
    <div
      className="mx-auto flex w-full max-w-[320px] items-center gap-1 p-1"
      style={{
        ...lumiThreadCapsuleStyle(),
        borderRadius: 999,
      }}
      role="tablist"
      aria-label="信息首页分段"
    >
      {(
        [
          { id: 'chats' as const, label: '会话' },
          { id: 'pulse' as const, label: '动态' },
          { id: 'murmur' as const, label: '碎碎念' },
        ] as const
      ).map((it) => {
        const on = value === it.id
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            className="relative flex-1 rounded-full py-1.5 text-center text-[13px] font-medium transition-colors"
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

const MSG_THREAD_SWIPE_ACTION_W = 232
const MSG_THREAD_SWIPE_SPRING = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.85 }
const MSG_THREAD_SWIPE_DRAG_THRESHOLD = 7
const MSG_THREAD_SWIPE_COMMIT_RATIO = 0.22
const MSG_THREAD_SWIPE_FLING_PX_PER_SEC = 520

function avatarInitial(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  return t.slice(0, 1)
}

function MessageThreadListItem({
  t,
  serviceStyle,
  muted,
  onOpenChat,
  onLongPress,
  swipeOpen,
  onSwipeOpenChange,
  playerIdentityId,
  onListDataMutated,
  onThreadHidden,
  onRequestDelete,
}: {
  t: MessagesThreadRow
  serviceStyle: boolean
  muted: boolean
  onOpenChat: (chat: WxActiveChat) => void
  onLongPress: (t: MessagesThreadRow, e: ReactPointerEvent) => void
  swipeOpen: boolean
  onSwipeOpenChange: (open: boolean) => void
  playerIdentityId: string | null
  onListDataMutated: () => void
  onThreadHidden?: (conversationKey: string) => void
  onRequestDelete: (t: MessagesThreadRow) => void
}) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  const x = useMotionValue(0)
  const pointerIdRef = useRef<number | null>(null)
  const swipeDraggingRef = useRef(false)
  const swipeStartClientXRef = useRef(0)
  const swipeStartClientYRef = useRef(0)
  const swipeStartXRef = useRef(0)
  const swipeStartOpenRef = useRef(false)
  const pointerSamplesRef = useRef<Array<{ t: number; clientX: number }>>([])

  useEffect(() => {
    void animate(x, swipeOpen ? -MSG_THREAD_SWIPE_ACTION_W : 0, MSG_THREAD_SWIPE_SPRING)
  }, [swipeOpen, x])

  /** 未滑开时完全隐藏操作层，避免半透明胶囊透出圆形按钮 */
  const actionReveal = useTransform(x, [0, -12, -28], [0, 0, 1])

  const clearTimer = () => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const endSwipeDrag = () => {
    swipeDraggingRef.current = false
    const cur = x.get()
    const samples = pointerSamplesRef.current
    let vx = 0
    if (samples.length >= 2) {
      const a = samples[samples.length - 2]!
      const b = samples[samples.length - 1]!
      const dt = Math.max(1, b.t - a.t)
      vx = ((b.clientX - a.clientX) / dt) * 1000
    }
    const startOpen = swipeStartOpenRef.current
    let shouldOpen = startOpen
    if (!startOpen) {
      if (cur <= -MSG_THREAD_SWIPE_ACTION_W * MSG_THREAD_SWIPE_COMMIT_RATIO || vx < -MSG_THREAD_SWIPE_FLING_PX_PER_SEC) {
        shouldOpen = true
      }
    } else if (
      cur >= -MSG_THREAD_SWIPE_ACTION_W * (1 - MSG_THREAD_SWIPE_COMMIT_RATIO) ||
      vx > MSG_THREAD_SWIPE_FLING_PX_PER_SEC
    ) {
      shouldOpen = false
    }
    onSwipeOpenChange(shouldOpen)
    void animate(x, shouldOpen ? -MSG_THREAD_SWIPE_ACTION_W : 0, MSG_THREAD_SWIPE_SPRING)
    pointerSamplesRef.current = []
  }

  const runPin = async () => {
    if (!playerIdentityId) return
    await personaDb.updatePinnedStatus({
      conversationKey: t.conversationKey,
      peerCharacterId: t.peerCharacterId,
      playerIdentityId,
      isPinned: !t.isPinned,
    })
    onSwipeOpenChange(false)
    void animate(x, 0, MSG_THREAD_SWIPE_SPRING)
    onListDataMutated()
  }

  const runMarkUnread = async () => {
    await personaDb.markWeChatConversationUnread(t.conversationKey)
    onSwipeOpenChange(false)
    void animate(x, 0, MSG_THREAD_SWIPE_SPRING)
    onListDataMutated()
  }

  const runHide = async () => {
    const existing = await personaDb.getChatConversationSettings(t.conversationKey)
    const pid = playerIdentityId?.trim() || existing?.playerIdentityId?.trim()
    if (!pid) return
    onThreadHidden?.(t.conversationKey)
    onSwipeOpenChange(false)
    void animate(x, 0, MSG_THREAD_SWIPE_SPRING)
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    await personaDb.upsertChatConversationSettings({
      conversationKey: t.conversationKey,
      peerCharacterId: t.peerCharacterId,
      playerIdentityId: pid,
      hiddenFromMessageList: true,
    })
  }

  const runDelete = () => {
    onSwipeOpenChange(false)
    void animate(x, 0, MSG_THREAD_SWIPE_SPRING)
    onRequestDelete(t)
  }

  const swipeActionSlotClass =
    'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5'
  const swipeActionCircleBase: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    boxShadow: '0 2px 8px rgba(16,16,18,0.06)',
  }
  const swipeActionLabelClass = 'max-w-full truncate text-center text-[10px] font-medium leading-none'

  const radius = serviceStyle ? 14 : 999
  const draft = t.draftPreview?.trim() || ''
  const capsule = lumiThreadCapsuleStyle()

  return (
    <div
      data-swipe-row-root
      className="relative isolate overflow-hidden"
      style={{
        fontFamily: LUMI_SHELL_FONT,
        ...capsule,
      }}
    >
      {/* 左滑露出层：圆形软按钮；未滑开时 opacity=0，避免透出 */}
      <motion.div
        className="absolute inset-y-0 right-0 z-0 flex items-center gap-1 px-1.5"
        style={{
          width: MSG_THREAD_SWIPE_ACTION_W,
          background: 'transparent',
          opacity: actionReveal,
        }}
        aria-hidden={!swipeOpen}
      >
        <button
          type="button"
          data-swipe-action
          tabIndex={swipeOpen ? 0 : -1}
          className={swipeActionSlotClass}
          style={{ pointerEvents: swipeOpen ? 'auto' : 'none', color: LUMI_SHELL.ink }}
          onClick={() => void runPin()}
        >
          <span
            style={{
              ...swipeActionCircleBase,
              background: 'rgba(255,255,255,0.92)',
            }}
          >
            <Pin
              className="size-4 shrink-0"
              strokeWidth={2}
              style={{ transform: 'rotate(45deg)' }}
              aria-hidden
            />
          </span>
          <span className={swipeActionLabelClass}>{t.isPinned ? '取消置顶' : '置顶'}</span>
        </button>
        <button
          type="button"
          data-swipe-action
          tabIndex={swipeOpen ? 0 : -1}
          className={swipeActionSlotClass}
          style={{ pointerEvents: swipeOpen ? 'auto' : 'none', color: LUMI_SHELL.ink }}
          onClick={() => void runMarkUnread()}
        >
          <span
            style={{
              ...swipeActionCircleBase,
              background: 'rgba(255,255,255,0.92)',
            }}
          >
            <CircleDot className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          </span>
          <span className={swipeActionLabelClass}>标为未读</span>
        </button>
        <button
          type="button"
          data-swipe-action
          tabIndex={swipeOpen ? 0 : -1}
          className={swipeActionSlotClass}
          style={{ pointerEvents: swipeOpen ? 'auto' : 'none', color: LUMI_SHELL.ink }}
          onClick={() => void runHide()}
        >
          <span
            style={{
              ...swipeActionCircleBase,
              background: 'rgba(255,255,255,0.92)',
            }}
          >
            <EyeOff className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          </span>
          <span className={swipeActionLabelClass}>不显示</span>
        </button>
        <button
          type="button"
          data-swipe-action
          tabIndex={swipeOpen ? 0 : -1}
          className={swipeActionSlotClass}
          style={{ pointerEvents: swipeOpen ? 'auto' : 'none', color: LUMI_SHELL.badgeRed }}
          onClick={runDelete}
        >
          <span
            style={{
              ...swipeActionCircleBase,
              background: 'rgba(229,72,77,0.12)',
              color: LUMI_SHELL.badgeRed,
            }}
          >
            <Trash2 className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          </span>
          <span className={swipeActionLabelClass}>删除</span>
        </button>
      </motion.div>

      <motion.div
        className="relative z-[1] w-full touch-pan-y"
        style={{
          x,
          // 不透明前景，避免未滑开时透过玻璃看到背后圆形按钮
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          borderRadius: LUMI_THREAD_CAPSULE.radiusPx,
          backdropFilter: LUMI_THREAD_CAPSULE.blur,
          WebkitBackdropFilter: LUMI_THREAD_CAPSULE.blur,
        }}
        onPointerDownCapture={(e) => {
          if ((e.target as HTMLElement).closest('[data-swipe-action]')) return
          pointerIdRef.current = e.pointerId
          swipeDraggingRef.current = false
          swipeStartClientXRef.current = e.clientX
          swipeStartClientYRef.current = e.clientY
          swipeStartXRef.current = x.get()
          swipeStartOpenRef.current = swipeOpen
          pointerSamplesRef.current = [{ t: performance.now(), clientX: e.clientX }]
          longPressFiredRef.current = false
          clearTimer()
          longPressTimerRef.current = window.setTimeout(() => {
            longPressFiredRef.current = true
            onLongPress(t, e)
          }, 520)
        }}
        onPointerMoveCapture={(e) => {
          if (pointerIdRef.current !== e.pointerId) return
          const dx = e.clientX - swipeStartClientXRef.current
          const dy = e.clientY - swipeStartClientYRef.current
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) clearTimer()
          if (!swipeDraggingRef.current) {
            if (Math.abs(dx) < MSG_THREAD_SWIPE_DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return
            swipeDraggingRef.current = true
            try {
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
          }
          e.preventDefault()
          const now = performance.now()
          const samples = pointerSamplesRef.current
          samples.push({ t: now, clientX: e.clientX })
          if (samples.length > 6) samples.splice(0, samples.length - 6)
          let next = swipeStartXRef.current + dx
          const min = -MSG_THREAD_SWIPE_ACTION_W
          const max = 0
          const rubber = 0.22
          if (next > max) next = max + (next - max) * rubber
          else if (next < min) next = min + (next - min) * rubber
          x.set(next)
        }}
        onPointerUpCapture={(e) => {
          if (pointerIdRef.current !== e.pointerId) return
          pointerIdRef.current = null
          clearTimer()
          try {
            ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          if (swipeDraggingRef.current) endSwipeDrag()
        }}
        onPointerCancelCapture={(e) => {
          if (pointerIdRef.current !== e.pointerId) return
          pointerIdRef.current = null
          clearTimer()
          try {
            ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          if (swipeDraggingRef.current) endSwipeDrag()
        }}
      >
        <Pressable
          onPointerUp={clearTimer}
          onPointerCancel={clearTimer}
          onPointerLeave={clearTimer}
          onClick={() => {
            if (longPressFiredRef.current) {
              longPressFiredRef.current = false
              return
            }
            if (swipeOpen) {
              onSwipeOpenChange(false)
              void animate(x, 0, MSG_THREAD_SWIPE_SPRING)
              return
            }
            onOpenChat(
              t.kind === 'lumi'
                ? { kind: 'lumi' }
                : t.kind === 'self'
                  ? { kind: 'self' }
                  : t.kind === 'group'
                    ? { kind: 'group', groupId: t.groupId }
                    : { kind: 'persona', characterId: t.characterId },
            )
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
          style={{ backgroundColor: 'transparent', borderRadius: LUMI_THREAD_CAPSULE.radiusPx }}
        >
          <span className="relative inline-flex h-12 w-12 shrink-0">
            {t.avatarUrl ? (
              <img
                src={resolveCharacterAvatarUrl({ avatarUrl: t.avatarUrl }) || t.avatarUrl}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 object-cover"
                style={{ borderRadius: radius, background: 'rgba(16,16,18,0.06)' }}
              />
            ) : (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center text-[16px] font-semibold"
                style={{
                  borderRadius: radius,
                  background: 'rgba(16,16,18,0.06)',
                  color: LUMI_SHELL.mist,
                }}
              >
                {avatarInitial(t.name)}
              </div>
            )}
            {t.unread > 0 ? (
              <span
                className={`pointer-events-none absolute right-0 top-0 flex items-center justify-center rounded-full text-[10px] font-bold leading-none text-white ${
                  muted
                    ? 'h-[10px] w-[10px] translate-x-[30%] -translate-y-[30%]'
                    : 'min-h-[18px] min-w-[18px] -translate-y-[30%] translate-x-[35%] px-[5px]'
                }`}
                style={{ background: LUMI_SHELL.badgeRed, boxShadow: '0 0 0 1.5px rgba(255,255,255,0.95)' }}
                title={`未读 ${t.unread} 条`}
                aria-label={`未读 ${t.unread} 条`}
              >
                {muted ? null : <WeChatUnreadBadgeText count={t.unread} />}
              </span>
            ) : null}
          </span>
          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-[15px] font-semibold" style={{ color: LUMI_SHELL.ink }}>
                {t.name}
              </p>
              <span className="shrink-0 text-[12px] leading-none" style={{ color: LUMI_SHELL.mist }}>
                <WeChatThreadTimeText text={t.time} />
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-[14px] leading-snug" style={{ color: LUMI_SHELL.mist }}>
                {draft ? (
                  <>
                    <span style={{ color: LUMI_SHELL.badgeRed }}>[草稿]</span>
                    <span> </span>
                    <WeChatThreadPreviewText text={draft} />
                  </>
                ) : (
                  <WeChatThreadPreviewText text={t.preview} />
                )}
              </p>
              {muted ? (
                <BellOff className="shrink-0" width={12} height={12} strokeWidth={2} color={LUMI_SHELL.mist} aria-hidden />
              ) : null}
            </div>
          </div>
        </Pressable>
      </motion.div>
    </div>
  )
}

function ThreadGroupCard({
  title,
  threads,
  serviceStyle,
  isConversationMuted,
  onOpenChat,
  onLongPressRow,
  swipeOpenThreadKey,
  setSwipeOpenThreadKey,
  playerIdentityId,
  onListDataMutated,
  onThreadHidden,
  onRequestDelete,
}: {
  title: ReactNode
  threads: MessagesThreadRow[]
  serviceStyle: boolean
  isConversationMuted: (conversationKey: string) => boolean
  onOpenChat: (chat: WxActiveChat) => void
  onLongPressRow: (t: MessagesThreadRow, e: ReactPointerEvent) => void
  swipeOpenThreadKey: string | null
  setSwipeOpenThreadKey: (k: string | null) => void
  playerIdentityId: string | null
  onListDataMutated: () => void
  onThreadHidden?: (conversationKey: string) => void
  onRequestDelete: (t: MessagesThreadRow) => void
}) {
  if (!threads.length) return null
  return (
    <section>
      <div
        className="px-1 pb-2.5 pt-0.5 text-[11px] font-semibold tracking-[0.08em]"
        style={{ color: LUMI_SHELL.mist }}
      >
        {title}
      </div>
      <div className="flex flex-col" style={{ gap: LUMI_THREAD_CAPSULE.gapPx }}>
        {threads.map((t) => {
          const muted = isConversationMuted(t.conversationKey)
          return (
            <MessageThreadListItem
              key={t.key}
              t={t}
              serviceStyle={serviceStyle}
              muted={muted}
              onOpenChat={onOpenChat}
              onLongPress={onLongPressRow}
              swipeOpen={swipeOpenThreadKey === t.key}
              onSwipeOpenChange={(open) => setSwipeOpenThreadKey(open ? t.key : null)}
              playerIdentityId={playerIdentityId}
              onListDataMutated={onListDataMutated}
              onThreadHidden={onThreadHidden}
              onRequestDelete={onRequestDelete}
            />
          )
        })}
      </div>
    </section>
  )
}

export function MessagesTab({
  threads,
  pinnedExpanded,
  onPinnedExpandedChange,
  isConversationMuted,
  onOpenChat,
  playerIdentityId,
  onListDataMutated,
  onThreadHidden,
  onAddFriend,
  onNewGroup,
  onHome,
  pulseContacts = [],
  pulseSelfName,
  pulseSelfAvatarUrl,
  onOpenPulseFriend,
}: {
  threads: MessagesThreadRow[]
  pinnedExpanded: boolean
  onPinnedExpandedChange: (v: boolean) => void
  isConversationMuted: (conversationKey: string) => boolean
  onOpenChat: (chat: WxActiveChat) => void
  playerIdentityId: string | null
  onListDataMutated: () => void
  onThreadHidden?: (conversationKey: string) => void
  onAddFriend?: () => void
  onNewGroup?: () => void
  /** 返回手机桌面（信息页自管顶栏时须自行挂载） */
  onHome?: () => void
  /** 动态页：通讯录人设好友 */
  pulseContacts?: FriendPulseContact[]
  pulseSelfName?: string
  pulseSelfAvatarUrl?: string
  onOpenPulseFriend?: (characterId: string) => void
}) {
  const [homeSegment, setHomeSegment] = useState<MessagesHomeSegment>('chats')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [plusOpen, setPlusOpen] = useState(false)
  const [swipeOpenThreadKey, setSwipeOpenThreadKey] = useState<string | null>(null)
  const [deleteConfirmThread, setDeleteConfirmThread] = useState<MessagesThreadRow | null>(null)
  const [pinActionSheet, setPinActionSheet] = useState<{
    thread: MessagesThreadRow
    x: number
    y: number
  } | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return threads.filter((t) => {
      if (!q) return true
      return t.name.toLowerCase().includes(q) || t.preview.toLowerCase().includes(q) || (t.draftPreview || '').toLowerCase().includes(q)
    })
  }, [threads, searchQuery])

  const friendThreads = useMemo(() => {
    const rows = filtered.filter((t) => isFriendThread(t) || isGroupThread(t))
    return [...rows].sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
  }, [filtered])

  const serviceThreads = useMemo(() => {
    const rows = filtered.filter(isServiceThread)
    return [...rows].sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
  }, [filtered])

  const pinnedInFriends = useMemo(() => friendThreads.filter((t) => t.isPinned), [friendThreads])
  const normalFriendThreads = useMemo(() => friendThreads.filter((t) => !t.isPinned), [friendThreads])
  const needsFold = pinnedInFriends.length >= 4

  const pinnedListForCard = useMemo(() => {
    if (!needsFold || pinnedExpanded) return pinnedInFriends
    return pinnedInFriends.slice(0, 3)
  }, [needsFold, pinnedExpanded, pinnedInFriends])

  const foldRestCount = pinnedInFriends.length - 3

  const onLongPressRow = useCallback((t: MessagesThreadRow, e: ReactPointerEvent) => {
    setPinActionSheet({ thread: t, x: e.clientX, y: e.clientY })
  }, [])

  const applyPinToggle = useCallback(
    async (t: MessagesThreadRow, nextPinned: boolean) => {
      if (!playerIdentityId) return
      await personaDb.updatePinnedStatus({
        conversationKey: t.conversationKey,
        peerCharacterId: t.peerCharacterId,
        playerIdentityId,
        isPinned: nextPinned,
      })
      setPinActionSheet(null)
      onListDataMutated()
    },
    [playerIdentityId, onListDataMutated],
  )

  const applyDeleteThread = useCallback(
    async (mode: 'hard' | 'soft') => {
      if (!deleteConfirmThread) return
      if (deleteConfirmThread.kind === 'group') {
        const pid = playerIdentityId?.trim()
        if (pid) await personaDb.leaveGroupChat(deleteConfirmThread.groupId, pid)
      } else if (mode === 'soft') {
        await personaDb.hideWeChatConversationHistoryFromUiKeepAiContext(deleteConfirmThread.conversationKey)
      } else {
        await personaDb.deleteAllWeChatMessagesForConversation(deleteConfirmThread.conversationKey)
      }
      setDeleteConfirmThread(null)
      setSwipeOpenThreadKey(null)
      onListDataMutated()
    },
    [deleteConfirmThread, onListDataMutated, playerIdentityId],
  )

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      style={{
        fontFamily: LUMI_SHELL_FONT,
        background: LUMI_SHELL.paper,
        /* 消息页隐藏了微信 Header，需自行吃沉浸式顶安全区（与 Header 一致） */
        paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
      }}
    >
      {/* 顶栏 */}
      <div className="relative flex shrink-0 items-center justify-center px-4 pb-1 pt-2">
        {onHome ? (
          <div className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center">
            <Pressable
              type="button"
              data-wx-chat-header-btn="back"
              onClick={onHome}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ color: LUMI_SHELL.ink }}
              aria-label="返回桌面"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 11l9-7 9 7" />
                <path d="M5 10.5V20a1.8 1.8 0 0 0 1.8 1.8h10.4A1.8 1.8 0 0 0 19 20v-9.5" />
                <path d="M10 21v-6.2a1.6 1.6 0 0 1 1.6-1.6h.8a1.6 1.6 0 0 1 1.6 1.6V21" />
              </svg>
            </Pressable>
          </div>
        ) : null}
        <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: LUMI_SHELL.ink }}>
          微信
        </h1>
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {homeSegment === 'chats' ? (
            <>
          <Pressable
            type="button"
            aria-label={searchOpen ? '关闭搜索' : '搜索'}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ color: LUMI_SHELL.ink }}
            onClick={() => {
              setSearchOpen((o) => !o)
              if (searchOpen) setSearchQuery('')
            }}
          >
            {searchOpen ? <X size={20} strokeWidth={1.75} /> : <Search size={20} strokeWidth={1.75} />}
          </Pressable>
          <div className="relative">
            <Pressable
              type="button"
              aria-label="添加"
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ color: LUMI_SHELL.ink }}
              onClick={() => setPlusOpen((o) => !o)}
            >
              <Plus size={22} strokeWidth={1.75} />
            </Pressable>
            {plusOpen ? (
              <>
                <Pressable type="button" aria-label="关闭" className="fixed inset-0 z-[198]" onClick={() => setPlusOpen(false)}>
                  {null}
                </Pressable>
                <div
                  className="absolute right-0 top-[calc(100%+6px)] z-[199] min-w-[160px] overflow-hidden rounded-[12px] py-1"
                  style={{
                    background: LUMI_SHELL.card,
                    border: `1px solid ${LUMI_SHELL.hairline}`,
                    boxShadow: '0 10px 30px rgba(16,16,18,0.12)',
                  }}
                >
                  <Pressable
                    type="button"
                    className="flex w-full px-4 py-3 text-left text-[15px]"
                    style={{ color: LUMI_SHELL.ink }}
                    onClick={() => {
                      setPlusOpen(false)
                      onNewGroup?.()
                    }}
                  >
                    发起群聊
                  </Pressable>
                  <Pressable
                    type="button"
                    className="flex w-full px-4 py-3 text-left text-[15px]"
                    style={{ color: LUMI_SHELL.ink }}
                    onClick={() => {
                      setPlusOpen(false)
                      onAddFriend?.()
                    }}
                  >
                    添加朋友
                  </Pressable>
                </div>
              </>
            ) : null}
          </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-2 pt-1">
        <MessagesHomeSegmentControl
          value={homeSegment}
          onChange={(v) => {
            setHomeSegment(v)
            if (v !== 'chats') {
              setSearchOpen(false)
              setSearchQuery('')
              setPlusOpen(false)
              setSwipeOpenThreadKey(null)
            }
          }}
        />
      </div>

      {homeSegment === 'chats' && searchOpen ? (
        <div className="px-4 pb-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索会话"
            className="h-9 w-full rounded-[10px] px-3 text-[14px] outline-none"
            style={{
              background: LUMI_SHELL.card,
              border: `1px solid ${LUMI_SHELL.hairline}`,
              color: LUMI_SHELL.ink,
              fontFamily: LUMI_SHELL_FONT,
            }}
            autoFocus
          />
        </div>
      ) : null}

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] px-4 pt-2"
        style={{
          paddingBottom: LUMI_LIQUID_NAV_CONTENT_PAD_BOTTOM,
        }}
        onPointerDownCapture={(e) => {
          if (homeSegment !== 'chats' || !swipeOpenThreadKey) return
          const el = e.target as HTMLElement
          if (!el.closest('[data-swipe-row-root]')) setSwipeOpenThreadKey(null)
        }}
      >
        {homeSegment === 'pulse' ? (
          <MessagesPulsePane
            contacts={pulseContacts}
            playerIdentityId={playerIdentityId}
            selfName={pulseSelfName}
            selfAvatarUrl={pulseSelfAvatarUrl}
            onOpenFriend={onOpenPulseFriend}
          />
        ) : homeSegment === 'murmur' ? (
          <MurmurPane
            mode="board"
            contacts={pulseContacts}
            playerIdentityId={playerIdentityId}
            selfName={pulseSelfName}
            selfAvatarUrl={pulseSelfAvatarUrl}
          />
        ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={searchQuery}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mx-auto flex w-full max-w-[520px] flex-col"
            style={{ gap: 24 }}
          >
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-[14px]" style={{ color: LUMI_SHELL.mist }}>
                暂无会话
              </p>
            ) : (
              <>
                {pinnedListForCard.length > 0 || normalFriendThreads.length > 0 ? (
                  <div className="flex flex-col" style={{ gap: 24 }}>
                    {pinnedListForCard.length > 0 ? (
                      <div>
                        <ThreadGroupCard
                          title={
                            <span className="inline-flex items-center gap-1">
                              <Pin
                                className="size-3"
                                strokeWidth={2.25}
                                style={{ transform: 'rotate(45deg)' }}
                                aria-hidden
                              />
                              置顶
                            </span>
                          }
                          threads={pinnedListForCard}
                          serviceStyle={false}
                          isConversationMuted={isConversationMuted}
                          onOpenChat={onOpenChat}
                          onLongPressRow={onLongPressRow}
                          swipeOpenThreadKey={swipeOpenThreadKey}
                          setSwipeOpenThreadKey={setSwipeOpenThreadKey}
                          playerIdentityId={playerIdentityId}
                          onListDataMutated={onListDataMutated}
                          onThreadHidden={onThreadHidden}
                          onRequestDelete={setDeleteConfirmThread}
                        />
                        {needsFold ? (
                          <button
                            type="button"
                            className="mt-2.5 w-full py-2.5 text-center text-[13px]"
                            style={{
                              color: LUMI_SHELL.mist,
                              ...lumiThreadCapsuleStyle(),
                            }}
                            onClick={() => onPinnedExpandedChange(!pinnedExpanded)}
                          >
                            {pinnedExpanded ? '收起置顶聊天' : `展开${foldRestCount}条置顶聊天`}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {normalFriendThreads.length > 0 ? (
                      <ThreadGroupCard
                        title="好友消息"
                        threads={normalFriendThreads}
                        serviceStyle={false}
                        isConversationMuted={isConversationMuted}
                        onOpenChat={onOpenChat}
                        onLongPressRow={onLongPressRow}
                        swipeOpenThreadKey={swipeOpenThreadKey}
                        setSwipeOpenThreadKey={setSwipeOpenThreadKey}
                        playerIdentityId={playerIdentityId}
                        onListDataMutated={onListDataMutated}
                        onThreadHidden={onThreadHidden}
                        onRequestDelete={setDeleteConfirmThread}
                      />
                    ) : null}
                  </div>
                ) : null}

                {serviceThreads.length > 0 ? (
                  <ThreadGroupCard
                    title="服务号"
                    threads={serviceThreads}
                    serviceStyle
                    isConversationMuted={isConversationMuted}
                    onOpenChat={onOpenChat}
                    onLongPressRow={onLongPressRow}
                    swipeOpenThreadKey={swipeOpenThreadKey}
                    setSwipeOpenThreadKey={setSwipeOpenThreadKey}
                    playerIdentityId={playerIdentityId}
                    onListDataMutated={onListDataMutated}
                    onThreadHidden={onThreadHidden}
                    onRequestDelete={setDeleteConfirmThread}
                  />
                ) : null}
              </>
            )}
          </motion.div>
        </AnimatePresence>
        )}
      </div>

      {pinActionSheet ? (
        <div className="fixed inset-0 z-[280]" role="presentation">
          <button type="button" aria-label="关闭" className="absolute inset-0 bg-black/20" onClick={() => setPinActionSheet(null)} />
          <div
            className="absolute min-w-[200px] overflow-hidden rounded-[12px] bg-white shadow-lg"
            style={{
              border: `1px solid ${LUMI_SHELL.hairline}`,
              left: Math.min(pinActionSheet.x, typeof window !== 'undefined' ? window.innerWidth - 220 : pinActionSheet.x),
              top: Math.min(pinActionSheet.y, typeof window !== 'undefined' ? window.innerHeight - 120 : pinActionSheet.y),
            }}
          >
            <Pressable
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3.5 text-left text-[16px]"
              style={{ color: LUMI_SHELL.ink, borderBottom: `1px solid ${LUMI_SHELL.hairline}`, borderRadius: 0, background: '#fff' }}
              onClick={() => void applyPinToggle(pinActionSheet.thread, !pinActionSheet.thread.isPinned)}
            >
              {pinActionSheet.thread.isPinned ? (
                <>
                  <PinOff className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                  <span>取消置顶</span>
                </>
              ) : (
                <>
                  <Pin
                    className="size-4 shrink-0"
                    strokeWidth={2}
                    style={{ transform: 'rotate(45deg)' }}
                    aria-hidden
                  />
                  <span>置顶聊天</span>
                </>
              )}
            </Pressable>
            <Pressable
              type="button"
              className="w-full px-4 py-3.5 text-left text-[16px]"
              style={{ color: LUMI_SHELL.ink, borderRadius: 0, background: '#fff' }}
              onClick={() => setPinActionSheet(null)}
            >
              取消
            </Pressable>
          </div>
        </div>
      ) : null}

      {deleteConfirmThread ? (
        <div className="fixed inset-0 z-[285] flex items-center justify-center px-5" role="presentation">
          <button type="button" aria-label="关闭删除确认" className="absolute inset-0 bg-black/35" onClick={() => setDeleteConfirmThread(null)} />
          <div
            className="relative z-[1] w-full max-w-[320px] overflow-hidden rounded-[14px] bg-white"
            style={{ border: `1px solid ${LUMI_SHELL.hairline}`, boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}
          >
            <div className="px-5 py-4">
              <h3 className="text-[17px] font-medium" style={{ color: LUMI_SHELL.ink }}>
                {deleteConfirmThread.kind === 'group' ? '确认删除并退出群聊？' : '确认删除聊天？'}
              </h3>
              <p className="mt-2 text-[13px] leading-6" style={{ color: LUMI_SHELL.mist }}>
                {deleteConfirmThread.kind === 'group'
                  ? `将退出群聊「${deleteConfirmThread.name}」并清空本会话在本地的全部记录。`
                  : `与「${deleteConfirmThread.name}」的会话可选择彻底删除或仅清空界面。`}
              </p>
            </div>
            {deleteConfirmThread.kind === 'group' ? (
              <div className="flex" style={{ borderTop: `1px solid ${LUMI_SHELL.hairline}` }}>
                <button type="button" className="h-11 flex-1 text-[16px]" style={{ color: LUMI_SHELL.mist }} onClick={() => setDeleteConfirmThread(null)}>
                  取消
                </button>
                <div className="h-11 w-px" style={{ background: LUMI_SHELL.hairline }} aria-hidden />
                <button
                  type="button"
                  className="h-11 flex-1 text-[16px] font-medium"
                  style={{ color: LUMI_SHELL.badgeRed }}
                  onClick={() => void applyDeleteThread('hard')}
                >
                  删除并退出
                </button>
              </div>
            ) : (
              <div className="flex flex-col" style={{ borderTop: `1px solid ${LUMI_SHELL.hairline}` }}>
                <button type="button" className="h-11 w-full text-[16px] font-medium" style={{ color: LUMI_SHELL.badgeRed }} onClick={() => void applyDeleteThread('hard')}>
                  彻底删除
                </button>
                <div className="h-px w-full" style={{ background: LUMI_SHELL.hairline }} aria-hidden />
                <button type="button" className="h-11 w-full text-[16px]" style={{ color: LUMI_SHELL.ink }} onClick={() => void applyDeleteThread('soft')}>
                  仅清空界面
                </button>
                <div className="h-px w-full" style={{ background: LUMI_SHELL.hairline }} aria-hidden />
                <button type="button" className="h-11 w-full text-[16px]" style={{ color: LUMI_SHELL.mist }} onClick={() => setDeleteConfirmThread(null)}>
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
