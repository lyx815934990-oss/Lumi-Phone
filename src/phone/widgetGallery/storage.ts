import type {
  GalleryWidgetKind,
  GalleryWidgetPlacement,
  GalleryWidgetSize,
  WidgetGalleryState,
  WidgetMeta,
} from './types'

/** v3：桌面默认不预置任何装饰组件，需用户手动添加 */
export const WIDGET_GALLERY_STORAGE_KEY = 'lumi-widget-gallery-v3'
const LEGACY_STORAGE_KEY_V2 = 'lumi-widget-gallery-v2'
const LEGACY_STORAGE_KEY = 'lumi-widget-gallery-v1'

/** 梦核 / 铂金灰配色（低饱和） */
export const PLATINUM = {
  ink: '#2c2c2e',
  muted: 'rgba(44, 44, 46, 0.48)',
  line: 'rgba(255, 255, 255, 0.55)',
  acrylic: 'rgba(255, 255, 255, 0.22)',
  paper: '#FAFAFA',
  mist: 'rgba(180, 190, 205, 0.35)',
  stamp: '#3d8b5a',
} as const

export const WIDGET_META: Record<GalleryWidgetKind, WidgetMeta> = {
  polaroid: {
    kind: 'polaroid',
    title: '拍立得 · 单张',
    subtitle: '上传一张温柔照片',
    defaultSize: '2x2',
    decoLabel: '1张',
  },
  polaroidTriple: {
    kind: 'polaroidTriple',
    title: '拍立得 · 三张',
    subtitle: '4×2 三张错位叠放',
    defaultSize: '4x2',
    decoLabel: '3张',
  },
  anniversary: {
    kind: 'anniversary',
    title: '纪念日',
    subtitle: '4×2 双头像气泡天数卡',
    defaultSize: '4x2',
    decoLabel: 'Days',
  },
  stickyNote: {
    kind: 'stickyNote',
    title: '便签',
    subtitle: '一句话心情便利贴',
    defaultSize: '2x2',
    decoLabel: 'Note',
  },
  retroCamera: {
    kind: 'retroCamera',
    title: '复古相机',
    subtitle: '4×2 相机屏可换图',
    defaultSize: '4x2',
    decoLabel: 'Cam',
  },
  musicVinylSleeve: {
    kind: 'musicVinylSleeve',
    title: '超级唱片',
    subtitle: '2×2 封套黑胶 · 点击旋转',
    defaultSize: '2x2',
    decoLabel: 'Vinyl',
  },
  musicPlayerCard: {
    kind: 'musicPlayerCard',
    title: '音乐播放器 · 小号',
    subtitle: '2×2 封面进度播控',
    defaultSize: '2x2',
    decoLabel: 'Mini',
  },
  musicNowPlaying: {
    kind: 'musicNowPlaying',
    title: '音乐播放器 · 中号',
    subtitle: '4×2 NOW PLAYING',
    defaultSize: '4x2',
    decoLabel: 'Now',
  },
  musicVinylDeck: {
    kind: 'musicVinylDeck',
    title: '黑胶唱机',
    subtitle: '4×2 唱片 + 播控条',
    defaultSize: '4x2',
    decoLabel: 'Deck',
  },
}

/** 可添加多枚实例的组件 */
export const MULTI_INSTANCE_WIDGET_KINDS: GalleryWidgetKind[] = [
  'polaroid',
  'polaroidTriple',
  'stickyNote',
  'retroCamera',
  'musicVinylSleeve',
  'musicPlayerCard',
  'musicNowPlaying',
  'musicVinylDeck',
]

/** 可通过「编辑态右上角 +」添加的组件 */
export const ADDABLE_WIDGET_KINDS: GalleryWidgetKind[] = [
  'polaroid',
  'polaroidTriple',
  'anniversary',
  'stickyNote',
  'retroCamera',
  'musicVinylSleeve',
  'musicPlayerCard',
  'musicNowPlaying',
  'musicVinylDeck',
]

export function defaultConfigForKind(
  kind: GalleryWidgetKind,
): Record<string, unknown> | undefined {
  if (kind === 'polaroid') {
    return { rotation: -2.5 }
  }
  if (kind === 'polaroidTriple') {
    return {
      imageA: '',
      imageB: '',
      imageC: '',
    }
  }
  if (kind === 'stickyNote') {
    return { text: '今天也要慢慢来。', tilt: 2.4 }
  }
  if (kind === 'anniversary') {
    return {
      title: '恋爱天数',
      date: '2024-05-20',
      mode: 'since',
      showDate: false,
      nameLeft: '',
      nameRight: '',
      bubbleTop: '｜ıllıııllıl ♡°.•一切順利好運常在•.°♡',
      bubbleBottom: '♥︎․⁺ ✞ 𝑀𝑒𝑚𝑜𝑟𝑖𝑒𝑠 ✞',
    }
  }
  if (kind === 'retroCamera') {
    return { brand: 'iScreen' }
  }
  if (kind === 'musicVinylSleeve' || kind === 'musicVinylDeck') {
    return { spinSpeed: 'medium' }
  }
  return undefined
}

/** 默认空桌面：不预置任何装饰组件 */
export function createDefaultPlacements(): GalleryWidgetPlacement[] {
  return []
}

export function createDefaultGalleryState(): WidgetGalleryState {
  return {
    version: 1,
    placements: [],
  }
}

function isKind(v: unknown): v is GalleryWidgetKind {
  return typeof v === 'string' && v in WIDGET_META
}

function resolveSize(kind: GalleryWidgetKind, raw: unknown): GalleryWidgetSize {
  const def = WIDGET_META[kind].defaultSize
  if (raw === '2x2' || raw === '4x2') {
    if (
      kind === 'retroCamera' ||
      kind === 'polaroidTriple' ||
      kind === 'anniversary' ||
      kind === 'musicNowPlaying' ||
      kind === 'musicVinylDeck'
    ) {
      return '4x2'
    }
    return '2x2'
  }
  return def
}

function migrateAnniversaryConfig(
  kind: GalleryWidgetKind,
  config: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (kind !== 'anniversary') return config
  const base = defaultConfigForKind('anniversary') ?? {}
  const next = { ...base, ...(config ?? {}) }
  // 旧版 items 列表 → 取当前展示项
  if (Array.isArray(config?.items) && config.items.length) {
    const idx =
      typeof config.activeIndex === 'number' ? Math.max(0, config.activeIndex) : 0
    const item = config.items[Math.min(idx, config.items.length - 1)] as
      | Record<string, unknown>
      | undefined
    if (item && typeof item === 'object') {
      if (typeof item.title === 'string') next.title = String(item.title).slice(0, 10)
      if (typeof item.date === 'string') next.date = item.date
      if (item.mode === 'until' || item.mode === 'since') next.mode = item.mode
    }
    delete next.items
    delete next.activeIndex
  }
  return next
}

export function parseGalleryState(raw: unknown): WidgetGalleryState {
  const fallback = createDefaultGalleryState()
  if (!raw || typeof raw !== 'object') return fallback
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.placements)) return fallback

  const placements: GalleryWidgetPlacement[] = []
  for (const item of o.placements) {
    if (!item || typeof item !== 'object') continue
    const p = item as Record<string, unknown>
    if (typeof p.id !== 'string' || !p.id.trim()) continue
    if (!isKind(p.kind)) continue
    const size = resolveSize(p.kind, p.size)
    const maxCol = size === '4x2' ? 0 : 2
    const col =
      typeof p.col === 'number' && Number.isFinite(p.col)
        ? Math.max(0, Math.min(maxCol, Math.floor(p.col)))
        : undefined
    const row =
      typeof p.row === 'number' && Number.isFinite(p.row)
        ? Math.max(0, Math.min(6, Math.floor(p.row)))
        : undefined
    const x =
      typeof p.x === 'number' && Number.isFinite(p.x)
        ? Math.min(100, Math.max(0, p.x))
        : undefined
    const y =
      typeof p.y === 'number' && Number.isFinite(p.y)
        ? Math.min(100, Math.max(0, p.y))
        : undefined
    const rawConfig =
      p.config && typeof p.config === 'object'
        ? (p.config as Record<string, unknown>)
        : undefined
    placements.push({
      id: p.id.trim(),
      kind: p.kind,
      size,
      page: typeof p.page === 'number' && p.page >= 0 ? Math.floor(p.page) : 0,
      order: typeof p.order === 'number' ? p.order : placements.length,
      ...(col != null ? { col } : {}),
      ...(row != null ? { row } : {}),
      ...(x != null ? { x } : {}),
      ...(y != null ? { y } : {}),
      characterId: typeof p.characterId === 'string' ? p.characterId : undefined,
      enabled: p.enabled !== false,
      config: migrateAnniversaryConfig(p.kind, rawConfig),
    })
  }

  if (!placements.length) return createDefaultGalleryState()

  // 不再为缺失 kind 自动塞入禁用占位；仅保留用户已有数据
  placements.sort((a, b) => a.page - b.page || a.order - b.order)
  return { version: 1, placements }
}

export function loadGalleryState(): WidgetGalleryState {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY_V2)
  } catch {
    /* private mode */
  }
  try {
    const raw = localStorage.getItem(WIDGET_GALLERY_STORAGE_KEY)
    if (!raw) return createDefaultGalleryState()
    return parseGalleryState(JSON.parse(raw) as unknown)
  } catch {
    return createDefaultGalleryState()
  }
}

/** 过大的 dataURL 会撑爆配额；超长时清空该字段以便整包仍能落盘 */
function slimConfigImages(
  config: Record<string, unknown> | undefined,
  maxChars: number,
): Record<string, unknown> | undefined {
  if (!config) return config
  let changed = false
  const next: Record<string, unknown> = { ...config }
  for (const [k, v] of Object.entries(next)) {
    if (typeof v === 'string' && v.startsWith('data:image') && v.length > maxChars) {
      next[k] = ''
      changed = true
    }
  }
  return changed ? next : config
}

function slimGalleryState(
  state: WidgetGalleryState,
  maxChars: number,
): WidgetGalleryState {
  return {
    ...state,
    placements: state.placements.map((p) => ({
      ...p,
      config: slimConfigImages(p.config, maxChars),
    })),
  }
}

/** @returns 是否写入成功 */
export function saveGalleryState(state: WidgetGalleryState): boolean {
  const key = WIDGET_GALLERY_STORAGE_KEY
  const tryWrite = (payload: WidgetGalleryState) => {
    localStorage.setItem(key, JSON.stringify(payload))
  }
  try {
    tryWrite(state)
    return true
  } catch {
    /* quota / private mode — 逐步缩小图片后再试 */
  }
  for (const maxChars of [180_000, 100_000, 48_000]) {
    try {
      tryWrite(slimGalleryState(state, maxChars))
      return true
    } catch {
      /* continue */
    }
  }
  try {
    tryWrite(slimGalleryState(state, 0))
    return true
  } catch {
    return false
  }
}
