import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChevronDown, ChevronLeft, History, Lock, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { AnonymousQaWechatContext } from '../../../../components/anonymousQa/buildAnonymousQaPersonaContext'
import { Pressable } from '../../../components/Pressable'
import { MemoryCoachPortal } from '../memory/MemoryCoachPortal'
import { MemoryTutorialModal } from '../memory/MemoryTutorialModal'
import { readMemoryCoachSeen, writeMemoryCoachSeen } from '../memory/memoryCoachTypes'
import { formatObsHeaderDate, formatObsHistoryDate } from './formatTime'
import { runObservationNotesManualUpdate } from './manualUpdateAi'
import {
  OBS_NOTES_COACH_ROOT_ATTR,
  OBS_NOTES_COACH_TARGET_ATTR,
  OBS_NOTES_DETAIL_COACH_SCOPE,
  OBS_NOTES_DETAIL_COACH_SEEN_KEY,
  OBS_NOTES_DETAIL_COACH_STEPS,
} from './observationNotesCoach'
import { OBS_NOTES_DETAIL_TUTORIAL_SECTIONS } from './observationNotesTutorialCopy'
import { ObservationAffectionBar, ObservationNotesRadar } from './ObservationNotesRadar'
import {
  findPendingDiff,
  isPathPending,
  markObservationNotesSeen,
} from './store'
import {
  BASIC_FIELD_META,
  type ObservationField,
  type ObservationFieldDiff,
  type ObservationNotesDoc,
} from './types'
import {
  OBS_NOTES,
  OBS_NOTES_EN_STYLE,
  OBS_NOTES_FONT,
  OBS_NOTES_HEADER,
  OBS_NOTES_LABEL_STYLE,
  OBS_NOTES_NUM_STYLE,
  OBS_NOTES_SERIF_CLASS,
  OBS_SECTION_EN,
  obsMarginaliaStyle,
  obsRemarkStyle,
} from './theme'
import { useObservationCharHandFont } from './useObservationCharHandFont'

function FolderSection({
  title,
  titleRight,
  children,
  id,
  clip = true,
  en,
  index,
  defaultOpen = true,
}: {
  title: string
  titleRight?: ReactNode
  children: ReactNode
  id?: string
  /** 雷达等需要出框时关裁切 */
  clip?: boolean
  en?: string
  index?: string
  defaultOpen?: boolean
}) {
  const enLabel = en || OBS_SECTION_EN[title] || ''
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section id={id} className="relative" style={{ scrollMarginTop: 72 }}>
      {/* 文件夹页签 */}
      <div className="relative z-[1] flex items-end pl-1">
        <Pressable
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="relative flex max-w-[90%] items-center gap-2.5 rounded-t-[12px] px-3.5 pb-2.5 pt-2.5 text-left active:opacity-95"
          style={{
            background: open
              ? 'linear-gradient(180deg, #EEF1F6 0%, #FBFCFD 100%)'
              : 'linear-gradient(180deg, #E4E8EF 0%, #EBEEF4 100%)',
            border: `1px solid ${OBS_NOTES.hairline}`,
            borderBottom: open ? '1px solid transparent' : `1px solid ${OBS_NOTES.hairline}`,
            marginBottom: open ? -1 : 0,
            boxShadow: open ? 'none' : '0 4px 12px rgba(28,36,52,0.04)',
          }}
        >
          <span
            aria-hidden
            className="absolute -left-[1px] bottom-0 top-2 w-[3px] rounded-l-full"
            style={{ background: OBS_NOTES.coolRail }}
          />
          {index ? (
            <span
              className="inline-flex min-w-[26px] items-center justify-center rounded-[6px] px-1 py-0.5 text-[10px] font-semibold tabular-nums"
              style={{
                ...OBS_NOTES_NUM_STYLE,
                color: '#fff',
                background: OBS_NOTES.garnet,
              }}
            >
              {index}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-wide" style={{ color: OBS_NOTES.ink }}>
              {title}
            </p>
            {enLabel ? (
              <p className="mt-0.5 truncate" style={{ ...OBS_NOTES_EN_STYLE, fontSize: 8, letterSpacing: '0.12em' }}>
                {enLabel}
              </p>
            ) : null}
          </div>
          {titleRight}
          <ChevronDown
            className="ml-1 size-3.5 shrink-0 transition-transform duration-200"
            style={{
              color: OBS_NOTES.mist,
              transform: open ? 'rotate(180deg)' : undefined,
            }}
            strokeWidth={1.8}
          />
        </Pressable>
        <div
          aria-hidden
          className="mb-[7px] ml-2 min-w-[24px] flex-1"
          style={{ borderBottom: `1px dashed ${OBS_NOTES.coolLine}`, height: 1 }}
        />
      </div>

      {/* 文件夹袋身 */}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={clip ? 'overflow-hidden' : 'overflow-visible'}
          >
            <div
              className="relative overflow-hidden rounded-b-[14px] rounded-tr-[14px]"
              style={{
                backgroundColor: OBS_NOTES.card,
                backgroundImage: OBS_NOTES.pageDotBg,
                backgroundSize: OBS_NOTES.pageDotSize,
                border: `1px solid ${OBS_NOTES.hairline}`,
                boxShadow: '0 12px 32px rgba(28, 36, 52, 0.06)',
              }}
            >
              <div aria-hidden className="pointer-events-none absolute right-3 top-4 flex flex-col gap-2.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-[5px] rounded-full"
                    style={{
                      background: OBS_NOTES.paperSoft,
                      border: `1px solid ${OBS_NOTES.coolLine}`,
                    }}
                  />
                ))}
              </div>
              <div className="relative px-4 py-3.5 pr-8">{children}</div>
              <div
                aria-hidden
                className="h-[3px]"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(92,63,78,0.12) 20%, rgba(92,63,78,0.12) 80%, transparent 100%)',
                }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="spine"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative -mt-px overflow-hidden rounded-b-[12px] rounded-tr-[12px]"
            style={{
              height: 14,
              background: 'linear-gradient(180deg, #EBEEF4 0%, #E2E6ED 100%)',
              border: `1px solid ${OBS_NOTES.hairline}`,
              borderTop: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

function DiffPill() {
  return (
    <span
      className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium tracking-wide"
      style={{
        color: OBS_NOTES.garnet,
        border: `1px solid ${OBS_NOTES.garnet}`,
        lineHeight: 1.2,
      }}
    >
      已更新
    </span>
  )
}

function FieldValueText({
  field,
  larger,
  handStack,
  forceHand,
}: {
  field: ObservationField
  larger?: boolean
  handStack: string
  forceHand?: boolean
}) {
  const isMarginalia = forceHand || field.voice === 'marginalia'
  return (
    <p
      className={larger ? 'text-[14px] leading-relaxed' : 'text-[13px] leading-relaxed'}
      style={
        isMarginalia
          ? { ...obsMarginaliaStyle(handStack), fontSize: larger ? 15 : 14 }
          : { color: OBS_NOTES.ink, fontFamily: OBS_NOTES_FONT, fontSize: larger ? 14 : 13 }
      }
    >
      {field.text.trim() || '尚不清楚'}
    </p>
  )
}

function DiffableRow({
  path,
  label,
  en,
  doc,
  children,
  onConsumed,
}: {
  path: string
  label: string
  en?: string
  doc: ObservationNotesDoc
  children: ReactNode
  onConsumed: (path: string) => void
}) {
  const pending = isPathPending(doc, path)
  const diff = findPendingDiff(doc, path)
  const [expanded, setExpanded] = useState(false)
  const [highlight, setHighlight] = useState(pending)
  const consumedRef = useRef(false)

  useEffect(() => {
    if (!pending || consumedRef.current) return
    consumedRef.current = true
    const t = window.setTimeout(() => {
      setHighlight(false)
      onConsumed(path)
    }, 800)
    return () => window.clearTimeout(t)
  }, [pending, path, onConsumed])

  return (
    <div
      className="transition-colors duration-[800ms]"
      style={{
        background: highlight ? OBS_NOTES.garnetSoftBg : 'transparent',
        marginLeft: -8,
        marginRight: -8,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 8,
      }}
    >
      <Pressable
        type="button"
        className="flex w-full items-start gap-3 py-2.5 text-left"
        disabled={!diff}
        onClick={() => {
          if (diff) setExpanded((v) => !v)
        }}
      >
        <div className="w-[72px] shrink-0 pt-0.5">
          <p style={OBS_NOTES_LABEL_STYLE}>{en || label}</p>
          {en ? (
            <p className="mt-0.5 text-[11px]" style={{ color: OBS_NOTES.mist, fontFamily: OBS_NOTES_FONT }}>
              {label}
            </p>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          {children}
          <AnimatePresence initial={false}>
            {expanded && diff ? (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1.5 overflow-hidden text-[11px] leading-snug"
                style={{ color: OBS_NOTES.mist }}
              >
                此前：{diff.previousText || '（空）'}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
        {pending || diff ? (
          <div className="flex shrink-0 items-center gap-0.5 pt-1">
            <DiffPill />
            {diff ? (
              <ChevronDown
                className="size-3.5 transition-transform"
                style={{
                  color: OBS_NOTES.garnet,
                  transform: expanded ? 'rotate(180deg)' : undefined,
                }}
              />
            ) : null}
          </div>
        ) : null}
      </Pressable>
    </div>
  )
}

function IntimateReveal({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="relative min-h-[88px]">
      <div
        style={{
          filter: revealed ? 'blur(0px)' : 'blur(8px)',
          transition: 'filter 300ms ease',
          pointerEvents: revealed ? 'auto' : 'none',
          userSelect: revealed ? 'auto' : 'none',
        }}
      >
        {children}
      </div>
      <AnimatePresence>
        {!revealed ? (
          <motion.button
            type="button"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: 'rgba(242, 244, 247, 0.72)',
              borderRadius: 8,
            }}
            onClick={() => setRevealed(true)}
            aria-label="轻触查看亲密偏好"
          >
            <span className="text-[13px] font-medium tracking-wide" style={{ color: OBS_NOTES.mist }}>
              轻触查看
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function HistorySheet({
  open,
  onClose,
  doc,
}: {
  open: boolean
  onClose: () => void
  doc: ObservationNotesDoc
}) {
  const [expandedId, setExpandedId] = useState<string | null>(doc.changeHistory[0]?.id ?? null)
  const total = doc.changeHistory.length

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`absolute inset-0 z-[20] flex flex-col ${OBS_NOTES_SERIF_CLASS}`}
          style={{
            background: OBS_NOTES.paper,
            fontFamily: OBS_NOTES_FONT,
          }}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        >
          <div
            className="relative flex min-h-[52px] shrink-0 items-center px-1 pt-[max(6px,env(safe-area-inset-top,0px))]"
            style={{
              borderBottom: `1px solid ${OBS_NOTES.hairline}`,
              background: 'rgba(242,244,247,0.88)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Pressable
              type="button"
              aria-label="返回"
              className="relative z-[1] flex size-10 shrink-0 items-center justify-center"
              onClick={onClose}
            >
              <ChevronLeft className="size-5" style={{ color: OBS_NOTES.ink }} />
            </Pressable>
            <div className="pointer-events-none absolute inset-x-11 top-[max(6px,env(safe-area-inset-top,0px))] bottom-0 flex flex-col items-center justify-center">
              <p className="text-[16px] font-semibold tracking-[0.12em]" style={{ color: OBS_NOTES.ink }}>
                溯往
              </p>
              <p className="mt-0.5" style={{ ...OBS_NOTES_EN_STYLE, fontSize: 8, letterSpacing: '0.18em' }}>
                REVISION LOG
                {total > 0 ? ` · ${total}` : ''}
              </p>
            </div>
            <span className="ml-auto size-10 shrink-0" aria-hidden />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-5">
            {total === 0 ? (
              <div
                className="flex flex-col items-center justify-center px-6 py-16 text-center"
                style={{
                  background: OBS_NOTES.card,
                  borderRadius: 12,
                  border: `1px solid ${OBS_NOTES.hairline}`,
                }}
              >
                <History className="mb-3 size-7" style={{ color: OBS_NOTES.mist }} strokeWidth={1.4} />
                <p className="text-[14px]" style={{ color: OBS_NOTES.ink }}>
                  还没有变更记录
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: OBS_NOTES.mist }}>
                  下次写就时，这里会出现新旧对照。
                </p>
              </div>
            ) : (
              <ul className="relative pl-5">
                <span
                  aria-hidden
                  className="absolute bottom-3 left-[7px] top-3 w-px"
                  style={{ background: OBS_NOTES.hairline }}
                />
                {doc.changeHistory.map((ev, index) => {
                  const openRow = expandedId === ev.id
                  const diffCount = ev.diffs.length
                  return (
                    <li key={ev.id} className="relative pb-5 last:pb-2">
                      <span
                        aria-hidden
                        className="absolute left-[-13px] top-[18px] size-[9px] rounded-full"
                        style={{
                          background: index === 0 ? OBS_NOTES.garnet : OBS_NOTES.card,
                          border: `1.5px solid ${OBS_NOTES.garnet}`,
                          boxShadow: `0 0 0 3px ${OBS_NOTES.paper}`,
                        }}
                      />
                      <div
                        className="overflow-hidden"
                        style={{
                          background: OBS_NOTES.card,
                          borderRadius: 12,
                          border: `1px solid ${OBS_NOTES.hairline}`,
                          boxShadow: '0 8px 22px rgba(28,36,52,0.04)',
                        }}
                      >
                        <Pressable
                          type="button"
                          className="flex w-full items-start gap-3 px-3.5 py-3.5 text-left active:opacity-95"
                          onClick={() => setExpandedId(openRow ? null : ev.id)}
                          aria-expanded={openRow}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums"
                                style={{
                                  ...OBS_NOTES_NUM_STYLE,
                                  color: OBS_NOTES.garnet,
                                  background: OBS_NOTES.garnetSoftBg,
                                  border: `1px solid rgba(92,63,78,0.18)`,
                                }}
                              >
                                {formatObsHistoryDate(ev.at)}
                              </span>
                              {index === 0 ? (
                                <span
                                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide"
                                  style={{ color: OBS_NOTES.garnet, border: `1px solid ${OBS_NOTES.garnet}` }}
                                >
                                  最近
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-[14px] leading-[1.55]" style={{ color: OBS_NOTES.ink }}>
                              {ev.summary}
                            </p>
                            <p className="mt-2 text-[11px]" style={{ color: OBS_NOTES.mist }}>
                              {diffCount > 0 ? `${diffCount} 处字段变更` : '无字段明细'}
                            </p>
                          </div>
                          <ChevronDown
                            className="mt-1 size-4 shrink-0 transition-transform duration-200"
                            style={{
                              color: OBS_NOTES.garnet,
                              transform: openRow ? 'rotate(180deg)' : undefined,
                            }}
                            strokeWidth={1.8}
                          />
                        </Pressable>

                        <AnimatePresence initial={false}>
                          {openRow && diffCount > 0 ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden"
                            >
                              <div
                                className="space-y-2.5 px-3.5 pb-3.5 pt-1"
                                style={{ borderTop: `1px solid ${OBS_NOTES.hairline}` }}
                              >
                                <p className="pt-2.5" style={{ ...OBS_NOTES_EN_STYLE, fontSize: 9, color: OBS_NOTES.mist }}>
                                  FIELD DIFF
                                </p>
                                {ev.diffs.map((d) => (
                                  <DiffLine key={d.path + d.label} diff={d} />
                                ))}
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function DiffLine({ diff }: { diff: ObservationFieldDiff }) {
  const prev = (diff.previousText || '（空）').trim()
  const next = (diff.currentText || '（空）').trim()
  return (
    <div
      className="overflow-hidden rounded-[10px]"
      style={{ border: `1px solid ${OBS_NOTES.hairline}`, background: OBS_NOTES.paper }}
    >
      <div
        className="px-3 py-2"
        style={{ borderBottom: `1px solid ${OBS_NOTES.hairline}`, background: 'rgba(255,255,255,0.7)' }}
      >
        <p className="text-[12px] font-semibold tracking-wide" style={{ color: OBS_NOTES.garnet }}>
          {diff.label}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-0">
        <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${OBS_NOTES.hairline}` }}>
          <p className="mb-1" style={{ ...OBS_NOTES_EN_STYLE, fontSize: 9, color: OBS_NOTES.mist }}>
            BEFORE
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: OBS_NOTES.mist }}>
            {prev}
          </p>
        </div>
        <div className="px-3 py-2.5" style={{ background: OBS_NOTES.garnetSoftBg }}>
          <p className="mb-1" style={{ ...OBS_NOTES_EN_STYLE, fontSize: 9, color: OBS_NOTES.garnet }}>
            AFTER
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: OBS_NOTES.ink }}>
            {next}
          </p>
        </div>
      </div>
    </div>
  )
}

export function ObservationNotesScreen({
  open,
  doc,
  onClose,
  onDocChange,
  disableTransitions,
  accountId = null,
  wechatCtx = null,
}: {
  open: boolean
  doc: ObservationNotesDoc | null
  onClose: () => void
  onDocChange: (next: ObservationNotesDoc) => void
  disableTransitions?: boolean
  accountId?: string | null
  /** 手动更新所需：API + 身份上下文 */
  wechatCtx?: AnonymousQaWechatContext | null
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [playEntrance, setPlayEntrance] = useState(true)
  const [manualBusy, setManualBusy] = useState(false)
  const [manualFeedback, setManualFeedback] = useState<string | null>(null)
  const [manualConfirmOpen, setManualConfirmOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [coachStepIndex, setCoachStepIndex] = useState(0)
  const markedRef = useRef(false)
  const detailAutoCoachStartedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { handStack } = useObservationCharHandFont({
    characterId: doc?.conversationCharacterId,
    accountId,
  })
  const hand = useMemo(() => obsMarginaliaStyle(handStack), [handStack])
  const remarkStyle = useMemo(() => obsRemarkStyle(handStack), [handStack])

  const startLiveCoach = useCallback(() => {
    setCoachStepIndex(0)
    setCoachOpen(true)
  }, [])

  const finishCoach = useCallback((opts?: { openTutorial?: boolean }) => {
    writeMemoryCoachSeen(OBS_NOTES_DETAIL_COACH_SEEN_KEY)
    setCoachOpen(false)
    setCoachStepIndex(0)
    if (opts?.openTutorial) setTutorialOpen(true)
  }, [])

  useEffect(() => {
    if (!open || !doc) return
    if (detailAutoCoachStartedRef.current) return
    if (readMemoryCoachSeen(OBS_NOTES_DETAIL_COACH_SEEN_KEY)) return
    detailAutoCoachStartedRef.current = true
    writeMemoryCoachSeen(OBS_NOTES_DETAIL_COACH_SEEN_KEY)
    const id = window.setTimeout(() => startLiveCoach(), 560)
    return () => window.clearTimeout(id)
  }, [open, doc, startLiveCoach])

  useEffect(() => {
    if (!open) {
      markedRef.current = false
      setHistoryOpen(false)
      setManualBusy(false)
      setManualFeedback(null)
      setManualConfirmOpen(false)
      setTutorialOpen(false)
      setCoachOpen(false)
      setCoachStepIndex(0)
      return
    }
    setPlayEntrance(true)
    const t = window.setTimeout(() => setPlayEntrance(false), 900)
    return () => window.clearTimeout(t)
  }, [open, doc?.updatedAt])

  useEffect(() => {
    if (!open || !doc || markedRef.current) return
    markedRef.current = true
    void markObservationNotesSeen(doc).then(onDocChange)
  }, [open, doc, onDocChange])

  const onConsumed = useCallback((_path: string) => {}, [])

  const showUpdateBanner = useMemo(() => {
    if (!doc) return false
    return doc.pendingDiffs.length > 0
  }, [doc])

  const jumpToFirstDiff = useCallback(() => {
    if (!doc?.pendingDiffs[0]) return
    const path = doc.pendingDiffs[0].path
    const el = document.getElementById(`obs-path-${path.replace(/\./g, '-')}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [doc])

  const runManualUpdate = useCallback(async () => {
    if (!doc || manualBusy) return
    if (!wechatCtx?.apiConfig?.apiUrl?.trim()) {
      setManualFeedback('未配置 AI，无法手动更新')
      return
    }
    setManualConfirmOpen(false)
    setManualBusy(true)
    setManualFeedback('正在按近端 10 轮整份重写侧写…')
    try {
      const result = await runObservationNotesManualUpdate({
        conversationCharacterId: doc.conversationCharacterId,
        playerIdentityId: doc.playerIdentityId,
        charDisplayName: doc.charDisplayName,
        wechatCtx,
      })
      if (result.status === 'updated') {
        markedRef.current = false
        onDocChange(result.doc)
        setManualFeedback(`已整份重写 · ${result.diffCount} 处有变化`)
      } else if (result.status === 'no_change') {
        onDocChange(result.doc)
        setManualFeedback('本轮无实质变化')
      } else {
        if (result.doc) {
          markedRef.current = false
          onDocChange(result.doc)
        }
        setManualFeedback(result.reason || '更新失败')
      }
    } catch (e) {
      const msg = e instanceof Error && e.message.trim() ? e.message.trim() : '更新失败'
      setManualFeedback(msg)
    } finally {
      setManualBusy(false)
    }
  }, [doc, manualBusy, onDocChange, wechatCtx])

  const requestManualUpdate = useCallback(() => {
    if (!doc || manualBusy) return
    if (!wechatCtx?.apiConfig?.apiUrl?.trim()) {
      setManualFeedback('未配置 AI，无法手动更新')
      return
    }
    setManualConfirmOpen(true)
  }, [doc, manualBusy, wechatCtx])

  return (
    <>
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`absolute inset-0 z-[30] flex flex-col ${OBS_NOTES_SERIF_CLASS}`}
          style={{
            background: OBS_NOTES.paper,
            fontFamily: OBS_NOTES_FONT,
          }}
          initial={disableTransitions ? false : { x: '100%' }}
          animate={{ x: 0 }}
          exit={disableTransitions ? undefined : { x: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          {...{ [OBS_NOTES_COACH_ROOT_ATTR]: OBS_NOTES_DETAIL_COACH_SCOPE }}
        >
          <div
            className="relative shrink-0 pt-[max(6px,env(safe-area-inset-top,0px))]"
            style={{
              borderBottom: `1px solid ${OBS_NOTES.hairline}`,
              background: 'rgba(242,244,247,0.88)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="relative flex min-h-[44px] items-center px-1">
              <Pressable
                type="button"
                aria-label="返回"
                className="relative z-[1] flex size-10 shrink-0 items-center justify-center"
                onClick={onClose}
              >
                <ChevronLeft className="size-5" style={{ color: OBS_NOTES.ink }} />
              </Pressable>

              <div className="min-w-0 flex-1 px-1 text-center">
                <p
                  className="truncate text-[16px] font-semibold tracking-[0.12em]"
                  style={{ color: OBS_NOTES.ink }}
                >
                  {OBS_NOTES_HEADER.zh}
                </p>
                <p
                  className="mt-0.5 flex items-center justify-center gap-1.5 truncate"
                  style={{ color: OBS_NOTES.mist }}
                >
                  <span style={{ ...OBS_NOTES_EN_STYLE, fontSize: 8, letterSpacing: '0.18em' }}>
                    {OBS_NOTES_HEADER.en}
                  </span>
                  {doc ? (
                    <>
                      <span aria-hidden style={{ opacity: 0.45 }}>
                        ·
                      </span>
                      <span className="truncate text-[10px] tracking-wide" style={OBS_NOTES_NUM_STYLE}>
                        写于 {formatObsHeaderDate(doc.updatedAt)}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>

              <span className="size-10 shrink-0" aria-hidden />
            </div>

            <div
              className={`grid gap-2 px-3 pb-2.5 ${doc ? 'grid-cols-3' : 'grid-cols-1'}`}
            >
              <button
                type="button"
                onClick={() => setTutorialOpen(true)}
                className="flex h-8 w-full items-center justify-center gap-1 rounded-full px-2 transition-colors active:opacity-80"
                style={{
                  background: OBS_NOTES.garnetSoftBg,
                  color: OBS_NOTES.garnet,
                  border: `1px solid rgba(139,26,26,0.22)`,
                }}
                aria-label="私藏侧写教程"
                {...{ [OBS_NOTES_COACH_TARGET_ATTR]: 'obs-detail-tutorial' }}
              >
                <BookOpen className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                <span className="text-[11px] font-medium tracking-wide">教程</span>
              </button>
              {doc ? (
                <>
                  <Pressable
                    type="button"
                    aria-label="手动更新侧写"
                    disabled={manualBusy}
                    onClick={() => requestManualUpdate()}
                    className="flex h-8 w-full items-center justify-center gap-1 rounded-full px-2 active:opacity-80 disabled:opacity-55"
                    style={{
                      color: OBS_NOTES.garnet,
                      background: OBS_NOTES.garnetSoftBg,
                    }}
                    {...{ [OBS_NOTES_COACH_TARGET_ATTR]: 'obs-detail-manual' }}
                  >
                    <RefreshCw
                      className={`size-3.5 shrink-0 ${manualBusy ? 'animate-spin' : ''}`}
                      strokeWidth={1.7}
                    />
                    <span className="text-[11px] font-semibold tracking-wide">
                      {manualBusy ? '整理中' : '手动更新'}
                    </span>
                  </Pressable>
                  <Pressable
                    type="button"
                    aria-label="查看更新历史"
                    onClick={() => setHistoryOpen(true)}
                    className="flex h-8 w-full items-center justify-center gap-1 rounded-full px-2 active:opacity-80"
                    style={{
                      color: OBS_NOTES.garnet,
                      background: OBS_NOTES.garnetSoftBg,
                    }}
                    {...{ [OBS_NOTES_COACH_TARGET_ATTR]: 'obs-detail-history' }}
                  >
                    <History className="size-3.5 shrink-0" strokeWidth={1.7} />
                    <span className="text-[11px] font-semibold tracking-wide">历史</span>
                  </Pressable>
                </>
              ) : null}
            </div>
          </div>

          {manualFeedback ? (
            <div
              className="shrink-0 px-4 py-2 text-[12px] leading-snug"
              style={{
                color: OBS_NOTES.garnet,
                background: OBS_NOTES.garnetSoftBg,
                borderBottom: `1px solid ${OBS_NOTES.hairline}`,
              }}
            >
              {manualFeedback}
            </div>
          ) : null}

          {!doc ? (
            <div className="flex flex-1 items-center justify-center px-6">
              <p className="text-[13px]" style={{ color: OBS_NOTES.mist }}>
                还没有整理出关于你的笔记。
              </p>
            </div>
          ) : (
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(28px,env(safe-area-inset-bottom))]">
              {showUpdateBanner ? (
                <Pressable
                  type="button"
                  onClick={jumpToFirstDiff}
                  className="mb-4 mt-3 w-full rounded-[10px] px-3 py-2.5 text-left text-[12px] leading-snug"
                  style={{
                    color: OBS_NOTES.garnet,
                    background: OBS_NOTES.garnetSoftBg,
                    border: `1px solid rgba(92,63,78,0.22)`,
                  }}
                >
                  较上次更新，有 {doc.pendingDiffs.length} 项内容发生了变化 · 点击跳转
                </Pressable>
              ) : (
                <div className="h-3" aria-hidden />
              )}

              <div className="flex flex-col" style={{ gap: 16 }}>
                <FolderSection title="基础认知" index="01" defaultOpen>
                  {BASIC_FIELD_META.map((meta) => {
                    const path = `basic.${meta.key}`
                    const field = doc.basic[meta.key]
                    return (
                      <div key={meta.key} id={`obs-path-${path.replace(/\./g, '-')}`}>
                        <DiffableRow path={path} label={meta.label} en={meta.en} doc={doc} onConsumed={onConsumed}>
                          <FieldValueText
                            field={field}
                            handStack={handStack}
                            forceHand={meta.key === 'gender'}
                          />
                        </DiffableRow>
                        <div style={{ height: 1, background: OBS_NOTES.hairline, opacity: 0.7 }} />
                      </div>
                    )
                  })}
                </FolderSection>

                <FolderSection
                  title="亲密偏好认知"
                  index="02"
                  en="SEXUAL INTIMACY"
                  defaultOpen={false}
                  titleRight={
                    <Lock className="size-3.5" strokeWidth={1.6} style={{ color: OBS_NOTES.mist }} aria-hidden />
                  }
                >
                  <p className="mb-2 px-1 text-[11px] leading-relaxed" style={{ color: OBS_NOTES.mist }}>
                    性向身体亲密：节奏偏好 · 部位 XP · 敏感处 · 具体方式（非感情节奏）
                  </p>
                  <IntimateReveal>
                    {doc.intimate.map((row, idx) => {
                      const path = `intimate.${row.key}`
                      return (
                        <div key={row.key} id={`obs-path-${path.replace(/\./g, '-')}`}>
                          <DiffableRow path={path} label={row.label} doc={doc} onConsumed={onConsumed}>
                            <FieldValueText field={row.field} larger handStack={handStack} />
                          </DiffableRow>
                          {idx < doc.intimate.length - 1 ? (
                            <div style={{ height: 1, background: OBS_NOTES.hairline, opacity: 0.7 }} />
                          ) : null}
                        </div>
                      )
                    })}
                  </IntimateReveal>
                </FolderSection>

                <FolderSection title="优点与缺点" index="03" defaultOpen={false}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p style={{ ...OBS_NOTES_EN_STYLE, marginBottom: 4 }}>VIRTUES</p>
                      <p className="mb-2.5 text-[12px] font-medium" style={{ color: OBS_NOTES.inkSoft }}>
                        优点
                      </p>
                      <ul className="space-y-2.5">
                        {doc.strengths.map((s, i) => (
                          <li key={`s-${i}`} className="flex gap-2">
                            <span
                              className="mt-[7px] size-[4px] shrink-0 rounded-full"
                              style={{ background: OBS_NOTES.garnet }}
                            />
                            <p className="text-[13px] leading-relaxed" style={hand}>
                              {s}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p style={{ ...OBS_NOTES_EN_STYLE, marginBottom: 4 }}>FLAWS</p>
                      <p className="mb-2.5 text-[12px] font-medium" style={{ color: OBS_NOTES.inkSoft }}>
                        缺点
                      </p>
                      <ul className="space-y-2.5">
                        {doc.weaknesses.map((s, i) => (
                          <li key={`w-${i}`} className="flex gap-2">
                            <span
                              className="mt-[7px] size-[4px] shrink-0 rounded-full"
                              style={{ background: OBS_NOTES.garnet }}
                            />
                            <p className="text-[13px] leading-relaxed" style={hand}>
                              {s}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </FolderSection>

                <div id="obs-path-remarkNickname">
                  <FolderSection title="给你的线上备注" index="04" defaultOpen={false}>
                    <DiffableRow path="remarkNickname" label="备注" en="ALIAS" doc={doc} onConsumed={onConsumed}>
                      <p className="text-[18px] leading-snug" style={{ ...remarkStyle, fontSize: 18 }}>
                        {doc.remarkNickname.trim() || '尚未起备注（深爱可宝宝/宝贝；勿用XX狗/猫）'}
                      </p>
                    </DiffableRow>
                  </FolderSection>
                </div>

                <div id="obs-path-preferredAddress">
                  <FolderSection title="你喜欢的称呼" index="05" defaultOpen={false}>
                    <DiffableRow path="preferredAddress" label="称呼" en="ADDRESS" doc={doc} onConsumed={onConsumed}>
                      <p className="text-[16px] leading-relaxed" style={{ ...hand, fontSize: 16 }}>
                        {doc.preferredAddress.trim() || '还没想好怎么叫你。'}
                      </p>
                    </DiffableRow>
                  </FolderSection>
                </div>

                <FolderSection
                  title="对你的判定"
                  index="06"
                  clip={false}
                  defaultOpen={
                    !doc.personalityRadar.judged ||
                    !doc.abilityRadar.judged ||
                    !doc.personalityRadar.note?.trim() ||
                    !doc.abilityRadar.note?.trim() ||
                    isPathPending(doc, 'personalityRadar') ||
                    isPathPending(doc, 'abilityRadar')
                  }
                >
                  <div id="obs-path-personalityRadar" className="flex flex-col gap-8 overflow-visible px-1 py-1">
                    <ObservationNotesRadar
                      title="人格倾向判定 · MBTI"
                      block={doc.personalityRadar}
                      playEntrance={playEntrance}
                      handStack={handStack}
                    />
                    <div style={{ height: 1, background: OBS_NOTES.hairline }} />
                    <div id="obs-path-abilityRadar">
                      <ObservationNotesRadar
                        title="内在能力判断"
                        block={doc.abilityRadar}
                        playEntrance={playEntrance}
                        handStack={handStack}
                      />
                    </div>
                  </div>
                </FolderSection>

                <FolderSection title="总体评价" index="07" en="CLOSING LETTER">
                  <p className="text-[16px] leading-[1.8]" style={{ ...hand, fontSize: 16, lineHeight: 1.8 }}>
                    {doc.overallEvaluation.trim() || '……还在想怎么写。'}
                  </p>
                  <p
                    className="mt-5 text-right text-[15px] font-medium not-italic"
                    style={{ color: OBS_NOTES.ink, fontStyle: 'normal', fontFamily: OBS_NOTES_FONT }}
                  >
                    ——{doc.charDisplayName}
                  </p>

                  <div className="mt-8">
                    <ObservationAffectionBar
                      value={doc.affection}
                      stageLabel={doc.affectionStageLabel}
                      playEntrance={playEntrance}
                    />
                  </div>

                  <div className="mt-6 flex justify-center">
                    <span
                      className="rounded-full px-4 py-1.5 text-[13px] font-medium tracking-wide"
                      style={{
                        color: OBS_NOTES.garnet,
                        border: `1px solid ${OBS_NOTES.garnet}`,
                      }}
                    >
                      {doc.relationshipLabel}
                    </span>
                  </div>
                </FolderSection>
              </div>
            </div>
          )}

          {doc ? <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} doc={doc} /> : null}

          {manualConfirmOpen ? (
            <div
              className="absolute inset-0 z-[80] flex items-center justify-center px-6"
              style={{ background: 'rgba(18, 20, 26, 0.42)' }}
              role="presentation"
              onClick={() => {
                if (!manualBusy) setManualConfirmOpen(false)
              }}
            >
              <div
                className="w-full max-w-[320px] rounded-[16px] px-5 pb-5 pt-5"
                style={{
                  background: OBS_NOTES.card,
                  border: `1px solid ${OBS_NOTES.hairline}`,
                  boxShadow: '0 12px 40px rgba(18, 20, 26, 0.18)',
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="obs-manual-confirm-title"
                onClick={(e) => e.stopPropagation()}
              >
                <p
                  id="obs-manual-confirm-title"
                  className="text-center text-[16px] font-semibold tracking-wide"
                  style={{ color: OBS_NOTES.ink, fontFamily: OBS_NOTES_FONT }}
                >
                  确认整份重写？
                </p>
                <p
                  className="mt-3 text-[13px] leading-relaxed"
                  style={{ color: OBS_NOTES.inkSoft, fontFamily: OBS_NOTES_FONT }}
                >
                  将按线上/线下近端各 10 轮 + 最新侧写原稿对照**整份重写**并覆盖旧档（不走向量/长期记忆）。材料没提到的内容（含亲密偏好）会改成「暂时不知道」，不会原样保留无依据的旧认知。
                </p>
                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    disabled={manualBusy}
                    onClick={() => setManualConfirmOpen(false)}
                    className="flex-1 rounded-full py-2.5 text-[13px] font-medium active:opacity-80 disabled:opacity-55"
                    style={{
                      color: OBS_NOTES.inkSoft,
                      border: `1px solid ${OBS_NOTES.hairline}`,
                      background: OBS_NOTES.paperSoft,
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={manualBusy}
                    onClick={() => void runManualUpdate()}
                    className="flex-1 rounded-full py-2.5 text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-55"
                    style={{ background: OBS_NOTES.garnet }}
                  >
                    确认重写
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
      <MemoryTutorialModal
        open={tutorialOpen && open}
        onClose={() => setTutorialOpen(false)}
        title="私藏侧写 · 档案说明"
        subtitle="手动更新 · 历史 · 剧情回滚"
        sections={OBS_NOTES_DETAIL_TUTORIAL_SECTIONS}
        onStartLiveCoach={() => {
          setTutorialOpen(false)
          startLiveCoach()
        }}
        zIndex={63000}
      />
      <MemoryCoachPortal
        open={coachOpen && open}
        steps={OBS_NOTES_DETAIL_COACH_STEPS}
        stepIndex={coachStepIndex}
        onStepChange={setCoachStepIndex}
        onSkip={() => finishCoach()}
        onComplete={finishCoach}
        scopeRoot={OBS_NOTES_DETAIL_COACH_SCOPE}
        coachTargetAttr={OBS_NOTES_COACH_TARGET_ATTR}
        coachRootAttr={OBS_NOTES_COACH_ROOT_ATTR}
        zIndex={63100}
      />
    </>
  )
}
