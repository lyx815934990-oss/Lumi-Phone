import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import {
  createDefaultApiModelUserMeta,
  formatApiModelBillingLabel,
  hasConcreteApiModelBilling,
} from '../apiModelUserMeta'
import { apiTheme } from '../theme'
import type { ApiModelUserMeta } from '../types'

function SubLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 font-medium" style={{ fontSize: 10.5, color: apiTheme.muted }}>
      {children}
    </p>
  )
}

function SectionDivider() {
  return <div style={{ height: 1, background: apiTheme.hairline, margin: '14px 0' }} />
}

export function ApiModelUserMetaEditor({
  modelId: _modelId,
  value,
  onChange,
}: {
  modelId: string
  value: ApiModelUserMeta | undefined
  onChange: (next: ApiModelUserMeta) => void
}) {
  const meta = value ?? createDefaultApiModelUserMeta()
  const [tagDraft, setTagDraft] = useState('')
  const billingSummary = formatApiModelBillingLabel(meta)
  const tags = Array.isArray(meta.tags) ? meta.tags : []
  const hasNotes = Boolean(
    hasConcreteApiModelBilling(meta) || tags.length || (meta.remark || '').trim(),
  )
  const [open, setOpen] = useState(hasNotes)

  const patch = (partial: Partial<ApiModelUserMeta>) => {
    onChange({ ...meta, ...partial, currency: 'CNY' })
  }

  const parsePrice = (raw: string): number | null => {
    const s = raw.trim()
    if (!s) return null
    const n = Number(s)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  const addTag = () => {
    const t = tagDraft.trim().slice(0, 16)
    if (!t || tags.includes(t) || tags.length >= 12) {
      setTagDraft('')
      return
    }
    patch({ tags: [...tags, t] })
    setTagDraft('')
  }

  return (
    <div
      className="mt-3 overflow-hidden"
      style={{
        background: apiTheme.card,
        borderRadius: 14,
        border: `1px solid ${apiTheme.borderSoft}`,
      }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold" style={{ color: apiTheme.text }}>
            计费与标注
          </p>
          <p className="mt-0.5 truncate text-[11px]" style={{ color: apiTheme.subText }}>
            {hasNotes
              ? [billingSummary, tags.slice(0, 2).join(' · ')].filter(Boolean).join(' · ') ||
                '已填写备注'
              : '可选：按量/按次价签、备注与标签（仅本机展示）'}
          </p>
        </div>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: apiTheme.muted }}
        />
      </button>

      {open ? (
        <div className="px-3.5 pb-3.5" style={{ paddingTop: 0 }}>
          <div style={{ marginTop: 2 }}>
            <SubLabel>计费方式</SubLabel>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'usage' as const, label: '按量计费' },
                  { id: 'per_call' as const, label: '按次计费' },
                ] as const
              ).map((opt) => {
                const on = meta.billingMode === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ billingMode: opt.id })}
                    className="rounded-xl px-3 py-2 text-[13px] font-medium"
                    style={{
                      border: `1px solid ${on ? apiTheme.accent : apiTheme.border}`,
                      background: on ? apiTheme.accentSoft : apiTheme.card,
                      color: on ? apiTheme.text : apiTheme.subText,
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {meta.billingMode === 'usage' ? (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px]" style={{ color: apiTheme.subText }}>
                    输入（¥/M）
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={meta.inputPrice ?? ''}
                    onChange={(e) => patch({ inputPrice: parsePrice(e.target.value) })}
                    placeholder="可选"
                    className="mt-1 w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
                    style={{
                      border: `1px solid ${apiTheme.border}`,
                      color: apiTheme.text,
                      background: apiTheme.card,
                    }}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px]" style={{ color: apiTheme.subText }}>
                    输出（¥/M）
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={meta.outputPrice ?? ''}
                    onChange={(e) => patch({ outputPrice: parsePrice(e.target.value) })}
                    placeholder="可选"
                    className="mt-1 w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
                    style={{
                      border: `1px solid ${apiTheme.border}`,
                      color: apiTheme.text,
                      background: apiTheme.card,
                    }}
                  />
                </label>
              </div>
            ) : (
              <label className="mt-2.5 block">
                <span className="text-[11px]" style={{ color: apiTheme.subText }}>
                  单价（¥/次）
                </span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={meta.perCallPrice ?? ''}
                  onChange={(e) => patch({ perCallPrice: parsePrice(e.target.value) })}
                  placeholder="可选"
                  className="mt-1 w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
                  style={{
                    border: `1px solid ${apiTheme.border}`,
                    color: apiTheme.text,
                    background: apiTheme.card,
                  }}
                />
              </label>
            )}
          </div>

          <SectionDivider />

          <div>
            <SubLabel>备注</SubLabel>
            <textarea
              rows={2}
              value={meta.remark ?? ''}
              onChange={(e) => patch({ remark: e.target.value.slice(0, 200) })}
              placeholder="可选：适合场景、额度注意点…"
              className="w-full resize-none rounded-lg px-2.5 py-2 text-[13px] outline-none"
              style={{
                border: `1px solid ${apiTheme.border}`,
                color: apiTheme.text,
                background: apiTheme.card,
              }}
            />
          </div>

          <SectionDivider />

          <div>
            <SubLabel>标签</SubLabel>
            {tags.length ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patch({ tags: tags.filter((x) => x !== t) })}
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{
                      background: apiTheme.accentSoft,
                      border: `1px solid ${apiTheme.border}`,
                      color: apiTheme.accent,
                    }}
                    title="点击移除"
                  >
                    {t} ×
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="回车添加，如：便宜、主力"
                className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-[13px] outline-none"
                style={{
                  border: `1px solid ${apiTheme.border}`,
                  color: apiTheme.text,
                  background: apiTheme.card,
                }}
              />
              <button
                type="button"
                onClick={addTag}
                className="shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium"
                style={{ background: apiTheme.accent, color: apiTheme.onAccent }}
              >
                添加
              </button>
            </div>
          </div>

          <p className="mt-3 leading-[1.4]" style={{ fontSize: 10, color: apiTheme.faint }}>
            按模型单独保存；切换模型会显示对应备注。仅本机展示，不会改请求参数。
          </p>
        </div>
      ) : null}
    </div>
  )
}
