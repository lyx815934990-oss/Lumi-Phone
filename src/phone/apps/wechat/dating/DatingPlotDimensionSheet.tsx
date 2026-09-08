import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Loader2 } from 'lucide-react'
import { BottomSheet } from '../../../../storyRpg/components/ui/BottomSheet'
import {
  DATING_AI_LENGTH_TARGET_MAX,
  parsePlotDimensionLengthTarget,
  type NarrativePerspective,
  type PlotDimensionKind,
  type PlotItem,
} from './types'
import { PLOT_DIMENSION_LABELS } from './datingPlotDimensionAi'
import { PlotRichParagraph } from './plotRichText'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plot: PlotItem | null
  kind: PlotDimensionKind
  perspective: NarrativePerspective
  defaultLengthTarget: number
  onGenerate: (params: { writingGuide: string; lengthTargetChars: number }) => Promise<void>
  busy?: boolean
  themeStyle?: CSSProperties
}

export function DatingPlotDimensionSheet({
  open,
  onOpenChange,
  plot,
  kind,
  perspective,
  defaultLengthTarget,
  onGenerate,
  busy = false,
  themeStyle,
}: Props) {
  const label = PLOT_DIMENSION_LABELS[kind]
  const artifact = useMemo(() => {
    if (!plot) return null
    return kind === 'parallel' ? plot.parallelEvent : plot.ifLine
  }, [kind, plot])

  const [writingGuide, setWritingGuide] = useState('')
  const [lengthDraft, setLengthDraft] = useState(String(defaultLengthTarget))

  useEffect(() => {
    if (!open) return
    setWritingGuide(artifact?.writingGuide?.trim() || '')
    setLengthDraft(String(artifact?.lengthTargetChars || defaultLengthTarget))
  }, [artifact?.lengthTargetChars, artifact?.writingGuide, defaultLengthTarget, open])

  const handleGenerate = async () => {
    const lengthTargetChars = parsePlotDimensionLengthTarget(lengthDraft, defaultLengthTarget)
    await onGenerate({ writingGuide: writingGuide.trim(), lengthTargetChars })
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={label}
      subtitle={kind === 'parallel' ? '与锚点同刻 · 异场景切片' : '从锚点分歧 · 假设分支'}
      themeStyle={themeStyle}
    >
      <div className="space-y-4 pb-2">
        {artifact?.content?.trim() ? (
          <div className="rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sr-text-muted)]">
              已生成正文
            </p>
            <div className="sr-prose max-h-[min(36dvh,280px)] overflow-y-auto text-[14px]">
              <PlotRichParagraph
                content={artifact.content}
                plainDialogue
                dialogueTranslations={artifact.dialogueTranslations}
                innerOsTranslations={artifact.innerOsTranslations}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-3 rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] p-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] text-[var(--sr-text-muted)]">写作指引（可选）</span>
            <textarea
              value={writingGuide}
              onChange={(e) => setWritingGuide(e.target.value)}
              rows={3}
              placeholder={kind === 'parallel' ? '例如：写林子舟在另一处同时发生的事…' : '例如：要是当时没追问，转身走了会怎样…'}
              className="w-full resize-none rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--sr-text)] outline-none placeholder:text-[var(--sr-text-faint)] focus:border-[var(--sr-gold)]/45"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] text-[var(--sr-text-muted)]">目标字数</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={DATING_AI_LENGTH_TARGET_MAX}
              value={lengthDraft}
              onChange={(e) => setLengthDraft(e.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)] px-3 font-mono text-[14px] text-[var(--sr-text)] outline-none focus:border-[var(--sr-gold)]/45"
            />
          </label>
          <p className="text-[10px] leading-relaxed text-[var(--sr-text-faint)]">
            人称跟随当前设定（{perspective === 'first' ? '第一' : perspective === 'third' ? '第三' : '第二'}人称）；语言跟随约会「输出与翻译」设置。
          </p>
        </div>

        <button
          type="button"
          disabled={busy || !plot}
          onClick={() => void handleGenerate()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--sr-gold)] py-3 text-[14px] font-medium text-[var(--sr-gold-on)] transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              生成中…
            </>
          ) : artifact?.content?.trim() ? (
            `重新生成${label}`
          ) : (
            `生成${label}`
          )}
        </button>
      </div>
    </BottomSheet>
  )
}
