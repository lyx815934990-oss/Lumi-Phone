import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, X } from 'lucide-react'
import type {
  MemoryTraceData,
  MemoryTraceLineRelation,
  MemoryTraceMemoryBucket,
  MemoryTraceStoryTimelineInjectRow,
} from './memoryTraceTypes'
import { lineRelationUiLabel } from './wechatMemoryLineScope'
import { MEMORY_UNSUMMARIZED_OFFLINE_INJECT_AI_ROUNDS } from './memory/memorySummaryRetention'
import { parseStoryTimelineInjectBodyForTrace } from './memory/storyTimelineTypes'
import { stripUnsummarizedOnlineTimestampsForDisplay, sanitizeMemoryTraceDisplayText } from './memoryTraceDisplaySanitize'
import { listArchiveWorldbookTracePills } from '../../worldbook/buildWorldbookContext'
import {
  getLoreArchiveBuiltinPresetTogglesSnapshot,
  getWorldbookLoreEntriesSnapshot,
} from '../../worldbook/worldbookLoreStore'

export type { MemoryTraceData } from './memoryTraceTypes'

const PLATINUM = '#D4AF37'
const INK = '#1C1C1E'
const SHEET_SPRING = { type: 'spring' as const, damping: 38, stiffness: 380 }

function traceText(raw: string | null | undefined): string {
  return sanitizeMemoryTraceDisplayText(String(raw ?? ''))
}

function TraceCard(props: {
  children: ReactNode
  tone?: 'neutral' | 'gold' | 'green' | 'amber' | 'violet'
}) {
  const tone = props.tone ?? 'neutral'
  const ring =
    tone === 'gold'
      ? 'border-amber-100/90 bg-gradient-to-br from-amber-50/50 to-white'
      : tone === 'green'
        ? 'border-emerald-100/90 bg-gradient-to-br from-emerald-50/40 to-white'
        : tone === 'amber'
          ? 'border-orange-100/90 bg-gradient-to-br from-orange-50/40 to-white'
          : tone === 'violet'
            ? 'border-violet-100/90 bg-gradient-to-br from-violet-50/40 to-white'
            : 'border-neutral-100 bg-white'
  return (
    <div className={`rounded-2xl border p-3.5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] ${ring}`}>
      {props.children}
    </div>
  )
}

function TraceBody(props: { text: string; maxClass?: string }) {
  const body = traceText(props.text)
  if (!body) return <p className="mt-1 text-[12px] text-neutral-400">（无）</p>
  return (
    <pre
      className={`mt-2 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[13px] leading-[1.65] text-neutral-800 [scrollbar-width:thin] ${
        props.maxClass ?? 'max-h-[min(36vh,320px)]'
      }`}
    >
      {body}
    </pre>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <p className="px-1 text-[12px] leading-relaxed text-neutral-400">{text}</p>
}

function CountBadge({ n, active }: { n: number; active?: boolean }) {
  const on = active ?? n > 0
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
        on ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
      }`}
    >
      {on ? `${n}` : '暂无'}
    </span>
  )
}

type AccordionId =
  | 'sample'
  | 'm1'
  | 'm2'
  | 'm3'
  | 'm4'
  | 'm5'
  | 'm6'
  | 'm7'
  | 'personaWb'
  | 'globalWb'
  | 'persona'
  | 'network'
  | 'wbAfter'

function pct(score: number): string {
  return `${Math.round(score * 1000) / 10}%`
}

function timelineRowTitle(row: MemoryTraceStoryTimelineInjectRow): string | null {
  const title = row.label?.trim()
  if (!title) return null
  if (title === '向量命中' || title === '近端固定' || title === '合并快照') return null
  if (title === '向量召回' || title === '近端摘要' || title === '当前状态') return null
  return title
}

function InjectionOverview(props: {
  summary: NonNullable<MemoryTraceData['injectionSummary']> | null | undefined
  counts: {
    state: number
    vectorPlot: number
    recentSummary: number
    offlineFull: number
    unsChat: number
    ltmVector: number
    ltmKeyword: number
    personaWb: boolean
    globalWb: boolean
    wbAfter: boolean
  }
}) {
  const chip = (label: string, on: boolean) => (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
        on
          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
          : 'bg-neutral-50 text-neutral-400 ring-1 ring-neutral-100'
      }`}
    >
      {label}
    </span>
  )
  const c = props.counts
  return (
    <div className="rounded-2xl border border-neutral-100/90 bg-gradient-to-b from-[#FBF8F1] to-white p-4 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-400">本轮参考</p>
      <p className="mt-1 text-[13px] font-semibold text-neutral-800">七板块记忆 · 世界书 · 尾声</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {chip(`① 当前状态`, c.state > 0)}
        {chip(`② 历史摘要 ${c.vectorPlot}`, c.vectorPlot > 0)}
        {chip(`③ 线下摘要 ${c.recentSummary}`, c.recentSummary > 0)}
        {chip(`④ 线下原文 ${c.offlineFull}`, c.offlineFull > 0)}
        {chip(`⑤ 未总结 ${c.unsChat}`, c.unsChat > 0)}
        {chip(`⑥ 长期向量 ${c.ltmVector}`, c.ltmVector > 0)}
        {chip(`⑦ 关键词 ${c.ltmKeyword}`, c.ltmKeyword > 0)}
        {chip('人设世界书', c.personaWb)}
        {chip('档案室世界书', c.globalWb)}
        {chip('尾声延展', c.wbAfter)}
      </div>
    </div>
  )
}

function MemoryBucketBadge(props: { memoryBucket?: MemoryTraceMemoryBucket }) {
  const bucket = props.memoryBucket
  if (!bucket) return null
  const isLinked = bucket === 'linked'
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{
        background: isLinked ? 'rgba(99,102,241,0.12)' : 'rgba(212,175,55,0.1)',
        color: isLinked ? '#4338ca' : '#8B6914',
      }}
    >
      {isLinked ? '关联记忆' : '角色记忆'}
    </span>
  )
}

function LineScopeBadge(props: {
  sourceLineLabel?: string
  lineRelation?: MemoryTraceLineRelation
  memoryBucket?: MemoryTraceMemoryBucket
}) {
  const label = props.sourceLineLabel?.trim()
  const rel = props.lineRelation
  if (!label && !rel) return null
  const relText = rel ? lineRelationUiLabel(rel) : ''
  const isCurrent = rel === 'current'
  const isOther = rel === 'other'
  return (
    <p className="mb-1 flex flex-wrap items-center gap-1.5">
      <MemoryBucketBadge memoryBucket={props.memoryBucket} />
      {relText ? (
        <span
          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
          style={{
            background: isCurrent ? 'rgba(212,175,55,0.14)' : isOther ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.04)',
            color: isCurrent ? '#8B6914' : '#525252',
          }}
        >
          {relText}
        </span>
      ) : null}
      {label ? (
        <span className="text-[10px] font-medium text-neutral-500">马甲 · {label}</span>
      ) : null}
    </p>
  )
}

function AccordionRow(props: {
  titleEn: string
  titleZh: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="border-b border-neutral-100 last:border-b-0">
      <button
        type="button"
        onClick={props.onToggle}
        className="flex w-full items-center justify-between gap-3 py-4 text-left outline-none transition-colors hover:bg-neutral-50/80"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-400">{props.titleEn}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold" style={{ color: INK }}>
              {props.titleZh}
            </p>
            {props.badge}
          </div>
        </div>
        <motion.span animate={{ rotate: props.expanded ? 180 : 0 }} transition={{ duration: 0.28 }}>
          <ChevronDown className="size-5 shrink-0 text-neutral-400" strokeWidth={1.5} aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {props.expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 pt-0">{props.children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">{children}</p>
  )
}

export type MemoryTraceModalProps = {
  open: boolean
  onClose: () => void
  /** null：尚无记录（未生成过 AI 回复或尚未从本地恢复） */
  data?: MemoryTraceData | null
}

export function MemoryTraceModal({ open, onClose, data }: MemoryTraceModalProps) {
  const [expanded, setExpanded] = useState<Set<AccordionId>>(() => new Set())
  const matrix = data?.contextMatrix

  const timelineRows = useMemo(() => {
    const stored = matrix?.storyTimeline?.rows ?? []
    const looksComplete = (c: string) =>
      /【本轮事件】|【本轮锚点】|【摘要标题】|【当前锚点】|【服装锁定】|【物品追踪】/.test(c)
    const hasSubstance = stored.some((r) => looksComplete(String(r.content ?? '')))
    if (hasSubstance) return stored
    const excerpt = matrix?.storyTimeline?.promptExcerpt?.trim() || ''
    if (!excerpt) return stored
    // 旧溯源曾把行正文截断洗空：用全文重新解析
    try {
      const reparsed = parseStoryTimelineInjectBodyForTrace(excerpt)
      if (reparsed.some((r) => looksComplete(r.content) || r.content.trim().length >= 24)) {
        return reparsed
      }
    } catch {
      /* ignore */
    }
    return stored
  }, [matrix?.storyTimeline?.rows, matrix?.storyTimeline?.promptExcerpt])
  const stateRows = useMemo(
    () => timelineRows.filter((r) => r.injectKind === 'state'),
    [timelineRows],
  )
  const vectorPlotRows = useMemo(
    () => timelineRows.filter((r) => r.injectKind === 'vector'),
    [timelineRows],
  )
  const recentSummaryRows = useMemo(
    () => timelineRows.filter((r) => r.injectKind === 'recent'),
    [timelineRows],
  )

  const offlineFullRows = useMemo(
    () => (matrix?.recentContext.unsummarizedOfflinePlots ?? []).filter((row) => traceText(row.snippet)),
    [matrix?.recentContext.unsummarizedOfflinePlots],
  )

  const unsChatRows = useMemo(() => {
    return (matrix?.recentContext.unsummarizedChats ?? [])
      .map((row) => ({
        ...row,
        // 发布端已清洗；此处只去时间戳，避免二次 sanitize 把正文抹空
        body: stripUnsummarizedOnlineTimestampsForDisplay(String(row.snippet ?? '')).trim() || String(row.snippet ?? '').trim(),
      }))
      .filter((row) => row.body)
  }, [matrix?.recentContext.unsummarizedChats])

  const ltmVectorRows = useMemo(() => {
    return (matrix?.deepMemory.vectorRetrievals ?? [])
      .map((row) => ({
        ...row,
        body: String(row.content ?? '').trim() || traceText(row.content),
      }))
      .filter((row) => row.body)
  }, [matrix?.deepMemory.vectorRetrievals])

  const ltmKeywordRows = useMemo(() => {
    return (matrix?.deepMemory.keywordHits ?? [])
      .map((row) => ({
        ...row,
        body: String(row.content ?? '').trim() || traceText(row.content),
      }))
      .filter((row) => row.body)
  }, [matrix?.deepMemory.keywordHits])

  const personaWbText = traceText(matrix?.baseDirectives.characterWorldBook)
  const globalWbNames = useMemo(() => {
    const stored = matrix?.baseDirectives.worldbooks ?? []
    if (stored.length > 0) return stored
    // 旧溯源未写入名称 / 仅开了系统内置：打开面板时按当前档案室开关回显
    try {
      return listArchiveWorldbookTracePills(
        [],
        getWorldbookLoreEntriesSnapshot(),
        null,
        getLoreArchiveBuiltinPresetTogglesSnapshot(),
      )
    } catch {
      return []
    }
  }, [matrix?.baseDirectives.worldbooks])
  const globalWbText = traceText(matrix?.baseDirectives.globalWorldbook)
  const personaDetailText = traceText(matrix?.baseDirectives.personaDetail)
  const worldBgText = traceText(matrix?.baseDirectives.worldBackground)

  const hasPersonaWb =
    !!personaWbText &&
    !/^\(未绑定|^（未绑定|^无$|未启用人设世界书/.test(personaWbText)
  const hasGlobalWb =
    globalWbNames.length > 0 ||
    (!!globalWbText &&
      !/^\(当前场景无|^（当前场景无|^（当前群场景无|^（当前板块无|^无$|无匹配的档案室/.test(globalWbText))

  const wbAfter = data?.worldBookAfterChat
  const hasWbAfter =
    !!wbAfter &&
    (wbAfter.protocolInPrompt ||
      (wbAfter.injectedSnapshotEntries?.length ?? 0) > 0 ||
      wbAfter.parsedPatches.length > 0 ||
      (wbAfter.autoSummaryPatches?.length ?? 0) > 0)

  const overviewCounts = {
    state: stateRows.length || (matrix?.storyTimeline?.injected && !timelineRows.length ? 1 : 0),
    vectorPlot: vectorPlotRows.length,
    recentSummary: recentSummaryRows.length,
    offlineFull: offlineFullRows.length,
    unsChat: unsChatRows.length,
    ltmVector: ltmVectorRows.length,
    ltmKeyword: ltmKeywordRows.length,
    personaWb: hasPersonaWb,
    globalWb: hasGlobalWb,
    wbAfter: hasWbAfter,
  }

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      if (!data) {
        setExpanded(new Set())
        return
      }
      const prefer: AccordionId[] = []
      if (overviewCounts.state > 0) prefer.push('m1')
      else if (overviewCounts.unsChat > 0) prefer.push('m5')
      else if (overviewCounts.offlineFull > 0) prefer.push('m4')
      else prefer.push('m1', 'm5')
      setExpanded(new Set(prefer))
    }, 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随打开/数据切换重置展开
  }, [open, data])

  const toggleAccordion = (id: AccordionId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isExpanded = (id: AccordionId) => expanded.has(id)

  const blockVariants = useMemo(
    () => ({
      hidden: {},
      show: {
        transition: { staggerChildren: 0.06, delayChildren: 0.05 },
      },
    }),
    [],
  )

  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 12 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      },
    }),
    [],
  )

  const renderTimelineRows = (rows: MemoryTraceStoryTimelineInjectRow[], tone: 'neutral' | 'green' | 'amber') => {
    const cards = rows
      .map((row, i) => {
        const raw = String(row.content ?? '').trim()
        if (!raw) return null
        // 已在发布端清洗；避免 TraceBody 再次 sanitize 洗空
        const body =
          raw.length >= 8
            ? raw
            : traceText(raw) ||
              raw
                .replace(/^【时效·已发生】[^\n]*\n*/gm, '')
                .trim()
        if (!body) return null
        const title = timelineRowTitle(row)
        return (
          <li key={i}>
            <TraceCard tone={tone}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {title ? (
                    <p className="text-[13px] font-semibold leading-snug text-neutral-900">{title}</p>
                  ) : null}
                  {row.isHistorical ? (
                    <span className="mt-1 inline-flex rounded-full bg-violet-100/90 px-2 py-0.5 text-[10px] font-semibold text-violet-900">
                      往事
                    </span>
                  ) : null}
                  <pre
                    className="mt-2 max-h-[min(32vh,280px)] overflow-y-auto whitespace-pre-wrap break-words font-sans text-[13px] leading-[1.65] text-neutral-800 [scrollbar-width:thin]"
                  >
                    {body}
                  </pre>
                </div>
                {row.relevanceScore != null ? (
                  <span className="shrink-0 font-mono text-[10px] font-medium tabular-nums text-emerald-800">
                    {pct(row.relevanceScore)}
                  </span>
                ) : null}
              </div>
            </TraceCard>
          </li>
        )
      })
      .filter(Boolean)
    if (!cards.length) {
      return <EmptyHint text="本板块有记录，但正文未能展开。请再生成一轮后查看。" />
    }
    return <ul className="space-y-2.5 px-1">{cards}</ul>
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            aria-label="关闭"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="memory-trace-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_SPRING}
            className="relative mx-auto flex max-h-[88vh] w-full max-w-[520px] flex-col rounded-t-[22px] border border-neutral-200/80 bg-white/95 shadow-[0_-8px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl"
            style={{ color: INK }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <p
                  id="memory-trace-title"
                  className="text-[11px] font-medium uppercase tracking-[0.32em] text-neutral-400"
                >
                  TRACE MATRIX
                </p>
                <p className="mt-1 text-[17px] font-semibold tracking-tight">思维溯源</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white transition-transform active:scale-95"
                aria-label="关闭面板"
              >
                <X className="size-[18px] text-neutral-500" strokeWidth={1.75} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 pt-2 [scrollbar-width:thin]">
              {!data ? (
                <div className="flex flex-col items-center justify-center px-2 py-16 text-center">
                  <p className="text-[15px] font-semibold text-neutral-800">暂无思维溯源记录</p>
                  <p className="mt-3 max-w-[300px] text-[13px] leading-relaxed text-neutral-500">
                    生成一轮 AI 回复后，这里会按七板块记忆、世界书与尾声延展展示本轮实际注入的参考内容。
                  </p>
                </div>
              ) : null}

              {data && matrix ? (
                <motion.div
                  variants={blockVariants}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-5 pt-3"
                >
                  <motion.div variants={itemVariants}>
                    <InjectionOverview summary={data.injectionSummary} counts={overviewCounts} />
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm"
                  >
                    <div className="border-b border-neutral-50 bg-neutral-50/60 px-4 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-400">
                        Memory · ①–⑦
                      </p>
                      <p className="mt-0.5 text-[13px] font-semibold text-neutral-700">七板块记忆注入</p>
                    </div>

                    <AccordionRow
                      titleEn="① CURRENT STATE"
                      titleZh="当前状态 · 故事「现在」"
                      expanded={isExpanded('m1')}
                      onToggle={() => toggleAccordion('m1')}
                      badge={<CountBadge n={overviewCounts.state} />}
                    >
                      {stateRows.length ? (
                        renderTimelineRows(stateRows, 'neutral')
                      ) : matrix.storyTimeline?.injected && matrix.storyTimeline.promptExcerpt.trim() ? (
                        <div className="px-1">
                          <TraceCard>
                            <TraceBody
                              text={matrix.storyTimeline.promptExcerpt}
                              maxClass="max-h-[min(40vh,400px)]"
                            />
                          </TraceCard>
                        </div>
                      ) : (
                        <EmptyHint text="本轮未注入当前状态（地点/时段/服装/在场等故事「现在」快照）。" />
                      )}
                    </AccordionRow>

                    <AccordionRow
                      titleEn="② VECTOR · PLOT"
                      titleZh="向量召回 · 历史剧情摘要"
                      expanded={isExpanded('m2')}
                      onToggle={() => toggleAccordion('m2')}
                      badge={<CountBadge n={vectorPlotRows.length} />}
                    >
                      {vectorPlotRows.length ? (
                        renderTimelineRows(vectorPlotRows, 'green')
                      ) : (
                        <EmptyHint text="本轮无向量命中的历史剧情摘要（至多 5 条）。" />
                      )}
                    </AccordionRow>

                    <AccordionRow
                      titleEn="③ NEAR · SUMMARY"
                      titleZh="近端 · 更早线下摘要"
                      expanded={isExpanded('m3')}
                      onToggle={() => toggleAccordion('m3')}
                      badge={<CountBadge n={recentSummaryRows.length} />}
                    >
                      {recentSummaryRows.length ? (
                        renderTimelineRows(recentSummaryRows, 'amber')
                      ) : (
                        <EmptyHint text="本轮无更早轮次的线下剧情摘要（不含已用全文注入的最近 2 轮）。" />
                      )}
                    </AccordionRow>

                    <AccordionRow
                      titleEn="④ NEAR · FULL TEXT"
                      titleZh={`近端 · 最近 ${MEMORY_UNSUMMARIZED_OFFLINE_INJECT_AI_ROUNDS} 轮线下原文`}
                      expanded={isExpanded('m4')}
                      onToggle={() => toggleAccordion('m4')}
                      badge={<CountBadge n={offlineFullRows.length} />}
                    >
                      {offlineFullRows.length ? (
                        <ul className="space-y-2.5 px-1">
                          {offlineFullRows.map((row, i) => (
                            <li key={i}>
                              <TraceCard>
                                <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                                  {row.date}
                                </p>
                                <TraceBody text={row.snippet} maxClass="max-h-[min(36vh,320px)]" />
                              </TraceCard>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <EmptyHint text="本轮未注入最近线下剧情原文。" />
                      )}
                    </AccordionRow>

                    <AccordionRow
                      titleEn="⑤ UNSUMMARIZED"
                      titleZh="未总结 · 线上私聊 / 群聊"
                      expanded={isExpanded('m5')}
                      onToggle={() => toggleAccordion('m5')}
                      badge={<CountBadge n={unsChatRows.length} />}
                    >
                      {unsChatRows.length ? (
                        <ul className="space-y-2.5 px-1">
                          {unsChatRows.map((row, i) => (
                            <li key={i}>
                              <TraceCard tone="gold">
                                <LineScopeBadge
                                  sourceLineLabel={row.sourceLineLabel}
                                  lineRelation={row.lineRelation}
                                />
                                <p className="text-[11px] font-semibold tracking-wide text-neutral-700">
                                  {row.type === 'group' ? `群聊 · ${row.source}` : row.source || '私聊'}
                                </p>
                                <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-[1.65] text-neutral-800">
                                  {row.body}
                                </pre>
                              </TraceCard>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <EmptyHint text="本轮无未总结线上私聊 / 群聊摘录。" />
                      )}
                    </AccordionRow>

                    <AccordionRow
                      titleEn="⑥ LTM · VECTOR"
                      titleZh="向量召回 · 线上长期记忆"
                      expanded={isExpanded('m6')}
                      onToggle={() => toggleAccordion('m6')}
                      badge={<CountBadge n={ltmVectorRows.length} />}
                    >
                      {ltmVectorRows.length ? (
                        <ul className="space-y-2.5 px-1">
                          {ltmVectorRows.map((row, i) => (
                            <li key={i}>
                              <TraceCard tone="green">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <LineScopeBadge
                                      sourceLineLabel={row.sourceLineLabel}
                                      lineRelation={row.lineRelation}
                                      memoryBucket={row.memoryBucket}
                                    />
                                    <p className="text-[13px] leading-[1.65] text-neutral-800">{row.body}</p>
                                  </div>
                                  <span className="shrink-0 font-mono text-[10px] font-medium tabular-nums text-emerald-800">
                                    {pct(row.relevanceScore)}
                                  </span>
                                </div>
                              </TraceCard>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <EmptyHint text="本轮无线上长期记忆向量召回（至多 5 条）。" />
                      )}
                    </AccordionRow>

                    <AccordionRow
                      titleEn="⑦ LTM · KEYWORD"
                      titleZh="关键词命中 · 线上长期记忆"
                      expanded={isExpanded('m7')}
                      onToggle={() => toggleAccordion('m7')}
                      badge={<CountBadge n={ltmKeywordRows.length} />}
                    >
                      {ltmKeywordRows.length ? (
                        <ul className="space-y-2.5 px-1">
                          {ltmKeywordRows.map((row, i) => (
                            <li key={i}>
                              <TraceCard tone="gold">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <LineScopeBadge
                                      sourceLineLabel={row.sourceLineLabel}
                                      lineRelation={row.lineRelation}
                                      memoryBucket={row.memoryBucket}
                                    />
                                    <p
                                      className="font-mono text-[11px] font-semibold tracking-wide"
                                      style={{ color: PLATINUM }}
                                    >
                                      {row.keyword}
                                    </p>
                                    <p className="mt-2 text-[13px] leading-[1.65] text-neutral-800">{row.body}</p>
                                  </div>
                                  {row.relevanceScore != null ? (
                                    <span
                                      className="shrink-0 font-mono text-[10px] font-medium tabular-nums"
                                      style={{ color: PLATINUM }}
                                    >
                                      {pct(row.relevanceScore)}
                                    </span>
                                  ) : null}
                                </div>
                              </TraceCard>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <EmptyHint text="本轮无关键词命中的线上长期记忆。" />
                      )}
                    </AccordionRow>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm"
                  >
                    <div className="border-b border-neutral-50 bg-neutral-50/60 px-4 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-400">
                        World Books · Epilogue
                      </p>
                      <p className="mt-0.5 text-[13px] font-semibold text-neutral-700">世界书与尾声</p>
                    </div>

                    <AccordionRow
                      titleEn="PERSONA WORLD BOOK"
                      titleZh="人设世界书"
                      expanded={isExpanded('personaWb')}
                      onToggle={() => toggleAccordion('personaWb')}
                      badge={
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            hasPersonaWb ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {hasPersonaWb ? '已注入' : '暂无'}
                        </span>
                      }
                    >
                      <div className="px-1">
                        {hasPersonaWb ? (
                          <TraceCard>
                            <TraceBody text={personaWbText} maxClass="max-h-[min(40vh,400px)]" />
                          </TraceCard>
                        ) : (
                          <EmptyHint text="本轮未注入人设绑定世界书。" />
                        )}
                      </div>
                    </AccordionRow>

                    <AccordionRow
                      titleEn="ARCHIVE · GLOBAL"
                      titleZh="全局世界书 · 档案室"
                      expanded={isExpanded('globalWb')}
                      onToggle={() => toggleAccordion('globalWb')}
                      badge={
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            hasGlobalWb ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {hasGlobalWb
                            ? globalWbNames.length
                              ? `${globalWbNames.length}`
                              : '已注入'
                            : '暂无'}
                        </span>
                      }
                    >
                      <div className="px-1">
                        {globalWbNames.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {globalWbNames.map((wb, i) => (
                              <span
                                key={`${wb.title}-${i}`}
                                className="rounded-full border border-amber-100 bg-amber-50/60 px-3 py-1.5 text-[12px] font-medium text-neutral-800"
                              >
                                {wb.title}
                              </span>
                            ))}
                          </div>
                        ) : hasGlobalWb ? (
                          <EmptyHint text="本轮已注入档案室条目，但未记录名称。再生成一轮后会显示书名。" />
                        ) : (
                          <EmptyHint text="本轮无匹配的档案室全局世界书条目。" />
                        )}
                      </div>
                    </AccordionRow>

                    <AccordionRow
                      titleEn="POST-CHAT · EPILOGUE"
                      titleZh="尾声延展 · 变化"
                      expanded={isExpanded('wbAfter')}
                      onToggle={() => toggleAccordion('wbAfter')}
                      badge={
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            hasWbAfter ? 'bg-amber-50 text-amber-900' : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {hasWbAfter ? '有记录' : '暂无'}
                        </span>
                      }
                    >
                      {!wbAfter ? (
                        <EmptyHint text="这条记录生成时尚未采集尾声延展。再生成一轮后会出现注入快照与补丁对照。" />
                      ) : (
                        <div className="space-y-4 px-1 text-[13px] leading-relaxed text-neutral-700">
                          <div className="flex flex-wrap gap-2 text-[12px]">
                            <span
                              className={`rounded-full px-2.5 py-0.5 font-medium ${
                                wbAfter.protocolInPrompt
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              快照：{wbAfter.protocolInPrompt ? '已进本轮' : '未启用'}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 font-medium ${
                                wbAfter.parsedPatches.length || (wbAfter.autoSummaryPatches?.length ?? 0) > 0
                                  ? 'bg-amber-50 text-amber-900'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              补丁：
                              {wbAfter.parsedPatches.length
                                ? `本轮 ${wbAfter.parsedPatches.length}`
                                : (wbAfter.autoSummaryPatches?.length ?? 0) > 0
                                  ? '自动总结'
                                  : '无'}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 font-medium ${
                                wbAfter.appliedToDb
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              写库：{wbAfter.appliedToDb ? '已写入' : '未写入'}
                            </span>
                          </div>

                          {wbAfter.injectedSnapshotEntries?.length ? (
                            <div>
                              <SectionLabel>注入快照</SectionLabel>
                              <ul className="space-y-2.5">
                                {wbAfter.injectedSnapshotEntries.map((entry, i) => (
                                  <li key={`${entry.bookName}-${entry.itemName}-${i}`}>
                                    <TraceCard>
                                      <p className="text-[13px] font-semibold text-neutral-800">
                                        {entry.characterName}
                                        <span className="mx-1.5 font-normal text-neutral-400">·</span>
                                        {entry.bookName && entry.itemName
                                          ? `「${entry.bookName}」·「${entry.itemName}」`
                                          : entry.itemName || entry.bookName || '条目'}
                                      </p>
                                      <TraceBody
                                        text={entry.content}
                                        maxClass="max-h-[min(28vh,280px)]"
                                      />
                                    </TraceCard>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {wbAfter.parsedPatches.length ? (
                            <div>
                              <SectionLabel>本轮补丁对照</SectionLabel>
                              <ul className="space-y-3">
                                {wbAfter.parsedPatches.map((row, i) => (
                                  <li key={`${row.worldBookId}-${row.itemId}-${i}`}>
                                    <TraceCard tone="amber">
                                      <p className="text-[13px] font-semibold text-neutral-800">
                                        {row.bookName && row.itemName
                                          ? `「${row.bookName}」·「${row.itemName}」`
                                          : '世界书条目'}
                                      </p>
                                      <p className="mt-3 text-[11px] font-medium text-neutral-500">替换前</p>
                                      <TraceBody
                                        text={row.previousContent || '（无旧文）'}
                                        maxClass="max-h-[min(20vh,200px)]"
                                      />
                                      <p className="mt-3 text-[11px] font-medium text-emerald-800/90">替换后</p>
                                      <TraceBody
                                        text={row.newContentFull || '（空）'}
                                        maxClass="max-h-[min(28vh,280px)]"
                                      />
                                    </TraceCard>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {(wbAfter.autoSummaryPatches?.length ?? 0) > 0 ? (
                            <div>
                              <SectionLabel>自动总结补丁</SectionLabel>
                              <ul className="space-y-3">
                                {wbAfter.autoSummaryPatches!.map((row, i) => (
                                  <li key={`auto-${row.worldBookId}-${row.itemId}-${i}`}>
                                    <TraceCard tone="violet">
                                      <p className="text-[13px] font-semibold text-neutral-800">
                                        {row.bookName && row.itemName
                                          ? `「${row.bookName}」·「${row.itemName}」`
                                          : '世界书条目'}
                                      </p>
                                      <p className="mt-3 text-[11px] font-medium text-neutral-500">替换前</p>
                                      <TraceBody
                                        text={row.previousContent || '（无旧文）'}
                                        maxClass="max-h-[min(20vh,200px)]"
                                      />
                                      <p className="mt-3 text-[11px] font-medium text-emerald-800/90">替换后</p>
                                      <TraceBody
                                        text={row.newContentFull || '（空）'}
                                        maxClass="max-h-[min(28vh,280px)]"
                                      />
                                    </TraceCard>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {!wbAfter.injectedSnapshotEntries?.length &&
                          !wbAfter.parsedPatches.length &&
                          !(wbAfter.autoSummaryPatches?.length ?? 0) ? (
                            <EmptyHint text="本轮无尾声延展快照或补丁变化。" />
                          ) : null}
                        </div>
                      )}
                    </AccordionRow>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm"
                  >
                    <AccordionRow
                      titleEn="TARGET SAMPLE"
                      titleZh="最新回复切片"
                      expanded={isExpanded('sample')}
                      onToggle={() => toggleAccordion('sample')}
                    >
                      <div className="px-1">
                        <div
                          className="rounded-xl bg-neutral-50/80 p-4"
                          style={{ borderLeft: `2px solid ${PLATINUM}80` }}
                        >
                          <p className="text-[12px] text-neutral-500">
                            角色 <span className="font-medium text-neutral-700">{data.charName}</span>
                          </p>
                          <p className="mt-3 font-serif text-[16px] italic leading-relaxed text-neutral-900">
                            {data.lastReply}
                          </p>
                        </div>
                      </div>
                    </AccordionRow>

                    <AccordionRow
                      titleEn="PERSONA CARD"
                      titleZh="角色档案"
                      expanded={isExpanded('persona')}
                      onToggle={() => toggleAccordion('persona')}
                    >
                      <div className="space-y-4 px-1">
                        {personaDetailText ? (
                          <TraceCard>
                            <TraceBody text={personaDetailText} maxClass="max-h-[min(40vh,400px)]" />
                          </TraceCard>
                        ) : matrix.baseDirectives.persona.length ? (
                          <div className="flex flex-wrap gap-2">
                            {matrix.baseDirectives.persona.map((t) => (
                              <span
                                key={t}
                                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[12px] text-neutral-700"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <EmptyHint text="无人设档案正文。" />
                        )}
                        {worldBgText ? (
                          <div>
                            <SectionLabel>世界背景</SectionLabel>
                            <TraceCard>
                              <p className="text-[13px] leading-[1.65] text-neutral-800">{worldBgText}</p>
                            </TraceCard>
                          </div>
                        ) : null}
                      </div>
                    </AccordionRow>

                    {data.networkRelationships ? (
                      <AccordionRow
                        titleEn="NETWORK"
                        titleZh="人脉关系"
                        expanded={isExpanded('network')}
                        onToggle={() => toggleAccordion('network')}
                      >
                        <div className="space-y-4 px-1">
                          {(data.networkRelationships.focusCharacterName ||
                            data.networkRelationships.rootCharacterName) && (
                            <p className="text-[12px] text-neutral-500">
                              {[
                                data.networkRelationships.focusCharacterName,
                                data.networkRelationships.rootCharacterName,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                          {(data.networkRelationships.involvingFocus?.length ?? 0) > 0 ? (
                            <ul className="space-y-2.5">
                              {data.networkRelationships.involvingFocus.map((row, i) => (
                                <li key={`f-${row.fromName}-${row.toName}-${i}`}>
                                  <TraceCard tone="gold">
                                    <p className="text-[13px] font-semibold text-neutral-900">
                                      {row.fromName} —「{row.relation}」→ {row.toName}
                                    </p>
                                    {row.fromPerspective ? (
                                      <p className="mt-2 text-[13px] leading-[1.65] text-neutral-700">
                                        {row.fromName}看：{row.fromPerspective}
                                      </p>
                                    ) : null}
                                    {row.toPerspective ? (
                                      <p className="mt-1 text-[13px] leading-[1.65] text-neutral-700">
                                        {row.toName}看：{row.toPerspective}
                                      </p>
                                    ) : null}
                                  </TraceCard>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {traceText(data.networkRelationships.promptExcerpt) ? (
                            <div>
                              <SectionLabel>参考摘录</SectionLabel>
                              <TraceCard>
                                <TraceBody
                                  text={data.networkRelationships.promptExcerpt}
                                  maxClass="max-h-[min(28vh,240px)]"
                                />
                              </TraceCard>
                            </div>
                          ) : null}
                        </div>
                      </AccordionRow>
                    ) : null}
                  </motion.div>
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
