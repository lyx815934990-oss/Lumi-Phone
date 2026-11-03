import { Reorder } from 'framer-motion'
import {
  ArrowLeft,
  ArrowLeftRight,
  Copy,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { CotEntryCard } from './components/CotEntryCard'
import { CotRegexRuleCard } from './components/CotRegexRuleCard'
import { SortableCotEntry } from './components/SortableCotEntry'
import {
  COT_REGEX_GROUP_OTHER,
  COT_SYSTEM_PRESET_ID,
  inferCotRegexGroup,
  type CoTEntry,
  type CoTPreset,
  type CotPresetKind,
  type CotPresetScope,
  type CotRegexRule,
} from './cotTypes'
import {
  activateCotPreset,
  activateSystemForScene,
  convertCotPresetKind,
  createEmptyCotEntry,
  createEmptyCotPreset,
  createEmptyCotRegexRule,
  deleteCotPreset,
  downloadSingleCotPreset,
  duplicateCotPreset,
  getCotStoreSnapshotForStore,
  getEffectiveCotTokenStats,
  getKindActiveIds,
  importCotPresetsJson,
  isGeneralModeActive,
  saveCotPreset,
  subscribeCotStore,
} from './cotStore'
import { estimatePresetEffectiveTokens, sortCotEntriesDisplay } from './cotTokens'
import { cotTheme } from './cotTheme'

type Props = { onBack: () => void }

type Screen =
  | { name: 'home' }
  | { name: 'entries'; presetId: string; draft: CoTPreset }

/** 预设编辑顶栏：条目，或某一正则配套 */
type EditorTab = { kind: 'entries' } | { kind: 'regex'; pack: string }

function listRegexPacks(rules: CotRegexRule[]): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  for (const r of [...rules].sort((a, b) => a.order - b.order)) {
    const g = inferCotRegexGroup(r)
    if (seen.has(g)) continue
    seen.add(g)
    order.push(g)
  }
  // 「其他」靠后
  order.sort((a, b) => {
    if (a === COT_REGEX_GROUP_OTHER) return 1
    if (b === COT_REGEX_GROUP_OTHER) return -1
    return a.localeCompare(b, 'zh')
  })
  return order
}

const SCOPE_META: Record<
  CotPresetScope,
  { label: string; short: string; accent: string; soft: string; border: string }
> = {
  both: {
    label: '通用',
    short: '通用',
    accent: '#8B6914',
    soft: 'rgba(217,185,119,0.28)',
    border: 'rgba(217,185,119,0.7)',
  },
  online: {
    label: '线上',
    short: '线上',
    accent: '#1F6B5C',
    soft: 'rgba(45,140,120,0.16)',
    border: 'rgba(45,140,120,0.55)',
  },
  offline: {
    label: '线下',
    short: '线下',
    accent: '#7A3E2E',
    soft: 'rgba(180,90,70,0.14)',
    border: 'rgba(180,90,70,0.5)',
  },
}

function ScopeBadge({ scope, large }: { scope: CotPresetScope; large?: boolean }) {
  const m = SCOPE_META[scope]
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-wide ${
        large ? 'px-3 py-1 text-[12px]' : 'px-2.5 py-0.5 text-[11px]'
      }`}
      style={{
        background: m.soft,
        color: m.accent,
        border: `1.5px solid ${m.border}`,
      }}
    >
      {m.label}
    </span>
  )
}

function enabledCount(p: CoTPreset): number {
  return p.entries.filter((e) => e.enabled).length
}

function isPresetActive(p: CoTPreset, onlineId: string, offlineId: string): boolean {
  if (p.scope === 'both') return onlineId === p.id && offlineId === p.id
  if (p.scope === 'online') return onlineId === p.id
  return offlineId === p.id
}

export function ThinkingChainApp({ onBack }: Props) {
  const store = useSyncExternalStore(
    subscribeCotStore,
    getCotStoreSnapshotForStore,
    getCotStoreSnapshotForStore,
  )
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [query, setQuery] = useState('')
  const [hint, setHint] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  /** 预设编辑：条目 / 各正则配套分 tab */
  const [editorTab, setEditorTab] = useState<EditorTab>({ kind: 'entries' })
  /** 刚添加的正则：默认展开编辑 */
  const [freshRegexId, setFreshRegexId] = useState<string | null>(null)
  /** 首页：提示词 / 思维链 */
  const [homeKind, setHomeKind] = useState<CotPresetKind>('replyStyle')
  /** 首页：通用 / 线上 / 线下 */
  const [homeScope, setHomeScope] = useState<CotPresetScope>('online')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const tokenStats = useMemo(() => getEffectiveCotTokenStats(), [store])

  const presetsByKindScope = useMemo(() => {
    const empty = () => ({ both: [] as CoTPreset[], online: [] as CoTPreset[], offline: [] as CoTPreset[] })
    const replyStyle = empty()
    const thinkingChain = empty()
    for (const p of store.presets) {
      const bucket = p.kind === 'replyStyle' ? replyStyle : thinkingChain
      if (p.scope === 'online') bucket.online.push(p)
      else if (p.scope === 'offline') bucket.offline.push(p)
      else bucket.both.push(p)
    }
    return { replyStyle, thinkingChain }
  }, [store.presets])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const p of store.presets) for (const t of p.tags) set.add(t)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh'))
  }, [store.presets])

  const openEntries = (preset: CoTPreset) => {
    setQuery('')
    setHint('')
    setTagDraft('')
    setEditorTab({ kind: 'entries' })
    setFreshRegexId(null)
    setScreen({
      name: 'entries',
      presetId: preset.id,
      draft: {
        ...preset,
        kind: preset.kind ?? 'thinkingChain',
        tags: [...preset.tags],
        entries: preset.entries.map((e) => ({
          ...e,
          tags: [...(e.tags ?? [])],
        })),
        regexRules: (preset.regexRules ?? []).map((r) => ({ ...r })),
      },
    })
  }

  const addRegexRule = (pack?: string) => {
    if (screen.name !== 'entries') return
    const list = screen.draft.regexRules ?? []
    const nextOrder = (list.reduce((m, r) => Math.max(m, r.order), 0) || 0) + 1
    const group =
      (pack && pack.trim()) ||
      (editorTab.kind === 'regex' ? editorTab.pack : '') ||
      COT_REGEX_GROUP_OTHER
    const created = createEmptyCotRegexRule(nextOrder, {
      group: group === COT_REGEX_GROUP_OTHER ? undefined : group,
    })
    if (group && group !== COT_REGEX_GROUP_OTHER) {
      created.group = group
      if (!created.name.startsWith('【')) created.name = `【${group}】规则 ${nextOrder}`
    }
    setFreshRegexId(created.id)
    setEditorTab({ kind: 'regex', pack: inferCotRegexGroup(created) })
    patchDraft({ regexRules: [...list, created] })
  }

  const onCreate = (scope: CotPresetScope, kind: CotPresetKind) => {
    const label =
      kind === 'replyStyle'
        ? `${SCOPE_META[scope].label}提示词`
        : `${SCOPE_META[scope].label}思维链`
    openEntries(createEmptyCotPreset(label, scope, kind))
  }

  const filteredEntries = useMemo(() => {
    if (screen.name !== 'entries') return []
    const q = query.trim().toLowerCase()
    let list = sortCotEntriesDisplay(screen.draft.entries)
    if (q) {
      list = list.filter(
        (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q),
      )
    }
    return list
  }, [query, screen])

  const patchDraft = (patch: Partial<CoTPreset>) => {
    if (screen.name !== 'entries') return
    setScreen({
      ...screen,
      draft: { ...screen.draft, ...patch },
    })
  }

  const patchEntry = (id: string, next: CoTEntry) => {
    if (screen.name !== 'entries') return
    patchDraft({
      entries: screen.draft.entries.map((e) => (e.id === id ? next : e)),
    })
  }

  const addTagToDraft = () => {
    if (screen.name !== 'entries') return
    const t = tagDraft.trim().slice(0, 16)
    if (!t) return
    if (screen.draft.tags.includes(t)) {
      setTagDraft('')
      return
    }
    if (screen.draft.tags.length >= 12) {
      setHint('标签最多 12 个')
      return
    }
    patchDraft({ tags: [...screen.draft.tags, t] })
    setTagDraft('')
  }

  const saveDraft = (activate: boolean) => {
    if (screen.name !== 'entries') return
    const name = screen.draft.name.trim()
    if (!name) {
      setHint('请填写预设名称')
      return
    }
    const ordered = sortCotEntriesDisplay(screen.draft.entries).map((e, i) => ({
      ...e,
      order: i + 1,
    }))
    const regexOrdered = [...(screen.draft.regexRules ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((r, i) => ({ ...r, order: i + 1 }))
    const saved = saveCotPreset(
      {
        ...screen.draft,
        name,
        scope: screen.draft.scope,
        kind: screen.draft.kind ?? 'thinkingChain',
        tags: screen.draft.tags,
        entries: ordered,
        regexRules: regexOrdered,
        updatedAt: Date.now(),
      },
      { activate },
    )
    if (!saved) {
      setHint('保存失败（预设套数可能已达上限）')
      return
    }
    setHint(activate ? '已保存并启用' : '已保存')
    setScreen({ name: 'home' })
  }

  const onImportFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const useReplace = !window.confirm(
        '导入方式：\n\n确定 = 合并到现有预设（同 id 覆盖）\n取消 = 用文件整表替换本地预设',
      )
      const result = importCotPresetsJson(text, useReplace ? 'replace' : 'merge')
      if (!result.ok) {
        setHint(result.error)
        return
      }
      setHint(`已导入 ${result.imported} 个预设`)
    } catch {
      setHint('读取文件失败')
    }
  }

  const filterByTag = (list: CoTPreset[]) => {
    const t = tagFilter.trim()
    if (!t) return list
    return list.filter((p) => p.tags.includes(t))
  }

  const renderPresetCard = (
    p: CoTPreset,
    opts: { canActivate: boolean; lockReason?: string },
  ) => {
    const kind = p.kind ?? 'thinkingChain'
    const { online, offline } = getKindActiveIds(store, kind)
    const active = isPresetActive(p, online, offline)
    const count = p.entries.length
    const on = enabledCount(p)
    const tok = estimatePresetEffectiveTokens(p)

    return (
      <div
        key={p.id}
        className="mx-4 mt-2.5"
        style={{
          background: cotTheme.card,
          borderRadius: 16,
          padding: active ? '14px 14px 16px' : '12px 14px',
          border: `1.5px solid ${active ? SCOPE_META[p.scope].border : cotTheme.border}`,
          boxShadow: active ? '0 10px 28px rgba(45,42,38,0.06)' : 'none',
        }}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[15px] font-semibold" style={{ color: cotTheme.text }}>
                {p.name}
              </p>
              <ScopeBadge scope={p.scope} />
              {active ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: cotTheme.goldSoft, color: cotTheme.text }}
                >
                  使用中
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                style={{ background: cotTheme.tagBg, color: cotTheme.muted }}
              >
                {on}/{count} 条生效
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                style={{ background: cotTheme.tagBg, color: cotTheme.muted }}
              >
                ≈{tok} tokens
              </span>
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    background: SCOPE_META[p.scope].soft,
                    color: SCOPE_META[p.scope].accent,
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
            {!opts.canActivate && opts.lockReason && !active ? (
              <p className="mt-1.5 text-[11px]" style={{ color: cotTheme.muted }}>
                {opts.lockReason}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {active ? (
              <button
                type="button"
                onClick={() =>
                  activateSystemForScene(
                    p.scope === 'both' ? 'both' : p.scope,
                    p.kind ?? 'thinkingChain',
                  )
                }
                className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: cotTheme.btnSecondaryBg,
                  color: cotTheme.btnSecondaryText,
                  border: `1.5px solid ${cotTheme.btnSecondaryBorder}`,
                }}
              >
                停用
              </button>
            ) : (
              <button
                type="button"
                disabled={!opts.canActivate}
                onClick={() => activateCotPreset(p.id)}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium disabled:opacity-40"
                style={{
                  background: cotTheme.btnPrimaryBg,
                  color: cotTheme.btnPrimaryText,
                }}
              >
                启用
              </button>
            )}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="rounded-lg p-1.5"
                style={{ color: cotTheme.muted }}
                onClick={() => {
                  const from = p.kind ?? 'thinkingChain'
                  const toLabel = from === 'replyStyle' ? '思维链' : '提示词'
                  if (
                    !window.confirm(
                      `将「${p.name}」转为${toLabel}？\n条目内容不变；若当前已启用，会按新类型重新启用。`,
                    )
                  ) {
                    return
                  }
                  const r = convertCotPresetKind(p.id)
                  if (!r.ok) {
                    setHint(r.error)
                    return
                  }
                  setHint(
                    r.to === 'replyStyle'
                      ? `已转为提示词「${r.preset.name}」`
                      : `已转为思维链「${r.preset.name}」`,
                  )
                }}
                aria-label={
                  (p.kind ?? 'thinkingChain') === 'replyStyle'
                    ? '转为思维链'
                    : '转为提示词'
                }
                title={
                  (p.kind ?? 'thinkingChain') === 'replyStyle'
                    ? '转为思维链'
                    : '转为提示词'
                }
              >
                <ArrowLeftRight size={15} />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5"
                style={{ color: cotTheme.muted }}
                onClick={() => {
                  if (downloadSingleCotPreset(p.id)) setHint(`已导出「${p.name}」`)
                }}
                aria-label="导出此预设"
                title="导出"
              >
                <Download size={15} />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5"
                style={{ color: cotTheme.muted }}
                onClick={() => duplicateCotPreset(p.id)}
                aria-label="复制"
              >
                <Copy size={15} />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5"
                style={{ color: cotTheme.muted }}
                onClick={() => openEntries(p)}
                aria-label="编辑"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5"
                style={{ color: cotTheme.muted }}
                onClick={() => {
                  if (window.confirm(`删除预设「${p.name}」？`)) deleteCotPreset(p.id)
                }}
                aria-label="删除"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
        {active ? (
          <button
            type="button"
            onClick={() => openEntries(p)}
            className="mt-3 w-full rounded-xl py-2.5 text-[13px] font-medium"
            style={{
              background: cotTheme.btnSecondaryBg,
              color: cotTheme.btnSecondaryText,
              border: `1.5px solid ${cotTheme.btnSecondaryBorder}`,
            }}
          >
            编辑条目
          </button>
        ) : null}
      </div>
    )
  }

  const renderSection = (
    scope: CotPresetScope,
    list: CoTPreset[],
    kind: CotPresetKind,
  ) => {
    const meta = SCOPE_META[scope]
    const filtered = filterByTag(list)
    const generalMode = isGeneralModeActive(kind, store)
    const { online, offline } = getKindActiveIds(store, kind)
    const dedicatedLocked = scope !== 'both' && generalMode
    const hasDedicatedActive =
      !generalMode &&
      (online !== COT_SYSTEM_PRESET_ID || offline !== COT_SYSTEM_PRESET_ID)
    const generalLocked = scope === 'both' && hasDedicatedActive
    const usingSystem =
      scope === 'both'
        ? online === COT_SYSTEM_PRESET_ID && offline === COT_SYSTEM_PRESET_ID
        : scope === 'online'
          ? online === COT_SYSTEM_PRESET_ID
          : offline === COT_SYSTEM_PRESET_ID
    const fallbackHint =
      kind === 'replyStyle'
        ? '未启用时使用系统扮演主壳 + 内置文风'
        : '未启用时使用系统默认思维链'

    return (
      <section className="mt-3">
        <div className="mx-4 mb-2 flex items-center gap-2">
          <div
            className="h-6 w-1.5 rounded-full"
            style={{ background: meta.accent }}
            aria-hidden
          />
          <h3
            className="text-[15px] font-bold tracking-wide"
            style={{ color: meta.accent, fontFamily: cotTheme.sans }}
          >
            {meta.label}
          </h3>
          <ScopeBadge scope={scope} large />
          <span className="text-[11px]" style={{ color: cotTheme.muted }}>
            {filtered.length} 套
            {usingSystem ? ' · 当前系统默认' : ''}
          </span>
          <button
            type="button"
            onClick={() => onCreate(scope, kind)}
            className="ml-auto flex size-8 items-center justify-center rounded-xl"
            style={{
              background: cotTheme.btnPrimaryBg,
              color: cotTheme.btnPrimaryText,
            }}
            aria-label={`新建${meta.label}${kind === 'replyStyle' ? '提示词' : '思维链'}`}
          >
            <Plus size={15} />
          </button>
        </div>

        {filtered.map((p) =>
          renderPresetCard(p, {
            canActivate: scope === 'both' ? !generalLocked : !dedicatedLocked,
            lockReason:
              scope === 'both'
                ? '已启用线上/线下专用，请先停用后再启通用'
                : '已启用通用预设，专用通道已锁定',
          }),
        )}
        {!filtered.length ? (
          <p className="mx-4 mt-2 text-[12px]" style={{ color: cotTheme.muted }}>
            暂无{meta.label}自定义 · {fallbackHint}
          </p>
        ) : null}
      </section>
    )
  }

  const homeKindMeta =
    homeKind === 'replyStyle'
      ? {
          title: '自定义提示词',
          desc: '始终可生效：线上替换扮演主壳（沙盒与格式仍保留）；线下替换扮演/写作，并覆盖沙盒与禁词硬钉。',
          createLabel: '新建提示词',
        }
      : {
          title: '自定义思维链',
          desc: '仅在开启思维链开关时注入：替换内置思维链 / 场记包。',
          createLabel: '新建思维链',
        }

  const homeScopeCounts = useMemo(() => {
    const by = presetsByKindScope[homeKind]
    const count = (list: CoTPreset[]) => filterByTag(list).length
    return {
      both: count(by.both),
      online: count(by.online),
      offline: count(by.offline),
    }
  }, [presetsByKindScope, homeKind, tagFilter])

  if (screen.name === 'entries') {
    const draft = screen.draft
    const draftTokens = estimatePresetEffectiveTokens(draft)
    const sortedRegexRules = (draft.regexRules ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
    const regexPacks = listRegexPacks(sortedRegexRules)
    const activeRegexPack =
      editorTab.kind === 'regex'
        ? regexPacks.includes(editorTab.pack)
          ? editorTab.pack
          : regexPacks[0] ?? COT_REGEX_GROUP_OTHER
        : null
    const visibleRegexRules =
      activeRegexPack == null
        ? []
        : sortedRegexRules.filter((r) => inferCotRegexGroup(r) === activeRegexPack)
    const editorTabs: Array<
      | { id: 'entries'; label: string; count: string }
      | { id: string; pack: string; label: string; count: string }
    > = [
      {
        id: 'entries',
        label: '条目',
        count: `${enabledCount(draft)}/${draft.entries.length}`,
      },
      ...regexPacks.map((pack) => {
        const inPack = sortedRegexRules.filter((r) => inferCotRegexGroup(r) === pack)
        const on = inPack.filter((r) => r.enabled).length
        return {
          id: `regex:${pack}`,
          pack,
          label: pack,
          count: `${on}/${inPack.length}`,
        }
      }),
    ]
    // 尚无正则时仍给一个「其他」入口，方便新建配套
    if (!regexPacks.length) {
      editorTabs.push({
        id: `regex:${COT_REGEX_GROUP_OTHER}`,
        pack: COT_REGEX_GROUP_OTHER,
        label: '正则',
        count: '0',
      })
    }

    return (
      <div className="flex h-full min-h-0 flex-col" style={{ background: cotTheme.bg }}>
        <header
          className="flex shrink-0 items-center gap-2 px-3 pb-2"
          style={{
            borderBottom: `1px solid ${cotTheme.border}`,
            paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
          }}
        >
          <button
            type="button"
            onClick={() => setScreen({ name: 'home' })}
            className="rounded-lg p-2"
            style={{ color: cotTheme.text }}
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[11px] tracking-[0.18em]"
              style={{ color: cotTheme.muted, fontFamily: cotTheme.serif }}
            >
              {(draft.kind ?? 'thinkingChain') === 'replyStyle'
                ? 'REPLY STYLE'
                : 'COT ENTRIES'}
              {' · '}
              {(draft.kind ?? 'thinkingChain') === 'replyStyle' ? '提示词' : '思维链'}
            </p>
            <input
              value={draft.name}
              onChange={(e) => patchDraft({ name: e.target.value })}
              className="mt-0.5 w-full bg-transparent text-[16px] font-semibold outline-none"
              style={{ color: cotTheme.text, fontFamily: cotTheme.sans }}
              placeholder="预设名称"
            />
          </div>
          <button
            type="button"
            onClick={() => saveDraft(false)}
            className="rounded-xl px-3 py-1.5 text-[12px] font-medium"
            style={{
              background: cotTheme.btnSecondaryBg,
              color: cotTheme.btnSecondaryText,
              border: `1.5px solid ${cotTheme.btnSecondaryBorder}`,
            }}
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => saveDraft(true)}
            className="rounded-xl px-3 py-1.5 text-[12px] font-medium"
            style={{
              background: cotTheme.btnPrimaryBg,
              color: cotTheme.btnPrimaryText,
            }}
          >
            保存并启用
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pt-3">
          <button
            type="button"
            onClick={() => {
              const from = draft.kind ?? 'thinkingChain'
              const to: CotPresetKind =
                from === 'replyStyle' ? 'thinkingChain' : 'replyStyle'
              patchDraft({ kind: to })
              setHint(
                to === 'replyStyle'
                  ? '已改为提示词类型（保存后生效）'
                  : '已改为思维链类型（保存后生效）',
              )
            }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={{
              background: cotTheme.goldSoft,
              color: cotTheme.text,
              border: `1.5px solid ${cotTheme.borderStrong}`,
            }}
            title="转换类型"
          >
            <ArrowLeftRight size={13} />
            {(draft.kind ?? 'thinkingChain') === 'replyStyle'
              ? '转为思维链'
              : '转为提示词'}
          </button>
          {(['both', 'online', 'offline'] as const).map((o) => {
            const active = draft.scope === o
            const m = SCOPE_META[o]
            return (
              <button
                key={o}
                type="button"
                onClick={() => patchDraft({ scope: o })}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
                style={{
                  background: active ? m.soft : cotTheme.card,
                  color: active ? m.accent : cotTheme.muted,
                  border: `1.5px solid ${active ? m.border : cotTheme.border}`,
                }}
              >
                {m.label}
              </button>
            )
          })}
          <span className="text-[11px]" style={{ color: cotTheme.muted }}>
            生效 ≈{draftTokens} tokens
          </span>
        </div>

        <div className="mx-4 mt-3 rounded-[14px] p-3" style={{ background: cotTheme.editBg }}>
          <p className="text-[11px] font-medium" style={{ color: cotTheme.muted }}>
            分类标签
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  patchDraft({ tags: draft.tags.filter((x) => x !== t) })
                }
                className="rounded-full px-2.5 py-1 text-[11px]"
                style={{
                  background: SCOPE_META[draft.scope].soft,
                  color: SCOPE_META[draft.scope].accent,
                  border: `1px solid ${SCOPE_META[draft.scope].border}`,
                }}
              >
                #{t} ×
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTagToDraft()
                }
              }}
              placeholder="输入标签后回车"
              className="min-w-0 flex-1 rounded-lg border bg-white px-2.5 py-2 text-[12px] outline-none"
              style={{ borderColor: cotTheme.border, color: cotTheme.text }}
            />
            <button
              type="button"
              onClick={addTagToDraft}
              className="rounded-xl px-3 py-2 text-[12px] font-medium"
              style={{
                background: cotTheme.btnPrimaryBg,
                color: cotTheme.btnPrimaryText,
              }}
            >
              添加
            </button>
          </div>
        </div>

        <div
          className="mx-4 mt-3 flex shrink-0 gap-1 overflow-x-auto rounded-xl p-1 [scrollbar-width:thin]"
          style={{ background: cotTheme.card, border: `1px solid ${cotTheme.border}` }}
          role="tablist"
          aria-label="预设编辑分区"
        >
          {editorTabs.map((tab) => {
            const active =
              tab.id === 'entries'
                ? editorTab.kind === 'entries'
                : editorTab.kind === 'regex' &&
                  (activeRegexPack ?? editorTab.pack) === ('pack' in tab ? tab.pack : '')
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (tab.id === 'entries') setEditorTab({ kind: 'entries' })
                  else if ('pack' in tab) setEditorTab({ kind: 'regex', pack: tab.pack })
                }}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition"
                style={{
                  background: active ? cotTheme.btnPrimaryBg : 'transparent',
                  color: active ? cotTheme.btnPrimaryText : cotTheme.muted,
                }}
              >
                <span className="max-w-[7.5rem] truncate">{tab.label}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
                  style={{
                    background: active ? 'rgba(255,255,255,0.18)' : cotTheme.goldSoft,
                    color: active ? cotTheme.btnPrimaryText : cotTheme.text,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {editorTab.kind === 'entries' ? (
          <>
            <div className="flex shrink-0 items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  const nextOrder =
                    (draft.entries.reduce((m, e) => Math.max(m, e.order), 0) || 0) + 1
                  patchDraft({
                    entries: [...draft.entries, createEmptyCotEntry(nextOrder)],
                  })
                }}
                className="flex size-9 items-center justify-center rounded-xl"
                style={{
                  background: cotTheme.btnPrimaryBg,
                  color: cotTheme.btnPrimaryText,
                }}
                aria-label="新建条目"
              >
                <Plus size={16} />
              </button>
              <div
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2"
                style={{ background: cotTheme.card, border: `1px solid ${cotTheme.border}` }}
              >
                <Search size={14} style={{ color: cotTheme.muted }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索条目"
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                  style={{ color: cotTheme.text }}
                />
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium"
                style={{ background: cotTheme.goldSoft, color: cotTheme.text }}
              >
                拖动手柄排序
              </span>
            </div>

            <p className="px-4 pb-2 text-[11px]" style={{ color: cotTheme.muted }}>
              列表按你拖动的顺序排列；注入时跳过关闭的条目，已开启的按列表从上到下依次拼接。按住左侧 ≡
              可拖动排序。
              {query.trim() ? ' 搜索中暂不可拖动。' : ''}
            </p>

            <div className="min-h-0 flex-1 overflow-y-auto pb-8">
              {filteredEntries.length ? (
                query.trim() ? (
                  filteredEntries.map((entry, idx) => (
                    <CotEntryCard
                      key={entry.id}
                      entry={entry}
                      indexLabel={idx + 1}
                      presetKind={draft.kind ?? 'thinkingChain'}
                      onChange={(next) => {
                        if (next.enabled !== entry.enabled) {
                          const merged = draft.entries.map((e) =>
                            e.id === entry.id ? next : e,
                          )
                          patchDraft({
                            entries: sortCotEntriesDisplay(merged).map((e, i) => ({
                              ...e,
                              order: i + 1,
                            })),
                          })
                        } else {
                          patchEntry(entry.id, next)
                        }
                      }}
                      onDelete={() =>
                        patchDraft({
                          entries: draft.entries.filter((e) => e.id !== entry.id),
                        })
                      }
                    />
                  ))
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={filteredEntries}
                    onReorder={(next) => {
                      const renumbered = next.map((e, i) => ({ ...e, order: i + 1 }))
                      patchDraft({ entries: renumbered })
                    }}
                    className="flex flex-col"
                  >
                    {filteredEntries.map((entry, idx) => (
                      <SortableCotEntry
                        key={entry.id}
                        entry={entry}
                        indexLabel={idx + 1}
                        presetKind={draft.kind ?? 'thinkingChain'}
                        onChange={(next) => {
                          if (next.enabled !== entry.enabled) {
                            const merged = draft.entries.map((e) =>
                              e.id === entry.id ? next : e,
                            )
                            patchDraft({
                              entries: sortCotEntriesDisplay(merged).map((e, i) => ({
                                ...e,
                                order: i + 1,
                              })),
                            })
                          } else {
                            patchEntry(entry.id, next)
                          }
                        }}
                        onDelete={() =>
                          patchDraft({
                            entries: draft.entries.filter((e) => e.id !== entry.id),
                          })
                        }
                      />
                    ))}
                  </Reorder.Group>
                )
              ) : (
                <p
                  className="px-6 py-16 text-center text-[13px] leading-relaxed"
                  style={{ color: cotTheme.muted }}
                >
                  {query.trim() ? '无匹配条目' : '还没有条目。点 + 新建。'}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => addRegexRule(activeRegexPack ?? COT_REGEX_GROUP_OTHER)}
                className="flex size-9 items-center justify-center rounded-xl"
                style={{
                  background: cotTheme.btnPrimaryBg,
                  color: cotTheme.btnPrimaryText,
                }}
                aria-label="添加正则"
              >
                <Plus size={16} />
              </button>
              <p className="min-w-0 flex-1 text-[11px] leading-relaxed" style={{ color: cotTheme.muted }}>
                配套「{activeRegexPack ?? COT_REGEX_GROUP_OTHER}
                」· 仅本预设生效。按名称【配套】自动分 tab；点标题可展开编辑。
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-8">
              {visibleRegexRules.length ? (
                visibleRegexRules.map((rule) => (
                  <CotRegexRuleCard
                    key={rule.id}
                    rule={rule}
                    defaultOpen={rule.id === freshRegexId}
                    onChange={(next) => {
                      const list = draft.regexRules ?? []
                      // 改名可能导致换配套：同步 group 并必要时切 tab
                      const pack = inferCotRegexGroup(next)
                      const synced =
                        next.group === pack
                          ? next
                          : { ...next, group: pack === COT_REGEX_GROUP_OTHER ? undefined : pack }
                      patchDraft({
                        regexRules: list.map((r) => (r.id === rule.id ? synced : r)),
                      })
                      if (editorTab.kind === 'regex' && pack !== editorTab.pack) {
                        setEditorTab({ kind: 'regex', pack })
                      }
                    }}
                    onDelete={() => {
                      if (freshRegexId === rule.id) setFreshRegexId(null)
                      patchDraft({
                        regexRules: (draft.regexRules ?? []).filter((r) => r.id !== rule.id),
                      })
                    }}
                  />
                ))
              ) : (
                <p
                  className="px-6 py-16 text-center text-[13px] leading-relaxed"
                  style={{ color: cotTheme.muted }}
                >
                  「{activeRegexPack ?? '正则'}」还没有规则。点 + 添加。
                </p>
              )}
              <div className="px-4 pb-10 pt-3">
                <button
                  type="button"
                  onClick={() => addRegexRule(activeRegexPack ?? COT_REGEX_GROUP_OTHER)}
                  className="w-full rounded-xl border border-dashed py-2.5 text-[13px] font-medium"
                  style={{
                    borderColor: cotTheme.borderStrong,
                    color: cotTheme.muted,
                    background: cotTheme.card,
                  }}
                >
                  + 添加「{activeRegexPack ?? COT_REGEX_GROUP_OTHER}」正则
                </button>
              </div>
            </div>
          </>
        )}

        {hint ? (
          <p className="px-4 pb-3 text-center text-[12px]" style={{ color: cotTheme.gold }}>
            {hint}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: cotTheme.bg }}>
      <header
        className="flex shrink-0 items-center gap-2 px-3 pb-2"
        style={{
          borderBottom: `1px solid ${cotTheme.border}`,
          paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-2"
          style={{ color: cotTheme.text }}
          aria-label="返回桌面"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] tracking-[0.2em]"
            style={{ color: cotTheme.muted, fontFamily: cotTheme.serif }}
          >
            WENXIN
          </p>
          <h1
            className="text-[18px] font-semibold"
            style={{ color: cotTheme.text, fontFamily: cotTheme.serif }}
          >
            文心
          </h1>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[12px] font-medium"
          style={{
            background: cotTheme.btnSecondaryBg,
            color: cotTheme.btnSecondaryText,
            border: `1.5px solid ${cotTheme.btnSecondaryBorder}`,
          }}
        >
          <Upload size={14} />
          导入
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            void onImportFile(f)
            e.target.value = ''
          }}
        />
      </header>

      {/* 一级 Tab：提示词 / 思维链 */}
      <div
        className="mx-4 mt-3 flex shrink-0 rounded-2xl p-1"
        style={{ background: cotTheme.editBg, border: `1px solid ${cotTheme.border}` }}
        role="tablist"
        aria-label="预设类型"
      >
        {(
          [
            { id: 'replyStyle' as const, label: '提示词' },
            { id: 'thinkingChain' as const, label: '思维链' },
          ] as const
        ).map((tab) => {
          const active = homeKind === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setHomeKind(tab.id)}
              className="min-w-0 flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition"
              style={{
                background: active ? cotTheme.card : 'transparent',
                color: active ? cotTheme.text : cotTheme.muted,
                boxShadow: active ? '0 4px 14px rgba(45,42,38,0.06)' : 'none',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 二级 Tab：通用 / 线上 / 线下 */}
      <div
        className="mx-4 mt-2.5 flex shrink-0 gap-1.5"
        role="tablist"
        aria-label="作用范围"
      >
        {(['both', 'online', 'offline'] as const).map((scope) => {
          const active = homeScope === scope
          const m = SCOPE_META[scope]
          const n = homeScopeCounts[scope]
          return (
            <button
              key={scope}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setHomeScope(scope)}
              className="min-w-0 flex-1 rounded-full px-2 py-2 text-[12px] font-semibold"
              style={{
                background: active ? m.soft : cotTheme.card,
                color: active ? m.accent : cotTheme.muted,
                border: `1.5px solid ${active ? m.border : cotTheme.border}`,
              }}
            >
              {m.label}
              <span className="ml-1 tabular-nums opacity-70">{n}</span>
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-10 pt-1">
        <div
          className="mx-4 mt-3 rounded-[16px] px-4 py-3"
          style={{
            background: cotTheme.card,
            border: `1.5px solid ${cotTheme.borderStrong}`,
          }}
        >
          <p className="text-[11px] tracking-[0.16em]" style={{ color: cotTheme.muted }}>
            EFFECTIVE TOKENS · 生效自定义提示词 + 思维链
          </p>
          <p
            className="mt-1 text-[22px] font-semibold tabular-nums"
            style={{ color: cotTheme.text, fontFamily: cotTheme.serif }}
          >
            ≈ {tokenStats.tokens}
            <span className="ml-1 text-[13px] font-normal" style={{ color: cotTheme.muted }}>
              tokens
            </span>
          </p>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: cotTheme.muted }}>
            {tokenStats.shared
              ? '含通用预设（线上=线下不重复累计）'
              : `线上 ≈${tokenStats.onlineTokens} · 线下 ≈${tokenStats.offlineTokens}`}
          </p>
        </div>

        <p className="px-5 pb-1 pt-3 text-[12px] leading-relaxed" style={{ color: cotTheme.muted }}>
          {homeKindMeta.desc} 当前查看：
          <span style={{ color: SCOPE_META[homeScope].accent, fontWeight: 600 }}>
            {SCOPE_META[homeScope].label}
          </span>
          。提示词与思维链可同时启用；同类型下通用 / 线上 / 线下互斥。
        </p>

        <div className="mx-4 mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onCreate(homeScope, homeKind)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium"
            style={{
              background: cotTheme.btnPrimaryBg,
              color: cotTheme.btnPrimaryText,
            }}
          >
            <Plus size={14} />
            {homeKindMeta.createLabel}·{SCOPE_META[homeScope].short}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          <button
            type="button"
            onClick={() => setTagFilter('')}
            className="rounded-full px-2.5 py-1 text-[11px]"
            style={{
              background: !tagFilter ? cotTheme.goldSoft : cotTheme.tagBg,
              color: cotTheme.text,
              border: `1px solid ${!tagFilter ? cotTheme.borderStrong : cotTheme.border}`,
            }}
          >
            全部标签
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTagFilter((cur) => (cur === t ? '' : t))}
              className="rounded-full px-2.5 py-1 text-[11px]"
              style={{
                background: tagFilter === t ? cotTheme.goldSoft : cotTheme.tagBg,
                color: cotTheme.text,
                border: `1px solid ${
                  tagFilter === t ? cotTheme.borderStrong : cotTheme.border
                }`,
              }}
            >
              #{t}
            </button>
          ))}
        </div>

        {hint ? (
          <p className="px-4 pt-2 text-center text-[12px]" style={{ color: cotTheme.gold }}>
            {hint}
          </p>
        ) : null}

        {renderSection(
          homeScope,
          presetsByKindScope[homeKind][homeScope],
          homeKind,
        )}
      </div>
    </div>
  )
}
