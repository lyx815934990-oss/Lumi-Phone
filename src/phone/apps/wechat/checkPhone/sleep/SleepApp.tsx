import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Moon, Sparkles, SunMedium, Trash2, TrendingUp } from 'lucide-react'
import { useCurrentApiConfig } from '../../../api/ApiSettingsContext'

import { Pressable } from '../../../../components/Pressable'
import { findNight, formatChineseDate, parseDateKey, toDateKey, emptySleepDataset } from './mockData'
import { generateSleepDatasetWithAi } from './sleepAi'
import { clearSleepDataset, loadSleepDataset, saveSleepDataset } from './sleepStorage'
import { SleepOverviewCard } from './components/SleepOverviewCard'
import { SleepStageTimeline } from './components/SleepStageTimeline'
import { SleepStageStats } from './components/SleepStageStats'
import { SleepHeartRateChart } from './components/SleepHeartRateChart'
import { SleepSummaryCard } from './components/SleepSummaryCard'
import { SleepHistoryStrip } from './components/SleepHistoryStrip'
import { SleepAIGenerateModal } from './SleepAIGenerateModal'
import type { SleepDataset } from './types'
import './sleepApp.css'

type ThemeMode = 'night' | 'day'

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function SleepApp({
  onClose,
  characterId,
  characterName,
  playerIdentityId,
  playerDisplayName,
  useLumiProjectAssistantPrompt,
}: {
  onClose: () => void
  characterId: string
  characterName?: string
  playerIdentityId: string
  playerDisplayName: string
  useLumiProjectAssistantPrompt: boolean
}) {
  const apiConfig = useCurrentApiConfig('chatCard')
  const [dataset, setDataset] = useState<SleepDataset>(emptySleepDataset)
  const [loaded, setLoaded] = useState(false)
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()))
  const [theme, setTheme] = useState<ThemeMode>('night')
  const [genOpen, setGenOpen] = useState(false)
  const [genBusy, setGenBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const rows = await loadSleepDataset(characterId)
      if (cancelled) return
      setDataset(rows)
      const latest = rows.history[rows.history.length - 1]?.dateKey ?? toDateKey(new Date())
      setSelectedDateKey(latest)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [characterId])

  const night = findNight(dataset, selectedDateKey) ?? dataset.nights[dataset.nights.length - 1]
  const selectedIdx = dataset.history.findIndex((h) => h.dateKey === selectedDateKey)
  const hasData = dataset.nights.length > 0 && !!night

  const shiftDay = (delta: number) => {
    const next = selectedIdx + delta
    if (next < 0 || next >= dataset.history.length) return
    setSelectedDateKey(dataset.history[next]!.dateKey)
  }

  const onGenerate = async (params: { days: number; bias: string }) => {
    setGenBusy(true)
    setError(null)
    try {
      const next = await generateSleepDatasetWithAi({
        apiConfig,
        characterId,
        playerIdentityId,
        playerDisplayName,
        useLumiProjectAssistantPrompt,
        days: params.days,
        bias: params.bias,
        current: dataset,
      })
      setDataset(next)
      await saveSleepDataset(characterId, next)
      const latest = next.history[next.history.length - 1]?.dateKey ?? toDateKey(new Date())
      setSelectedDateKey(latest)
      setGenOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenBusy(false)
    }
  }

  const onClear = async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('确认清除当前睡眠监测数据吗？该操作不可撤销。')
      if (!confirmed) return
    }
    const empty = emptySleepDataset()
    setDataset(empty)
    setSelectedDateKey(toDateKey(new Date()))
    await clearSleepDataset(characterId)
  }

  return (
    <motion.div
      className="sleep-app absolute inset-0 z-[1408] flex flex-col overflow-hidden"
      data-theme={theme}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div className="sleep-app__bg" aria-hidden />

      <div
        className="relative z-[2] shrink-0 border-b border-[var(--sleep-card-border)] px-4 pb-3 backdrop-blur-md"
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          background: 'var(--sleep-nav-bg)',
        }}
      >
        <div className="flex items-center gap-2">
          <Pressable
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--sleep-chip-border)] bg-[var(--sleep-chip)] text-[var(--sleep-text)] active:scale-[0.98]"
            onClick={onClose}
            aria-label="返回桌面"
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </Pressable>

          <div className="min-w-0 flex-1 px-1">
            <div className="text-[15px] tracking-[0.2em] text-[var(--sleep-text-bright)]">睡眠</div>
            {hasData ? (
              <div className="mt-0.5 flex items-center gap-1">
                <Pressable
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--sleep-muted)] disabled:opacity-25"
                  onClick={() => shiftDay(-1)}
                  disabled={selectedIdx <= 0}
                  aria-label="前一天"
                >
                  <ChevronLeft size={14} strokeWidth={1.8} />
                </Pressable>
                <span className="truncate text-[11px] text-[var(--sleep-muted)]">
                  {formatChineseDate(parseDateKey(night.dateKey))}
                </span>
                <Pressable
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--sleep-muted)] disabled:opacity-25"
                  onClick={() => shiftDay(1)}
                  disabled={selectedIdx < 0 || selectedIdx >= dataset.history.length - 1}
                  aria-label="后一天"
                >
                  <ChevronRight size={14} strokeWidth={1.8} />
                </Pressable>
              </div>
            ) : (
              <div className="mt-0.5 text-[11px] text-[var(--sleep-muted)]">尚未同步监测数据</div>
            )}
          </div>

          <Pressable
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--sleep-chip-border)] bg-[var(--sleep-chip)] text-[var(--sleep-muted)]"
            onClick={() => setTheme((t) => (t === 'night' ? 'day' : 'night'))}
            aria-label={theme === 'night' ? '切换日间模式' : '切换夜间模式'}
          >
            {theme === 'night' ? <SunMedium size={15} strokeWidth={1.6} /> : <Moon size={15} strokeWidth={1.6} />}
          </Pressable>

          {hasData ? (
            <Pressable
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--sleep-chip-border)] bg-[var(--sleep-chip)] text-[var(--sleep-muted)]"
              aria-label="清除数据"
              onClick={() => {
                void onClear()
              }}
            >
              <Trash2 size={14} strokeWidth={1.6} />
            </Pressable>
          ) : null}

          <Pressable
            type="button"
            className="flex h-9 items-center gap-1 rounded-full border border-[var(--sleep-chip-border)] bg-[var(--sleep-chip)] px-2.5 text-[var(--sleep-text)]"
            onClick={() => setGenOpen(true)}
            aria-label="AI生成"
          >
            <Sparkles size={14} strokeWidth={1.6} />
            <span className="text-[11px]">AI</span>
          </Pressable>

          {hasData ? (
            <Pressable
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--sleep-chip-border)] bg-[var(--sleep-chip)] text-[var(--sleep-muted)]"
              aria-label="睡眠趋势"
              onClick={() => {
                const el = document.getElementById('sleep-history-anchor')
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }}
            >
              <TrendingUp size={15} strokeWidth={1.6} />
            </Pressable>
          ) : null}
        </div>
      </div>

      <div
        className="relative z-[1] flex-1 overflow-y-auto px-4 pb-8 pt-4"
        style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
      >
        {!loaded ? (
          <div className="mx-auto mt-16 max-w-[440px] text-center text-[13px] text-[var(--sleep-muted)]">加载中…</div>
        ) : !hasData ? (
          <div className="mx-auto mt-10 flex max-w-[440px] flex-col items-center px-4 text-center">
            <div className="sleep-card sleep-card--hero w-full px-6 py-10">
              <div className="relative z-[1]">
                <div className="text-[13px] tracking-[0.2em] text-[var(--sleep-muted)]">SLEEP MONITOR</div>
                <div className="mt-3 text-[18px] text-[var(--sleep-text-bright)]">还没有睡眠记录</div>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--sleep-muted)]">
                  用 AI 根据角色人设与近期剧情，生成可偷看的私密睡眠监测数据。
                </p>
                <Pressable
                  type="button"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-[var(--sleep-chip-border)] bg-[var(--sleep-chip)] px-5 text-[13px] text-[var(--sleep-text-bright)]"
                  onClick={() => setGenOpen(true)}
                >
                  <Sparkles size={15} strokeWidth={1.6} />
                  AI 生成睡眠数据
                </Pressable>
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={night.dateKey}
              className="mx-auto flex w-full max-w-[440px] flex-col gap-3.5"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={item}>
                <SleepOverviewCard night={night} />
              </motion.div>
              <motion.div variants={item}>
                <SleepStageTimeline night={night} />
              </motion.div>
              <motion.div variants={item}>
                <SleepStageStats night={night} />
              </motion.div>
              <motion.div variants={item}>
                <SleepHeartRateChart night={night} />
              </motion.div>
              <motion.div variants={item}>
                <SleepSummaryCard night={night} characterName={characterName} />
              </motion.div>
              <motion.div variants={item} id="sleep-history-anchor">
                <SleepHistoryStrip
                  history={dataset.history}
                  selectedDateKey={selectedDateKey}
                  onSelect={setSelectedDateKey}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <SleepAIGenerateModal
        open={genOpen}
        busy={genBusy}
        error={error}
        onClose={() => {
          if (!genBusy) setGenOpen(false)
        }}
        onSubmit={onGenerate}
      />
    </motion.div>
  )
}
