import type { ApiModelBillingMode, ApiModelUserMeta } from './types'

export function createDefaultApiModelUserMeta(): ApiModelUserMeta {
  return {
    billingMode: 'usage',
    currency: 'CNY',
    inputPrice: null,
    outputPrice: null,
    perCallPrice: null,
    remark: '',
    tags: [],
  }
}

function asFiniteNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) && n >= 0 ? n : null
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const t = String(item ?? '')
      .trim()
      .slice(0, 16)
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
    if (out.length >= 12) break
  }
  return out
}

export function normalizeApiModelUserMeta(raw: unknown): ApiModelUserMeta {
  const base = createDefaultApiModelUserMeta()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<ApiModelUserMeta>
  const billingMode: ApiModelBillingMode = r.billingMode === 'per_call' ? 'per_call' : 'usage'
  return {
    billingMode,
    currency: 'CNY',
    inputPrice: asFiniteNumberOrNull(r.inputPrice),
    outputPrice: asFiniteNumberOrNull(r.outputPrice),
    perCallPrice: asFiniteNumberOrNull(r.perCallPrice),
    remark: typeof r.remark === 'string' ? r.remark.slice(0, 200) : '',
    tags: normalizeTags(r.tags),
  }
}

export function normalizeApiModelUserMetaMap(raw: unknown): Record<string, ApiModelUserMeta> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, ApiModelUserMeta> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(k || '').trim()
    if (!id) continue
    out[id] = normalizeApiModelUserMeta(v)
  }
  return out
}

/** 是否已填写具体数字费率（不含仅选了计费方式） */
export function hasConcreteApiModelBilling(meta: ApiModelUserMeta | undefined): boolean {
  if (!meta) return false
  if (meta.billingMode === 'per_call') return meta.perCallPrice != null
  return meta.inputPrice != null || meta.outputPrice != null
}

export function formatApiModelBillingLabel(meta: ApiModelUserMeta | undefined): string {
  if (!meta) return ''
  const cur = '¥'
  if (meta.billingMode === 'per_call') {
    const p = meta.perCallPrice
    if (p == null) return '按次计费'
    return `按次 · ${cur}${formatPriceNum(p)}/次`
  }
  const inn = meta.inputPrice
  const out = meta.outputPrice
  if (inn == null && out == null) return '按量计费'
  if (inn != null && out != null) return `按量 · ${cur}${formatPriceNum(inn)}/${formatPriceNum(out)} /M`
  if (inn != null) return `按量 · 入 ${cur}${formatPriceNum(inn)}/M`
  return `按量 · 出 ${cur}${formatPriceNum(out!)}/M`
}

function formatPriceNum(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(6).replace(/\.?0+$/, '') || '0'
}
