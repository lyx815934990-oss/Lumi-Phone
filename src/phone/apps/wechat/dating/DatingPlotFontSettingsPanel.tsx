import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Type } from 'lucide-react'
import {
  applyDatingPlotFontPreset,
  applyDatingPlotFontToAllRegions,
  createEmptyDatingPlotFontSettings,
  deleteDatingPlotFontPreset,
  isDatingPlotFontGlobal,
  newDatingPlotFontAssetId,
  newDatingPlotFontFamily,
  normalizeDatingPlotFontSettings,
  regionUsesAsset,
  removeDatingPlotFontLibraryItem,
  renameDatingPlotFontLibraryItem,
  saveDatingPlotFontPreset,
  setDatingPlotFontAsGlobal,
  setDatingPlotFontRegionExclusive,
  summarizeDatingPlotFontSettings,
  type DatingPlotFontLibraryItem,
  type DatingPlotFontRegion,
  type DatingPlotFontSettings,
} from './datingPlotFontSettings'
import {
  deleteDatingPlotFontDataUrl,
  persistDatingPlotFontDataUrl,
} from './datingPlotFontPersist'

const ACCEPT =
  '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/font-woff,application/font-woff2,application/x-font-ttf,application/x-font-otf'

const REGION_OPTS: { id: DatingPlotFontRegion; label: string }[] = [
  { id: 'narrative', label: '正文' },
  { id: 'dialogue', label: '对白' },
  { id: 'innerOs', label: '内心OS' },
]

type FontTab = 'library' | 'apply' | 'presets'

function stripExt(name: string): string {
  return name.replace(/\.(ttf|otf|woff2?)$/i, '').trim() || '自定义字体'
}

function LibraryTab({
  characterId,
  settings,
  dataUrlById,
  onChange,
  onDataUrlChange,
}: {
  characterId: string
  settings: DatingPlotFontSettings
  dataUrlById: Record<string, string>
  onChange: (next: DatingPlotFontSettings) => void
  onDataUrlChange: (next: Record<string, string>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const onPick = (file: File | undefined) => {
    if (!file) return
    const cid = characterId.trim()
    if (!cid) {
      setErr('缺少角色 id')
      return
    }
    setBusy(true)
    setErr(null)
    const reader = new FileReader()
    reader.onload = () => {
      void (async () => {
        try {
          if (typeof reader.result !== 'string' || !reader.result.trim()) {
            throw new Error('读取字体失败')
          }
          const id = newDatingPlotFontAssetId()
          const family = newDatingPlotFontFamily()
          await persistDatingPlotFontDataUrl(cid, id, reader.result)
          const fileName = file.name || '自定义字体'
          const item: DatingPlotFontLibraryItem = {
            id,
            family,
            fileName,
            displayName: stripExt(fileName),
          }
          const withLib: DatingPlotFontSettings = {
            ...settings,
            library: [...settings.library, item],
          }
          // 首个字体：直接设为全局（清空分区覆盖 + 开启跟随），避免「库里有衬线却仍显示黑体」
          const next =
            settings.library.length === 0
              ? setDatingPlotFontAsGlobal(withLib, id)
              : withLib
          onDataUrlChange({ ...dataUrlById, [id]: reader.result })
          onChange(next)
        } catch (e) {
          setErr(e instanceof Error ? e.message : '上传失败')
        } finally {
          setBusy(false)
        }
      })()
    }
    reader.onerror = () => {
      setBusy(false)
      setErr('读取字体失败')
    }
    reader.readAsDataURL(file)
  }

  const removeItem = (assetId: string) => {
    void (async () => {
      await deleteDatingPlotFontDataUrl(characterId, assetId)
      const nextMap = { ...dataUrlById }
      delete nextMap[assetId]
      onDataUrlChange(nextMap)
      onChange(removeDatingPlotFontLibraryItem(settings, assetId))
    })()
  }

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[12px] leading-relaxed text-[#8e8e8e]">
        在此上传并存放字体文件，可自定义显示名称。应用与预设在另外两个页签设置。
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-xl bg-neutral-900 px-3.5 py-2 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {busy ? '上传中…' : '上传到字体库'}
        </button>
        <span className="text-[11px] text-[#a3a3a3]">.ttf / .otf / .woff / .woff2</span>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {err ? <p className="text-[12px] text-red-600">{err}</p> : null}

      {!settings.library.length ? (
        <div className="rounded-xl border border-dashed border-[#e0e0e0] bg-[#fafafa] px-3 py-4 text-center text-[12px] text-[#9a9a9a]">
          字体库为空
        </div>
      ) : (
        <ul className="space-y-2.5">
          {settings.library.map((a) => {
            const editing = editingId === a.id
            return (
              <li key={a.id} className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3 py-2.5">
                {editing ? (
                  <div className="space-y-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value.slice(0, 40))}
                      className="h-9 w-full rounded-[10px] border border-[#e5e5e5] bg-white px-3 text-[13px] text-[#1a1a1a] outline-none focus:border-[#cfcfcf]"
                      placeholder="字体显示名"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1 text-[12px] text-[#6a6a6a]"
                        onClick={() => setEditingId(null)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[#2a2a2a] px-2.5 py-1 text-[12px] text-white"
                        onClick={() => {
                          onChange(renameDatingPlotFontLibraryItem(settings, a.id, editName))
                          setEditingId(null)
                        }}
                      >
                        保存名称
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#1a1a1a]">{a.displayName}</p>
                        <p className="mt-0.5 truncate text-[10px] text-[#a3a3a3]">
                          {dataUrlById[a.id] ? `文件 · ${a.fileName}` : '文件缺失 · 请重新上传'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-[11px] text-[#525252] active:bg-[#ececec]"
                          onClick={() => {
                            setEditingId(a.id)
                            setEditName(a.displayName)
                          }}
                        >
                          改名
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-[11px] text-[#8a8a8a] active:bg-[#ececec]"
                          onClick={() => removeItem(a.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ApplyTab({
  settings,
  dataUrlById,
  onChange,
  onToast,
}: {
  settings: DatingPlotFontSettings
  dataUrlById: Record<string, string>
  onChange: (next: DatingPlotFontSettings) => void
  onToast: (msg: string) => void
}) {
  const [presetName, setPresetName] = useState('')

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[12px] leading-relaxed text-[#8e8e8e]">
        「设为全局字体」会清空正文/对白/内心的分区覆盖，并开启跟随——三区都会用该字体。若只勾选某一区，则该区优先用勾选字体，其余区仍跟随全局。
      </p>

      <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#1a1a1a]">跟随全局字体</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[#8e8e8e]">
            关闭后，未指定区域使用系统默认
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.followGlobal}
          onClick={() => onChange({ ...settings, followGlobal: !settings.followGlobal })}
          className={`relative h-8 w-[52px] shrink-0 rounded-full p-1 transition-colors ${
            settings.followGlobal ? 'bg-[#1a1a1a]' : 'bg-[#cccccc]'
          }`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              settings.followGlobal ? 'translate-x-[20px]' : 'translate-x-0'
            }`}
          />
        </button>
      </label>

      {!settings.library.length ? (
        <div className="rounded-xl border border-dashed border-[#e0e0e0] bg-[#fafafa] px-3 py-4 text-center text-[12px] text-[#9a9a9a]">
          请先在「字体库」上传字体
        </div>
      ) : (
        <ul className="space-y-2.5">
          {settings.library.map((a) => {
            const isGlobal = isDatingPlotFontGlobal(settings, a.id)
            const missing = !dataUrlById[a.id]?.trim()
            return (
              <li key={a.id} className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3 py-2.5">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-medium text-[#1a1a1a]">{a.displayName}</p>
                  {isGlobal ? (
                    <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-medium text-white">
                      全局
                    </span>
                  ) : null}
                  {missing ? (
                    <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] text-[#b91c1c]">
                      文件缺失
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {REGION_OPTS.map((r) => {
                    const on = regionUsesAsset(settings, a.id, r.id)
                    return (
                      <label
                        key={r.id}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
                          on
                            ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                            : 'border-[#e0e0e0] bg-white text-[#525252]'
                        } ${missing ? 'opacity-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          disabled={missing}
                          checked={on}
                          onChange={(e) => {
                            onChange(
                              setDatingPlotFontRegionExclusive(settings, a.id, r.id, e.target.checked),
                            )
                          }}
                        />
                        {r.label}
                      </label>
                    )
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={missing}
                    className="text-[11px] text-[#6a6a6a] underline decoration-dotted underline-offset-2 disabled:opacity-40"
                    onClick={() => {
                      onChange(setDatingPlotFontAsGlobal(settings, a.id))
                      onToast('已设为全局：三区将跟随该字体')
                    }}
                  >
                    设为全局字体
                  </button>
                  <button
                    type="button"
                    disabled={missing}
                    className="text-[11px] text-[#6a6a6a] underline decoration-dotted underline-offset-2 disabled:opacity-40"
                    onClick={() => onChange(applyDatingPlotFontToAllRegions(settings, a.id))}
                  >
                    应用到全部三个区域
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="rounded-xl border border-[#e8e8e8] bg-white px-3 py-2.5">
        <p className="text-[12px] font-medium text-[#333]">保存为预设</p>
        <div className="mt-2 flex gap-2">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value.slice(0, 40))}
            placeholder="预设名称，如：剧情柔和"
            className="h-9 min-w-0 flex-1 rounded-[10px] border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#cfcfcf]"
          />
          <button
            type="button"
            className="shrink-0 rounded-xl bg-[#2a2a2a] px-3 text-[12px] font-medium text-white disabled:opacity-40"
            disabled={!presetName.trim()}
            onClick={() => {
              onChange(saveDatingPlotFontPreset(settings, presetName))
              setPresetName('')
              onToast('预设已保存')
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function PresetsTab({
  settings,
  dataUrlById,
  onChange,
  onToast,
}: {
  settings: DatingPlotFontSettings
  dataUrlById: Record<string, string>
  onChange: (next: DatingPlotFontSettings) => void
  onToast: (msg: string) => void
}) {
  return (
    <div className="space-y-3 pt-1">
      <p className="text-[12px] leading-relaxed text-[#8e8e8e]">
        点击预设可直接套用对应字体分配；若引用的字体已从字体库删除或文件丢失，将提示无法应用。
      </p>
      {!settings.presets.length ? (
        <div className="rounded-xl border border-dashed border-[#e0e0e0] bg-[#fafafa] px-3 py-4 text-center text-[12px] text-[#9a9a9a]">
          暂无预设 · 在「应用」页签保存
        </div>
      ) : (
        <ul className="space-y-2">
          {settings.presets.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[#1a1a1a]">{p.name}</p>
                <p className="mt-0.5 text-[10px] text-[#a3a3a3]">
                  {[
                    p.narrativeAssetId ? '正文' : null,
                    p.dialogueAssetId ? '对白' : null,
                    p.innerOsAssetId ? '内心' : null,
                    p.globalAssetId ? '全局' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '未分配'}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full bg-[#2a2a2a] px-3 py-1 text-[11px] font-medium text-white"
                onClick={() => {
                  const result = applyDatingPlotFontPreset(settings, p.id, dataUrlById)
                  if (!result.ok) {
                    onToast(result.reason)
                    return
                  }
                  onChange(result.settings)
                  onToast(`已应用「${p.name}」`)
                }}
              >
                应用
              </button>
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-[#8a8a8a]"
                onClick={() => onChange(deleteDatingPlotFontPreset(settings, p.id))}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DatingPlotFontSettingsFields({
  characterId,
  value,
  dataUrlById,
  onChange,
  onDataUrlChange,
}: {
  characterId: string
  value: DatingPlotFontSettings
  dataUrlById: Record<string, string>
  onChange: (next: DatingPlotFontSettings) => void
  onDataUrlChange: (next: Record<string, string>) => void
}) {
  const settings = normalizeDatingPlotFontSettings(value)
  const [tab, setTab] = useState<FontTab>('library')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const tabs: { id: FontTab; label: string }[] = [
    { id: 'library', label: '字体库' },
    { id: 'apply', label: '应用' },
    { id: 'presets', label: '预设' },
  ]

  return (
    <div className="space-y-3 pt-1">
      <div className="flex gap-1 rounded-full bg-[#ebebeb] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`flex-1 rounded-full py-1.5 text-[12px] font-medium transition-colors ${
              tab === t.id ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#6a6a6a]'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {toast ? (
        <p className="rounded-lg bg-[#1a1a1a] px-3 py-2 text-center text-[12px] text-white">{toast}</p>
      ) : null}
      {tab === 'library' ? (
        <LibraryTab
          characterId={characterId}
          settings={settings}
          dataUrlById={dataUrlById}
          onChange={onChange}
          onDataUrlChange={onDataUrlChange}
        />
      ) : null}
      {tab === 'apply' ? (
        <ApplyTab
          settings={settings}
          dataUrlById={dataUrlById}
          onChange={onChange}
          onToast={setToast}
        />
      ) : null}
      {tab === 'presets' ? (
        <PresetsTab
          settings={settings}
          dataUrlById={dataUrlById}
          onChange={onChange}
          onToast={setToast}
        />
      ) : null}
    </div>
  )
}

export function DatingPlotFontSettingsButton({
  characterId,
  value,
  dataUrlById,
  onChange,
  onDataUrlChange,
  className = '',
  iconOnly = false,
}: {
  characterId: string
  value: DatingPlotFontSettings
  dataUrlById: Record<string, string>
  onChange: (next: DatingPlotFontSettings) => void
  onDataUrlChange: (next: Record<string, string>) => void
  className?: string
  iconOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const settings = normalizeDatingPlotFontSettings(value)
  const summary = summarizeDatingPlotFontSettings(settings)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const panel: ReactNode = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 px-4"
          style={{
            paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[min(85dvh,640px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-[18px] border border-[#e4e4e4] bg-[#f4f4f4] shadow-[0_20px_50px_rgba(0,0,0,0.16)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e0e0e0] bg-[#f0f0f0] px-4 py-3">
              <div className="min-w-0">
                <p id={titleId} className="text-[16px] font-semibold tracking-wide text-[#1a1a1a]">
                  剧情字体
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#8a8a8a]">{summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg bg-[#2a2a2a] px-3 py-1.5 text-[13px] font-medium text-[#f5f5f5]"
              >
                完成
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f4f4f4] px-3 pb-3">
              <DatingPlotFontSettingsFields
                characterId={characterId}
                value={settings}
                dataUrlById={dataUrlById}
                onChange={onChange}
                onDataUrlChange={onDataUrlChange}
              />
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`剧情字体 · ${summary}`}
        className={
          iconOnly
            ? `inline-flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50 p-2 text-[#262626] transition-all duration-200 hover:border-stone-400 ${className}`
            : `inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[13px] text-[#262626] transition-all duration-200 hover:border-stone-400 ${className}`
        }
      >
        <Type className="size-4" strokeWidth={1.75} />
        {iconOnly ? null : <span>字体</span>}
      </button>
      {panel}
    </>
  )
}

export { createEmptyDatingPlotFontSettings, normalizeDatingPlotFontSettings }
