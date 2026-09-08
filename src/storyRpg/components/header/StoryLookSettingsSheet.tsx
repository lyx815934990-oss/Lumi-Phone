import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { DatingStoryAppearance } from '../../../phone/apps/wechat/dating/datingStoryAppearance'
import { resolveDatingStoryDanmakuVisual } from '../../../phone/apps/wechat/dating/datingStoryAppearance'
import { DatingPlotFontSettingsFields } from '../../../phone/apps/wechat/dating/DatingPlotFontSettingsPanel'
import {
  normalizeDatingPlotFontSettings,
  type DatingPlotFontSettings,
} from '../../../phone/apps/wechat/dating/datingPlotFontSettings'
import {
  loadDatingStyleTuning,
  saveDatingStyleTuning,
  type DatingStyleTuning,
} from '../../../phone/apps/wechat/dating/styleTuningStorage'
import { BottomSheet } from '../ui/BottomSheet'
import { StoryThemeFields } from './StoryThemeFields'

type TabId = 'theme' | 'font' | 'style' | 'danmaku'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  characterId: string
  appearance: DatingStoryAppearance
  onPatchAppearance: (patch: Partial<DatingStoryAppearance>) => void
  plotFontSettings: DatingPlotFontSettings
  plotFontDataUrls: Record<string, string>
  onPlotFontChange: (next: DatingPlotFontSettings) => void
  onPlotFontDataUrlChange: (next: Record<string, string>) => void
  onStyleSaved?: (v: DatingStyleTuning) => void
  themeStyle?: CSSProperties
  initialTab?: TabId
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'theme', label: '主题' },
  { id: 'font', label: '字体' },
  { id: 'style', label: '文风' },
  { id: 'danmaku', label: '弹幕' },
]

const DM_PRESET_COLORS = ['#FFFFFF', '#FFE8A3', '#FFB4C8', '#A8E6CF', '#A8D4FF', '#E0C3FC', '#FFD4A8'] as const

const FONT_ACCEPT =
  '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/font-woff,application/font-woff2,application/x-font-ttf,application/x-font-otf'

function stripFontExt(name: string): string {
  return name.replace(/\.(ttf|otf|woff2?)$/i, '').trim() || '弹幕字体'
}

function newDanmakuFontFamily(): string {
  return `DatingDanmakuFont-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-medium text-[var(--sr-text-soft)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-[var(--sr-gold)]' : 'bg-[var(--sr-border)]'
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

function RangeRow({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[var(--sr-text-soft)]">{label}</p>
        <span className="font-mono text-[11px] text-[var(--sr-text-muted)]">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--sr-gold)]"
      />
    </div>
  )
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
}) {
  const hex = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#FFFFFF'
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[12px] font-medium text-[var(--sr-text-soft)]">{label}</p>
      <label className="inline-flex cursor-pointer items-center gap-2">
        <span className="font-mono text-[11px] text-[var(--sr-text-muted)]">{hex}</span>
        <span
          className="size-7 overflow-hidden rounded-full border border-[var(--sr-border)]"
          style={{ background: hex }}
        >
          <input
            type="color"
            value={hex}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="size-full cursor-pointer opacity-0"
          />
        </span>
      </label>
    </div>
  )
}

export function StoryLookSettingsSheet({
  open,
  onOpenChange,
  characterId,
  appearance,
  onPatchAppearance,
  plotFontSettings,
  plotFontDataUrls,
  onPlotFontChange,
  onPlotFontDataUrlChange,
  onStyleSaved,
  themeStyle,
  initialTab = 'theme',
}: Props) {
  const [tab, setTab] = useState<TabId>(initialTab)
  const [stylePrompt, setStylePrompt] = useState('')
  const [referenceSnippet, setReferenceSnippet] = useState('')
  const [fontBusy, setFontBusy] = useState(false)
  const [fontErr, setFontErr] = useState<string | null>(null)
  const fontInputRef = useRef<HTMLInputElement>(null)

  const dm = resolveDatingStoryDanmakuVisual(appearance)

  useEffect(() => {
    if (!open) return
    setTab(initialTab)
    const v = loadDatingStyleTuning(characterId)
    setStylePrompt(v.stylePrompt)
    setReferenceSnippet(v.referenceSnippet)
    setFontErr(null)
  }, [open, characterId, initialTab])

  useEffect(() => {
    const family = dm.fontFamily?.trim()
    const dataUrl = dm.fontDataUrl?.trim()
    if (!family || !dataUrl || !dataUrl.startsWith('data:')) return
    let cancelled = false
    try {
      const face = new FontFace(family, `url(${dataUrl})`)
      void face.load().then((loaded) => {
        if (cancelled) return
        document.fonts.add(loaded)
      })
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true
    }
  }, [dm.fontFamily, dm.fontDataUrl])

  const saveStyle = () => {
    const v: DatingStyleTuning = { stylePrompt, referenceSnippet }
    saveDatingStyleTuning(characterId, v)
    onStyleSaved?.(v)
  }

  const onPickFont = (file: File | undefined) => {
    if (!file) return
    setFontBusy(true)
    setFontErr(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string' || !reader.result.startsWith('data:')) {
          throw new Error('读取字体失败')
        }
        const family = newDanmakuFontFamily()
        onPatchAppearance({
          danmakuFontFamily: family,
          danmakuFontFileName: stripFontExt(file.name),
          danmakuFontDataUrl: reader.result,
        })
      } catch (e) {
        setFontErr(e instanceof Error ? e.message : '字体上传失败')
      } finally {
        setFontBusy(false)
        if (fontInputRef.current) fontInputRef.current.value = ''
      }
    }
    reader.onerror = () => {
      setFontErr('读取字体失败')
      setFontBusy(false)
    }
    reader.readAsDataURL(file)
  }

  const clearFont = () => {
    onPatchAppearance({
      danmakuFontFamily: undefined,
      danmakuFontFileName: undefined,
      danmakuFontDataUrl: undefined,
    })
    setFontErr(null)
  }

  const previewShadowParts: string[] = []
  if (dm.glowEnabled && dm.glowSize > 0) {
    previewShadowParts.push(`0 0 ${dm.glowSize}px ${dm.glowColor}`)
  }
  if (dm.shadowEnabled) {
    previewShadowParts.push(
      `${dm.shadowOffsetX}px ${dm.shadowOffsetY}px ${dm.shadowBlur}px ${dm.shadowColor}`,
    )
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="外观"
      subtitle="主题 · 字体 · 文风 · 弹幕"
      themeStyle={themeStyle}
    >
      <div className="space-y-3 pb-2">
        <div className="flex gap-1 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg py-1.5 text-[12px] font-medium transition ${
                tab === t.id
                  ? 'bg-[var(--sr-gold)] text-[var(--sr-gold-on)] shadow-sm'
                  : 'text-[var(--sr-text-muted)] hover:text-[var(--sr-text)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'theme' ? (
          <StoryThemeFields appearance={appearance} onPatch={onPatchAppearance} />
        ) : null}

        {tab === 'font' ? (
          <DatingPlotFontSettingsFields
            characterId={characterId}
            value={normalizeDatingPlotFontSettings(plotFontSettings)}
            dataUrlById={plotFontDataUrls}
            onChange={onPlotFontChange}
            onDataUrlChange={onPlotFontDataUrlChange}
          />
        ) : null}

        {tab === 'style' ? (
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium text-[var(--sr-text-soft)]">目标文风描述</label>
              <textarea
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                rows={3}
                placeholder="例如：克制白描、少形容词、对话推进"
                className="mt-1.5 w-full resize-y rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--sr-text)] outline-none focus:border-[var(--sr-gold)]/45"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[var(--sr-text-soft)]">参考片段示例</label>
              <p className="mt-1 text-[10px] leading-snug text-[var(--sr-text-faint)]">
                粘贴喜欢的节选，模型会模仿节奏与用词（建议 400 字内）。
              </p>
              <textarea
                value={referenceSnippet}
                onChange={(e) => setReferenceSnippet(e.target.value)}
                rows={7}
                placeholder="粘贴节选…"
                className="mt-1.5 w-full resize-y rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--sr-text)] outline-none focus:border-[var(--sr-gold)]/45"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--sr-text-faint)]">
              保存后写入本机；下次发送 / 重新回复时注入（与全局规则并存，冲突取更保守侧）。
            </p>
            <button
              type="button"
              onClick={() => {
                saveStyle()
                onOpenChange(false)
              }}
              className="w-full rounded-xl bg-[var(--sr-gold)] py-3 text-[14px] font-medium text-[var(--sr-gold-on)] transition hover:brightness-110"
            >
              保存文风
            </button>
          </div>
        ) : null}

        {tab === 'danmaku' ? (
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-medium text-[var(--sr-text-soft)]">弹幕颜色</p>
              <p className="mt-1 text-[10px] leading-snug text-[var(--sr-text-faint)]">
                默认白色；仅影响约会剧情页，弹幕会循环滚动直到下一轮生成。
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {DM_PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`弹幕色 ${c}`}
                    onClick={() => onPatchAppearance({ danmakuColor: c })}
                    className={`size-8 rounded-full border-2 transition ${
                      dm.colorHex.toUpperCase() === c
                        ? 'border-[var(--sr-gold)] scale-110 shadow-sm'
                        : 'border-[var(--sr-border)]'
                    }`}
                    style={{ background: c }}
                  />
                ))}
                <label className="relative inline-flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-[var(--sr-border)] bg-[var(--sr-panel)]">
                  <span className="text-[10px] text-[var(--sr-text-muted)]">+</span>
                  <input
                    type="color"
                    value={dm.colorHex}
                    onChange={(e) => onPatchAppearance({ danmakuColor: e.target.value.toUpperCase() })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>

            <RangeRow
              label="不透明度"
              value={Math.round(dm.opacity * 100)}
              min={15}
              max={100}
              format={(v) => `${v}%`}
              onChange={(v) => onPatchAppearance({ danmakuOpacity: v / 100 })}
            />

            <RangeRow
              label="字号"
              value={dm.fontSize}
              min={10}
              max={28}
              format={(v) => `${v}px`}
              onChange={(v) => onPatchAppearance({ danmakuFontSize: v })}
            />

            <div>
              <p className="text-[12px] font-medium text-[var(--sr-text-soft)]">自定义字体</p>
              <p className="mt-1 text-[10px] leading-snug text-[var(--sr-text-faint)]">
                支持 ttf / otf / woff / woff2，仅用于剧情页弹幕。
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={fontBusy}
                  onClick={() => fontInputRef.current?.click()}
                  className="rounded-lg border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3 py-1.5 text-[12px] text-[var(--sr-text)] disabled:opacity-50"
                >
                  {fontBusy ? '读取中…' : dm.fontFileName ? '更换字体' : '上传字体'}
                </button>
                {dm.fontFileName ? (
                  <>
                    <span className="max-w-[10rem] truncate text-[11px] text-[var(--sr-text-muted)]">
                      {dm.fontFileName}
                    </span>
                    <button
                      type="button"
                      onClick={clearFont}
                      className="text-[11px] text-[var(--sr-text-faint)] underline"
                    >
                      清除
                    </button>
                  </>
                ) : null}
                <input
                  ref={fontInputRef}
                  type="file"
                  accept={FONT_ACCEPT}
                  className="hidden"
                  onChange={(e) => onPickFont(e.target.files?.[0])}
                />
              </div>
              {fontErr ? <p className="mt-1 text-[11px] text-red-400">{fontErr}</p> : null}
            </div>

            <div className="space-y-2.5 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)]/60 p-3">
              <ToggleRow
                label="底部背景条"
                checked={dm.barEnabled}
                onChange={(v) => onPatchAppearance({ danmakuBarEnabled: v })}
              />
              {dm.barEnabled ? (
                <>
                  <ColorRow
                    label="背景条颜色"
                    value={dm.barColor}
                    onChange={(hex) => onPatchAppearance({ danmakuBarColor: hex })}
                  />
                  <RangeRow
                    label="背景条不透明度"
                    value={Math.round(dm.barOpacity * 100)}
                    min={5}
                    max={100}
                    format={(v) => `${v}%`}
                    onChange={(v) => onPatchAppearance({ danmakuBarOpacity: v / 100 })}
                  />
                </>
              ) : null}
            </div>

            <div className="space-y-2.5 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)]/60 p-3">
              <ToggleRow
                label="边缘发光"
                checked={dm.glowEnabled}
                onChange={(v) => onPatchAppearance({ danmakuGlowEnabled: v })}
              />
              {dm.glowEnabled ? (
                <>
                  <ColorRow
                    label="发光颜色"
                    value={dm.glowColor}
                    onChange={(hex) => onPatchAppearance({ danmakuGlowColor: hex })}
                  />
                  <RangeRow
                    label="发光半径"
                    value={dm.glowSize}
                    min={0}
                    max={24}
                    format={(v) => `${v}px`}
                    onChange={(v) => onPatchAppearance({ danmakuGlowSize: v })}
                  />
                </>
              ) : null}
            </div>

            <div className="space-y-2.5 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel)]/60 p-3">
              <ToggleRow
                label="文字阴影"
                checked={dm.shadowEnabled}
                onChange={(v) => onPatchAppearance({ danmakuShadowEnabled: v })}
              />
              {dm.shadowEnabled ? (
                <>
                  <ColorRow
                    label="阴影颜色"
                    value={dm.shadowColor}
                    onChange={(hex) => onPatchAppearance({ danmakuShadowColor: hex })}
                  />
                  <RangeRow
                    label="模糊"
                    value={dm.shadowBlur}
                    min={0}
                    max={32}
                    format={(v) => `${v}px`}
                    onChange={(v) => onPatchAppearance({ danmakuShadowBlur: v })}
                  />
                  <RangeRow
                    label="水平偏移"
                    value={dm.shadowOffsetX}
                    min={-12}
                    max={12}
                    format={(v) => `${v}px`}
                    onChange={(v) => onPatchAppearance({ danmakuShadowOffsetX: v })}
                  />
                  <RangeRow
                    label="垂直偏移"
                    value={dm.shadowOffsetY}
                    min={-12}
                    max={12}
                    format={(v) => `${v}px`}
                    onChange={(v) => onPatchAppearance({ danmakuShadowOffsetY: v })}
                  />
                </>
              ) : null}
            </div>

            <div
              className="relative h-16 overflow-hidden rounded-xl border border-[var(--sr-border)] bg-[#1a1a1e]"
              aria-hidden
            >
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap font-medium tracking-wide"
                style={{
                  color: dm.colorRgba,
                  fontSize: `${dm.fontSize}px`,
                  fontFamily: dm.fontFamily ? `"${dm.fontFamily}", system-ui, sans-serif` : undefined,
                  textShadow: previewShadowParts.length ? previewShadowParts.join(', ') : undefined,
                  ...(dm.barEnabled
                    ? {
                        background: `color-mix(in srgb, ${dm.barColor} ${Math.round(dm.barOpacity * 100)}%, transparent)`,
                        padding: '2px 8px',
                        borderRadius: 999,
                      }
                    : null),
                }}
              >
                弹幕预览 · 循环滚动中
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  )
}
