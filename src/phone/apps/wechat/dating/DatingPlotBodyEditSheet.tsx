import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { BottomSheet } from '../../../../storyRpg/components/ui/BottomSheet'
import type { PlotItem } from './types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plot: PlotItem | null
  onSave: (plotId: string, draftBody: string) => Promise<{ ok: boolean; reason?: string }>
  themeStyle?: CSSProperties
}

export function DatingPlotBodyEditSheet({ open, onOpenChange, plot, onSave, themeStyle }: Props) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !plot) return
    setDraft(String(plot.content ?? ''))
    setError(null)
  }, [open, plot])

  const isPlayer = plot?.type === 'player'
  const title = isPlayer ? '编辑你的输入' : '编辑剧情正文'
  const subtitle = isPlayer
    ? '保存后仅改本条输入；若要换一版回复，请点「重新回复」'
    : '保存后写入当前版本；重新生成的旧稿仍可在版本切换里回退'

  const handleSave = async () => {
    if (!plot) return
    const next = draft.trimEnd()
    if (!next.trim()) {
      setError('内容不能为空')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await onSave(plot.id, next)
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
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} subtitle={subtitle} themeStyle={themeStyle}>
      <div className="space-y-3 pb-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={12}
          disabled={busy}
          placeholder={isPlayer ? '输入本轮行动或对白…' : '编辑本段剧情正文…'}
          className="w-full resize-y rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-panel)] px-3.5 py-3 text-[14px] leading-relaxed text-[var(--sr-text)] outline-none placeholder:text-[var(--sr-text-faint)] focus:border-[var(--sr-gold)]/45 disabled:opacity-60"
        />
        {error ? <p className="text-[12px] text-[var(--sr-gold)]">{error}</p> : null}
        <button
          type="button"
          disabled={busy || !plot}
          onClick={() => void handleSave()}
          className="w-full rounded-xl bg-[var(--sr-gold)] py-3 text-[14px] font-medium text-[var(--sr-gold-on)] transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? '保存中…' : '保存'}
        </button>
      </div>
    </BottomSheet>
  )
}
