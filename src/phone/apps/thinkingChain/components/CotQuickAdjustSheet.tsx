/**
 * 聊天 / 线下约会快捷：切换提示词·思维链预设、开关条目、编辑保存
 */
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { cotTheme } from '../cotTheme'
import {
  activateCotPreset,
  activateSystemForScene,
  getCotStoreSnapshotForStore,
  getKindActiveIds,
  isGeneralModeActive,
  saveCotPreset,
  subscribeCotStore,
} from '../cotStore'
import {
  COT_SYSTEM_PRESET_ID,
  type CoTEntry,
  type CoTPreset,
  type CotPresetKind,
} from '../cotTypes'
import { sortCotEntriesDisplay } from '../cotTokens'
import { CotCapsuleSwitch } from './CotCapsuleSwitch'

const SCOPE_LABEL: Record<string, string> = {
  both: '通用',
  online: '线上',
  offline: '线下',
}

const SCENE_LABEL: Record<'online' | 'offline', string> = {
  online: '线上',
  offline: '线下',
}

function setEntryEnabled(preset: CoTPreset, entryId: string, enabled: boolean): void {
  const merged = preset.entries.map((e) =>
    e.id === entryId
      ? { ...e, enabled, tags: [...(e.tags ?? [])] }
      : { ...e, tags: [...(e.tags ?? [])] },
  )
  const next: CoTPreset = {
    ...preset,
    kind: preset.kind ?? 'thinkingChain',
    tags: [...preset.tags],
    entries: sortCotEntriesDisplay(merged).map((e, i) => ({ ...e, order: i + 1 })),
  }
  saveCotPreset(next)
}

function saveEntryEdit(
  preset: CoTPreset,
  entryId: string,
  patch: { title: string; content: string },
): void {
  const merged = preset.entries.map((e) =>
    e.id === entryId
      ? {
          ...e,
          title: patch.title.trim().slice(0, 64) || e.title,
          content: patch.content.slice(0, 100_000),
          tags: [...(e.tags ?? [])],
        }
      : { ...e, tags: [...(e.tags ?? [])] },
  )
  const next: CoTPreset = {
    ...preset,
    kind: preset.kind ?? 'thinkingChain',
    tags: [...preset.tags],
    entries: sortCotEntriesDisplay(merged).map((e, i) => ({ ...e, order: i + 1 })),
  }
  saveCotPreset(next)
}

function savePresetName(preset: CoTPreset, name: string): void {
  const next: CoTPreset = {
    ...preset,
    name: name.trim().slice(0, 40) || preset.name,
    kind: preset.kind ?? 'thinkingChain',
    tags: [...preset.tags],
    entries: preset.entries.map((e) => ({ ...e, tags: [...(e.tags ?? [])] })),
  }
  saveCotPreset(next)
}

function EntryEditPanel({
  entry,
  onSave,
  onCancel,
}: {
  entry: CoTEntry
  onSave: (patch: { title: string; content: string }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(entry.title)
  const [content, setContent] = useState(entry.content)

  useEffect(() => {
    setTitle(entry.title)
    setContent(entry.content)
  }, [entry.id, entry.title, entry.content])

  const dirty =
    title.trim() !== entry.title.trim() || content !== entry.content

  return (
    <div
      className="mt-2 space-y-2 rounded-[12px] px-3 py-2.5"
      style={{
        background: cotTheme.editBg,
        border: `1px solid ${cotTheme.borderStrong}`,
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={64}
        placeholder="条目标题"
        className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-[13px] outline-none"
        style={{ borderColor: cotTheme.border, color: cotTheme.text }}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        placeholder="条目正文…"
        className="w-full resize-y rounded-lg border bg-white px-2.5 py-2 text-[12.5px] leading-relaxed outline-none"
        style={{ borderColor: cotTheme.border, color: cotTheme.text }}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[12px]"
          style={{ color: cotTheme.muted }}
        >
          取消
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onSave({ title, content })}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-40"
          style={{
            background: cotTheme.btnPrimaryBg,
            color: cotTheme.btnPrimaryText,
          }}
        >
          <Check size={14} strokeWidth={2.25} />
          保存
        </button>
      </div>
    </div>
  )
}

function KindBlock({
  kind,
  title,
  hint,
  scene,
}: {
  kind: CotPresetKind
  title: string
  hint: string
  scene: 'online' | 'offline'
}) {
  const store = useSyncExternalStore(
    subscribeCotStore,
    getCotStoreSnapshotForStore,
    getCotStoreSnapshotForStore,
  )
  const generalMode = isGeneralModeActive(kind, store)
  const ids = getKindActiveIds(store, kind)
  const activeId = scene === 'online' ? ids.online : ids.offline
  const activePreset =
    activeId === COT_SYSTEM_PRESET_ID
      ? null
      : store.presets.find((p) => p.id === activeId && (p.kind ?? 'thinkingChain') === kind) ??
        null

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [editingName, setEditingName] = useState(false)
  /** 默认收起：先方便切预设，需要时再展开条目 */
  const [entriesOpen, setEntriesOpen] = useState(false)

  useEffect(() => {
    setEditingEntryId(null)
    setEditingName(false)
    setEntriesOpen(false)
  }, [activeId, kind, scene])

  useEffect(() => {
    if (activePreset) setNameDraft(activePreset.name)
  }, [activePreset?.id, activePreset?.name])

  const switchable = useMemo(() => {
    return store.presets
      .filter(
        (p) =>
          (p.kind ?? 'thinkingChain') === kind &&
          (p.scope === 'both' || p.scope === scene),
      )
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [store.presets, kind, scene])

  const entries = useMemo(() => {
    if (!activePreset) return []
    return sortCotEntriesDisplay(activePreset.entries)
  }, [activePreset])

  const emptyHint =
    scene === 'offline'
      ? '暂无可用预设。可在桌面「文心」里新建通用 / 线下预设。'
      : '暂无可用预设。可在桌面「文心」里新建通用 / 线上预设。'

  return (
    <section className="mt-3">
      <h3 className="text-[14px] font-semibold" style={{ color: cotTheme.text }}>
        {title}
      </h3>
      <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: cotTheme.muted }}>
        {hint}
        {generalMode ? ' · 通用模式' : ''}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <p className="text-[12px]" style={{ color: cotTheme.muted }}>
          当前{SCENE_LABEL[scene]}：
          <span style={{ color: cotTheme.text, fontWeight: 600 }}>
            {activePreset ? activePreset.name : '系统默认'}
          </span>
        </p>
        {activePreset ? (
          <button
            type="button"
            onClick={() => {
              setEditingName((v) => !v)
              setNameDraft(activePreset.name)
            }}
            className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px]"
            style={{ color: cotTheme.muted }}
          >
            <Pencil size={11} />
            改名
          </button>
        ) : null}
      </div>

      {editingName && activePreset ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={40}
            className="min-w-0 flex-1 rounded-lg border bg-white px-2.5 py-1.5 text-[13px] outline-none"
            style={{ borderColor: cotTheme.border, color: cotTheme.text }}
          />
          <button
            type="button"
            onClick={() => {
              savePresetName(activePreset, nameDraft)
              setEditingName(false)
            }}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium"
            style={{
              background: cotTheme.btnPrimaryBg,
              color: cotTheme.btnPrimaryText,
            }}
          >
            保存
          </button>
        </div>
      ) : null}

      <div className="mt-2 mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: cotTheme.text }}>
          切换预设
        </span>
        <button
          type="button"
          onClick={() => activateSystemForScene(scene, kind)}
          className="rounded-lg px-2 py-1 text-[11px] font-medium"
          style={{
            background:
              activeId === COT_SYSTEM_PRESET_ID ? cotTheme.goldSoft : cotTheme.card,
            color: cotTheme.text,
            border: `1px solid ${
              activeId === COT_SYSTEM_PRESET_ID
                ? cotTheme.borderStrong
                : cotTheme.border
            }`,
          }}
        >
          系统默认
        </button>
      </div>

      {!switchable.length ? (
        <p className="py-2 text-[12px]" style={{ color: cotTheme.muted }}>
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {switchable.map((p) => {
            const on = activeId === p.id
            const showEntries = on && entriesOpen
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (on) {
                      setEntriesOpen((v) => !v)
                      if (entriesOpen) setEditingEntryId(null)
                      return
                    }
                    activateCotPreset(p.id)
                  }}
                  className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left"
                  style={{
                    background: on ? cotTheme.goldSoft : cotTheme.card,
                    border: `1px solid ${on ? cotTheme.borderStrong : cotTheme.border}`,
                  }}
                  aria-expanded={on ? entriesOpen : undefined}
                >
                  <span
                    className="flex size-4 shrink-0 items-center justify-center rounded-full"
                    style={{
                      border: `1.5px solid ${on ? cotTheme.gold : '#C9BFB0'}`,
                      background: on ? cotTheme.gold : 'transparent',
                    }}
                    aria-hidden
                  >
                    {on ? <span className="size-1.5 rounded-full bg-white" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[13px] font-medium"
                      style={{ color: cotTheme.text }}
                    >
                      {p.name}
                    </span>
                    <span className="text-[10px]" style={{ color: cotTheme.muted }}>
                      {SCOPE_LABEL[p.scope] ?? p.scope} ·{' '}
                      {p.entries.filter((e) => e.enabled).length}/{p.entries.length} 条目开
                    </span>
                  </span>
                  {on ? (
                    entriesOpen ? (
                      <ChevronUp size={16} style={{ color: cotTheme.muted }} />
                    ) : (
                      <ChevronDown size={16} style={{ color: cotTheme.muted }} />
                    )
                  ) : null}
                </button>

                {showEntries ? (
                  !entries.length ? (
                    <p className="px-1 py-2 text-[12px]" style={{ color: cotTheme.muted }}>
                      「{p.name}」里还没有条目。可在桌面「文心」里添加。
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1.5 pl-1">
                      {entries.map((e, i) => {
                        const expanded = editingEntryId === e.id
                        return (
                          <li key={e.id}>
                            <div
                              className="flex items-center gap-2 rounded-[12px] px-3 py-2.5"
                              style={{
                                background: cotTheme.card,
                                border: `1px solid ${
                                  expanded ? cotTheme.borderStrong : cotTheme.border
                                }`,
                                opacity: e.enabled || expanded ? 1 : cotTheme.disabledOpacity,
                              }}
                            >
                              <span
                                className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-bold tracking-wide"
                                style={{
                                  background: e.enabled ? cotTheme.goldSoft : '#F0EBE1',
                                  color: e.enabled ? '#9A7B3C' : '#B5A995',
                                  fontFamily: cotTheme.sans,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <button
                                type="button"
                                className="min-w-0 flex-1 text-left"
                                onClick={() =>
                                  setEditingEntryId((cur) => (cur === e.id ? null : e.id))
                                }
                              >
                                <p
                                  className="truncate text-[13px] font-medium"
                                  style={{ color: cotTheme.text }}
                                >
                                  {e.title.trim() || `条目 ${i + 1}`}
                                </p>
                                <p className="text-[10px]" style={{ color: cotTheme.muted }}>
                                  {expanded ? '收起编辑' : '点此编辑正文'}
                                </p>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingEntryId((cur) => (cur === e.id ? null : e.id))
                                }
                                className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                                style={{ color: cotTheme.muted }}
                                aria-label={expanded ? '收起编辑' : '编辑条目'}
                              >
                                {expanded ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </button>
                              <CotCapsuleSwitch
                                checked={e.enabled}
                                onChange={(enabled) =>
                                  setEntryEnabled(activePreset!, e.id, enabled)
                                }
                                aria-label={e.enabled ? '关闭条目' : '开启条目'}
                              />
                            </div>
                            {expanded && activePreset ? (
                              <EntryEditPanel
                                entry={e}
                                onCancel={() => setEditingEntryId(null)}
                                onSave={(patch) => {
                                  saveEntryEdit(activePreset, e.id, patch)
                                  setEditingEntryId(null)
                                }}
                              />
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function CotQuickAdjustSheet({
  open,
  onClose,
  scene = 'online',
}: {
  open: boolean
  onClose: () => void
  /** 聊天页=线上；约会剧情=线下 */
  scene?: 'online' | 'offline'
}) {
  const replyHint =
    scene === 'offline'
      ? '线下：替换扮演/写作，并覆盖沙盒与禁词硬钉；约会输出壳与场控仍生效。'
      : '线上：替换扮演主壳（沙盒与格式仍保留）。'
  const cotHint =
    scene === 'offline'
      ? '需在场控中心开启「思维链」后才会注入。'
      : '需开启聊天「思维链」开关后才会注入。'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key={`cot-quick-${scene}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[270] flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(6px)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex max-h-[78vh] flex-col overflow-hidden rounded-t-[20px]"
            style={{
              background: cotTheme.bg,
              paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3.5"
              style={{ borderBottom: `1px solid ${cotTheme.border}` }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="text-[10px] tracking-[0.18em]"
                  style={{ color: cotTheme.muted, fontFamily: cotTheme.serif }}
                >
                  PROMPT & COT · {SCENE_LABEL[scene].toUpperCase()}
                </p>
                <h2
                  className="text-[17px] font-semibold"
                  style={{ color: cotTheme.text, fontFamily: cotTheme.sans }}
                >
                  文心 · {SCENE_LABEL[scene]}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-xl"
                style={{
                  background: cotTheme.btnSecondaryBg,
                  border: `1.5px solid ${cotTheme.btnSecondaryBorder}`,
                  color: cotTheme.text,
                }}
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-1">
              <KindBlock
                kind="replyStyle"
                title="自定义提示词"
                hint={replyHint}
                scene={scene}
              />
              <KindBlock
                kind="thinkingChain"
                title="自定义思维链"
                hint={cotHint}
                scene={scene}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
