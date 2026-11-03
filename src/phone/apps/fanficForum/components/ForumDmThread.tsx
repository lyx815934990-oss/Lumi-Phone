import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, Send } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'
import { loadResolvedApiConfig } from '../../api/loadResolvedApiConfig'
import { computeRevealDelayMs } from '../../wechat/chatRoom/computeRevealDelayMs'
import { aiGenerateForumDmReply } from '../forumDmAi'
import { FORUM } from '../forumTheme'
import {
  getForumDmItem,
  getForumDmThread,
  type ForumDmBubble,
} from '../forumDmSample'
import { useForumInboxUnreadStore } from '../forumInboxUnreadStore'
import { getNetizenPersona } from '../netizenPersonas'
import { personaAvatarResolved } from '../personaAvatar'
import { getResidentWriter, isResidentWriterId } from '../residentWriters'
import { ForumAvatar } from './ui'

function resolvePerson(id: string) {
  const writer = getResidentWriter(id)
  if (writer) {
    return {
      id: writer.id,
      name: writer.username,
      imageUrl: personaAvatarResolved(writer.id, writer.username),
      role: '驻站写手',
      isWriter: true as const,
    }
  }
  const nz = getNetizenPersona(id)
  return {
    id,
    name: nz?.username ?? '网友',
    imageUrl: personaAvatarResolved(id, nz?.username ?? '网友'),
    role: nz?.archetype ?? '通讯社同好',
    isWriter: false as const,
  }
}

function newBubbleId(): string {
  return `dm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function ForumDmThread({
  dmId,
  selfName,
  onBack,
  onOpenWriter,
}: {
  dmId: string
  selfName: string
  onBack: () => void
  onOpenWriter?: (writerId: string) => void
}) {
  const item = getForumDmItem(dmId)
  const peer = resolvePerson(item?.fromId ?? '')
  const [messages, setMessages] = useState<ForumDmBubble[]>(() => getForumDmThread(dmId))
  const [draft, setDraft] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)
  const [pendingPeerCount, setPendingPeerCount] = useState(0)
  const canOpenWriter = peer.isWriter && isResidentWriterId(peer.id) && !!onOpenWriter
  const markDmRead = useForumInboxUnreadStore((s) => s.markDmRead)

  const messagesRef = useRef(messages)
  const queueRef = useRef<string[]>([])
  const queueTimerRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const replyBusyRef = useRef(false)

  messagesRef.current = messages
  replyBusyRef.current = replyBusy

  useEffect(() => {
    if (!item) return
    markDmRead(dmId)
  }, [dmId, item, markDmRead])

  useEffect(() => {
    return () => {
      if (queueTimerRef.current != null) {
        window.clearTimeout(queueTimerRef.current)
        queueTimerRef.current = null
      }
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, pendingPeerCount, scrollToBottom])

  const drainPeerQueue = useCallback(() => {
    if (queueTimerRef.current != null) return
    const next = queueRef.current[0]
    if (!next) {
      setPendingPeerCount(0)
      return
    }
    const delay = computeRevealDelayMs({ text: next })
    queueTimerRef.current = window.setTimeout(() => {
      queueTimerRef.current = null
      const text = queueRef.current.shift()
      setPendingPeerCount(queueRef.current.length)
      if (text) {
        setMessages((prev) => [
          ...prev,
          { id: newBubbleId(), fromMe: false, text, time: '刚刚' },
        ])
      }
      if (queueRef.current.length) drainPeerQueue()
    }, delay)
  }, [])

  const enqueuePeerBubbles = useCallback(
    (bubbles: string[]) => {
      const cleaned = bubbles.map((b) => b.trim()).filter(Boolean)
      if (!cleaned.length) return
      queueRef.current.push(...cleaned)
      setPendingPeerCount(queueRef.current.length)
      drainPeerQueue()
    },
    [drainPeerQueue],
  )

  const triggerPeerReply = useCallback(async () => {
    if (replyBusyRef.current) return
    if (queueRef.current.length > 0) return
    const history = messagesRef.current
    const last = history[history.length - 1]
    // 与微信一致：仅当最后一条是自己发的，才允许空发催回
    if (!last?.fromMe) return

    setReplyBusy(true)
    try {
      const apiConfig = await loadResolvedApiConfig('chatCard')
      const bubbles = await aiGenerateForumDmReply({
        apiConfig,
        peerId: peer.id,
        selfName,
        messages: history,
      })
      enqueuePeerBubbles(bubbles)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '回复生成失败，请重试')
    } finally {
      setReplyBusy(false)
    }
  }, [enqueuePeerBubbles, peer.id, selfName])

  const commitSendText = useCallback(
    (raw: string, alsoReply: boolean) => {
      const t = raw.trim()
      if (!t) return
      const next: ForumDmBubble = {
        id: newBubbleId(),
        fromMe: true,
        text: t,
        time: '刚刚',
      }
      setMessages((prev) => {
        const updated = [...prev, next]
        messagesRef.current = updated
        return updated
      })
      setDraft('')
      if (alsoReply) {
        queueMicrotask(() => {
          void triggerPeerReply()
        })
      }
    },
    [triggerPeerReply],
  )

  /** 有字 → 发送并触发回复；空白 → 催对方回复（同微信发送键） */
  const onSendButtonClick = () => {
    if (replyBusy || pendingPeerCount > 0) return
    const t = draft.trim()
    if (t) {
      commitSendText(t, true)
      return
    }
    void triggerPeerReply()
  }

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    if (replyBusy || pendingPeerCount > 0) return
    const t = draft.trim()
    if (t) {
      // 回车有字：发送；本轮也触发回复（通讯社私信简化对齐「发送键」）
      commitSendText(t, true)
      return
    }
    void triggerPeerReply()
  }

  const lastIsMine = messages[messages.length - 1]?.fromMe === true
  const canNudge =
    lastIsMine && !replyBusy && pendingPeerCount === 0 && !draft.trim()
  const sendEnabled = Boolean(draft.trim()) || canNudge

  if (!item) {
    return (
      <div className="flex h-full min-h-0 flex-col" style={{ backgroundColor: FORUM.surface1 }}>
        <header
          className="shrink-0 border-b"
          style={{
            paddingTop: FORUM.headerPadTop,
            paddingBottom: 10,
            paddingLeft: FORUM.pagePadX - 8,
            paddingRight: FORUM.pagePadX - 8,
            borderColor: FORUM.hairline,
            backgroundColor: FORUM.surface2,
          }}
        >
          <Pressable
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            aria-label="返回"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} color={FORUM.text} />
          </Pressable>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
          <p style={{ fontSize: 13.5, color: FORUM.textMuted }}>会话不存在或已失效</p>
          <Pressable
            type="button"
            onClick={onBack}
            className="rounded-full px-4 py-2 text-[13px] font-medium active:opacity-80"
            style={{ backgroundColor: FORUM.surface2, color: FORUM.text }}
          >
            返回私信
          </Pressable>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ backgroundColor: FORUM.surface1 }}>
      <header
        className="shrink-0 border-b"
        style={{
          paddingTop: FORUM.headerPadTop,
          paddingBottom: 10,
          paddingLeft: FORUM.pagePadX - 8,
          paddingRight: FORUM.pagePadX - 8,
          borderColor: FORUM.hairline,
          backgroundColor: FORUM.surface2,
        }}
      >
        <div className="flex items-center">
          <Pressable
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:opacity-70"
            aria-label="返回"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} color={FORUM.text} />
          </Pressable>

          <div className="min-w-0 flex-1 px-1 text-center">
            <p className="truncate font-semibold" style={{ fontSize: 15, color: FORUM.text }}>
              {peer.name}
            </p>
            <p className="mt-0.5 truncate" style={{ fontSize: 11, color: FORUM.textMuted }}>
              {peer.role}
            </p>
          </div>

          {canOpenWriter ? (
            <Pressable
              type="button"
              onClick={() => onOpenWriter?.(peer.id)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:opacity-80"
              aria-label="查看写手主页"
            >
              <ForumAvatar size={32} name={peer.name} imageUrl={peer.imageUrl} seed={peer.id} />
            </Pressable>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center">
              <ForumAvatar size={32} name={peer.name} imageUrl={peer.imageUrl} seed={peer.id} />
            </div>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-[19px] py-3 [scrollbar-width:none]"
      >
        <div
          className="mb-3 rounded-[10px] px-3 py-2 text-center"
          style={{ backgroundColor: FORUM.bgAccent }}
        >
          <p style={{ fontSize: 11, color: FORUM.textMuted }}>
            通讯社私信 · 请友好交流，勿人身攻击
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] ${m.fromMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}
              >
                {!m.fromMe ? (
                  <span style={{ fontSize: 10, color: FORUM.textMuted, paddingLeft: 4 }}>
                    {peer.name}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: FORUM.textMuted, paddingRight: 4 }}>
                    {selfName || '我'}
                  </span>
                )}
                <div
                  className="rounded-[14px] px-3.5 py-2.5"
                  style={{
                    backgroundColor: m.fromMe ? FORUM.accent : FORUM.surface2,
                    color: m.fromMe ? FORUM.surface2 : FORUM.text,
                    border: m.fromMe ? 'none' : `1px solid ${FORUM.hairline}`,
                    borderBottomRightRadius: m.fromMe ? 4 : 14,
                    borderBottomLeftRadius: m.fromMe ? 14 : 4,
                  }}
                >
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.text}</p>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: FORUM.textMuted,
                    paddingLeft: m.fromMe ? 0 : 4,
                    paddingRight: m.fromMe ? 4 : 0,
                  }}
                >
                  {m.time}
                </span>
              </div>
            </div>
          ))}

          {replyBusy || pendingPeerCount > 0 ? (
            <div className="flex justify-start">
              <div
                className="rounded-[14px] px-3.5 py-2.5"
                style={{
                  backgroundColor: FORUM.surface2,
                  border: `1px solid ${FORUM.hairline}`,
                  borderBottomLeftRadius: 4,
                }}
              >
                <p style={{ fontSize: 12.5, color: FORUM.textMuted }}>
                  {peer.name} 正在输入…
                </p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="h-4" />
      </div>

      <div
        className="flex shrink-0 items-end gap-2 border-t px-[19px] pt-2"
        style={{
          borderColor: FORUM.hairline,
          backgroundColor: FORUM.surface2,
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder="回复一条私信…"
          disabled={replyBusy}
          className="min-h-[40px] max-h-[96px] flex-1 resize-none px-3 py-2.5 text-[13.5px] outline-none disabled:opacity-60"
          style={{
            borderRadius: 12,
            backgroundColor: FORUM.bgAccent,
            color: FORUM.text,
            border: `1px solid ${FORUM.hairline}`,
          }}
          onKeyDown={onComposerKeyDown}
        />
        <Pressable
          type="button"
          onClick={onSendButtonClick}
          disabled={!sendEnabled}
          className="flex size-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
          style={{ backgroundColor: FORUM.accent }}
          aria-label={draft.trim() ? '发送' : '催对方回复'}
        >
          <Send className="size-4" strokeWidth={2} color={FORUM.surface2} />
        </Pressable>
      </div>
    </div>
  )
}
