import { AnimatePresence, motion } from 'framer-motion'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { LUMI_SHELL, LUMI_SHELL_FONT } from '../lumiShellTheme'
import { StatusComicBubble } from '../messagesPulse/StatusComicBubble'
import type { FriendPresence } from '../messagesPulse/types'
import {
  DEFAULT_PEER_PRESENCE_THOUGHT,
  loadPeerPresenceThought,
  PEER_PRESENCE_THOUGHT_UPDATED_EVENT,
  type PeerPresenceThoughtStatus,
} from './peerPresenceThoughtStorage'

const PRESENCE_COLOR: Record<FriendPresence, string> = {
  online: '#34C759',
  away: '#F5A623',
  offline: 'rgba(139,139,143,0.55)',
}

const PRESENCE_DOT_LABEL: Record<FriendPresence, string> = {
  online: '在线',
  away: '离开',
  offline: '离线',
}

export type ChatPeerPresenceDotHandle = {
  toggle: () => void
  open: () => void
  close: () => void
}

export const ChatPeerPresenceDot = forwardRef<
  ChatPeerPresenceDotHandle,
  {
    characterId: string
    name: string
    avatarUrl?: string
    size?: number
    /**
     * 自定义触发器（如 X 顶栏头像区）。
     * 传入时不再渲染默认绿点按钮；面板锚点优先用 anchorRef，否则用 trigger 根节点。
     */
    renderTrigger?: (api: {
      open: boolean
      toggle: () => void
      triggerRef: RefObject<HTMLElement | null>
    }) => ReactNode
    /** 面板定位锚点；缺省为触发按钮 */
    anchorRef?: RefObject<HTMLElement | null>
    /** 隐藏默认绿点但仍可通过 ref / openRequest 打开面板 */
    hideDot?: boolean
    /** 外部递增以打开面板 */
    openRequest?: number
  }
>(function ChatPeerPresenceDot(
  {
    characterId,
    name,
    avatarUrl,
    size = 8,
    renderTrigger,
    anchorRef,
    hideDot = false,
    openRequest,
  },
  ref,
) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<PeerPresenceThoughtStatus>(DEFAULT_PEER_PRESENCE_THOUGHT)
  const btnRef = useRef<HTMLElement | null>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  const toggle = () => setOpen((v) => !v)
  const openPanel = () => setOpen(true)
  const closePanel = () => setOpen(false)

  useImperativeHandle(ref, () => ({ toggle, open: openPanel, close: closePanel }), [])

  useEffect(() => {
    if (openRequest == null || openRequest <= 0) return
    setOpen(true)
  }, [openRequest])

  useEffect(() => {
    setPortalRoot(
      document.querySelector('[data-phone-page="wechat"]') ||
        document.querySelector('[data-wx-chat-header]')?.parentElement ||
        null,
    )
  }, [open])

  useEffect(() => {
    const cid = characterId.trim()
    if (!cid) return
    let cancelled = false
    const apply = (next: PeerPresenceThoughtStatus) => {
      if (!cancelled) setStatus(next)
    }
    void loadPeerPresenceThought(cid).then(apply)
    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<{ characterId?: string; status?: PeerPresenceThoughtStatus }>).detail
      if (detail?.characterId?.trim() !== cid || !detail.status) return
      apply(detail.status)
    }
    window.addEventListener(PEER_PRESENCE_THOUGHT_UPDATED_EVENT, onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener(PEER_PRESENCE_THOUGHT_UPDATED_EVENT, onUpdated)
    }
  }, [characterId])

  useEffect(() => {
    if (!open) {
      setPanelPos(null)
      return
    }
    const el = anchorRef?.current ?? btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const phone = document.querySelector('[data-phone-page="wechat"]') as HTMLElement | null
    const rootRect = phone?.getBoundingClientRect()
    const top = rootRect ? rect.bottom - rootRect.top + 8 : rect.bottom + 8
    const left = rootRect
      ? Math.min(Math.max(12, rect.left - rootRect.left - 40), (rootRect.width || 320) - 220)
      : Math.max(12, rect.left - 40)
    setPanelPos({ top, left })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const avatarSrc = resolveCharacterAvatarUrl({ avatarUrl }) || ''
  const presence = status.presence
  const activityLabel = status.presenceLabel.trim() || PRESENCE_DOT_LABEL[presence]
  const thoughtEmoji = status.thoughtEmoji
  const thoughtText = status.thoughtText

  const panel =
    open && portalRoot && panelPos
      ? createPortal(
          <AnimatePresence>
            <motion.div
              key="peer-presence-layer"
              className="absolute inset-0 z-[5600]"
              style={{ fontFamily: LUMI_SHELL_FONT }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/20"
                aria-label="关闭"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                }}
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute w-[200px] overflow-hidden rounded-[16px] bg-[#F7F6F4] shadow-[0_12px_40px_rgba(16,16,18,0.18)]"
                style={{
                  top: panelPos.top,
                  left: panelPos.left,
                  border: `1px solid ${LUMI_SHELL.hairline}`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex w-full flex-col items-center px-3 pb-3 pt-4 text-center">
                  {thoughtEmoji || thoughtText ? (
                    <div className="mb-1 flex w-full justify-center">
                      <StatusComicBubble
                        emoji={thoughtEmoji}
                        text={thoughtText || '…'}
                        placement="above"
                        maxWidth={150}
                      />
                    </div>
                  ) : (
                    <p className="mb-2 w-full text-center text-[11px]" style={{ color: LUMI_SHELL.mist }}>
                      暂无想法
                    </p>
                  )}
                  <div className="relative">
                    <div
                      className="overflow-hidden rounded-full"
                      style={{
                        width: 56,
                        height: 56,
                        background: LUMI_SHELL.hairline,
                        border: `1px solid ${LUMI_SHELL.hairline}`,
                      }}
                    >
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span
                          className="flex h-full w-full items-center justify-center text-[18px]"
                          style={{ color: LUMI_SHELL.mist }}
                        >
                          {(name || '?').slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <span
                      className="absolute bottom-0 right-0 rounded-full"
                      style={{
                        width: 12,
                        height: 12,
                        background: PRESENCE_COLOR[presence],
                        border: '2px solid #F7F6F4',
                      }}
                    />
                  </div>
                  <p
                    className="mt-2 w-full max-w-full truncate px-1 text-center text-[14px] font-semibold"
                    style={{ color: LUMI_SHELL.ink }}
                  >
                    {name}
                  </p>
                  <p className="mt-0.5 w-full text-center text-[10px]" style={{ color: LUMI_SHELL.mist }}>
                    {PRESENCE_DOT_LABEL[presence]}
                  </p>
                  {activityLabel.trim() && activityLabel !== PRESENCE_DOT_LABEL[presence] ? (
                    <p
                      className="mt-0.5 w-full max-w-full truncate px-1 text-center text-[13px] font-medium"
                      style={{ color: LUMI_SHELL.ink }}
                    >
                      {activityLabel.trim()}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          portalRoot,
        )
      : null

  const trigger = renderTrigger ? (
    renderTrigger({ open, toggle, triggerRef: btnRef })
  ) : hideDot ? null : (
    <button
      ref={btnRef as RefObject<HTMLButtonElement>}
      type="button"
      aria-label={`查看 ${name} 的在线状态`}
      className="relative ml-1 inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size + 10, height: size + 10 }}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        toggle()
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: PRESENCE_COLOR[presence],
          boxShadow: presence === 'online' ? '0 0 0 1px rgba(52,199,89,0.28)' : undefined,
        }}
      />
    </button>
  )

  return (
    <>
      {trigger}
      {panel}
    </>
  )
})
