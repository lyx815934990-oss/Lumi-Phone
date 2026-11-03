import { ChevronDown, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cotTheme } from '../cotTheme'
import type { CotRegexRule } from '../cotTypes'
import { CotCapsuleSwitch } from './CotCapsuleSwitch'
import { compileCotRegexFind } from '../cotApplyRegex'

export function CotRegexRuleCard({
  rule,
  onChange,
  onDelete,
  defaultOpen = false,
}: {
  rule: CotRegexRule
  onChange: (next: CotRegexRule) => void
  onDelete: () => void
  /** 新建时建议 true，便于立刻编辑 */
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const findOk = !rule.find.trim() || !!compileCotRegexFind(rule.find)
  const nameText = rule.name.trim() || '未命名正则'
  const findPreview = rule.find.trim().replace(/\s+/g, ' ').slice(0, 48)

  return (
    <div
      className="mx-4 mt-2.5 transition-opacity"
      style={{
        background: cotTheme.card,
        borderRadius: 14,
        padding: '11px 13px',
        border: `1px solid ${cotTheme.border}`,
        opacity: rule.enabled ? 1 : cotTheme.disabledOpacity,
        boxShadow: '0 6px 18px rgba(45,42,38,0.04)',
      }}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="text-[14px] font-semibold leading-snug"
              style={{ color: cotTheme.text, fontFamily: cotTheme.sans }}
            >
              {nameText}
            </span>
            {rule.markdownOnly ? (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px]"
                style={{ background: cotTheme.tagBg, color: cotTheme.muted }}
              >
                仅展示
              </span>
            ) : null}
            {rule.promptOnly ? (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px]"
                style={{ background: cotTheme.tagBg, color: cotTheme.muted }}
              >
                仅 Prompt
              </span>
            ) : null}
            {!findOk ? (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px]"
                style={{ background: 'rgba(196,92,92,0.14)', color: '#C45C5C' }}
              >
                无效
              </span>
            ) : null}
          </div>
          {!open && findPreview ? (
            <p
              className="mt-1 truncate font-mono text-[11px] leading-snug"
              style={{ color: cotTheme.muted }}
            >
              {findPreview}
              {rule.find.trim().length > 48 ? '…' : ''}
            </p>
          ) : null}
        </button>
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          <CotCapsuleSwitch
            checked={rule.enabled}
            onChange={(enabled) => onChange({ ...rule, enabled })}
            aria-label="启用正则"
          />
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5"
            style={{ color: cotTheme.muted }}
            aria-label="删除正则"
          >
            <Trash2 size={15} />
          </button>
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
              规则名
            </span>
            <input
              value={rule.name}
              onChange={(e) => onChange({ ...rule, name: e.target.value })}
              placeholder="规则名"
              className="mt-1 w-full rounded-lg border bg-white px-2.5 py-2 text-[13px] outline-none"
              style={{ borderColor: cotTheme.border, color: cotTheme.text }}
            />
          </label>

          <label className="block">
            <span className="text-[11px]" style={{ color: cotTheme.muted }}>
              查找（支持 /pattern/flags，裸写法默认全局 g）
            </span>
            <textarea
              value={rule.find}
              onChange={(e) => onChange({ ...rule, find: e.target.value })}
              placeholder="例如 :::emotion_status\\s*([\\s\\S]*?)\\s*#\\s*([\\s\\S]*?)\\s*:::"
              rows={2}
              className="mt-1 w-full resize-y rounded-lg border bg-white px-2.5 py-2 font-mono text-[12px] outline-none"
              style={{
                borderColor: findOk ? cotTheme.border : '#C45C5C',
                color: cotTheme.text,
                minHeight: 44,
              }}
            />
          </label>
          {!findOk ? (
            <p className="text-[11px]" style={{ color: '#C45C5C' }}>
              正则无效，保存后不会生效
            </p>
          ) : null}

          <label className="block">
            <span className="text-[11px]" style={{ color: cotTheme.muted }}>
              替换为（可用 $1/$2；可直接换行，或写 \n）
            </span>
            <textarea
              value={rule.replace}
              onChange={(e) => onChange({ ...rule, replace: e.target.value })}
              placeholder="替换内容，可留空表示删除匹配；HTML/CSS 请保持原有换行"
              rows={8}
              className="mt-1 w-full resize-y rounded-lg border bg-white px-2.5 py-2 font-mono text-[12px] leading-snug outline-none"
              style={{
                borderColor: cotTheme.border,
                color: cotTheme.text,
                minHeight: 120,
              }}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <label
              className="inline-flex items-center gap-1.5 text-[11px]"
              style={{ color: cotTheme.muted }}
            >
              <input
                type="checkbox"
                checked={rule.markdownOnly === true}
                onChange={(e) =>
                  onChange({ ...rule, markdownOnly: e.target.checked || undefined })
                }
              />
              仅展示（美化）
            </label>
            <label
              className="inline-flex items-center gap-1.5 text-[11px]"
              style={{ color: cotTheme.muted }}
            >
              <input
                type="checkbox"
                checked={rule.promptOnly === true}
                onChange={(e) =>
                  onChange({ ...rule, promptOnly: e.target.checked || undefined })
                }
              />
              仅 Prompt（如只留摘要）
            </label>
          </div>
          <p className="text-[10px] leading-snug" style={{ color: cotTheme.muted }}>
            对应酒馆「短暂 → 仅格式显示 / 仅格式提示词」。展示正则已固定作用在 AI
            剧情正文（线下楼层 / 线上可见回复），无需再勾「AI 输出」。预设本身选
            通用 / 线上 / 线下即可。
          </p>
        </div>
      ) : null}
    </div>
  )
}
