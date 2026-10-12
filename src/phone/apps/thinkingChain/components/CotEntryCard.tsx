import { ChevronDown, GripVertical } from 'lucide-react'
import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cotTheme } from '../cotTheme'
import type { CoTEntry, CotPresetKind } from '../cotTypes'
import { CotCapsuleSwitch } from './CotCapsuleSwitch'

const MAX_ENTRY_TAG = 16
const MAX_ENTRY_TAGS = 12

export function CotEntryCard({
  entry,
  indexLabel,
  onChange,
  onDelete,
  dragEnabled,
  onDragHandlePointerDown,
  presetKind = 'thinkingChain',
}: {
  entry: CoTEntry
  indexLabel: number
  onChange: (next: CoTEntry) => void
  onDelete: () => void
  /** 是否显示拖拽手柄并允许排序 */
  dragEnabled?: boolean
  onDragHandlePointerDown?: (e: ReactPointerEvent) => void
  presetKind?: CotPresetKind
}) {
  const [open, setOpen] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const titleText = entry.title.trim() || '未命名'
  const tags = entry.tags ?? []

  const addTag = () => {
    const t = tagDraft.trim().slice(0, MAX_ENTRY_TAG)
    if (!t) return
    if (tags.includes(t)) {
      setTagDraft('')
      return
    }
    if (tags.length >= MAX_ENTRY_TAGS) return
    onChange({ ...entry, tags: [...tags, t] })
    setTagDraft('')
  }

  return (
    <div
      className="mx-4 mt-2.5 transition-opacity"
      style={{
        background: cotTheme.card,
        borderRadius: 14,
        padding: '11px 13px',
        border: `1px solid ${cotTheme.border}`,
        opacity: entry.enabled ? 1 : cotTheme.disabledOpacity,
        boxShadow: '0 6px 18px rgba(45,42,38,0.04)',
      }}
    >
      <div className="flex items-start gap-2">
        {dragEnabled ? (
          <button
            type="button"
            className="mt-0.5 flex size-7 shrink-0 touch-none items-center justify-center rounded-md"
            style={{ color: cotTheme.gold, background: cotTheme.goldSoft }}
            aria-label="拖动调整顺序"
            title="按住上下拖动"
            onPointerDown={(e) => {
              onDragHandlePointerDown?.(e)
            }}
          >
            <GripVertical size={16} strokeWidth={2} />
          </button>
        ) : null}
        <div
          className="mt-0.5 flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5"
          style={{
            background: entry.enabled ? cotTheme.goldSoft : '#F0EBE1',
            color: entry.enabled ? '#9A7B3C' : '#B5A995',
            fontFamily: cotTheme.sans,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-hidden
        >
          {String(indexLabel).padStart(2, '0')}
        </div>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="text-[14px] font-semibold leading-snug"
              style={{ color: cotTheme.text, fontFamily: cotTheme.sans }}
            >
              {titleText}
            </span>
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full px-1.5 py-0.5 text-[10px]"
                style={{ background: cotTheme.tagBg, color: cotTheme.muted }}
              >
                {t}
              </span>
            ))}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <CotCapsuleSwitch
            checked={entry.enabled}
            onChange={(enabled) => onChange({ ...entry, enabled })}
            aria-label={entry.enabled ? '关闭条目' : '开启条目'}
          />
          <button
            type="button"
            className="rounded-md p-1"
            style={{ color: cotTheme.muted }}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? '收起' : '展开'}
          >
            <ChevronDown
              size={16}
              style={{
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.18s',
              }}
            />
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="mt-3 space-y-2.5 rounded-[12px] p-3"
          style={{ background: cotTheme.editBg }}
        >
          <label className="block">
            <span className="text-[11px]" style={{ color: cotTheme.muted }}>
              标题
            </span>
            <input
              value={entry.title}
              onChange={(e) => onChange({ ...entry, title: e.target.value })}
              className="mt-1 w-full rounded-lg border bg-white px-2.5 py-2 text-[13px] outline-none"
              style={{ borderColor: cotTheme.border, color: cotTheme.text }}
            />
          </label>

          <div>
            <span className="text-[11px]" style={{ color: cotTheme.muted }}>
              标签（手动添加，不影响标题）
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    onChange({ ...entry, tags: tags.filter((x) => x !== t) })
                  }
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{
                    background: cotTheme.tagBg,
                    color: cotTheme.muted,
                    border: `1px solid ${cotTheme.border}`,
                  }}
                >
                  {t} ×
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="输入标签"
                className="min-w-0 flex-1 rounded-lg border bg-white px-2.5 py-2 text-[12px] outline-none"
                style={{ borderColor: cotTheme.border, color: cotTheme.text }}
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-xl px-3 py-2 text-[12px] font-medium"
                style={{
                  background: cotTheme.btnPrimaryBg,
                  color: cotTheme.btnPrimaryText,
                }}
              >
                添加
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-[11px]" style={{ color: cotTheme.muted }}>
              正文
            </span>
            <textarea
              value={entry.content}
              onChange={(e) => onChange({ ...entry, content: e.target.value })}
              rows={8}
              className="mt-1 w-full resize-y rounded-lg border bg-white px-2.5 py-2 text-[12.5px] leading-relaxed outline-none"
              style={{
                borderColor: cotTheme.border,
                color: cotTheme.text,
                fontFamily: cotTheme.sans,
              }}
              placeholder={
                presetKind === 'replyStyle'
                  ? '启用后按编号拼接：线上替换 WECHAT_CORE；线下替换扮演/写作并覆盖沙盒与禁词…'
                  : '启用本预设后，已开启条目将按编号顺序拼接，并整段替换内置思维链…'
              }
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg px-3 py-1.5 text-[12px]"
              style={{ color: '#9B4B3C' }}
            >
              删除条目
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
