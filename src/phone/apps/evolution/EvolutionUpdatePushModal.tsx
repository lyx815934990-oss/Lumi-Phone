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

type ViewMode = 'brief' | 'detail'

const DWELL_SECONDS = 15

const CAT_LABEL: Record<UpdateCategory['type'], string> = {
  feature: '新增',
  optimization: '优化',
  fix: '修复',
}

/** 三板块统一纸感底 + 柔和色条，避免黑白虚线混搭 */
const CAT_SECTION_META: Record<
  UpdateCategory['type'],
  {
    en: string
    accentBar: string
    shell: string
    head: string
    pill: string
    title: string
    count: string
    moduleName: string
    entryPath: string
    itemTitle: string
    itemBody: string
  }
> = {
  feature: {
    en: 'NEW',
    accentBar: 'bg-[#3B6D8C]',
    shell: 'overflow-hidden rounded-2xl border border-[#3B6D8C]/14 bg-[#F3F7FA]',
    head: 'flex items-center gap-2.5 px-3.5 py-2.5',
    pill: 'rounded-md bg-[#3B6D8C] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-white',
    title: 'text-[15px] font-semibold tracking-wide text-[#1E3A4C]',
    count: 'font-mono text-[10px] tabular-nums text-[#3B6D8C]/55',
    moduleName: 'text-[13px] font-semibold text-[#1E3A4C]',
    entryPath: 'mt-0.5 text-[10px] leading-relaxed text-[#3B6D8C]/55',
    itemTitle: 'text-[12px] font-medium leading-snug text-[#243B4A]',
    itemBody: 'mt-0.5 text-[12px] leading-relaxed text-[#4A6575]',
  },
  optimization: {
    en: 'OPT',
    accentBar: 'bg-[#4A7C6A]',
    shell: 'overflow-hidden rounded-2xl border border-[#4A7C6A]/14 bg-[#F3F8F5]',
    head: 'flex items-center gap-2.5 px-3.5 py-2.5',
    pill: 'rounded-md bg-[#4A7C6A] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-white',
    title: 'text-[15px] font-semibold tracking-wide text-[#1F3D32]',
    count: 'font-mono text-[10px] tabular-nums text-[#4A7C6A]/55',
    moduleName: 'text-[13px] font-semibold text-[#1F3D32]',
    entryPath: 'mt-0.5 text-[10px] leading-relaxed text-[#4A7C6A]/55',
    itemTitle: 'text-[12px] font-medium leading-snug text-[#274237]',
    itemBody: 'mt-0.5 text-[12px] leading-relaxed text-[#4D6B5C]',
  },
  fix: {
    en: 'FIX',
    accentBar: 'bg-[#8A7355]',
    shell: 'overflow-hidden rounded-2xl border border-[#8A7355]/16 bg-[#F8F5F1]',
    head: 'flex items-center gap-2.5 px-3.5 py-2.5',
    pill: 'rounded-md bg-[#8A7355] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-white',
    title: 'text-[15px] font-semibold tracking-wide text-[#3D3228]',
    count: 'font-mono text-[10px] tabular-nums text-[#8A7355]/55',
    moduleName: 'text-[13px] font-semibold text-[#3D3228]',
    entryPath: 'mt-0.5 text-[10px] leading-relaxed text-[#8A7355]/55',
    itemTitle: 'text-[12px] font-medium leading-snug text-[#4A3F34]',
    itemBody: 'mt-0.5 text-[12px] leading-relaxed text-[#6B5D4E]',
  },
}

function splitDetailTitle(item: UpdateDetail): { title: string | null; body: string } {
  if (item.highlight) {
    return {
      title: item.highlight.replace(/：$/, '').replace(/:$/, '').trim(),
      body: item.text,
    }
  }
  const raw = item.text.trim()
  const m = raw.match(/^(.{2,18}?)([：:，,]|。)/)
  if (m) {
    return { title: m[1].trim(), body: raw.slice(m[0].length).trim() || raw }
  }
  return { title: null, body: raw }
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
        modules: cat.modules
          .map((m) => ({
            name: m.moduleName,
            entryPath: m.entryPath,
            items: m.items.map((item) => splitDetailTitle(item)),
          }))
          .filter((m) => m.items.length > 0),
      }))
      .filter((s) => s.modules.length > 0)
  }, [latest])

  const [viewMode, setViewMode] = useState<ViewMode>('brief')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeGuide, setActiveGuide] = useState<EvolutionEntryGuide | null>(null)
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
    setViewMode('brief')
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
          <div className="absolute inset-0 bg-[#1A2229]/48 backdrop-blur-[4px]" />
          <motion.div
            className="relative flex max-h-[min(680px,88vh)] w-full max-w-[400px] flex-col overflow-hidden rounded-[24px] border border-[#1A2229]/8 bg-[#FBFCFD] text-[#1A2229] shadow-[0_28px_64px_rgba(26,34,41,0.28)]"
            initial={{ y: 16, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.99, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* 顶栏 */}
            <div className="shrink-0 border-b border-[#1A2229]/6 bg-gradient-to-b from-white to-[#F7F9FB] px-5 pb-3.5 pt-5 sm:px-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#1A2229]/35">
                  System Update
                </p>
                {!canDismiss ? (
                  <span className="rounded-full bg-[#1A2229] px-2.5 py-1 font-mono text-[11px] tabular-nums text-white">
                    {remainSec}s
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="font-mono text-[30px] font-light leading-none tracking-tight text-[#1A2229]">
                  {latest.version}
                </p>
                <span className="mb-1 shrink-0 font-mono text-[11px] text-[#1A2229]/40">
                  {latest.date}
                </span>
              </div>
              <h2 className="mt-2.5 text-[15px] font-semibold leading-snug tracking-wide text-[#1A2229]">
                {latest.title}
              </h2>
              {!canDismiss ? (
                <p className="mt-2 text-[12px] leading-relaxed text-[#1A2229]/50">
                  请先浏览下方更新要点，{remainSec} 秒后可关闭（已读过本版则不再强制停留）。
                </p>
              ) : null}

              {/* 简略 / 详细 */}
              <div
                className="mt-3.5 flex rounded-xl bg-[#1A2229]/[0.05] p-1"
                role="tablist"
                aria-label="更新说明详细程度"
              >
                {(
                  [
                    ['brief', '简略'],
                    ['detail', '详细'],
                  ] as const
                ).map(([id, label]) => {
                  const on = viewMode === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setViewMode(id)}
                      className={`relative flex-1 rounded-[10px] py-2 text-[13px] font-medium transition ${
                        on
                          ? 'bg-white text-[#1A2229] shadow-[0_1px_4px_rgba(26,34,41,0.1)]'
                          : 'text-[#1A2229]/45 hover:text-[#1A2229]/70'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#1A2229]/40">
                {viewMode === 'brief'
                  ? '按版块概括本版重点，快速扫一眼。'
                  : '含入口路径与完整说明，适合细读。'}
              </p>
            </div>

            {/* 内容 */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 [scrollbar-width:thin]">
              {viewMode === 'brief' ? (
                <div className="space-y-2.5 pb-1">
                  {(latest.briefSections?.length
                    ? latest.briefSections
                    : [
                        {
                          title: latest.version,
                          body: `${latest.title}。可切换「详细」查看分模块说明。`,
                        },
                      ]
                  ).map((sec) => (
                    <article
                      key={sec.title}
                      className="rounded-2xl border border-[#1A2229]/8 bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(26,34,41,0.04)]"
                    >
                      <h3 className="text-[13px] font-semibold tracking-wide text-[#1A2229]/88">
                        {sec.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-[1.65] text-[#1A2229]/62">
                        {sec.body}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
              <div className="space-y-3 pb-1">
                {summarySections.map((sec) => {
                  const meta = CAT_SECTION_META[sec.type]
                  const itemCount = sec.modules.reduce((n, m) => n + m.items.length, 0)
                  return (
                    <section key={sec.type} className={meta.shell}>
                      <div className="flex">
                        <span className={`w-[3px] shrink-0 self-stretch ${meta.accentBar}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <header className={meta.head}>
                            <span className={meta.pill}>{meta.en}</span>
                            <h3 className={`min-w-0 flex-1 ${meta.title}`}>{sec.label}</h3>
                            <span className={meta.count}>
                              {`${String(itemCount).padStart(2, '0')} 条`}
                            </span>
                          </header>

                          <div>
                              {sec.modules.map((mod) => (
                                <article
                                  key={mod.name}
                                  className="border-t border-black/[0.05] px-3.5 py-3 first:border-t-0"
                                >
                                  <h4 className={meta.moduleName}>{mod.name}</h4>
                                  {mod.entryPath ? (
                                    <p className={meta.entryPath}>入口 · {mod.entryPath}</p>
                                  ) : null}
                                  <ul className="mt-2 space-y-2.5">
                                    {mod.items.map((item, i) => (
                                      <li key={`${mod.name}-${i}`} className="flex gap-2">
                                        <span
                                          className={`mt-[7px] size-1 shrink-0 rounded-full ${meta.accentBar}`}
                                          aria-hidden
                                        />
                                        <div className="min-w-0 flex-1">
                                          {item.title ? (
                                            <p className={meta.itemTitle}>{item.title}</p>
                                          ) : null}
                                          <p className={item.title ? meta.itemBody : meta.itemTitle}>
                                            {item.body}
                                          </p>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </article>
                              ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  )
                })}
              </div>
              )}
            </div>

            {/* 底栏 */}
            <div className="shrink-0 border-t border-[#1A2229]/6 bg-white px-5 pb-4 pt-3 sm:px-6">
              <div className="space-y-2.5">
                {guidedFeatures.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleOpenFeatureGuides}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#1A2229]/10 bg-[#F3F6F8] text-[14px] font-medium text-[#1A2229] transition active:scale-[0.99]"
                  >
                    <Sparkles className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    查看新增功能指引
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleViewLog}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#1A2229] text-[14px] font-medium text-white shadow-[0_12px_28px_rgba(26,34,41,0.22)] transition active:scale-[0.99]"
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
                  className="h-10 rounded-[12px] border border-[#1A2229]/10 bg-[#F7F9FB] text-[13px] font-medium text-[#1A2229]/70 transition hover:bg-[#EEF2F5] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {canDismiss ? '今日关闭' : `今日关闭（${remainSec}s）`}
                </button>
                <button
                  type="button"
                  disabled={!canDismiss}
                  onClick={handleCloseSession}
                  className="h-10 rounded-[12px] border border-transparent text-[13px] font-medium text-[#1A2229]/40 transition hover:text-[#1A2229]/70 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {canDismiss ? '关闭' : `关闭（${remainSec}s）`}
                </button>
              </div>
              <p className="mt-2.5 text-center text-[11px] leading-relaxed text-[#1A2229]/38">
                「关闭」仅本次停留不再弹出；刷新仍会提醒。「今日关闭」则今天不再弹出。
                未读首次需停留约 {DWELL_SECONDS} 秒。
              </p>
            </div>
          </motion.div>

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
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A2229]/40">
                        Feature Guide
                      </p>
                      <h3 className="mt-1 text-[17px] font-semibold text-[#1A2229]">
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
                        className="flex w-full items-center gap-3 rounded-[16px] border border-gray-100 bg-[#F7F9FB] px-4 py-3.5 text-left transition active:scale-[0.99]"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1A2229] text-white">
                          <Sparkles className="size-3.5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-medium text-[#1A2229]">
                            {guide.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-[#1A2229]/45">
                            {moduleName}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-[#1A2229]/35" strokeWidth={1.75} />
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
