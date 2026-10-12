import { MemoryModelIdText } from '../../wechat/memory/MemoryModelIdText'
import { splitApiModelDisplay } from '../apiModelDisplay'
import { formatApiModelBillingLabel } from '../apiModelUserMeta'
import { apiTheme } from '../theme'
import type { ApiModelUserMeta } from '../types'

/** 统一展示模型全名：主标题突出，前缀/路径与价签作辅信息 */
export function ApiModelIdView({
  modelId,
  modelMeta,
  tone = 'default',
  showFullId = true,
  compact = false,
}: {
  modelId: string
  modelMeta?: ApiModelUserMeta
  tone?: 'default' | 'onDark'
  /** 主标题与全名不同时，是否再展示完整 id */
  showFullId?: boolean
  compact?: boolean
}) {
  const id = modelId.trim()
  if (!id) return null
  const { title, badge, path } = splitApiModelDisplay(id)
  const billing = formatApiModelBillingLabel(modelMeta)
  const tags = Array.isArray(modelMeta?.tags) ? modelMeta!.tags!.filter(Boolean).slice(0, 4) : []
  const onDark = tone === 'onDark'
  const titleColor = onDark ? '#ffffff' : apiTheme.text
  const muted = onDark ? 'rgba(255,255,255,0.72)' : apiTheme.subText
  const chipBg = onDark ? 'rgba(255,255,255,0.14)' : '#FFFFFF'
  const chipBorder = onDark ? 'rgba(255,255,255,0.22)' : apiTheme.border
  const chipText = onDark ? 'rgba(255,255,255,0.9)' : apiTheme.text
  const fullDiffers = title !== id

  return (
    <div className="min-w-0">
      {badge || path ? (
        <p
          className={`mb-0.5 truncate leading-snug ${compact ? 'text-[10px]' : 'text-[11px]'}`}
          style={{ color: muted }}
        >
          {badge || path}
        </p>
      ) : null}
      <p
        className={`break-all font-semibold leading-snug ${compact ? 'text-[12px]' : 'text-[13px]'}`}
        style={{ color: titleColor }}
      >
        <MemoryModelIdText text={title || id} />
      </p>
      {showFullId && fullDiffers ? (
        <p className="mt-0.5 break-all text-[10px] leading-snug select-all" style={{ color: muted }}>
          <MemoryModelIdText text={id} />
        </p>
      ) : null}
      {billing || tags.length ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {billing ? (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: chipBg, color: chipText, border: `1px solid ${chipBorder}` }}
            >
              {billing}
            </span>
          ) : null}
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{ background: chipBg, color: muted, border: `1px solid ${chipBorder}` }}
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
