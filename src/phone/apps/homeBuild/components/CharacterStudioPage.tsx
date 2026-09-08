import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Pipette, UserRound } from 'lucide-react'
import { useHomeBuildStore } from '../store'
import { PAPER_DOLL_3D_RECOMMENDED, PAPER_DOLL_3D_TOOLS, resolvePaperDollImageUrl } from '../paperDoll'
import {
  PAPER_DOLL_CHROMA_DEFAULT,
  PAPER_DOLL_CHROMA_PRESETS,
  PAPER_DOLL_HEIGHT_SCALE_MAX,
  PAPER_DOLL_HEIGHT_SCALE_MIN,
  registerPaperDollCornerSampler,
  renderPaperDollChromaPreview,
  sampleCornerAverageHex,
  samplePaperDollCornerKey,
  type PaperDollChromaSettings,
} from '../paperDollChroma'
import {
  applyWalkSettings,
  setWalkAvatar3dEnabled,
  setWalkPaperDollChroma,
  setWalkPaperDollEnabled,
} from '../walkInput'
import { loadWalkSettings, saveWalkSettings } from '../walkSettings'
import { OcModelImportPanel } from './OcModelImportPanel'

/** 人物 Tab：3D OC + 漫游纸片人 + 外链工具 */
export function CharacterStudioPage() {
  const characterId = useHomeBuildStore((s) => s.characterId)
  const initial = loadWalkSettings()
  const [paperDollEnabled, setPaperDollEnabled] = useState(initial.paperDollEnabled)
  const [avatar3dEnabled, setAvatar3dEnabled] = useState(initial.avatar3dEnabled)
  const [chroma, setChroma] = useState<PaperDollChromaSettings>(initial.paperDollChroma)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    applyWalkSettings(loadWalkSettings())
  }, [])

  useEffect(() => {
    setWalkPaperDollEnabled(paperDollEnabled)
    setWalkAvatar3dEnabled(avatar3dEnabled)
    setWalkPaperDollChroma(chroma)
    saveWalkSettings({
      ...loadWalkSettings(),
      paperDollEnabled,
      avatar3dEnabled,
      paperDollChroma: chroma,
    })
  }, [paperDollEnabled, avatar3dEnabled, chroma])

  useEffect(() => {
    let cancelled = false
    void resolvePaperDollImageUrl(characterId).then((url) => {
      if (!cancelled) setImageUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [characterId])

  useEffect(() => {
    if (!imageUrl) {
      imageRef.current = null
      registerPaperDollCornerSampler(null)
      const c = canvasRef.current
      if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      registerPaperDollCornerSampler(() => sampleCornerAverageHex(img))
      const canvas = canvasRef.current
      if (canvas) renderPaperDollChromaPreview(img, canvas, chroma)
    }
    img.onerror = () => {
      imageRef.current = null
      registerPaperDollCornerSampler(null)
    }
    img.src = imageUrl
    return () => registerPaperDollCornerSampler(null)
  }, [imageUrl])

  useEffect(() => {
    const img = imageRef.current
    const canvas = canvasRef.current
    if (!img || !canvas || !img.complete) return
    renderPaperDollChromaPreview(img, canvas, chroma)
  }, [chroma])

  const patchChroma = (patch: Partial<PaperDollChromaSettings>) => {
    setChroma((prev) => ({ ...prev, ...patch }))
  }

  const previewHeight = `${Math.round(160 * chroma.heightScale)}px`

  return (
    <div className="hb-char-studio relative flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <header className="mb-3 flex items-center gap-1.5 text-[14px] font-semibold text-[var(--hb-ink)]">
          <UserRound className="size-4 text-[var(--hb-blue)]" />
          人物
        </header>

        <OcModelImportPanel
          characterId={characterId}
          avatar3dEnabled={avatar3dEnabled}
          onAvatar3dChange={setAvatar3dEnabled}
          onImported={() => setAvatar3dEnabled(true)}
        />

        <section className="hb-char-studio-card mb-3">
          <div className="mb-2 flex items-center justify-between text-[12px] text-[var(--hb-ink)]">
            <span className="font-medium">漫游纸片人</span>
            <label className="flex items-center gap-2 text-[11px] text-[var(--hb-mist)]">
              显示
              <button
                type="button"
                role="switch"
                aria-checked={paperDollEnabled}
                className={`hb-walk-switch ${paperDollEnabled ? 'is-on' : ''}`}
                onClick={() => setPaperDollEnabled((v) => !v)}
              >
                <span className="hb-walk-switch-knob" />
              </button>
            </label>
          </div>

          <div
            className="hb-char-studio-preview mb-2 flex items-end justify-center overflow-hidden rounded-xl"
            style={{ minHeight: previewHeight }}
          >
            {imageUrl ? (
              <canvas
                ref={canvasRef}
                className="max-h-full max-w-full object-contain"
                style={{ height: previewHeight, width: 'auto' }}
              />
            ) : (
              <p className="px-4 py-8 text-center text-[11px] text-[var(--hb-mist)]">
                无人设全身立绘
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--hb-mist)]">
            <span>色度抠图</span>
            <button
              type="button"
              role="switch"
              aria-checked={chroma.enabled}
              className={`hb-walk-switch ${chroma.enabled ? 'is-on' : ''}`}
              onClick={() => patchChroma({ enabled: !chroma.enabled })}
            >
              <span className="hb-walk-switch-knob" />
            </button>
          </div>

          {chroma.enabled ? (
            <div className="mt-2.5 flex flex-col gap-2 border-t border-[var(--hb-hairline)] pt-2.5">
              <div className="flex flex-wrap gap-1.5">
                {PAPER_DOLL_CHROMA_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="hb-char-studio-chip inline-flex items-center gap-1"
                    onClick={() =>
                      patchChroma({
                        enabled: true,
                        keyHex: p.keyHex,
                        similarity: p.similarity,
                        softness: p.softness,
                        spill: p.spill,
                      })
                    }
                  >
                    <span
                      className="inline-block size-2.5 rounded-sm border border-black/10"
                      style={{ background: p.keyHex }}
                    />
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="hb-char-studio-chip inline-flex items-center gap-1"
                  onClick={() => {
                    const hex = samplePaperDollCornerKey()
                    if (hex) patchChroma({ enabled: true, keyHex: hex })
                  }}
                >
                  <Pipette className="size-3" />
                  取色
                </button>
              </div>
              <label className="block text-[11px] text-[var(--hb-mist)]">
                <span className="mb-1 flex justify-between">
                  <span>身高</span>
                  <span className="tabular-nums text-[var(--hb-ink)]">{chroma.heightScale.toFixed(2)}×</span>
                </span>
                <input
                  type="range"
                  min={PAPER_DOLL_HEIGHT_SCALE_MIN}
                  max={PAPER_DOLL_HEIGHT_SCALE_MAX}
                  step={0.05}
                  value={chroma.heightScale}
                  onChange={(e) => patchChroma({ heightScale: Number.parseFloat(e.target.value) })}
                  className="hb-char-studio-slider w-full"
                  aria-label="纸片人身高"
                />
              </label>
              <button
                type="button"
                className="self-start text-[10px] text-[var(--hb-mist)] underline-offset-2 hover:underline"
                onClick={() => setChroma({ ...PAPER_DOLL_CHROMA_DEFAULT })}
              >
                重置抠图
              </button>
            </div>
          ) : null}
        </section>

        <section className="hb-char-studio-card">
          <button
            type="button"
            className="flex w-full items-center justify-between text-[12px] font-medium text-[var(--hb-ink)]"
            onClick={() => setToolsOpen((v) => !v)}
          >
            图生 3D / 绑骨工具
            <ChevronDown
              className={`size-4 text-[var(--hb-mist)] transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {toolsOpen ? (
            <div className="mt-3 flex flex-col gap-2">
              {PAPER_DOLL_3D_RECOMMENDED.map((site) => (
                <a
                  key={site.id}
                  href={site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hb-char-studio-rec flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                >
                  <span className="text-[11px] font-medium text-[var(--hb-ink)]">{site.label}</span>
                  {site.badge ? <span className="hb-char-studio-rec-badge shrink-0">{site.badge}</span> : null}
                </a>
              ))}
              <div className="mt-1 flex flex-wrap gap-1.5 border-t border-[var(--hb-hairline)] pt-2">
                {PAPER_DOLL_3D_TOOLS.filter((t) => t.group !== 'docs').map((tool) => (
                  <a
                    key={tool.href}
                    href={tool.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hb-char-studio-link inline-block text-[10px]"
                  >
                    {tool.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
