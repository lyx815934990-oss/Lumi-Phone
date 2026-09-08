import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Loader2, Plus, Shuffle, Trash2, Wand2, X } from 'lucide-react'
import {
  composeContinueProbeDirectorText,
  DATING_CONTINUE_PROBE_BUILTIN,
  DATING_CONTINUE_PROBE_CATEGORIES,
  DATING_CONTINUE_PROBE_SECTIONS,
  DATING_CONTINUE_PROBE_SUBS,
  formatContinueProbeChipLabel,
  freeformProbeId,
  listSpecificsForSub,
  listSubsForCategory,
  pickRandomContinueProbeIds,
  type ContinueProbeCategoryId,
  type ContinueProbePreset,
  type ContinueProbeSubDef,
} from './datingContinueProbePresets'
import {
  addUserContinueProbe,
  loadUserContinueProbes,
  removeUserContinueProbe,
  userProbeToPreset,
  type UserContinueProbe,
} from './datingContinueProbeStorage'
import {
  CONTINUE_DRAFT_TIME_ADVANCE_OPTIONS,
  requestDatingDirectorContinueDrafts,
  type ContinueDraftTimeAdvance,
} from './datingDirectorContinueDraftAi'
import type { ApiConfig } from '../../api/types'
import type { CharacterInfo, PlotItem } from './types'
import { DATING_PLOT_PACE_UNIT_OPTIONS } from './datingPlotPace'

type Props = {
  open: boolean
  onClose: () => void
  target: 'normal' | 'vn'
  onApply: (text: string) => void
  showToast: (msg: string) => void
  apiConfig: ApiConfig | null
  character: CharacterInfo
  plots: PlotItem[]
  playerDisplayName: string
  godPerspective: boolean
  mainCharacterOffstage: boolean
  isVnMode: boolean
  theme?: 'classic' | 'story'
  themeStyle?: CSSProperties
}

function ProbeChip({
  item,
  active,
  onClick,
  story,
  displayLabel,
}: {
  item: ContinueProbePreset
  active: boolean
  onClick: () => void
  story: boolean
  displayLabel?: string
}) {
  const title = [item.hint, item.probe].filter(Boolean).join(' · ')
  const free = !!item.freeform
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg border px-2 py-1.5 text-center text-[12px] font-medium leading-tight transition ${
        active
          ? story
            ? free
              ? 'border-[var(--sr-gold)] bg-[var(--sr-gold)] text-[var(--sr-gold-on)]'
              : 'border-[var(--sr-gold)] bg-[var(--sr-gold)]/18 text-[var(--sr-text)]'
            : free
              ? 'border-[color:var(--ds-accent,#7a8f72)] bg-[color:var(--ds-accent,#7a8f72)] text-white'
              : 'border-[color:var(--ds-accent,#7a8f72)] bg-[color:var(--ds-accent-soft,rgba(183,192,175,0.45))] text-[#1a1a1a]'
          : story
            ? free
              ? 'border-dashed border-[var(--sr-gold)]/50 bg-[var(--sr-gold)]/8 text-[var(--sr-gold)]'
              : 'border-[var(--sr-border)] bg-[var(--sr-panel)] text-[var(--sr-text)] hover:border-[var(--sr-gold)]/35'
            : free
              ? 'border-dashed border-[color:var(--ds-accent,#7a8f72)] bg-[color:var(--ds-accent-soft,rgba(183,192,175,0.2))] text-[#445]'
              : 'border-[#e6e6e6] bg-white text-[#333] hover:border-[#d0d0d0]'
      }`}
    >
      {displayLabel ?? item.label}
    </button>
  )
}

function ProbeOptionCell({
  item,
  active,
  onToggle,
  customNote,
  onCustomNoteChange,
  story,
  displayLabel,
  inputCls,
}: {
  item: ContinueProbePreset
  active: boolean
  onToggle: () => void
  customNote: string
  onCustomNoteChange: (value: string) => void
  story: boolean
  displayLabel?: string
  inputCls: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <ProbeChip
        item={item}
        active={active}
        onClick={onToggle}
        story={story}
        displayLabel={displayLabel}
      />
      <input
        value={customNote}
        onChange={(e) => onCustomNoteChange(e.target.value.slice(0, 80))}
        placeholder="自定义补充"
        className={`${inputCls} !h-7 px-1.5 text-[11px]`}
        aria-label={`${displayLabel ?? item.label}自定义补充`}
      />
    </div>
  )
}

function TimeChip({
  label,
  hint,
  active,
  onClick,
  story,
}: {
  label: string
  hint?: string
  active: boolean
  onClick: () => void
  story: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`rounded-lg border px-2 py-1.5 text-left transition ${
        active
          ? story
            ? 'border-[var(--sr-gold)] bg-[var(--sr-gold)]/18 text-[var(--sr-text)]'
            : 'border-[color:var(--ds-accent,#7a8f72)] bg-[color:var(--ds-accent-soft)] text-[#1a1a1a]'
          : story
            ? 'border-[var(--sr-border)] bg-[var(--sr-panel)] text-[var(--sr-text)]'
            : 'border-[#e6e6e6] bg-white text-[#444]'
      }`}
    >
      <span className="block text-[12px] font-medium leading-tight">{label}</span>
      {hint ? (
        <span
          className={`mt-0.5 block text-[10px] leading-tight ${
            story ? 'text-[var(--sr-text-muted)]' : 'opacity-55'
          }`}
        >
          {hint}
        </span>
      ) : null}
    </button>
  )
}

export function DatingContinueProbeSheet(props: Props) {
  const {
    open,
    onClose,
    onApply,
    showToast,
    apiConfig,
    character,
    plots,
    playerDisplayName,
    godPerspective,
    mainCharacterOffstage,
    isVnMode,
    theme = 'classic',
    themeStyle,
  } = props

  const story = theme === 'story'

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  /** 各具体选项的自定义补充文案 */
  const [optionNotes, setOptionNotes] = useState<Record<string, string>>({})
  const [userProbes, setUserProbes] = useState<UserContinueProbe[]>([])
  const [extraNote, setExtraNote] = useState('')
  const [timeAdvance, setTimeAdvance] = useState<ContinueDraftTimeAdvance>('none')
  const [timeAmount, setTimeAmount] = useState('3')
  const [timeUnit, setTimeUnit] = useState<'hour' | 'day' | 'month' | 'year'>('day')
  const [customLabel, setCustomLabel] = useState('')
  const [customProbe, setCustomProbe] = useState('')
  const [customCategory, setCustomCategory] = useState<ContinueProbeCategoryId>('relation')
  const [expandedSection, setExpandedSection] = useState<string>('relation')
  const [nsfwTab, setNsfwTab] = useState<ContinueProbeCategoryId>('nsfw_foreplay')
  /** 各大类当前展开的小分类 id */
  const [activeSubByCategory, setActiveSubByCategory] = useState<Partial<Record<ContinueProbeCategoryId, string>>>(
    {},
  )
  const [moreOpen, setMoreOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPreview, setAiPreview] = useState<string[] | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setUserProbes(loadUserContinueProbes())
    setAiPreview(null)
  }, [open])

  const allPresets = useMemo(() => {
    const custom = userProbes.map(userProbeToPreset)
    return [...DATING_CONTINUE_PROBE_BUILTIN, ...custom]
  }, [userProbes])

  const presetById = useMemo(() => {
    const m = new Map<string, ContinueProbePreset>()
    for (const p of allPresets) m.set(p.id, p)
    return m
  }, [allPresets])

  const subById = useMemo(() => {
    const m = new Map<string, ContinueProbeSubDef>()
    for (const s of DATING_CONTINUE_PROBE_SUBS) m.set(s.id, s)
    return m
  }, [])

  const resolveActiveSub = useCallback(
    (category: ContinueProbeCategoryId): ContinueProbeSubDef | null => {
      const subs = listSubsForCategory(category)
      if (!subs.length) return null
      const picked = activeSubByCategory[category]
      return subs.find((s) => s.id === picked) ?? subs[0]!
    },
    [activeSubByCategory],
  )

  const selectedProbes = useMemo(() => {
    const out: Array<ContinueProbePreset & { customNote?: string }> = []
    for (const id of selectedIds) {
      const p = presetById.get(id)
      if (!p) continue
      const note = optionNotes[id]?.trim()
      out.push(note ? { ...p, customNote: note } : p)
    }
    return out
  }, [selectedIds, presetById, optionNotes])

  const selectedCountBySection = useMemo(() => {
    const counts = new Map<string, number>()
    for (const section of DATING_CONTINUE_PROBE_SECTIONS) {
      let n = 0
      if (section.kind === 'flat') {
        for (const p of selectedProbes) if (p.category === section.category) n += 1
      } else {
        const tabCats = new Set(section.tabs.map((t) => t.category))
        for (const p of selectedProbes) if (tabCats.has(p.category)) n += 1
      }
      counts.set(section.id, n)
    }
    return counts
  }, [selectedProbes])

  const composed = useMemo(() => {
    const amountRaw = Number.parseFloat(timeAmount)
    return composeContinueProbeDirectorText({
      probes: selectedProbes,
      timeAdvance,
      timeAdvanceCustom:
        timeAdvance === 'custom'
          ? {
              amount: Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 3,
              unit: timeUnit,
            }
          : null,
      extraNote,
    })
  }, [selectedProbes, timeAdvance, timeAmount, timeUnit, extraNote])

  const togglePreset = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const setOptionNote = useCallback((id: string, value: string) => {
    setOptionNotes((prev) => {
      if (!value) {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: value }
    })
    if (value.trim()) {
      setSelectedIds((prev) => {
        if (prev.has(id)) return prev
        return new Set(prev).add(id)
      })
    }
  }, [])

  const handleRandomPick = useCallback(() => {
    const ids = pickRandomContinueProbeIds(allPresets)
    if (!ids.length) {
      showToast('暂无可抽取的方向')
      return
    }
    setSelectedIds(new Set(ids))
    const labels = ids
      .map((id) => {
        const p = presetById.get(id)
        return p ? formatContinueProbeChipLabel(p, subById) : ''
      })
      .filter(Boolean)
      .join('、')
    showToast(labels ? `已随机：${labels}` : `已随机 ${ids.length} 个方向`)
  }, [allPresets, presetById, showToast, subById])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setOptionNotes({})
  }, [])

  const handleAddCustom = useCallback(() => {
    const added = addUserContinueProbe({
      label: customLabel,
      probe: customProbe,
      category: customCategory,
    })
    if (!added) {
      showToast('请填写按钮名和探题句，或已达上限')
      return
    }
    setUserProbes(loadUserContinueProbes())
    setSelectedIds((prev) => new Set(prev).add(`custom:${added.id}`))
    setCustomLabel('')
    setCustomProbe('')
    showToast('已保存为我的预设')
  }, [customCategory, customLabel, customProbe, showToast])

  const handleRemoveCustom = useCallback((id: string) => {
    removeUserContinueProbe(id)
    setUserProbes(loadUserContinueProbes())
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(`custom:${id}`)
      return next
    })
  }, [])

  const handleApply = useCallback(() => {
    const text = composed.trim()
    if (!text) {
      showToast('请至少选择一个发展方向')
      return
    }
    onApply(text)
    onClose()
  }, [composed, onApply, onClose, showToast])

  const runAiGenerate = useCallback(async () => {
    if (aiGenerating) return
    if (!apiConfig?.apiUrl?.trim() || !apiConfig?.apiKey?.trim() || !apiConfig?.modelId?.trim()) {
      showToast('请先配置聊天 API')
      return
    }
    setAiGenerating(true)
    try {
      const amountRaw = Number.parseFloat(timeAmount)
      const probeHints = selectedProbes.map((p) => p.probe).join('；')
      const bias = [probeHints, extraNote.trim()].filter(Boolean).join('\n')
      const guides = await requestDatingDirectorContinueDrafts({
        apiConfig,
        character,
        plots,
        count: 2,
        playerDisplayName,
        bias: bias || undefined,
        actionFocus: 'both',
        timeAdvance,
        timeAdvanceCustom:
          timeAdvance === 'custom'
            ? {
                amount: Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 3,
                unit: timeUnit,
              }
            : null,
        godPerspective,
        mainCharacterOffstage,
        isVnMode,
      })
      setAiPreview(guides)
      setMoreOpen(true)
      setAdvancedOpen(true)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI 生成失败')
    } finally {
      setAiGenerating(false)
    }
  }, [
    aiGenerating,
    apiConfig,
    character,
    extraNote,
    godPerspective,
    isVnMode,
    mainCharacterOffstage,
    playerDisplayName,
    plots,
    selectedProbes,
    showToast,
    timeAdvance,
    timeAmount,
    timeUnit,
  ])

  if (!open) return null

  const userCustomPresets = userProbes.map(userProbeToPreset)

  const inputCls = story
    ? 'h-9 w-full rounded-lg border border-[var(--sr-border)] bg-[var(--sr-panel)] px-2.5 text-[13px] text-[var(--sr-text)] outline-none placeholder:text-[var(--sr-text-muted)] focus:border-[var(--sr-gold)]/40'
    : 'h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-2.5 text-[13px] outline-none focus:border-[#cfcfcf]'

  const muted = story ? 'text-[var(--sr-text-muted)]' : 'text-[#737373]'
  const border = story ? 'border-[var(--sr-border)]' : 'border-[#ececec]'
  const panelBg = story ? 'bg-[var(--sr-panel)]' : 'bg-white'

  const panel = (
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center"
      style={{
        background: 'transparent',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`story-rpg-root flex max-h-[min(88dvh,720px)] w-full max-w-md flex-col overflow-hidden shadow-[0_-12px_40px_rgba(0,0,0,0.22)] ${
          story
            ? 'rounded-t-[24px] border border-[var(--sr-border)]'
            : 'rounded-t-[22px] border border-[#e8e8e8] bg-[#f7f7f7] sm:rounded-[22px]'
        }`}
        style={
          story
            ? {
                ...themeStyle,
                background: 'var(--sr-panel-elevated, #f4f4f5)',
                color: 'var(--sr-text, #1a1a1a)',
              }
            : undefined
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="continue-probe-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`flex shrink-0 items-center gap-2 border-b px-4 py-3 ${border}`}>
          <div className="min-w-0 flex-1">
            <p
              id="continue-probe-title"
              className={`font-[family-name:var(--sr-font-serif,inherit)] text-[17px] font-semibold tracking-wide ${
                story ? 'text-[var(--sr-text)]' : 'text-[#1a1a1a]'
              }`}
            >
              续写方向
            </p>
            <p className={`mt-0.5 text-[11px] ${muted}`}>
              大类 → 小类 → 具体选项；每个选项可填自定义补充
            </p>
          </div>
          {selectedProbes.length ? (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                story ? 'bg-[var(--sr-gold)]/15 text-[var(--sr-gold)]' : 'bg-[#eaeaea] text-[#555]'
              }`}
            >
              已选 {selectedProbes.length}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
              story ? 'text-[var(--sr-text-muted)] hover:bg-[var(--sr-panel)]' : 'text-[#888] hover:bg-[#eee]'
            }`}
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={handleRandomPick}
              className={`inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition ${
                story
                  ? 'border-[var(--sr-gold)]/35 bg-[var(--sr-gold)]/10 text-[var(--sr-gold)]'
                  : 'border-[color:var(--ds-accent,#7a8f72)] bg-[color:var(--ds-accent-soft,rgba(183,192,175,0.35))] text-[#333]'
              }`}
            >
              <Shuffle className="size-3.5" strokeWidth={1.75} />
              随机 2～3 个
            </button>
            {selectedIds.size ? (
              <button
                type="button"
                onClick={handleClearSelection}
                className={`inline-flex h-8 items-center justify-center rounded-lg border px-3 text-[12px] ${
                  story
                    ? 'border-[var(--sr-border)] text-[var(--sr-text-muted)]'
                    : 'border-[#e0e0e0] bg-white text-[#666]'
                }`}
              >
                清空
              </button>
            ) : null}
          </div>

          {selectedProbes.length ? (
            <div className={`mb-3 flex flex-wrap gap-1.5 rounded-xl border ${border} ${panelBg} p-2`}>
              {selectedProbes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title="点击取消"
                  onClick={() => togglePreset(p.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                    story
                      ? 'border-[var(--sr-gold)]/40 bg-[var(--sr-gold)]/12 text-[var(--sr-text)]'
                      : 'border-[color:var(--ds-accent,#7a8f72)]/40 bg-[color:var(--ds-accent-soft)] text-[#333]'
                  }`}
                >
                  {formatContinueProbeChipLabel(p, subById)}
                  <X className="size-2.5 opacity-60" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-1.5">
            {DATING_CONTINUE_PROBE_SECTIONS.map((section) => {
              const openSec = expandedSection === section.id
              const selCount = selectedCountBySection.get(section.id) ?? 0

              return (
                <div
                  key={section.id}
                  className={`overflow-hidden rounded-xl border ${border} ${panelBg}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                    onClick={() => setExpandedSection((cur) => (cur === section.id ? '' : section.id))}
                  >
                    <span
                      className={`min-w-0 flex-1 text-[13px] font-medium ${
                        story ? 'text-[var(--sr-text)]' : 'text-[#222]'
                      }`}
                    >
                      {section.label}
                    </span>
                    {selCount ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          story
                            ? 'bg-[var(--sr-gold)]/15 text-[var(--sr-gold)]'
                            : 'bg-[#eaeaea] text-[#555]'
                        }`}
                      >
                        {selCount}
                      </span>
                    ) : null}
                    {openSec ? (
                      <ChevronUp className={`size-4 ${muted}`} />
                    ) : (
                      <ChevronDown className={`size-4 ${muted}`} />
                    )}
                  </button>

                  {openSec ? (
                    <div className={`border-t px-3 pb-3 pt-2 ${border}`}>
                      {section.kind === 'tabs' ? (
                        <div
                          className={`mb-2 grid grid-cols-3 gap-1 rounded-lg p-1 ${
                            story ? 'bg-[var(--sr-panel-elevated)]' : 'bg-[#f0f0f0]'
                          }`}
                        >
                          {section.tabs.map((tab) => {
                            const active = nsfwTab === tab.category
                            const tabCount = selectedProbes.filter((p) => p.category === tab.category).length
                            return (
                              <button
                                key={tab.category}
                                type="button"
                                onClick={() => setNsfwTab(tab.category)}
                                className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                                  active
                                    ? story
                                      ? 'bg-[var(--sr-panel)] text-[var(--sr-text)] shadow-sm'
                                      : 'bg-white text-[#222] shadow-sm'
                                    : muted
                                }`}
                              >
                                {tab.label}
                                {tabCount ? ` ·${tabCount}` : ''}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}

                      {(() => {
                        const cat: ContinueProbeCategoryId =
                          section.kind === 'flat' ? section.category : nsfwTab
                        const subs = listSubsForCategory(cat)
                        const activeSub = resolveActiveSub(cat)
                        const freePreset = activeSub
                          ? presetById.get(freeformProbeId(activeSub.id))
                          : undefined
                        const specifics = activeSub
                          ? listSpecificsForSub(DATING_CONTINUE_PROBE_BUILTIN, activeSub.id)
                          : []
                        const customInCat = userCustomPresets.filter((p) => p.category === cat)

                        return (
                          <div className="space-y-2.5">
                            {subs.length ? (
                              <div className="flex flex-wrap gap-1.5">
                                {subs.map((sub) => {
                                  const on = activeSub?.id === sub.id
                                  const count = selectedProbes.filter((p) => p.subId === sub.id).length
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() =>
                                        setActiveSubByCategory((prev) => ({ ...prev, [cat]: sub.id }))
                                      }
                                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                                        on
                                          ? story
                                            ? 'border-[var(--sr-gold)] bg-[var(--sr-gold)]/15 text-[var(--sr-text)]'
                                            : 'border-[color:var(--ds-accent,#7a8f72)] bg-[color:var(--ds-accent-soft)] text-[#222]'
                                          : story
                                            ? 'border-[var(--sr-border)] text-[var(--sr-text-muted)]'
                                            : 'border-[#e6e6e6] text-[#666]'
                                      }`}
                                    >
                                      {sub.label}
                                      {count ? ` ·${count}` : ''}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}

                            {activeSub ? (
                              <p className={`text-[10px] leading-snug ${muted}`}>
                                小类「{activeSub.label}」：点选场面，下方可写自定义补充；也可只点自行发挥
                              </p>
                            ) : null}

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {freePreset ? (
                                <ProbeOptionCell
                                  item={freePreset}
                                  active={selectedIds.has(freePreset.id)}
                                  onToggle={() => togglePreset(freePreset.id)}
                                  customNote={optionNotes[freePreset.id] ?? ''}
                                  onCustomNoteChange={(v) => setOptionNote(freePreset.id, v)}
                                  story={story}
                                  displayLabel="模型自行发挥"
                                  inputCls={inputCls}
                                />
                              ) : null}
                              {specifics.map((item) => (
                                <ProbeOptionCell
                                  key={item.id}
                                  item={item}
                                  active={selectedIds.has(item.id)}
                                  onToggle={() => togglePreset(item.id)}
                                  customNote={optionNotes[item.id] ?? ''}
                                  onCustomNoteChange={(v) => setOptionNote(item.id, v)}
                                  story={story}
                                  inputCls={inputCls}
                                />
                              ))}
                            </div>

                            {customInCat.length ? (
                              <div>
                                <p className={`mb-1 text-[10px] ${muted}`}>我的自定义</p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                  {customInCat.map((item) => (
                                    <ProbeOptionCell
                                      key={item.id}
                                      item={item}
                                      active={selectedIds.has(item.id)}
                                      onToggle={() => togglePreset(item.id)}
                                      customNote={optionNotes[item.id] ?? ''}
                                      onCustomNoteChange={(v) => setOptionNote(item.id, v)}
                                      story={story}
                                      inputCls={inputCls}
                                    />
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )
                      })()}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className={`mt-3 overflow-hidden rounded-xl border ${border} ${panelBg}`}>
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              onClick={() => setMoreOpen((v) => !v)}
            >
              <span className={`text-[13px] font-medium ${story ? 'text-[var(--sr-text)]' : 'text-[#222]'}`}>
                时间 · 补充 · 自定义
              </span>
              {moreOpen ? <ChevronUp className={`size-4 ${muted}`} /> : <ChevronDown className={`size-4 ${muted}`} />}
            </button>

            {moreOpen ? (
              <div className={`space-y-3 border-t px-3 pb-3 pt-3 ${border}`}>
                <div>
                  <p className={`mb-1.5 text-[11px] font-medium ${muted}`}>时间推进</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CONTINUE_DRAFT_TIME_ADVANCE_OPTIONS.map((opt) => (
                      <TimeChip
                        key={opt.id}
                        label={opt.label}
                        hint={opt.hint}
                        active={timeAdvance === opt.id}
                        onClick={() => setTimeAdvance(opt.id)}
                        story={story}
                      />
                    ))}
                  </div>
                  {timeAdvance === 'custom' ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0.1}
                        value={timeAmount}
                        onChange={(e) => setTimeAmount(e.target.value)}
                        className={`${inputCls} !w-20`}
                      />
                      <select
                        value={timeUnit}
                        onChange={(e) => setTimeUnit(e.target.value as 'hour' | 'day' | 'month' | 'year')}
                        className={inputCls}
                      >
                        {DATING_PLOT_PACE_UNIT_OPTIONS.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>

                <div>
                  <p className={`mb-1.5 text-[11px] font-medium ${muted}`}>补充一句</p>
                  <input
                    value={extraNote}
                    onChange={(e) => setExtraNote(e.target.value.slice(0, 120))}
                    placeholder="语气更软；先别说话"
                    className={inputCls}
                  />
                </div>

                {composed.trim() ? (
                  <div>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between text-[12px] font-medium ${muted}`}
                      onClick={() => setPreviewOpen((v) => !v)}
                    >
                      <span>预览注入内容</span>
                      {previewOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                    {previewOpen ? (
                      <pre
                        className={`mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg p-2.5 text-[11px] leading-relaxed ${
                          story
                            ? 'bg-[var(--sr-panel-elevated)] text-[var(--sr-text-muted)]'
                            : 'border border-[#ececec] bg-[#fafafa] text-[#444]'
                        }`}
                      >
                        {composed}
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between text-[12px] font-medium ${muted}`}
                    onClick={() => setAdvancedOpen((v) => !v)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Wand2 className="size-3.5" />
                      AI 帮写具体指导
                    </span>
                    {advancedOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  {advancedOpen ? (
                    <div className="mt-2 space-y-2">
                      <button
                        type="button"
                        disabled={aiGenerating}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] disabled:opacity-50 ${
                          story
                            ? 'bg-[var(--sr-gold)]/15 text-[var(--sr-gold)]'
                            : 'bg-[#eee] text-[#333]'
                        }`}
                        onClick={() => void runAiGenerate()}
                      >
                        {aiGenerating ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        {aiGenerating ? '生成中…' : 'AI 生成 2 条指导'}
                      </button>
                      {aiPreview?.map((guide, idx) => (
                        <div
                          key={`ai-guide-${idx}`}
                          className={`rounded-lg border p-2.5 ${
                            story
                              ? 'border-[var(--sr-border)] bg-[var(--sr-panel-elevated)]'
                              : 'border-[#e8e8e8] bg-[#fafafa]'
                          }`}
                        >
                          <p className={`text-[11px] ${story ? 'text-[var(--sr-text-faint)]' : 'text-[#999]'}`}>
                            指导 {idx + 1}
                          </p>
                          <p
                            className={`mt-1 text-[12px] leading-relaxed ${
                              story ? 'text-[var(--sr-text)]' : 'text-[#333]'
                            }`}
                          >
                            {guide}
                          </p>
                          <button
                            type="button"
                            className={`mt-2 rounded-md px-2.5 py-1 text-[11px] font-medium ${
                              story
                                ? 'bg-[var(--sr-gold)] text-[var(--sr-gold-on)]'
                                : 'bg-[color:var(--ds-accent,#7a8f72)] text-white'
                            }`}
                            onClick={() => onApply(guide)}
                          >
                            直接填入
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <p className={`mb-1.5 text-[11px] font-medium ${muted}`}>我的预设</p>
                  {userCustomPresets.length ? (
                    <div className="mb-2 grid grid-cols-3 gap-1.5">
                      {userCustomPresets.map((item) => (
                        <div key={item.id} className="relative">
                          <ProbeChip
                            item={item}
                            active={selectedIds.has(item.id)}
                            onClick={() => togglePreset(item.id)}
                            story={story}
                          />
                          <button
                            type="button"
                            className={`absolute -right-1 -top-1 rounded-full p-0.5 ${
                              story
                                ? 'bg-[var(--sr-panel-elevated)] text-[var(--sr-text-faint)]'
                                : 'bg-[#f0f0f0] text-[#aaa]'
                            }`}
                            aria-label={`删除 ${item.label}`}
                            onClick={() => handleRemoveCustom(item.id.replace(/^custom:/, ''))}
                          >
                            <Trash2 className="size-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`mb-2 text-[11px] ${story ? 'text-[var(--sr-text-faint)]' : 'text-[#b0b0b0]'}`}>
                      暂无自定义预设
                    </p>
                  )}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value.slice(0, 12))}
                        placeholder="按钮名"
                        className={`${inputCls} min-w-0 flex-1`}
                      />
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as ContinueProbeCategoryId)}
                        className={`${inputCls} !w-[7.5rem] shrink-0`}
                      >
                        {DATING_CONTINUE_PROBE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.shortLabel ?? c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      value={customProbe}
                      onChange={(e) => setCustomProbe(e.target.value.slice(0, 160))}
                      placeholder="具体场面一句"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border text-[12px] ${
                        story
                          ? 'border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] text-[var(--sr-text-muted)]'
                          : 'border-[#e0e0e0] bg-[#fafafa] text-[#444]'
                      }`}
                      onClick={handleAddCustom}
                    >
                      <Plus className="size-3.5" />
                      保存为我的预设
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={`flex shrink-0 gap-2.5 border-t px-4 py-3 ${
            story ? 'border-[var(--sr-border)] bg-[var(--sr-panel)]' : 'border-[#ececec] bg-[#f4f8f3]'
          }`}
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            className={`h-11 flex-1 rounded-2xl border text-[14px] font-medium ${
              story
                ? 'border-[var(--sr-border)] text-[var(--sr-text-muted)]'
                : 'border-[#ddd] bg-white text-[#555]'
            }`}
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            disabled={!composed.trim()}
            className={`h-11 flex-[1.35] rounded-2xl text-[14px] font-semibold transition disabled:opacity-40 ${
              story
                ? 'bg-[var(--sr-gold)] text-[var(--sr-gold-on)]'
                : 'bg-[color:var(--ds-accent,#7a8f72)] text-white'
            }`}
            onClick={handleApply}
          >
            填入输入框{selectedProbes.length ? ` · ${selectedProbes.length}` : ''}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
