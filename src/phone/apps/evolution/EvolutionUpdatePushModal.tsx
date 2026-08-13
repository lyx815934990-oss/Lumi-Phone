import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Pressable } from '../../components/Pressable'
import { EvolutionFeatureEntryCoach } from './EvolutionFeatureEntryCoach'
import {
  dismissEvolutionPushForToday,
  dismissEvolutionPushThisSession,
  isEvolutionPushVersionRead,
  markEvolutionPushVersionRead,
} from './evolutionPushStorage'
import {
  getEvolutionEntryGuide,
  type EvolutionEntryGuide,
} from './evolutionFeatureEntryGuides'
import {
  getLatestEvolutionRecord,
  type UpdateCategory,
  type UpdateDetail,
} from './evolutionLogData'

type Props = {
  open: boolean
  onClose: () => void
  onOpenEvolution: () => void
}

const DWELL_SECONDS = 15

const CAT_LABEL: Record<UpdateCategory['type'], string> = {
  feature: '新增',
  optimization: '优化',
  fix: '修复',
}

const CAT_SECTION_META: Record<
  UpdateCategory['type'],
  {
    en: string
    shell: string
    head: string
    accent: string
    pill: string
    title: string
    card: string
    module: string
    body: string
  }
> = {
  feature: {
    en: 'NEW',
    shell: 'overflow-hidden rounded-[18px] border border-[#1C1C1E]/10 bg-[#1C1C1E]',
    head: 'flex items-center gap-2.5 border-b border-white/10 bg-[#1C1C1E] px-3.5 py-2.5',
    accent: 'h-5 w-1 rounded-full bg-white',
    pill: 'rounded-full bg-white px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-[#1C1C1E]',
    title: 'font-serif text-[15px] font-semibold tracking-[0.08em] text-white',
    card: 'rounded-[12px] border border-white/10 bg-white/[0.06] px-3 py-2.5',
    module: 'text-[11px] font-medium text-white/75',
    body: 'mt-1 text-[12px] leading-relaxed text-white/55',
  },
  optimization: {
    en: 'OPT',
    shell: 'overflow-hidden rounded-[18px] border border-[#1C1C1E]/8 bg-[#F0F0F3]',
    head: 'flex items-center gap-2.5 border-b border-[#1C1C1E]/8 bg-[#E4E4EA] px-3.5 py-2.5',
    accent: 'h-5 w-1 rounded-full bg-[#1C1C1E]',
    pill: 'rounded-full bg-[#1C1C1E] px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-white',
    title: 'font-serif text-[15px] font-semibold tracking-[0.08em] text-[#1C1C1E]',
    card: 'rounded-[12px] border border-[#1C1C1E]/6 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(28,28,30,0.04)]',
    module: 'text-[11px] font-medium text-[#1C1C1E]/85',
    body: 'mt-1 text-[12px] leading-relaxed text-[#1C1C1E]/55',
  },
  fix: {
    en: 'FIX',
    shell: 'overflow-hidden rounded-[18px] border border-dashed border-[#C4C4CC] bg-white',
    head: 'flex items-center gap-2.5 border-b border-dashed border-[#D8D8DE] bg-[#FAFAFB] px-3.5 py-2.5',
    accent: 'h-5 w-1 rounded-full bg-[#8E8E93]',
    pill: 'rounded-full border border-[#C7C7CC] bg-white px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-[#636366]',
    title: 'font-serif text-[15px] font-semibold tracking-[0.08em] text-[#3A3A3C]',
    card: 'rounded-[12px] border border-[#E8E8ED] bg-[#FBFBFC] px-3 py-2.5',
    module: 'text-[11px] font-medium text-[#48484A]',
    body: 'mt-1 text-[12px] leading-relaxed text-[#6C6C70]',
  },
}

function detailLine(item: UpdateDetail): string {
  return item.highlight ? `${item.highlight}${item.text}` : item.text
}

export function EvolutionUpdatePushModal({ open, onClose, onOpenEvolution }: Props) {
  const latest = getLatestEvolutionRecord()
  const version = latest.version

  const guidedFeatures = useMemo(() => {
    const mods = latest.categories.find((c) => c.type === 'feature')?.modules ?? []
    return mods
      .map((m) => {
        const guide = getEvolutionEntryGuide(m.entryGuideId)
        return guide ? { moduleName: m.moduleName, guide } : null
      })
      .filter((x): x is { moduleName: string; guide: EvolutionEntryGuide } => !!x)
  }, [latest])

  const summarySections = useMemo(() => {
    return latest.categories
      .map((cat) => ({
        type: cat.type,
        label: CAT_LABEL[cat.type],
        rows: cat.modules.flatMap((m) =>
          m.items.map((item) => ({
            module: m.moduleName,
            text: detailLine(item),
          })),
        ),
      }))
      .filter((s) => s.rows.length > 0)
  }, [latest])

  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeGuide, setActiveGuide] = useState<EvolutionEntryGuide | null>(null)
  /** 未读时需倒计时；已读则立即解锁关闭 */
  const [alreadyRead, setAlreadyRead] = useState(() => isEvolutionPushVersionRead(version))
  const [remainSec, setRemainSec] = useState(() =>
    isEvolutionPushVersionRead(version) ? 0 : DWELL_SECONDS,
  )

  const canDismiss = alreadyRead || remainSec <= 0

  useEffect(() => {
    if (!open) {
      setPickerOpen(false)
      setActiveGuide(null)
      return
    }
    const read = isEvolutionPushVersionRead(version)
    setAlreadyRead(read)
    setRemainSec(read ? 0 : DWELL_SECONDS)
  }, [open, version])

  useEffect(() => {
    if (!open || alreadyRead) return
    const id = window.setInterval(() => {
      setRemainSec((s) => {
        if (s <= 1) {
          markEvolutionPushVersionRead(version)
          setAlreadyRead(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [open, alreadyRead, version])

  const markReadAndClose = (closeFn: () => void) => {
    if (!canDismiss) return
    markEvolutionPushVersionRead(version)
    closeFn()
  }

  const handleViewLog = () => {
    markEvolutionPushVersionRead(version)
    dismissEvolutionPushThisSession(version)
    onClose()
    onOpenEvolution()
  }

  const handleCloseSession = () => {
    markReadAndClose(() => {
      dismissEvolutionPushThisSession(version)
      onClose()
    })
  }

  const handleCloseToday = () => {
    markReadAndClose(() => {
      dismissEvolutionPushForToday(version)
      dismissEvolutionPushThisSession(version)
      onClose()
    })
  }

  const handleOpenFeatureGuides = () => {
    if (guidedFeatures.length === 0) return
    if (guidedFeatures.length === 1) {
      setActiveGuide(guidedFeatures[0].guide)
      return
    }
    setPickerOpen(true)
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[10002] flex items-center justify-center px-5 py-6 sm:px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label="系统更新推送"
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" />
          <motion.div
            className="relative flex max-h-[min(640px,86vh)] w-full max-w-[400px] flex-col overflow-hidden rounded-[22px] border border-black/10 bg-white text-[#1C1C1E] shadow-[0_24px_60px_rgba(28,28,30,0.22)]"
            initial={{ y: 16, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.99, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="shrink-0 border-b border-gray-100 bg-[#FAFAFA] px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-gray-400">
                  System Update
                </p>
                {!canDismiss ? (
                  <span className="rounded-full bg-[#1C1C1E] px-2.5 py-1 font-mono text-[11px] tabular-nums text-white">
                    {remainSec}s
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="font-mono text-[32px] font-light leading-none tracking-tight text-[#1C1C1E]">
                  {latest.version}
                </p>
                <span className="mb-1 shrink-0 font-mono text-[11px] text-gray-400">
                  {latest.date}
                </span>
              </div>
              <h2 className="mt-3 font-serif text-[17px] font-semibold leading-snug tracking-wide text-[#1C1C1E]">
                {latest.title}
              </h2>
              {!canDismiss ? (
                <p className="mt-2 text-[12px] leading-relaxed text-[#1C1C1E]/55">
                  请先浏览下方更新要点，{remainSec} 秒后可关闭（已读过本版则不再强制停留）。
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 [scrollbar-width:thin]">
              <p className="text-[13px] leading-relaxed text-[#1C1C1E]/65 sm:text-[14px]">
                以下为本版演进录已登记的优化与修复。可下滑浏览，或打开完整更新日志。
              </p>

              <div className="mt-4 space-y-3.5 pb-1">
                {summarySections.map((sec) => {
                  const meta = CAT_SECTION_META[sec.type]
                  return (
                    <section key={sec.type} className={meta.shell}>
                      <header className={meta.head}>
                        <span className={meta.accent} aria-hidden />
                        <span className={meta.pill}>{meta.en}</span>
                        <h3 className={`min-w-0 flex-1 ${meta.title}`}>{sec.label}</h3>
                        <span className="font-mono text-[10px] tabular-nums text-current opacity-40">
                          {String(sec.rows.length).padStart(2, '0')}
                        </span>
                      </header>
                      <ul className="space-y-2 p-2.5">
                        {sec.rows.map((row, i) => (
                          <li key={`${sec.type}-${i}-${row.module}`} className={meta.card}>
                            <p className={meta.module}>{row.module}</p>
                            <p className={meta.body}>{row.text}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-100 bg-white px-5 pb-4 pt-3 sm:px-6">
              <div className="space-y-2.5">
                {guidedFeatures.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleOpenFeatureGuides}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#1C1C1E]/[0.1] bg-[#F4F4F5] text-[14px] font-medium text-[#1C1C1E] transition active:scale-[0.99]"
                  >
                    <Sparkles className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    查看新增功能指引
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleViewLog}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#1C1C1E] text-[14px] font-medium text-white shadow-[0_12px_28px_rgba(28,28,30,0.2)] transition active:scale-[0.99]"
                >
                  查看更新日志
                  <ArrowRight className="size-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={!canDismiss}
                  onClick={handleCloseToday}
                  className="h-10 rounded-[12px] border border-gray-200 bg-[#F9FAFB] text-[13px] font-medium text-[#1C1C1E]/75 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {canDismiss ? '今日关闭' : `今日关闭（${remainSec}s）`}
                </button>
                <button
                  type="button"
                  disabled={!canDismiss}
                  onClick={handleCloseSession}
                  className="h-10 rounded-[12px] border border-transparent text-[13px] font-medium text-gray-400 transition hover:text-[#1C1C1E]/70 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {canDismiss ? '关闭' : `关闭（${remainSec}s）`}
                </button>
              </div>
              <p className="mt-2.5 text-center text-[11px] leading-relaxed text-gray-400">
                「关闭」仅本次停留不再弹出；刷新仍会提醒。「今日关闭」则今天不再弹出。
                未读首次需停留约 {DWELL_SECONDS} 秒。
              </p>
            </div>
          </motion.div>

          {/* 多条新功能时先选再开指引 */}
          <AnimatePresence>
            {pickerOpen ? (
              <motion.div
                className="absolute inset-0 z-[1] flex items-end justify-center sm:items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/35"
                  aria-label="关闭指引选择"
                  onClick={() => setPickerOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-label="选择新增功能指引"
                  className="relative z-[1] mb-0 w-full max-w-[400px] rounded-t-[22px] border border-black/10 bg-white p-5 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] sm:mb-0 sm:rounded-[22px]"
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 16, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1C1C1E]/40">
                        Feature Guide
                      </p>
                      <h3 className="mt-1 font-serif text-[17px] font-semibold text-[#1C1C1E]">
                        选择要查看的指引
                      </h3>
                    </div>
                    <Pressable
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04]"
                      aria-label="关闭"
                    >
                      <X className="size-4 text-neutral-500" strokeWidth={1.5} />
                    </Pressable>
                  </div>
                  <div className="mt-4 space-y-2">
                    {guidedFeatures.map(({ moduleName, guide }) => (
                      <Pressable
                        key={guide.id}
                        type="button"
                        onClick={() => {
                          setPickerOpen(false)
                          setActiveGuide(guide)
                        }}
                        className="flex w-full items-center gap-3 rounded-[16px] border border-gray-100 bg-[#FAFAFA] px-4 py-3.5 text-left transition active:scale-[0.99]"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-white">
                          <Sparkles className="size-3.5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-medium text-[#1C1C1E]">
                            {guide.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-[#1C1C1E]/45">
                            {moduleName}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-[#1C1C1E]/35" strokeWidth={1.75} />
                      </Pressable>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeGuide ? (
            <EvolutionFeatureEntryCoach
              open
              guide={activeGuide}
              onClose={() => setActiveGuide(null)}
            />
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
