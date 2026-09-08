import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Type } from 'lucide-react'
import { BottomSheet } from '../../../../storyRpg/components/ui/BottomSheet'
import {
  applyDatingPlotFontPreset,
  applyDatingPlotFontToAllRegions,
  clampDatingPlotFontSizePx,
  createEmptyDatingPlotFontSettings,
  DATING_PLOT_FONT_SIZE_DEFAULT,
  DATING_PLOT_FONT_SIZE_MAX,
  DATING_PLOT_FONT_SIZE_MIN,
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
      <p className="text-[12px] leading-relaxed text-[var(--sr-text-muted)]">
        在此上传并存放字体文件，可自定义显示名称。应用与预设在另外两个页签设置。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-xl bg-[var(--sr-gold)] px-3.5 py-2 text-[13px] font-medium text-[var(--sr-gold-on)] shadow-[0_2px_10px_var(--sr-gold-glow)] disabled:opacity-50"
        >
          {busy ? '上传中…' : '上传到字体库'}
        </button>
        <span className="text-[11px] text-[var(--sr-text-faint)]">.ttf / .otf / .woff / .woff2</span>
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
      {err ? <p className="text-[12px] text-[var(--ds-danger,#d08080)]">{err}</p> : null}

      {!settings.library.length ? (
        <div className="rounded-xl border border-dashed border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-8 text-center text-[12px] text-[var(--sr-text-faint)]">
          字体库为空
        </div>
      ) : (
        <ul className="space-y-2.5">
          {settings.library.map((a) => {
            const editing = editingId === a.id
            return (
              <li
                key={a.id}
                className="rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5"
              >
                {editing ? (
                  <div className="space-y-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value.slice(0, 40))}
                      className="h-9 w-full rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 text-[13px] text-[var(--sr-text)] outline-none placeholder:text-[var(--sr-text-faint)] focus:border-[var(--sr-gold)]/45"
                      placeholder="字体显示名"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1 text-[12px] text-[var(--sr-text-muted)] hover:text-[var(--sr-text)]"
                        onClick={() => setEditingId(null)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--sr-gold)] px-2.5 py-1 text-[12px] font-medium text-[var(--sr-gold-on)]"
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[var(--sr-text)]">
                        {a.displayName}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-[var(--sr-text-faint)]">
                        {dataUrlById[a.id] ? `文件 · ${a.fileName}` : '文件缺失 · 请重新上传'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--sr-border)] px-2 py-1 text-[11px] text-[var(--sr-text-soft)] hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-text)]"
                        onClick={() => {
                          setEditingId(a.id)
                          setEditName(a.displayName)
                        }}
                      >
                        改名
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-[11px] text-[var(--sr-text-muted)] hover:text-[var(--ds-danger,#d08080)]"
                        onClick={() => removeItem(a.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
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
      <p className="text-[12px] leading-relaxed text-[var(--sr-text-muted)]">
        「设为全局字体」会清空正文/对白/内心的分区覆盖，并开启跟随——三区都会用该字体。若只勾选某一区，则该区优先用勾选字体，其余区仍跟随全局。上方「剧情字号」滑杆会统一放大旁白、对白与内心，保存预设时一并记下。
      </p>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--sr-text)]">跟随全局字体</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--sr-text-muted)]">
            关闭后，未指定区域使用系统默认
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.followGlobal}
          onClick={() => onChange({ ...settings, followGlobal: !settings.followGlobal })}
          className={`relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-full transition-colors ${
            settings.followGlobal ? 'bg-[var(--sr-gold)]' : 'bg-[var(--sr-border)]'
          }`}
        >
          <span
            className={`inline-block size-[20px] rounded-full bg-[var(--sr-gold-on,#0f0f13)] shadow transition-transform ${
              settings.followGlobal ? 'translate-x-[21px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </label>

      {!settings.library.length ? (
        <div className="rounded-xl border border-dashed border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-8 text-center text-[12px] text-[var(--sr-text-faint)]">
          请先在「字体库」上传字体
        </div>
      ) : (
        <ul className="space-y-2.5">
          {settings.library.map((a) => {
            const isGlobal = isDatingPlotFontGlobal(settings, a.id)
            const missing = !dataUrlById[a.id]?.trim()
            return (
              <li
                key={a.id}
                className="rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-medium text-[var(--sr-text)]">{a.displayName}</p>
                  {isGlobal ? (
                    <span className="rounded-full bg-[var(--sr-gold)] px-2 py-0.5 text-[10px] font-medium text-[var(--sr-gold-on)]">
                      全局
                    </span>
                  ) : null}
                  {missing ? (
                    <span className="rounded-full border border-[var(--ds-danger,#d08080)]/35 bg-[var(--ds-danger,#d08080)]/15 px-2 py-0.5 text-[10px] text-[var(--ds-danger,#d08080)]">
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
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                          on
                            ? 'border-[var(--sr-gold)] bg-[var(--sr-gold)] text-[var(--sr-gold-on)]'
                            : 'border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] text-[var(--sr-text-soft)] hover:border-[var(--sr-gold)]/35'
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
                    className="text-[11px] text-[var(--sr-text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--sr-gold)] disabled:opacity-40"
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
                    className="text-[11px] text-[var(--sr-text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--sr-gold)] disabled:opacity-40"
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

      <div className="rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5">
        <p className="text-[12px] font-medium text-[var(--sr-text)]">保存为预设</p>
        <div className="mt-2 flex gap-2">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value.slice(0, 40))}
            placeholder="预设名称，如：剧情柔和"
            className="h-9 min-w-0 flex-1 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 text-[13px] text-[var(--sr-text)] outline-none placeholder:text-[var(--sr-text-faint)] focus:border-[var(--sr-gold)]/45"
          />
          <button
            type="button"
            className="shrink-0 rounded-xl bg-[var(--sr-gold)] px-3 text-[12px] font-medium text-[var(--sr-gold-on)] disabled:opacity-40"
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
      <p className="text-[12px] leading-relaxed text-[var(--sr-text-muted)]">
        点击预设可直接套用对应字体分配；若引用的字体已从字体库删除或文件丢失，将提示无法应用。
      </p>
      {!settings.presets.length ? (
        <div className="rounded-xl border border-dashed border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-8 text-center text-[12px] text-[var(--sr-text-faint)]">
          暂无预设 · 在「应用」页签保存
        </div>
      ) : (
        <ul className="space-y-2">
          {settings.presets.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--sr-text)]">{p.name}</p>
                <p className="mt-0.5 text-[10px] text-[var(--sr-text-faint)]">
                  {[
                    p.narrativeAssetId ? '正文' : null,
                    p.dialogueAssetId ? '对白' : null,
                    p.innerOsAssetId ? '内心' : null,
                    p.globalAssetId ? '全局' : null,
                    `${clampDatingPlotFontSizePx(p.baseFontSizePx ?? DATING_PLOT_FONT_SIZE_DEFAULT)}px`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '未分配'}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full bg-[var(--sr-gold)] px-3 py-1 text-[11px] font-medium text-[var(--sr-gold-on)]"
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
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-[var(--sr-text-muted)] hover:text-[var(--ds-danger,#d08080)]"
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
      <div className="rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--sr-text)]">剧情字号</p>
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--sr-text-muted)]">
              正文 / 对白 / 内心统一字号（默认 {DATING_PLOT_FONT_SIZE_DEFAULT}px）
            </p>
          </div>
          <span className="shrink-0 font-mono text-[12px] text-[var(--sr-text-soft)]">
            {settings.baseFontSizePx}px
          </span>
        </div>
        <input
          type="range"
          min={DATING_PLOT_FONT_SIZE_MIN}
          max={DATING_PLOT_FONT_SIZE_MAX}
          step={1}
          value={settings.baseFontSizePx}
          onChange={(e) =>
            onChange({
              ...settings,
              baseFontSizePx: clampDatingPlotFontSizePx(Number(e.target.value)),
            })
          }
          className="mt-2.5 w-full accent-[var(--sr-gold)]"
          aria-label="剧情字号"
        />
        <div className="mt-1 flex justify-between text-[10px] text-[var(--sr-text-faint)]">
          <span>{DATING_PLOT_FONT_SIZE_MIN}</span>
          <span>{DATING_PLOT_FONT_SIZE_MAX}</span>
        </div>
      </div>

      <div className="flex gap-1 rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel)] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`flex-1 rounded-full py-1.5 text-[12px] font-medium transition-colors ${
              tab === t.id
                ? 'bg-[var(--sr-gold)] text-[var(--sr-gold-on)] shadow-[0_2px_10px_var(--sr-gold-glow)]'
                : 'text-[var(--sr-text-muted)] hover:text-[var(--sr-text)]'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {toast ? (
        <p className="rounded-xl border border-[var(--sr-gold)]/35 bg-[var(--sr-gold)]/15 px-3 py-2 text-center text-[12px] text-[var(--sr-gold)]">
          {toast}
        </p>
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
  storyHeader = false,
  themeStyle,
}: {
  characterId: string
  value: DatingPlotFontSettings
  dataUrlById: Record<string, string>
  onChange: (next: DatingPlotFontSettings) => void
  onDataUrlChange: (next: Record<string, string>) => void
  className?: string
  iconOnly?: boolean
  /** 剧情页标题栏胶囊样式 */
  storyHeader?: boolean
  /** Portal 后需自带主题变量，否则 --sr-* 失效 */
  themeStyle?: CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const settings = normalizeDatingPlotFontSettings(value)
  const summary = summarizeDatingPlotFontSettings(settings)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`剧情字体 · ${summary}`}
        className={
          storyHeader
            ? `inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--sr-border)] bg-[var(--sr-glass)] px-2.5 font-[family-name:var(--sr-font-serif)] text-[12px] tracking-wide text-[var(--sr-text-muted)] backdrop-blur-sm transition hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-text)] ${className}`
            : iconOnly
              ? `inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 p-2 text-white/85 transition hover:bg-white/15 ${className}`
              : `inline-flex items-center gap-1 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-glass)] px-2.5 py-1.5 text-[13px] text-[var(--sr-text-soft)] transition hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-text)] ${className}`
        }
      >
        {storyHeader ? (
          <span>字</span>
        ) : (
          <>
            <Type className="size-4" strokeWidth={1.75} />
            {iconOnly ? null : <span>字体</span>}
          </>
        )}
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="剧情字体"
        subtitle={summary}
        themeStyle={themeStyle}
      >
        <DatingPlotFontSettingsFields
          characterId={characterId}
          value={settings}
          dataUrlById={dataUrlById}
          onChange={onChange}
          onDataUrlChange={onDataUrlChange}
        />
      </BottomSheet>
    </>
  )
}

export { createEmptyDatingPlotFontSettings, normalizeDatingPlotFontSettings }
