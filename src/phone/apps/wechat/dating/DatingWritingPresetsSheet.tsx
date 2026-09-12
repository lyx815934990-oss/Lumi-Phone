import { AnimatePresence, motion } from 'framer-motion'
import { Check, PenLine, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { DatingCapsuleSwitch } from './DatingCapsuleSwitch'
import {
  createDatingCustomWritingEntry,
  createEmptyDatingCustomWritingPreset,
  DATING_WRITING_SYSTEM_PRESET_ID,
  deleteDatingCustomWritingPreset,
  getDatingWritingPresetsSnapshotForStore,
  saveDatingCustomWritingPreset,
  setActiveDatingWritingPresetId,
  subscribeDatingWritingPresets,
  type DatingCustomWritingEntry,
  type DatingCustomWritingPreset,
} from './datingWritingPresetStore'

type Props = {
  open: boolean
  onClose: () => void
  themeStyle?: CSSProperties
}

type EditorState = {
  preset: DatingCustomWritingPreset
  isNew: boolean
}

function clonePreset(p: DatingCustomWritingPreset): DatingCustomWritingPreset {
  return {
    ...p,
    entries: p.entries.map((e) => ({ ...e })),
  }
}

/** 约会页 · 写作预设：系统默认 / 自定义多预设切换与编辑 */
export function DatingWritingPresetsSheet({ open, onClose, themeStyle }: Props) {
  const store = useSyncExternalStore(
    subscribeDatingWritingPresets,
    getDatingWritingPresetsSnapshotForStore,
    getDatingWritingPresetsSnapshotForStore,
  )
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [saveHint, setSaveHint] = useState('')

  useEffect(() => {
    if (!open) {
      setEditor(null)
      setSaveHint('')
    }
  }, [open])

  const activeName =
    store.activeId === DATING_WRITING_SYSTEM_PRESET_ID
      ? '系统默认'
      : store.presets.find((p) => p.id === store.activeId)?.name ?? '自定义'

  const onSave = (activate: boolean) => {
    if (!editor) return
    const name = editor.preset.name.trim()
    if (!name) {
      setSaveHint('请填写预设名称')
      return
    }
    const saved = saveDatingCustomWritingPreset(
      { ...editor.preset, name },
      { activate },
    )
    if (!saved) {
      setSaveHint('保存失败（可能已达数量上限）')
      return
    }
    setSaveHint(activate ? '已保存并启用' : '已保存')
    setEditor(null)
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="关闭遮罩"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dating-writing-presets-title"
            className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] shadow-2xl sm:rounded-2xl"
            style={{
              ...themeStyle,
              maxHeight: 'min(86dvh, 760px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--sr-border)]" />
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--sr-border)] px-4 py-3">
              <div className="min-w-0">
                <p
                  id="dating-writing-presets-title"
                  className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-[var(--sr-text)]"
                >
                  <PenLine className="size-4 shrink-0 text-[var(--sr-gold)]" aria-hidden />
                  {editor ? '编辑写作预设' : '写作预设'}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--sr-text-muted)]">
                  {editor
                    ? '自定义条目标题、正文与开关；启用后完全按本预设注入，不再用系统内置线下提示词。'
                    : `当前：${activeName}。系统默认=内置线下规则；自定义=只注入你写的条目。`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (editor) {
                    setEditor(null)
                    setSaveHint('')
                    return
                  }
                  onClose()
                }}
                className="rounded-full p-1.5 text-[var(--sr-text-muted)] transition-colors hover:bg-[var(--sr-glass)] hover:text-[var(--sr-text)]"
                aria-label={editor ? '返回列表' : '关闭'}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:thin]">
              {editor ? (
                <PresetEditor
                  preset={editor.preset}
                  saveHint={saveHint}
                  onChange={(next) => setEditor({ ...editor, preset: next })}
                  onSave={onSave}
                  onCancel={() => {
                    setEditor(null)
                    setSaveHint('')
                  }}
                />
              ) : (
                <>
                  <section>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sr-text-faint)]">
                      选用
                    </p>
                    <ul className="space-y-1.5">
                      <li>
                        <PresetPickRow
                          title="系统默认"
                          desc="内置线下提示词（壳、沙盒、扮演核心、通道/神态/禁词等），默认全开。"
                          active={store.activeId === DATING_WRITING_SYSTEM_PRESET_ID}
                          onSelect={() =>
                            setActiveDatingWritingPresetId(DATING_WRITING_SYSTEM_PRESET_ID)
                          }
                        />
                      </li>
                      {store.presets.map((p) => {
                        const onCount = p.entries.filter((e) => e.enabled).length
                        return (
                          <li key={p.id}>
                            <PresetPickRow
                              title={p.name}
                              desc={`${onCount}/${p.entries.length} 条开启 · 点选用后仅注入自定义内容`}
                              active={store.activeId === p.id}
                              onSelect={() => setActiveDatingWritingPresetId(p.id)}
                              onEdit={() =>
                                setEditor({ preset: clonePreset(p), isNew: false })
                              }
                              onDelete={() => {
                                if (
                                  typeof window !== 'undefined' &&
                                  !window.confirm(`删除预设「${p.name}」？`)
                                ) {
                                  return
                                }
                                deleteDatingCustomWritingPreset(p.id)
                              }}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  </section>

                  <button
                    type="button"
                    onClick={() =>
                      setEditor({
                        preset: createEmptyDatingCustomWritingPreset(),
                        isNew: true,
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-3 text-[13px] font-medium text-[var(--sr-text)] transition-colors hover:border-[var(--sr-gold)]/50 hover:text-[var(--sr-gold)]"
                  >
                    <Plus className="size-4" aria-hidden />
                    新建自定义预设
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function PresetPickRow({
  title,
  desc,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  title: string
  desc: string
  active: boolean
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        active
          ? 'border-[var(--sr-gold)]/55 bg-[var(--sr-gold)]/10'
          : 'border-[var(--sr-border)] bg-[var(--sr-panel)]'
      }`}
    >
      <div className="flex items-start gap-2">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--sr-text)]">
            {title}
            {active ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--sr-gold)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--sr-gold)]">
                <Check className="size-3" aria-hidden />
                使用中
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--sr-text-muted)]">{desc}</p>
        </button>
        {onEdit || onDelete ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg px-2 py-1 text-[11px] text-[var(--sr-text-muted)] hover:bg-[var(--sr-glass)] hover:text-[var(--sr-text)]"
              >
                编辑
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1.5 text-[var(--sr-text-muted)] hover:bg-red-500/10 hover:text-red-400"
                aria-label={`删除 ${title}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PresetEditor({
  preset,
  saveHint,
  onChange,
  onSave,
  onCancel,
}: {
  preset: DatingCustomWritingPreset
  saveHint: string
  onChange: (next: DatingCustomWritingPreset) => void
  onSave: (activate: boolean) => void
  onCancel: () => void
}) {
  const updateEntry = (id: string, patch: Partial<DatingCustomWritingEntry>) => {
    onChange({
      ...preset,
      entries: preset.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })
  }

  const removeEntry = (id: string) => {
    onChange({
      ...preset,
      entries: preset.entries.filter((e) => e.id !== id),
    })
  }

  const addEntry = () => {
    onChange({
      ...preset,
      entries: [...preset.entries, createDatingCustomWritingEntry()],
    })
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-[var(--sr-text-muted)]">预设名称</span>
        <input
          value={preset.name}
          onChange={(e) => onChange({ ...preset, name: e.target.value })}
          className="w-full rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2 text-[13px] text-[var(--sr-text)] outline-none focus:border-[var(--sr-gold)]/60"
          placeholder="例如：白描短句风"
          maxLength={32}
        />
      </label>

      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--sr-text-faint)]">
          条目（可开关）
        </p>
        {preset.entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--sr-border)] px-3 py-4 text-center text-[12px] text-[var(--sr-text-muted)]">
            还没有条目。添加后可分别开关与编辑正文。
          </p>
        ) : null}
        {preset.entries.map((entry, index) => (
          <div
            key={entry.id}
            className="space-y-2 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] p-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={entry.title}
                onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-2.5 py-1.5 text-[13px] text-[var(--sr-text)] outline-none focus:border-[var(--sr-gold)]/50"
                placeholder={`条目 ${index + 1} 标题`}
                maxLength={48}
              />
              <DatingCapsuleSwitch
                variant="story"
                checked={entry.enabled}
                onToggle={() => updateEntry(entry.id, { enabled: !entry.enabled })}
              />
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                className="rounded-lg p-1.5 text-[var(--sr-text-muted)] hover:bg-red-500/10 hover:text-red-400"
                aria-label="删除条目"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <textarea
              value={entry.content}
              onChange={(e) => updateEntry(entry.id, { content: e.target.value })}
              rows={5}
              className="w-full resize-y rounded-lg border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-2.5 py-2 text-[12px] leading-relaxed text-[var(--sr-text)] outline-none focus:border-[var(--sr-gold)]/50"
              placeholder="写入该条目的提示词正文…"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addEntry}
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--sr-border)] px-3 py-2.5 text-[12px] text-[var(--sr-text-muted)] hover:border-[var(--sr-gold)]/40 hover:text-[var(--sr-gold)]"
        >
          <Plus className="size-3.5" aria-hidden />
          添加条目
        </button>
      </div>

      {saveHint ? (
        <p className="text-center text-[11px] text-[var(--sr-gold)]">{saveHint}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 pb-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[var(--sr-border)] px-3 py-2 text-[12px] text-[var(--sr-text-muted)] hover:bg-[var(--sr-glass)]"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => onSave(false)}
          className="rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2 text-[12px] font-medium text-[var(--sr-text)] hover:border-[var(--sr-gold)]/40"
        >
          仅保存
        </button>
        <button
          type="button"
          onClick={() => onSave(true)}
          className="ml-auto rounded-xl bg-[var(--sr-gold)] px-3 py-2 text-[12px] font-semibold text-stone-900 hover:opacity-90"
        >
          保存并使用
        </button>
      </div>
    </div>
  )
}
