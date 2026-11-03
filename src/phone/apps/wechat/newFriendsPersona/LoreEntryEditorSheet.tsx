import { AnimatePresence, motion } from 'framer-motion'
import { BookmarkPlus, Check, Eye, EyeOff, Pencil, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ensureElementVisibleAboveKeyboard,
  isAndroidWeb,
  resolveAndroidKeyboardPadPx,
} from '../../../hooks/keyboardInset'
import { isIOSWebKit } from '../../../utils/platform'
import {
  WORLD_BOOK_CHAR_PLACEHOLDER,
  WORLD_BOOK_USER_PLACEHOLDER,
  linkedCharacterPlaceholder,
  type WorldBookUserInsertContext,
} from '../charUserPlaceholders'
import {
  describeWorldBookUserPlaceholderBindingState,
  insertWorldBookUserPlaceholderInContent,
  migrateWorldBookItemUserPlaceholderLegacy,
  normalizeWorldBookItemUserPlaceholders,
  worldBookItemHasLegacyScopedUserPlaceholder,
} from '../worldBookUserPlaceholderBindings'
import {
  PlaceholderAwareTextarea,
  useCharacterFieldPlaceholderPreview,
  type PlaceholderAwareTextareaHandle,
} from './characterFieldPlaceholderPreview'
import type { Character, WorldBook, WorldBookItem } from './types'

const WB_ITEM_GENERATING_TEXT = '生成中…'

/** 与人设名片 / 世界书架一致的硬边水墨色 */
const INK = '#1E2024'
const PAGE = '#EDEBE7'
const CARD = '#F8F7F4'
const LINE = '#D2D0CB'
const FOIL = '#5A6574'
const MUTED = '#6A6E76'
const FAINT = '#9AA0A8'

const BODY_TEXTAREA_CLASS =
  'block min-h-[160px] w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed outline-none read-only:cursor-wait [-webkit-overflow-scrolling:touch]'

type PeerRow = { id: string; label: string; role: 'archive_root' | 'network_npc' }

function InkLabel({ zh, en }: { zh: string; en: string }) {
  return (
    <div className="mb-2">
      <p className="text-[11px] font-semibold leading-none" style={{ color: INK }}>
        {zh}
      </p>
      <p className="mt-1 font-serif text-[9px] tracking-[0.2em]" style={{ color: FOIL }}>
        {en}
      </p>
    </div>
  )
}

function measureIosKeyboardPadPx(): number {
  const vv = window.visualViewport
  if (!vv) return 0
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
}

export function LoreEntryEditorSheet({
  open,
  onClose,
  character,
  worldBook: _worldBook,
  item,
  wbId,
  itemId,
  onPatchItem,
  onDeleteItem,
  onResetToInitial,
  onMarkAsInitial,
  forPlayerIdentity = false,
  networkPeersForInsert,
  canUseAi,
  generating,
  onOpenAiLengthModal,
  worldBookUserInsertContext = null,
}: {
  open: boolean
  onClose: () => void
  character: Character
  worldBook: WorldBook
  item: WorldBookItem
  wbId: string
  itemId: string
  onPatchItem: (wbId: string, itemId: string, patch: Partial<WorldBookItem>) => void
  onDeleteItem: (wbId: string, itemId: string) => void
  /** 尾声延展：恢复本条出厂稿 */
  onResetToInitial?: () => void
  /** 尾声延展：把当前正文记为出厂定点 */
  onMarkAsInitial?: () => void
  forPlayerIdentity?: boolean
  networkPeersForInsert: PeerRow[]
  canUseAi: boolean
  generating: boolean
  onOpenAiLengthModal: () => void
  worldBookUserInsertContext?: WorldBookUserInsertContext | null
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bodySectionRef = useRef<HTMLDivElement | null>(null)
  const taHandleRef = useRef<PlaceholderAwareTextareaHandle | null>(null)
  const caretRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 })
  const inputFocusedRef = useRef(false)
  const [keyboardPadPx, setKeyboardPadPx] = useState(0)
  const [bodyEditing, setBodyEditing] = useState(false)
  const [confirmResetInitial, setConfirmResetInitial] = useState(false)
  const [confirmMarkInitial, setConfirmMarkInitial] = useState(false)
  const [showInitialPreview, setShowInitialPreview] = useState(false)

  const rawBody = String(item.content ?? '')
  const initialBody = String(item.contentInitial ?? '').trim()
  const canResetToInitial =
    item.priority === 'after' &&
    Boolean(onResetToInitial) &&
    initialBody.length > 0 &&
    initialBody !== rawBody.trim()
  const canMarkAsInitial =
    item.priority === 'after' &&
    Boolean(onMarkAsInitial) &&
    rawBody.trim().length > 0 &&
    rawBody.trim() !== initialBody
  const { expanded: expandedBody, loading: bodyPreviewLoading } = useCharacterFieldPlaceholderPreview({
    draft: rawBody,
    characterId: character.id,
    worldBookUserPlaceholderBindings: item.userPlaceholderBindings,
    enabled: open && !bodyEditing && !forPlayerIdentity && rawBody.includes('{{'),
  })
  const { expanded: expandedInitial, loading: initialPreviewLoading } = useCharacterFieldPlaceholderPreview({
    draft: initialBody,
    characterId: character.id,
    worldBookUserPlaceholderBindings: item.userPlaceholderBindings,
    enabled:
      open &&
      showInitialPreview &&
      !forPlayerIdentity &&
      initialBody.includes('{{'),
  })
  const viewBodyText =
    !forPlayerIdentity && rawBody.includes('{{') && expandedBody ? expandedBody : rawBody
  const viewInitialText =
    !forPlayerIdentity && initialBody.includes('{{') && expandedInitial ? expandedInitial : initialBody

  const scrollBodyAboveKeyboard = useCallback(() => {
    const section = bodySectionRef.current
    const scroller = scrollRef.current
    if (section && scroller) {
      const sectionTop = section.offsetTop
      const target = Math.max(0, sectionTop - 12)
      if (Math.abs(scroller.scrollTop - target) > 8)
        scroller.scrollTo({ top: target, behavior: 'smooth' })
    }
    const ta =
      taHandleRef.current?.getTextareaElement() ??
      (sheetRef.current?.querySelector('textarea') as HTMLTextAreaElement | null)
    if (ta) {
      requestAnimationFrame(() => ensureElementVisibleAboveKeyboard(ta, 20))
      window.setTimeout(() => ensureElementVisibleAboveKeyboard(ta, 20), 160)
      window.setTimeout(() => ensureElementVisibleAboveKeyboard(ta, 20), 360)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setBodyEditing(false)
      setConfirmResetInitial(false)
      setConfirmMarkInitial(false)
      setShowInitialPreview(false)
    }
  }, [open, itemId])

  useEffect(() => {
    if (!open || !bodyEditing || generating) return
    const t = window.setTimeout(() => {
      taHandleRef.current?.focusForEdit()
      scrollBodyAboveKeyboard()
    }, 60)
    return () => window.clearTimeout(t)
  }, [open, bodyEditing, generating, scrollBodyAboveKeyboard])

  /** 软键盘：抬升面板并收束高度；编辑区滚入可视范围（iOS / Android） */
  useEffect(() => {
    if (!open) {
      setKeyboardPadPx(0)
      inputFocusedRef.current = false
      return
    }
    const vv = window.visualViewport
    if (!vv) return

    const syncPad = () => {
      const focused = inputFocusedRef.current
      let pad = 0
      if (isAndroidWeb()) pad = resolveAndroidKeyboardPadPx(focused)
      else if (isIOSWebKit()) pad = measureIosKeyboardPadPx()
      else {
        pad = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      }
      if (!focused && pad < 48) pad = 0
      setKeyboardPadPx((prev) => (Math.abs(prev - pad) < 4 ? prev : pad))
    }

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return
      if (!sheetRef.current?.contains(t)) return
      inputFocusedRef.current = true
      syncPad()
      requestAnimationFrame(scrollBodyAboveKeyboard)
      window.setTimeout(scrollBodyAboveKeyboard, 120)
      window.setTimeout(scrollBodyAboveKeyboard, 320)
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement
        if (active instanceof HTMLElement && sheetRef.current?.contains(active)) return
        inputFocusedRef.current = false
        syncPad()
      }, 80)
    }

    syncPad()
    vv.addEventListener('resize', syncPad)
    vv.addEventListener('scroll', syncPad)
    window.addEventListener('orientationchange', syncPad)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    return () => {
      vv.removeEventListener('resize', syncPad)
      vv.removeEventListener('scroll', syncPad)
      window.removeEventListener('orientationchange', syncPad)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      setKeyboardPadPx(0)
      inputFocusedRef.current = false
    }
  }, [open, scrollBodyAboveKeyboard])

  useEffect(() => {
    if (!open || keyboardPadPx <= 0 || !bodyEditing) return
    scrollBodyAboveKeyboard()
  }, [open, keyboardPadPx, bodyEditing, scrollBodyAboveKeyboard])

  useEffect(() => {
    if (!open) return
    const sync = normalizeWorldBookItemUserPlaceholders(item.content ?? '', item.userPlaceholderBindings, null)
    if (!sync.changed) return
    onPatchItem(wbId, itemId, {
      content: sync.content,
      userPlaceholderBindings: sync.bindings,
    })
  }, [open, item.content, item.userPlaceholderBindings, wbId, itemId, onPatchItem])

  useEffect(() => {
    if (!open || !worldBookItemHasLegacyScopedUserPlaceholder(item)) return
    let cancelled = false
    void (async () => {
      const patch = await migrateWorldBookItemUserPlaceholderLegacy(item, {
        character,
        fallback: worldBookUserInsertContext,
      })
      if (cancelled || !patch) return
      onPatchItem(wbId, itemId, patch)
    })()
    return () => {
      cancelled = true
    }
  }, [open, item, wbId, itemId, worldBookUserInsertContext, onPatchItem])

  const patchContent = useCallback(
    (nextContent: string, bindingsOverride?: typeof item.userPlaceholderBindings) => {
      const sync = normalizeWorldBookItemUserPlaceholders(
        nextContent,
        bindingsOverride ?? item.userPlaceholderBindings,
        null,
      )
      onPatchItem(wbId, itemId, {
        content: sync.content,
        userPlaceholderBindings: sync.bindings,
      })
    },
    [item.userPlaceholderBindings, onPatchItem, wbId, itemId],
  )

  const insertToken = useCallback(
    (token: string) => {
      const cur = String(item.content ?? '')
      const keyCaret = caretRef.current
      const el = taHandleRef.current?.getTextareaElement() ?? null
      let start: number
      let end: number
      if (!el || el.value !== cur) {
        start = Math.min(Math.max(0, keyCaret.start), cur.length)
        end = Math.min(Math.max(0, keyCaret.end), cur.length)
      } else {
        start = el.selectionStart ?? cur.length
        end = el.selectionEnd ?? start
      }
      if (token === WORLD_BOOK_USER_PLACEHOLDER && worldBookUserInsertContext) {
        const { content, bindings } = insertWorldBookUserPlaceholderInContent({
          content: cur,
          bindings: item.userPlaceholderBindings,
          caretStart: start,
          caretEnd: end,
          ctx: worldBookUserInsertContext,
        })
        const pos = start + WORLD_BOOK_USER_PLACEHOLDER.length
        caretRef.current = { start: pos, end: pos }
        onPatchItem(wbId, itemId, { content, userPlaceholderBindings: bindings })
      } else {
        const next = cur.slice(0, start) + token + cur.slice(end)
        const pos = start + token.length
        caretRef.current = { start: pos, end: pos }
        patchContent(next)
      }

      queueMicrotask(() => {
        const t = taHandleRef.current?.getTextareaElement()
        if (!t) return
        const caret = caretRef.current
        t.focus()
        try {
          t.setSelectionRange(caret.start, caret.end)
        } catch {
          /* ignore */
        }
        scrollBodyAboveKeyboard()
      })
    },
    [
      item.content,
      item.userPlaceholderBindings,
      onPatchItem,
      patchContent,
      wbId,
      itemId,
      worldBookUserInsertContext,
      scrollBodyAboveKeyboard,
    ],
  )

  const bindingState = describeWorldBookUserPlaceholderBindingState(
    item.content ?? '',
    item.userPlaceholderBindings,
  )

  const sheetMaxHeight =
    keyboardPadPx > 0
      ? `min(85dvh, calc(100dvh - ${keyboardPadPx}px - env(safe-area-inset-top, 0px)))`
      : 'min(85dvh, 100%)'

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="lore-sheet-backdrop"
            type="button"
            aria-label="关闭蒙版"
            className="fixed inset-0 z-[1150]"
            style={{ background: 'rgba(30,32,36,0.42)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            key="lore-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lore-entry-editor-title"
            className="fixed inset-x-0 z-[1160] flex flex-col overflow-hidden border-t-[1.5px]"
            initial={{ y: '105%' }}
            animate={{ y: 0 }}
            exit={{ y: '105%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            style={{
              bottom: keyboardPadPx > 0 ? keyboardPadPx : 0,
              height: sheetMaxHeight,
              maxHeight: sheetMaxHeight,
              background: CARD,
              borderColor: INK,
              borderRadius: '14px 14px 0 0',
              paddingBottom:
                keyboardPadPx > 0
                  ? '0.75rem'
                  : 'max(1rem, env(safe-area-inset-bottom, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex shrink-0 items-center justify-between gap-3 px-3 py-2.5"
              style={{ background: INK, color: CARD }}
            >
              <button
                type="button"
                className="border border-white/25 p-1.5 opacity-85 transition hover:opacity-100"
                style={{ borderRadius: 8 }}
                aria-label="删除本条"
                onClick={() => {
                  onDeleteItem(wbId, itemId)
                  onClose()
                }}
              >
                <Trash2 className="size-4 stroke-[1.5]" />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p id="lore-entry-editor-title" className="text-[12px] font-semibold leading-none">
                  {item.priority === 'after' ? '尾声条目' : '固定条目'}
                </p>
                <p className="mt-1 font-serif text-[9px] tracking-[0.22em] opacity-80">
                  {item.priority === 'after' ? 'EPILOGUE ENTRY' : 'FIXED ENTRY'}
                </p>
              </div>
              <button
                type="button"
                className="border border-white/25 p-1.5 opacity-85 transition hover:opacity-100"
                style={{ borderRadius: 8 }}
                aria-label="关闭"
                onClick={onClose}
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-3 pb-3 pt-3 [-webkit-overflow-scrolling:touch]"
              style={{ background: PAGE }}
            >
              <div
                className="overflow-hidden border-[1.5px]"
                style={{ borderColor: INK, background: CARD, borderRadius: 12 }}
              >
                <div className="px-3 pb-3 pt-3">
                  <InkLabel zh="法则标题" en="TITLE" />
                  <input
                    value={item.name}
                    onChange={(e) => onPatchItem(wbId, itemId, { name: e.target.value })}
                    className="w-full border-0 border-b bg-transparent py-1 font-serif text-[18px] font-semibold tracking-tight outline-none"
                    style={{ color: INK, borderColor: LINE }}
                    placeholder="未命名法则"
                  />
                </div>

                <div className="border-t px-3 py-3" style={{ borderColor: LINE }}>
                  <InkLabel zh="生效时机" en="TIMING" />
                  <div className="flex gap-0 overflow-hidden border-[1.5px]" style={{ borderColor: INK, borderRadius: 10 }}>
                    {(
                      [
                        { v: 'before' as const, zh: '固定', en: 'FIXED' },
                        { v: 'after' as const, zh: '尾声', en: 'EPILOGUE' },
                      ] as const
                    ).map(({ v, zh, en }, idx) => {
                      const active = item.priority === v
                      return (
                        <button
                          key={v}
                          type="button"
                          className="flex-1 py-2.5 text-center transition-colors"
                          style={{
                            background: active ? INK : CARD,
                            color: active ? CARD : MUTED,
                            borderLeft: idx > 0 ? `1.5px solid ${INK}` : undefined,
                          }}
                          onClick={() => onPatchItem(wbId, itemId, { priority: v })}
                        >
                          <span className="block text-[13px] font-semibold">{zh}</span>
                          <span className="mt-0.5 block font-serif text-[9px] tracking-[0.14em] opacity-75">
                            {en}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {item.priority === 'after' && (onResetToInitial || onMarkAsInitial) ? (
                  <div className="border-t px-3 py-2.5" style={{ borderColor: LINE }}>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 shrink-0">
                        <p className="text-[11px] font-semibold leading-none" style={{ color: INK }}>
                          定点尾声
                        </p>
                        <p className="mt-1 font-serif text-[9px] tracking-[0.18em]" style={{ color: FOIL }}>
                          ANCHOR
                        </p>
                      </div>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={!initialBody}
                          title={
                            showInitialPreview
                              ? '收起定点预览'
                              : initialBody
                                ? '预览最初尾声'
                                : '尚无定点可预览'
                          }
                          onClick={() => setShowInitialPreview((v) => !v)}
                          className="inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                          style={{
                            borderColor: showInitialPreview ? INK : LINE,
                            background: showInitialPreview ? INK : CARD,
                            color: showInitialPreview ? CARD : MUTED,
                            borderRadius: 8,
                          }}
                        >
                          {showInitialPreview ? (
                            <EyeOff className="size-3 shrink-0" strokeWidth={2} />
                          ) : (
                            <Eye className="size-3 shrink-0" strokeWidth={2} />
                          )}
                          预览
                        </button>
                        {onMarkAsInitial ? (
                          <button
                            type="button"
                            disabled={!canMarkAsInitial && !confirmMarkInitial}
                            title={
                              confirmMarkInitial
                                ? initialBody
                                  ? '再点确认：用当前正文覆盖定点'
                                  : '再点确认：保存为最初版本'
                                : canMarkAsInitial
                                  ? initialBody
                                    ? '将当前正文标为最初版本'
                                    : '保存当前为最初版本'
                                  : rawBody.trim()
                                    ? '当前已是定点稿'
                                    : '正文为空，无法定点'
                            }
                            onClick={() => {
                              if (!canMarkAsInitial) return
                              if (!confirmMarkInitial) {
                                setConfirmMarkInitial(true)
                                window.setTimeout(() => setConfirmMarkInitial(false), 3600)
                                return
                              }
                              setConfirmMarkInitial(false)
                              onMarkAsInitial()
                            }}
                            className="inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                            style={{
                              borderColor: confirmMarkInitial ? INK : LINE,
                              background: confirmMarkInitial ? PAGE : CARD,
                              color: confirmMarkInitial ? INK : MUTED,
                              borderRadius: 8,
                            }}
                          >
                            <BookmarkPlus className="size-3 shrink-0" strokeWidth={2} />
                            {confirmMarkInitial ? '确认定点' : '定点'}
                          </button>
                        ) : null}
                        {onResetToInitial ? (
                          <button
                            type="button"
                            disabled={!canResetToInitial && !confirmResetInitial}
                            title={
                              confirmResetInitial
                                ? '再点确认：恢复本条最初内容'
                                : canResetToInitial
                                  ? '恢复本条最初尾声'
                                  : initialBody
                                    ? '已是最初尾声'
                                    : '尚无定点可恢复'
                            }
                            onClick={() => {
                              if (!canResetToInitial) return
                              if (!confirmResetInitial) {
                                setConfirmResetInitial(true)
                                window.setTimeout(() => setConfirmResetInitial(false), 3600)
                                return
                              }
                              setConfirmResetInitial(false)
                              onResetToInitial()
                            }}
                            className="inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                            style={{
                              borderColor: confirmResetInitial ? '#B45309' : LINE,
                              background: confirmResetInitial ? '#FEF3C7' : CARD,
                              color: confirmResetInitial ? '#92400E' : MUTED,
                              borderRadius: 8,
                            }}
                          >
                            <RotateCcw className="size-3 shrink-0" strokeWidth={2} />
                            {confirmResetInitial ? '确认恢复' : '恢复'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <AnimatePresence initial={false}>
                      {showInitialPreview && initialBody ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mt-2 border-[1.5px] px-3 py-2.5"
                            style={{ borderColor: INK, background: PAGE, borderRadius: 10 }}
                          >
                            <p
                              className="mb-1.5 font-serif text-[9px] tracking-[0.16em]"
                              style={{ color: FOIL }}
                            >
                              定点稿预览
                              {initialBody === rawBody.trim() ? ' · 与当前相同' : ' · 与当前不同'}
                            </p>
                            <p
                              className="whitespace-pre-wrap text-[13px] leading-relaxed"
                              style={{ color: INK }}
                            >
                              {initialPreviewLoading ? '展开占位符中…' : viewInitialText}
                            </p>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : null}

                <div className="border-t px-3 py-3" style={{ borderColor: LINE }}>
                  <InkLabel zh="AI 灵感" en="KEYWORDS" />
                  <div
                    className="flex items-center gap-2 border-[1.5px] px-2.5 py-2"
                    style={{ borderColor: INK, background: PAGE, borderRadius: 10 }}
                  >
                    <Sparkles className="size-3.5 shrink-0" style={{ color: FOIL }} strokeWidth={1.8} />
                    <input
                      value={item.keywords ?? ''}
                      onChange={(e) => onPatchItem(wbId, itemId, { keywords: e.target.value })}
                      readOnly={generating}
                      className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none"
                      style={{ color: INK }}
                      placeholder="关键词，由 AI 推演法则…"
                    />
                    <button
                      type="button"
                      disabled={!canUseAi || generating}
                      className="shrink-0 border-[1.5px] px-3 py-1.5 text-[12px] font-semibold transition-opacity disabled:opacity-40"
                      style={{
                        borderColor: INK,
                        background: INK,
                        color: CARD,
                        borderRadius: 8,
                      }}
                      onClick={() => {
                        if (!canUseAi || generating) return
                        onOpenAiLengthModal()
                      }}
                    >
                      生成
                    </button>
                  </div>
                </div>

                {!forPlayerIdentity && bodyEditing ? (
                  <div className="border-t px-3 py-3" style={{ borderColor: LINE }}>
                    <InkLabel zh="快捷插入" en="INSERT" />
                    <div className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {(
                        [
                          {
                            key: 'char',
                            label: '当前角色',
                            disabled: generating,
                            title: `插入原文：${WORLD_BOOK_CHAR_PLACEHOLDER}`,
                            onClick: () => insertToken(WORLD_BOOK_CHAR_PLACEHOLDER),
                          },
                          {
                            key: 'user',
                            label: worldBookUserInsertContext
                              ? `玩家·${worldBookUserInsertContext.displayName.length > 6 ? `${worldBookUserInsertContext.displayName.slice(0, 5)}…` : worldBookUserInsertContext.displayName}`
                              : '绑定的玩家',
                            disabled: generating || !worldBookUserInsertContext,
                            title: worldBookUserInsertContext
                              ? `插入 {{user}}，后台绑定 ${worldBookUserInsertContext.lineLabel}（${worldBookUserInsertContext.displayName}）`
                              : '请先选择当前微信账号与扮演身份',
                            onClick: () => insertToken(WORLD_BOOK_USER_PLACEHOLDER),
                          },
                        ] as const
                      ).map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          disabled={chip.disabled}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={chip.onClick}
                          title={chip.title}
                          className="shrink-0 border px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
                          style={{
                            borderColor: INK,
                            background: CARD,
                            color: INK,
                            borderRadius: 8,
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                      {networkPeersForInsert.map((peer) => {
                        const token = linkedCharacterPlaceholder(peer.id)
                        const zhLabel =
                          peer.role === 'archive_root'
                            ? '档案主角'
                            : `人脉·${peer.label.length > 8 ? `${peer.label.slice(0, 7)}…` : peer.label}`
                        return (
                          <button
                            key={peer.id}
                            type="button"
                            disabled={generating}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertToken(token)}
                            title={`插入原文：${token}`}
                            className="max-w-[148px] shrink-0 truncate border px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
                            style={{
                              borderColor: INK,
                              background: CARD,
                              color: INK,
                              borderRadius: 8,
                            }}
                          >
                            {zhLabel}
                          </button>
                        )
                      })}
                    </div>
                    {bindingState.slotCount > 0 ? (
                      <p className="mt-2 text-[10px] leading-relaxed" style={{ color: MUTED }}>
                        正文 {bindingState.slotCount} 处{' '}
                        <code style={{ color: INK }}>{`{{user}}`}</code>
                        {bindingState.summary ? (
                          <>
                            ，已绑定 {bindingState.boundCount} 处：{bindingState.summary}
                          </>
                        ) : (
                          <>（尚未写入绑定，保存或再点一次「玩家」插入可补齐）</>
                        )}
                        {bindingState.hasLegacyScoped ? (
                          <span style={{ color: '#B45309' }}> · 检测到旧式长表达式，将自动改为裸占位符</span>
                        ) : null}
                        {bindingState.slotCount > bindingState.boundCount && !bindingState.hasLegacyScoped ? (
                          <span style={{ color: '#B45309' }}> · 有槽位未绑定账号/身份</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div
                  ref={bodySectionRef}
                  className="border-t px-3 py-3 pb-5"
                  style={{ borderColor: LINE }}
                >
                  <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold leading-none" style={{ color: INK }}>
                        正文
                        {!generating && rawBody.trim() ? (
                          <span className="ml-2 font-normal" style={{ color: FAINT }}>
                            约 {String(rawBody).replace(/\s+/g, '').length} 字
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 font-serif text-[9px] tracking-[0.2em]" style={{ color: FOIL }}>
                        BODY
                      </p>
                    </div>
                    {!generating ? (
                      bodyEditing ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 border-[1.5px] px-3 py-1.5 text-[12px] font-semibold"
                          style={{
                            borderColor: INK,
                            background: INK,
                            color: CARD,
                            borderRadius: 8,
                          }}
                          onClick={() => setBodyEditing(false)}
                        >
                          <Check className="size-3.5" strokeWidth={2.5} />
                          完成
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 border-[1.5px] px-3 py-1.5 text-[12px] font-semibold"
                          style={{
                            borderColor: INK,
                            background: CARD,
                            color: INK,
                            borderRadius: 8,
                          }}
                          onClick={() => setBodyEditing(true)}
                        >
                          <Pencil className="size-3.5" strokeWidth={2} />
                          编辑
                        </button>
                      )
                    ) : null}
                  </div>
                  <div
                    className="border-[1.5px] px-3 py-3"
                    style={{ borderColor: INK, background: '#FBF7F0', borderRadius: 10 }}
                  >
                    {bodyEditing ? (
                      forPlayerIdentity ? (
                        <textarea
                          value={generating ? WB_ITEM_GENERATING_TEXT : rawBody}
                          readOnly={generating}
                          onChange={(e) => {
                            if (!generating) patchContent(e.target.value)
                          }}
                          onFocus={scrollBodyAboveKeyboard}
                          className={BODY_TEXTAREA_CLASS}
                          style={{ color: INK }}
                          placeholder="书写属于你的世界片段…"
                        />
                      ) : (
                        <PlaceholderAwareTextarea
                          ref={(h) => {
                            taHandleRef.current = h
                          }}
                          onCaretInRawText={(start, end) => {
                            caretRef.current = { start, end }
                          }}
                          readOnly={generating}
                          value={generating ? WB_ITEM_GENERATING_TEXT : rawBody}
                          onChange={(v) => {
                            if (!generating) patchContent(v)
                          }}
                          onFocus={scrollBodyAboveKeyboard}
                          characterId={character.id}
                          worldBookUserPlaceholderBindings={item.userPlaceholderBindings}
                          placeholderPreview
                          previewEditRequiresDoubleClick
                          previewShellWorldBook={false}
                          rows={12}
                          className={BODY_TEXTAREA_CLASS}
                          style={{ color: INK }}
                          placeholder="沉浸式书写… 占位符在预览中会展开为姓名"
                        />
                      )
                    ) : (
                      <div
                        className="whitespace-pre-wrap text-[15px] leading-relaxed"
                        style={{ wordBreak: 'break-word', color: INK }}
                      >
                        {generating ? (
                          WB_ITEM_GENERATING_TEXT
                        ) : bodyPreviewLoading && rawBody.includes('{{') ? (
                          <span style={{ color: FAINT }}>展开占位符预览…</span>
                        ) : viewBodyText.trim() ? (
                          viewBodyText
                        ) : (
                          <span style={{ color: FAINT }}>暂无正文，点「编辑」开始书写</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
