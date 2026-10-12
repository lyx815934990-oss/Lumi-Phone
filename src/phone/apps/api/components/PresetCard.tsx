import { Copy, Edit, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { normalizeApiWebsiteHref, openApiWebsiteUrl } from '../apiWebsiteUrl'
import { splitApiModelDisplay } from '../apiModelDisplay'
import { formatApiModelBillingLabel, hasConcreteApiModelBilling } from '../apiModelUserMeta'
import { apiTheme } from '../theme'
import type { ApiModelUserMeta } from '../types'
import { ApiModelIdView } from './ApiModelIdView'

export type PresetStatusTag = {
  text: string
}

export function PresetCard({
  name,
  modelId,
  modelMeta,
  websiteUrl,
  active,
  statusTags,
  footerHint,
  onActivate,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  name: string
  modelId?: string
  modelMeta?: ApiModelUserMeta
  websiteUrl?: string
  active?: boolean
  /** 仅展开态展示的状态胶囊 */
  statusTags?: PresetStatusTag[]
  footerHint?: string
  onActivate: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const websiteHref = normalizeApiWebsiteHref(websiteUrl ?? '')
  const modelLabel = (modelId || '').trim()
  const modelTitle = modelLabel ? splitApiModelDisplay(modelLabel).title || modelLabel : ''
  const billingLabel = hasConcreteApiModelBilling(modelMeta)
    ? formatApiModelBillingLabel(modelMeta)
    : ''
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  if (active) {
    return (
      <div
        className="mx-4 mt-3"
        style={{
          background: apiTheme.card,
          border: `1.5px solid ${apiTheme.borderStrong}`,
          borderRadius: 16,
          padding: '14px 14px 16px',
          boxShadow: apiTheme.shadow,
        }}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="min-w-0 truncate text-[15px] font-semibold" style={{ color: apiTheme.text }}>
                {name || '未命名预设'}
              </p>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: apiTheme.accentMuted, color: apiTheme.accent }}
              >
                使用中
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {websiteHref ? (
              <button
                type="button"
                className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
                onClick={() => openApiWebsiteUrl(websiteHref)}
                style={{ color: apiTheme.muted }}
                aria-label="打开 API 网站"
                title="打开 API 网站"
              >
                <ExternalLink size={15} strokeWidth={2} />
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
              onClick={onDuplicate}
              style={{ color: apiTheme.muted }}
              aria-label="复制预设"
              title="复制"
            >
              <Copy size={15} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
              onClick={onEdit}
              style={{ color: apiTheme.muted }}
              aria-label="编辑预设"
              title="编辑"
            >
              <Edit size={15} strokeWidth={2} />
            </button>
          </div>
        </div>

        {statusTags?.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {statusTags.map((t) => (
              <span
                key={t.text}
                className="rounded-full px-2 py-0.5 font-medium"
                style={{
                  fontSize: 10.5,
                  background: apiTheme.chip,
                  color: apiTheme.accent,
                }}
              >
                {t.text}
              </span>
            ))}
          </div>
        ) : null}

        <div
          className="mt-3 rounded-xl px-3 py-2.5"
          style={{ background: apiTheme.accentSoft, border: `1px solid ${apiTheme.borderSoft}` }}
        >
          <p className="text-[10px] font-medium" style={{ color: apiTheme.subText }}>
            当前模型
          </p>
          {modelLabel ? (
            <div className="mt-1">
              <ApiModelIdView modelId={modelLabel} modelMeta={modelMeta} showFullId={false} />
            </div>
          ) : (
            <p className="mt-1 text-[13px]" style={{ color: apiTheme.subText }}>
              尚未选择模型
            </p>
          )}
        </div>

        {footerHint ? (
          <p className="mt-3 leading-relaxed" style={{ fontSize: 11, color: apiTheme.muted }}>
            {footerHint}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className="relative mx-4 mt-2.5 flex items-center gap-3"
      style={{
        background: apiTheme.card,
        borderRadius: 14,
        padding: '12px 14px',
        border: `1px solid ${apiTheme.borderSoft}`,
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium" style={{ color: apiTheme.text }}>
          {name || '未命名预设'}
        </p>
        <p className="mt-0.5 truncate" style={{ fontSize: 11.5, color: apiTheme.subText }}>
          {modelTitle || '尚未选择模型'}
          {billingLabel ? ` · ${billingLabel}` : ''}
        </p>
      </div>

      <button
        type="button"
        onClick={onActivate}
        className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium transition-opacity hover:opacity-80"
        style={{
          color: apiTheme.accent,
          border: `1px solid ${apiTheme.borderStrong}`,
          background: apiTheme.accentSoft,
        }}
      >
        启用
      </button>

      <div className="relative shrink-0" ref={menuWrapRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ color: apiTheme.muted }}
          aria-label="更多操作"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={18} strokeWidth={2} />
        </button>
        {menuOpen ? (
          <div
            className="absolute right-0 top-[calc(100%+4px)] z-20 min-w-[128px] overflow-hidden rounded-xl py-1"
            style={{
              background: apiTheme.card,
              border: `1px solid ${apiTheme.borderSoft}`,
              boxShadow: apiTheme.shadow,
            }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-black/[0.03]"
              style={{ color: apiTheme.text }}
              onClick={() => {
                setMenuOpen(false)
                onEdit()
              }}
            >
              <Edit size={14} strokeWidth={2} style={{ color: apiTheme.subText }} />
              编辑
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-black/[0.03]"
              style={{ color: apiTheme.text }}
              onClick={() => {
                setMenuOpen(false)
                onDuplicate()
              }}
            >
              <Copy size={14} strokeWidth={2} style={{ color: apiTheme.subText }} />
              复制
            </button>
            {websiteHref ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-black/[0.03]"
                style={{ color: apiTheme.text }}
                onClick={() => {
                  setMenuOpen(false)
                  openApiWebsiteUrl(websiteHref)
                }}
              >
                <ExternalLink size={14} strokeWidth={2} style={{ color: apiTheme.subText }} />
                打开网站
              </button>
            ) : null}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-black/[0.03]"
              style={{ color: apiTheme.danger }}
              onClick={() => {
                setMenuOpen(false)
                onDelete()
              }}
            >
              <Trash2 size={14} strokeWidth={2} />
              删除
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
