import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { BottomSheet } from '../../../../storyRpg/components/ui/BottomSheet'
import type { DualNarrativeStoryFields } from '../memory/dualNarrativeTime'
import { MemoryStoryTimeFieldsEditor } from '../memory/MemoryStoryTimeFieldsEditor'
import { seedPlotStoryTimeEditorFields } from './updatePlotStoryTime'
import type { PlotItem } from './types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plot: PlotItem | null
  onSave: (plotId: string, fields: DualNarrativeStoryFields) => Promise<{ ok: boolean; reason?: string }>
  themeStyle?: CSSProperties
}

export function DatingPlotStoryTimeSheet({ open, onOpenChange, plot, onSave, themeStyle }: Props) {
  const [fields, setFields] = useState<DualNarrativeStoryFields>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !plot) return
    setFields(seedPlotStoryTimeEditorFields(plot))
    setError(null)
  }, [open, plot])

  const handleSave = async () => {
    if (!plot || plot.type !== 'ai') return
    setBusy(true)
    setError(null)
    try {
      const result = await onSave(plot.id, fields)
      if (result.ok) {
        onOpenChange(false)
      } else {
        setError(result.reason || '保存失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="修改剧情时间"
      subtitle="同步本段摘要锚点与剧情轴「现在」"
      themeStyle={themeStyle}
    >
      <div className="space-y-4 pb-2">
        <div className="rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] p-3">
          <MemoryStoryTimeFieldsEditor
            value={fields}
            onChange={setFields}
            disabled={busy}
            hint="可选「时间点」或「时间段」；保存后会写入本段剧情与线下摘要。"
          />
        </div>
        {error ? <p className="text-[12px] text-[var(--sr-gold)]">{error}</p> : null}
        <button
          type="button"
          disabled={busy || !plot}
          onClick={() => void handleSave()}
          className="w-full rounded-xl bg-[var(--sr-gold)] py-3 text-[14px] font-medium text-[var(--sr-gold-on)] transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? '保存中…' : '保存剧情时间'}
        </button>
      </div>
    </BottomSheet>
  )
}
