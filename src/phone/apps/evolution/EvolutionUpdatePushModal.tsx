import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Pressable } from '../../components/Pressable'
import { EvolutionFeatureEntryCoach } from './EvolutionFeatureEntryCoach'
import {
  dismissEvolutionPushForToday,
  dismissEvolutionPushThisSession,
} from './evolutionPushStorage'
import {
  getEvolutionEntryGuide,
  type EvolutionEntryGuide,
} from './evolutionFeatureEntryGuides'
import { getLatestEvolutionRecord } from './evolutionLogData'

type Props = {
  open: boolean
  onClose: () => void
  onOpenEvolution: () => void
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

  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeGuide, setActiveGuide] = useState<EvolutionEntryGuide | null>(null)

  useEffect(() => {
    if (!open) {
      setPickerOpen(false)
      setActiveGuide(null)
    }
  }, [open])

  const handleViewLog = () => {
    dismissEvolutionPushThisSession(version)
    onClose()
    onOpenEvolution()
  }

  const handleCloseSession = () => {
    dismissEvolutionPushThisSession(version)
    onClose()
  }

  const handleCloseToday = () => {
    dismissEvolutionPushForToday(version)
    dismissEvolutionPushThisSession(version)
    onClose()
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
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-gray-400">
                System Update
              </p>
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 [scrollbar-width:thin]">
              <p className="text-[13px] leading-relaxed text-[#1C1C1E]/65 sm:text-[14px]">
                账号检测已完成。可先看新增功能高亮指引，找到开关位置；或打开完整更新日志。
              </p>

              <div className="mt-5 space-y-2.5">
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

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseToday}
                  className="h-10 rounded-[12px] border border-gray-200 bg-[#F9FAFB] text-[13px] font-medium text-[#1C1C1E]/75 transition hover:bg-gray-100"
                >
                  今日关闭
                </button>
                <button
                  type="button"
                  onClick={handleCloseSession}
                  className="h-10 rounded-[12px] border border-transparent text-[13px] font-medium text-gray-400 transition hover:text-[#1C1C1E]/70"
                >
                  关闭
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
                「关闭」仅本次停留不再弹出；刷新或重新打开页面仍会提醒。选「今日关闭」则今天不再弹出。
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
