/**
 * 线下剧情自定义字体：
 * - 字体库：上传 / 改名 / 删除
 * - 应用：勾选区域或设为全局，可跟随全局
 * - 预设：保存当前分配，一键套用（字体文件仍在时）
 */

export type DatingPlotFontRegion = 'narrative' | 'dialogue' | 'innerOs'

/** @deprecated 旧版区域勾选结构，normalize 时迁移进 library + 当前分配 */
export type DatingPlotFontAsset = {
  id: string
  family: string
  fileName: string
  applyNarrative: boolean
  applyDialogue: boolean
  applyInnerOs: boolean
  displayName?: string
}

/** 字体库条目（文件侧存；此处仅元数据） */
export type DatingPlotFontLibraryItem = {
  id: string
  family: string
  /** 用户可改显示名 */
  displayName: string
  /** 原始上传文件名 */
  fileName: string
}

/** 字体预设：记录各区域引用的字体库 id */
export type DatingPlotFontPreset = {
  id: string
  name: string
  narrativeAssetId: string | null
  dialogueAssetId: string | null
  innerOsAssetId: string | null
  /** 全局字体（未勾选区域的回退） */
  globalAssetId: string | null
  followGlobal: boolean
  createdAt: number
}

export type DatingPlotFontSettings = {
  library: DatingPlotFontLibraryItem[]
  /** 当前生效：区域专属（互斥） */
  narrativeAssetId: string | null
  dialogueAssetId: string | null
  innerOsAssetId: string | null
  /** 全局字体 id；未指定区域且 followGlobal 时使用 */
  globalAssetId: string | null
  followGlobal: boolean
  presets: DatingPlotFontPreset[]
  /** 旧字段兼容 */
  assets?: DatingPlotFontAsset[]
}

export type DatingPlotFontCssVars = {
  '--dating-font-narrative': string
  '--dating-font-dialogue': string
  '--dating-font-inner-os': string
}

const FAMILY_PREFIX = 'DatingPlotFont'
const loadedFamilies = new Set<string>()

export function createEmptyDatingPlotFontSettings(): DatingPlotFontSettings {
  return {
    library: [],
    narrativeAssetId: null,
    dialogueAssetId: null,
    innerOsAssetId: null,
    globalAssetId: null,
    followGlobal: true,
    presets: [],
  }
}

export function newDatingPlotFontFamily(): string {
  return `${FAMILY_PREFIX}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function newDatingPlotFontAssetId(): string {
  return `df-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function newDatingPlotFontPresetId(): string {
  return `fp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function stripExt(name: string): string {
  return name.replace(/\.(ttf|otf|woff2?)$/i, '').trim() || '自定义字体'
}

function migrateFromLegacyAssets(assets: DatingPlotFontAsset[]): DatingPlotFontSettings {
  const library: DatingPlotFontLibraryItem[] = []
  let narrativeAssetId: string | null = null
  let dialogueAssetId: string | null = null
  let innerOsAssetId: string | null = null
  let globalAssetId: string | null = null
  for (const a of assets) {
    const id = String(a?.id ?? '').trim()
    const family = String(a?.family ?? '').trim()
    if (!id || !family) continue
    const fileName = String(a?.fileName ?? '').trim() || '自定义字体'
    library.push({
      id,
      family,
      displayName: String(a?.displayName ?? '').trim() || stripExt(fileName),
      fileName,
    })
    if (a.applyNarrative) narrativeAssetId = id
    if (a.applyDialogue) dialogueAssetId = id
    if (a.applyInnerOs) innerOsAssetId = id
    if (!a.applyNarrative && !a.applyDialogue && !a.applyInnerOs) {
      globalAssetId = id
    }
  }
  return {
    library,
    narrativeAssetId,
    dialogueAssetId,
    innerOsAssetId,
    globalAssetId,
    followGlobal: true,
    presets: [],
  }
}

export function normalizeDatingPlotFontSettings(
  raw: DatingPlotFontSettings | null | undefined,
): DatingPlotFontSettings {
  if (!raw) return createEmptyDatingPlotFontSettings()

  // 旧版 assets → library
  if ((!Array.isArray(raw.library) || !raw.library.length) && Array.isArray(raw.assets) && raw.assets.length) {
    const migrated = migrateFromLegacyAssets(raw.assets)
    return {
      ...migrated,
      followGlobal: raw.followGlobal !== false,
      presets: normalizePresets(raw.presets),
    }
  }

  const library: DatingPlotFontLibraryItem[] = []
  const seen = new Set<string>()
  for (const item of Array.isArray(raw.library) ? raw.library : []) {
    const id = String(item?.id ?? '').trim()
    const family = String(item?.family ?? '').trim()
    if (!id || !family || seen.has(id)) continue
    seen.add(id)
    const fileName = String(item?.fileName ?? '').trim() || '自定义字体'
    library.push({
      id,
      family,
      displayName: String(item?.displayName ?? '').trim() || stripExt(fileName),
      fileName,
    })
  }

  const pickId = (v: string | null | undefined): string | null => {
    const id = String(v ?? '').trim()
    if (!id) return null
    return library.some((x) => x.id === id) ? id : null
  }

  return {
    library,
    narrativeAssetId: pickId(raw.narrativeAssetId),
    dialogueAssetId: pickId(raw.dialogueAssetId),
    innerOsAssetId: pickId(raw.innerOsAssetId),
    globalAssetId: pickId(raw.globalAssetId),
    followGlobal: raw.followGlobal !== false,
    presets: normalizePresets(raw.presets),
  }
}

function normalizePresets(raw: DatingPlotFontPreset[] | null | undefined): DatingPlotFontPreset[] {
  if (!Array.isArray(raw)) return []
  const out: DatingPlotFontPreset[] = []
  for (const p of raw) {
    const id = String(p?.id ?? '').trim()
    const name = String(p?.name ?? '').trim()
    if (!id || !name) continue
    out.push({
      id,
      name,
      narrativeAssetId: String(p.narrativeAssetId ?? '').trim() || null,
      dialogueAssetId: String(p.dialogueAssetId ?? '').trim() || null,
      innerOsAssetId: String(p.innerOsAssetId ?? '').trim() || null,
      globalAssetId: String(p.globalAssetId ?? '').trim() || null,
      followGlobal: p.followGlobal !== false,
      createdAt: Number.isFinite(p.createdAt) ? Number(p.createdAt) : Date.now(),
    })
  }
  return out
}

/** 区域专属：勾选某字体到某区域（同区互斥）；勾选后不再作为全局 */
export function setDatingPlotFontRegionExclusive(
  settings: DatingPlotFontSettings,
  assetId: string,
  region: DatingPlotFontRegion,
  on: boolean,
): DatingPlotFontSettings {
  const base = normalizeDatingPlotFontSettings(settings)
  const id = assetId.trim()
  if (!base.library.some((x) => x.id === id)) return base
  const key =
    region === 'narrative'
      ? 'narrativeAssetId'
      : region === 'dialogue'
        ? 'dialogueAssetId'
        : 'innerOsAssetId'
  const next = { ...base, [key]: on ? id : base[key] === id ? null : base[key] } as DatingPlotFontSettings
  if (on && next.globalAssetId === id) next.globalAssetId = null
  return next
}

export function applyDatingPlotFontToAllRegions(
  settings: DatingPlotFontSettings,
  assetId: string,
): DatingPlotFontSettings {
  const base = normalizeDatingPlotFontSettings(settings)
  const id = assetId.trim()
  if (!base.library.some((x) => x.id === id)) return base
  return {
    ...base,
    narrativeAssetId: id,
    dialogueAssetId: id,
    innerOsAssetId: id,
    globalAssetId: null,
  }
}

export function setDatingPlotFontAsGlobal(
  settings: DatingPlotFontSettings,
  assetId: string,
): DatingPlotFontSettings {
  const base = normalizeDatingPlotFontSettings(settings)
  const id = assetId.trim()
  if (!base.library.some((x) => x.id === id)) return base
  // 全局 = 三区默认都跟它：清空分区覆盖，并强制开启跟随
  return {
    ...base,
    globalAssetId: id,
    narrativeAssetId: null,
    dialogueAssetId: null,
    innerOsAssetId: null,
    followGlobal: true,
  }
}

export function isDatingPlotFontGlobal(settings: DatingPlotFontSettings, assetId: string): boolean {
  const s = normalizeDatingPlotFontSettings(settings)
  return s.globalAssetId === assetId.trim()
}

export function regionUsesAsset(
  settings: DatingPlotFontSettings,
  assetId: string,
  region: DatingPlotFontRegion,
): boolean {
  const s = normalizeDatingPlotFontSettings(settings)
  const id = assetId.trim()
  if (region === 'narrative') return s.narrativeAssetId === id
  if (region === 'dialogue') return s.dialogueAssetId === id
  return s.innerOsAssetId === id
}

export function renameDatingPlotFontLibraryItem(
  settings: DatingPlotFontSettings,
  assetId: string,
  displayName: string,
): DatingPlotFontSettings {
  const base = normalizeDatingPlotFontSettings(settings)
  const id = assetId.trim()
  const name = displayName.trim() || '自定义字体'
  return {
    ...base,
    library: base.library.map((x) => (x.id === id ? { ...x, displayName: name } : x)),
  }
}

export function removeDatingPlotFontLibraryItem(
  settings: DatingPlotFontSettings,
  assetId: string,
): DatingPlotFontSettings {
  const base = normalizeDatingPlotFontSettings(settings)
  const id = assetId.trim()
  return {
    ...base,
    library: base.library.filter((x) => x.id !== id),
    narrativeAssetId: base.narrativeAssetId === id ? null : base.narrativeAssetId,
    dialogueAssetId: base.dialogueAssetId === id ? null : base.dialogueAssetId,
    innerOsAssetId: base.innerOsAssetId === id ? null : base.innerOsAssetId,
    globalAssetId: base.globalAssetId === id ? null : base.globalAssetId,
    // 预设仍保留引用；应用时再校验文件是否存在
  }
}

export function saveDatingPlotFontPreset(
  settings: DatingPlotFontSettings,
  name: string,
): DatingPlotFontSettings {
  const base = normalizeDatingPlotFontSettings(settings)
  const n = name.trim()
  if (!n) return base
  const preset: DatingPlotFontPreset = {
    id: newDatingPlotFontPresetId(),
    name: n.slice(0, 40),
    narrativeAssetId: base.narrativeAssetId,
    dialogueAssetId: base.dialogueAssetId,
    innerOsAssetId: base.innerOsAssetId,
    globalAssetId: base.globalAssetId,
    followGlobal: base.followGlobal,
    createdAt: Date.now(),
  }
  return { ...base, presets: [preset, ...base.presets].slice(0, 30) }
}

export function deleteDatingPlotFontPreset(
  settings: DatingPlotFontSettings,
  presetId: string,
): DatingPlotFontSettings {
  const base = normalizeDatingPlotFontSettings(settings)
  return { ...base, presets: base.presets.filter((p) => p.id !== presetId) }
}

export type ApplyFontPresetResult =
  | { ok: true; settings: DatingPlotFontSettings }
  | { ok: false; reason: string }

/** 套用预设：所引用字体须仍在库中且有文件 dataUrl */
export function applyDatingPlotFontPreset(
  settings: DatingPlotFontSettings,
  presetId: string,
  dataUrlById: Record<string, string>,
): ApplyFontPresetResult {
  const base = normalizeDatingPlotFontSettings(settings)
  const preset = base.presets.find((p) => p.id === presetId)
  if (!preset) return { ok: false, reason: '预设不存在' }

  const check = (id: string | null, label: string): string | null => {
    if (!id) return null
    if (!base.library.some((x) => x.id === id)) return `「${label}」引用的字体已从字体库删除`
    if (!dataUrlById[id]?.trim()) return `「${label}」对应字体文件已丢失，请重新上传`
    return null
  }

  const refs: Array<[string | null, string]> = [
    [preset.narrativeAssetId, '正文'],
    [preset.dialogueAssetId, '对白'],
    [preset.innerOsAssetId, '内心OS'],
    [preset.globalAssetId, '全局'],
  ]
  for (const [id, label] of refs) {
    const err = check(id, label)
    if (err) return { ok: false, reason: err }
  }

  return {
    ok: true,
    settings: {
      ...base,
      narrativeAssetId: preset.narrativeAssetId,
      dialogueAssetId: preset.dialogueAssetId,
      innerOsAssetId: preset.innerOsAssetId,
      globalAssetId: preset.globalAssetId,
      followGlobal: preset.followGlobal,
    },
  }
}

function fontFormatFromDataUrl(dataUrl: string, fileName?: string): string | undefined {
  const lower = `${fileName ?? ''} ${dataUrl.slice(0, 80)}`.toLowerCase()
  if (lower.includes('woff2')) return 'woff2'
  if (lower.includes('woff')) return 'woff'
  if (lower.includes('opentype') || lower.includes('.otf')) return 'opentype'
  if (lower.includes('truetype') || lower.includes('.ttf')) return 'truetype'
  return undefined
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const comma = dataUrl.indexOf(',')
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const isBase64 = /;base64/i.test(dataUrl.slice(0, Math.max(0, comma)))
  if (isBase64) {
    const bin = atob(payload)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
  }
  const text = decodeURIComponent(payload)
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i)
  return bytes.buffer
}

export async function ensureDatingPlotFontLoaded(
  family: string,
  dataUrl: string,
  fileName?: string,
): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) return false
  const fam = family.trim()
  const src = dataUrl.trim()
  if (!fam || !src) return false
  if (loadedFamilies.has(fam)) return true

  const descriptors: FontFaceDescriptors = { weight: 'normal', style: 'normal', display: 'swap' }

  const tryLoad = async (face: FontFace) => {
    const loaded = await face.load()
    document.fonts.add(loaded)
    loadedFamilies.add(fam)
    return true
  }

  // 1) data URL → ArrayBuffer（比 url(data:...) 更稳：避免未加引号 / 超长字符串解析失败）
  if (src.startsWith('data:')) {
    try {
      let buf: ArrayBuffer
      try {
        buf = dataUrlToArrayBuffer(src)
      } catch {
        const res = await fetch(src)
        buf = await res.arrayBuffer()
      }
      if (await tryLoad(new FontFace(fam, buf, descriptors))) return true
    } catch (err) {
      console.warn('[dating-font] ArrayBuffer load failed, fallback url()', fam, err)
    }
  }

  // 2) url("...") 回退（务必给 data URL 加引号）
  try {
    const format = fontFormatFromDataUrl(src, fileName)
    const source = format ? `url("${src}") format("${format}")` : `url("${src}")`
    if (await tryLoad(new FontFace(fam, source, descriptors))) return true
  } catch (err) {
    console.warn('[dating-font] url() load failed', fam, err)
  }
  return false
}

export async function ensureDatingPlotFontsLoaded(
  settings: DatingPlotFontSettings,
  dataUrlById: Record<string, string>,
): Promise<boolean> {
  const s = normalizeDatingPlotFontSettings(settings)
  const results = await Promise.all(
    s.library.map(async (a) => {
      const url = dataUrlById[a.id]?.trim()
      if (!url) return false
      return ensureDatingPlotFontLoaded(a.family, url, a.fileName)
    }),
  )
  return results.some(Boolean)
}

function familyById(settings: DatingPlotFontSettings, id: string | null): string | null {
  if (!id) return null
  return settings.library.find((x) => x.id === id)?.family ?? null
}

function pickFamilyForRegion(
  settings: DatingPlotFontSettings,
  region: DatingPlotFontRegion,
  dataUrlById: Record<string, string>,
): string | null {
  const s = normalizeDatingPlotFontSettings(settings)
  const specificId =
    region === 'narrative'
      ? s.narrativeAssetId
      : region === 'dialogue'
        ? s.dialogueAssetId
        : s.innerOsAssetId
  // 分区指定优先；文件缺失时回退全局，避免「设了却变黑体」
  if (specificId) {
    if (dataUrlById[specificId]?.trim()) return familyById(s, specificId)
  }
  if (s.followGlobal !== false && s.globalAssetId) {
    if (dataUrlById[s.globalAssetId]?.trim()) return familyById(s, s.globalAssetId)
  }
  return null
}

/**
 * 未指定自定义字体 / 自定义字体缺字形时：回退手机全局衬线，禁止落到 PingFang/雅黑。
 * （此前 SYSTEM_STACK 是无衬线，会把「全局艺术衬线」整页盖成黑体。）
 */
const PHONE_GLOBAL_FONT_FALLBACK =
  'var(--wx-font, var(--phone-font, "Noto Serif SC", "STKaiti", "KaiTi", "Songti SC", "STSong", serif))'

export function buildDatingPlotFontCssVars(
  settings: DatingPlotFontSettings,
  dataUrlById: Record<string, string>,
): DatingPlotFontCssVars {
  const wrap = (family: string | null) =>
    family ? `"${family}", ${PHONE_GLOBAL_FONT_FALLBACK}` : PHONE_GLOBAL_FONT_FALLBACK
  return {
    '--dating-font-narrative': wrap(pickFamilyForRegion(settings, 'narrative', dataUrlById)),
    '--dating-font-dialogue': wrap(pickFamilyForRegion(settings, 'dialogue', dataUrlById)),
    '--dating-font-inner-os': wrap(pickFamilyForRegion(settings, 'innerOs', dataUrlById)),
  }
}

export function summarizeDatingPlotFontSettings(settings: DatingPlotFontSettings): string {
  const s = normalizeDatingPlotFontSettings(settings)
  const n = s.library.length
  if (!n) return '系统默认'
  const bits: string[] = [`库${n}`]
  if (s.presets.length) bits.push(`预设${s.presets.length}`)
  const regions: string[] = []
  if (s.narrativeAssetId) regions.push('正文')
  if (s.dialogueAssetId) regions.push('对白')
  if (s.innerOsAssetId) regions.push('内心')
  if (s.globalAssetId) regions.push('全局')
  if (regions.length) bits.push(regions.join('·'))
  if (!s.followGlobal) bits.push('不跟随')
  return bits.join(' · ')
}
