import type { GalleryWidgetPlacement, GalleryWidgetSize } from './types'

export const GALLERY_GRID_COLS = 4
/** 每页固定 4×7 占位网格 */
export const GALLERY_GRID_ROWS = 7
export const GALLERY_GRID_GAP = 10
/** 主屏可放组件的页数（0 / 1 / 2） */
export const HOME_WIDGET_PAGE_COUNT = 3

/** 个人名片在主屏第 0 页占用 4×3 */
export const HOME_PROFILE_SPAN = { w: 4, h: 3 } as const

export type GridOrigin = { col: number; row: number }

/**
 * 名片顶行（0-based）。合法范围 0 .. PROFILE_ROW_MAX（一行一行挪，不只顶/底）。
 * 兼容旧存储：'top' → 0，'bottom' → PROFILE_ROW_MAX。
 */
export type ProfileAnchor = number

/** 名片可落的最大顶行（含）：7−3=4 */
export const PROFILE_ROW_MAX = GALLERY_GRID_ROWS - HOME_PROFILE_SPAN.h

export function clampProfileAnchor(raw: unknown): ProfileAnchor {
  if (raw === 'bottom') return PROFILE_ROW_MAX
  if (raw === 'top') return 0
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(PROFILE_ROW_MAX, Math.round(raw)))
  }
  return 0
}

/** 名片左上角（0-based，与组件库网格一致） */
export function homeProfileOrigin(anchor: ProfileAnchor = 0): GridOrigin {
  return { col: 0, row: clampProfileAnchor(anchor) }
}

/** 名片占用的全部格子（0-based） */
export function homeProfileCells(anchor: ProfileAnchor = 0): GridOrigin[] {
  const o = homeProfileOrigin(anchor)
  const out: GridOrigin[] = []
  for (let r = 0; r < HOME_PROFILE_SPAN.h; r += 1) {
    for (let c = 0; c < HOME_PROFILE_SPAN.w; c += 1) {
      out.push({ col: o.col + c, row: o.row + r })
    }
  }
  return out
}

/** 1-based 主屏格：名片占用（给图标避让用） */
export function homeProfileHomeCells(anchor: ProfileAnchor = 0): Array<{ col: number; row: number }> {
  return homeProfileCells(anchor).map((c) => ({ col: c.col + 1, row: c.row + 1 }))
}

const HOME_WIDGET_LAYOUT_STORAGE_KEY = 'lumi-home-widget-layout-v1'

/** 读主屏名片顶行（与 HomeScreen 同源） */
export function readHomeProfileAnchor(): ProfileAnchor {
  if (typeof window === 'undefined') return 0
  try {
    const raw = JSON.parse(
      window.localStorage.getItem(HOME_WIDGET_LAYOUT_STORAGE_KEY) || '{}',
    ) as { profileAnchor?: unknown }
    return clampProfileAnchor(raw.profileAnchor)
  } catch {
    return 0
  }
}

/** 某页不可被组件占用的格子（第 0 页预留名片 4×3） */
export function reservedOriginsForPage(page: number, anchor?: ProfileAnchor): GridOrigin[] {
  if (page !== 0) return []
  return homeProfileCells(anchor ?? readHomeProfileAnchor())
}

export function originHitsReserved(
  origin: GridOrigin,
  size: GalleryWidgetSize,
  reserved: GridOrigin[],
): boolean {
  if (!reserved.length) return false
  const set = new Set(reserved.map((c) => `${c.col},${c.row}`))
  return cellsOfOrigin(origin, size).some((c) => set.has(`${c.col},${c.row}`))
}

function originInPageBounds(origin: GridOrigin, size: GalleryWidgetSize): boolean {
  const { w, h } = spanOf(size)
  return (
    origin.col >= 0 &&
    origin.row >= 0 &&
    origin.col + w <= GALLERY_GRID_COLS &&
    origin.row + h <= GALLERY_GRID_ROWS
  )
}

/** 按组件尺寸占位：2×2 或整行 4×2 */
export function spanOf(size?: GalleryWidgetSize): { w: number; h: number } {
  return size === '4x2' ? { w: 4, h: 2 } : { w: 2, h: 2 }
}

export function cellKey(col: number, row: number): string {
  return `${col},${row}`
}

export function cellsOfOrigin(
  origin: GridOrigin,
  size: GalleryWidgetSize,
): GridOrigin[] {
  const { w, h } = spanOf(size)
  const out: GridOrigin[] = []
  for (let r = 0; r < h; r += 1) {
    for (let c = 0; c < w; c += 1) {
      out.push({ col: origin.col + c, row: origin.row + r })
    }
  }
  return out
}

export function clampOrigin(
  origin: GridOrigin,
  size: GalleryWidgetSize = '2x2',
): GridOrigin {
  const { w, h } = spanOf(size)
  return {
    col: Math.max(0, Math.min(GALLERY_GRID_COLS - w, Math.floor(origin.col))),
    row: Math.max(0, Math.min(GALLERY_GRID_ROWS - h, Math.floor(origin.row))),
  }
}

export function originsOverlap(
  a: GridOrigin,
  aSize: GalleryWidgetSize,
  b: GridOrigin,
  bSize: GalleryWidgetSize,
): boolean {
  const { w: aw, h: ah } = spanOf(aSize)
  const { w: bw, h: bh } = spanOf(bSize)
  return (
    a.col < b.col + bw &&
    b.col < a.col + aw &&
    a.row < b.row + bh &&
    b.row < a.row + ah
  )
}

/** 目标格是否可放（忽略自身；仅看同页 enabled；避开预留格） */
export function canPlaceAt(
  placements: GalleryWidgetPlacement[],
  selfId: string,
  origin: GridOrigin,
  size: GalleryWidgetSize,
  page?: number,
  reserved?: GridOrigin[],
): boolean {
  const o = clampOrigin(origin, size)
  if (o.col + spanOf(size).w > GALLERY_GRID_COLS) return false
  if (o.row < 0 || o.row + spanOf(size).h > GALLERY_GRID_ROWS) return false
  const reservedCells =
    reserved ??
    (typeof page === 'number' ? reservedOriginsForPage(page) : [])
  if (originHitsReserved(o, size, reservedCells)) return false
  for (const p of placements) {
    if (!p.enabled || p.id === selfId) continue
    if (typeof page === 'number' && p.page !== page) continue
    const other = resolveGridOrigin(p)
    if (originsOverlap(o, size, other, p.size)) return false
  }
  return true
}

/** 找第一个可放空位（限定在固定 4×7 页内；第 0 页避开名片 4×3） */
export function findFirstFreeOrigin(
  placements: GalleryWidgetPlacement[],
  size: GalleryWidgetSize = '2x2',
  excludeId?: string,
  page?: number,
  reserved?: GridOrigin[],
): GridOrigin | null {
  const { w, h } = spanOf(size)
  const scoped =
    typeof page === 'number'
      ? placements.filter((p) => p.page === page || p.id === excludeId)
      : placements
  const reservedCells =
    reserved ??
    (typeof page === 'number' ? reservedOriginsForPage(page) : [])
  for (let row = 0; row <= GALLERY_GRID_ROWS - h; row += 1) {
    for (let col = 0; col <= GALLERY_GRID_COLS - w; col += 1) {
      const origin = { col, row }
      if (canPlaceAt(scoped, excludeId ?? '', origin, size, page, reservedCells)) {
        return origin
      }
    }
  }
  return null
}

/** 按 order 生成默认格点（迁移旧数据） */
export function defaultOriginForOrder(
  order: number,
  size: GalleryWidgetSize = '2x2',
): GridOrigin {
  if (size === '4x2') {
    return { col: 0, row: Math.min(GALLERY_GRID_ROWS - 2, order * 2) }
  }
  const col = (order % 2) * 2
  const row = Math.min(GALLERY_GRID_ROWS - 2, Math.floor(order / 2) * 2)
  return { col, row }
}

/**
 * 解析网格原点。优先 col/row；兼容旧版 x/y 百分比。
 */
export function resolveGridOrigin(p: GalleryWidgetPlacement): GridOrigin {
  if (
    typeof p.col === 'number' &&
    Number.isFinite(p.col) &&
    typeof p.row === 'number' &&
    Number.isFinite(p.row)
  ) {
    return clampOrigin({ col: p.col, row: p.row }, p.size)
  }

  // 旧自由布局 x/y → 粗略映射到网格
  if (
    typeof p.x === 'number' &&
    Number.isFinite(p.x) &&
    typeof p.y === 'number' &&
    Number.isFinite(p.y)
  ) {
    const col = Math.round((p.x / 100) * GALLERY_GRID_COLS)
    const row = Math.round((p.y / 100) * GALLERY_GRID_ROWS)
    return clampOrigin({ col, row }, p.size)
  }

  return defaultOriginForOrder(p.order, p.size)
}

export function maxOccupiedRow(placements: GalleryWidgetPlacement[]): number {
  let max = 2
  for (const p of placements) {
    if (!p.enabled) continue
    const o = resolveGridOrigin(p)
    max = Math.max(max, o.row + spanOf(p.size).h)
  }
  return Math.max(4, max)
}

/** 指针落点 → 吸附为组件左上角格（支持非正方形格子） */
export function pointerToOrigin(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  cellSize: number,
  size: GalleryWidgetSize,
  cellHeight?: number,
): GridOrigin {
  const gap = GALLERY_GRID_GAP
  const localX = clientX - canvasRect.left
  const localY = clientY - canvasRect.top
  const cellW = cellSize
  const cellH = cellHeight ?? cellSize
  const col = Math.round(localX / (cellW + gap) - spanOf(size).w / 2)
  const row = Math.round(localY / (cellH + gap) - spanOf(size).h / 2)
  return clampOrigin({ col, row }, size)
}

/** 从画布实测宽高推算落点（1fr 网格用） */
export function pointerToOriginFromCanvas(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  size: GalleryWidgetSize,
): GridOrigin {
  const gap = GALLERY_GRID_GAP
  const cellW =
    (canvasRect.width - gap * (GALLERY_GRID_COLS - 1)) / GALLERY_GRID_COLS
  const cellH =
    (canvasRect.height - gap * (GALLERY_GRID_ROWS - 1)) / GALLERY_GRID_ROWS
  return pointerToOrigin(clientX, clientY, canvasRect, cellW, size, cellH)
}

function neighborPages(page: number): number[] {
  return [page + 1, page - 1, page + 2, page - 2].filter(
    (pg) => pg >= 0 && pg < HOME_WIDGET_PAGE_COUNT && pg !== page,
  )
}

/**
 * 将 self 放到目标格。
 * 组件占位绝对优先：只要同页组件之间还能错开，就全部留在本页；
 * 图标去剩余空格让位（挤不下的图标隐藏），绝不因为给图标腾位而把组件跨页挤走。
 * 只有「同页已没有任何空位能放下被挤的那个组件」时，才推到邻页。
 */
export function applyPlacementWithYield(
  placements: GalleryWidgetPlacement[],
  selfId: string,
  targetPage: number,
  targetOrigin: GridOrigin,
): GalleryWidgetPlacement[] {
  const self = placements.find((p) => p.id === selfId)
  if (!self || !self.enabled) return placements

  const size = self.size
  let page = Math.max(0, Math.min(HOME_WIDGET_PAGE_COUNT - 1, Math.floor(targetPage)))
  let origin = clampOrigin(targetOrigin, size)
  const reserved = reservedOriginsForPage(page)

  if (!originInPageBounds(origin, size) || originHitsReserved(origin, size, reserved)) {
    const alt = findFirstFreeOrigin(placements, size, selfId, page)
    if (alt) {
      origin = alt
    } else {
      for (const pg of neighborPages(page)) {
        const o = findFirstFreeOrigin(placements, size, selfId, pg)
        if (o) {
          page = pg
          origin = o
          break
        }
      }
    }
  }

  let next = placements.map((p) =>
    p.id === selfId
      ? {
          ...p,
          page,
          col: origin.col,
          row: origin.row,
          x: undefined,
          y: undefined,
        }
      : { ...p },
  )

  const overlapping = next.filter((p) => {
    if (!p.enabled || p.id === selfId || p.page !== page) return false
    return originsOverlap(origin, size, resolveGridOrigin(p), p.size)
  })

  for (const hit of overlapping) {
    const withoutHitAtTarget = next.map((p) =>
      p.id === hit.id ? { ...p, enabled: false } : p,
    )
    const pool = withoutHitAtTarget.filter((p) => p.enabled || p.id === hit.id)

    // 同页有空位 → 必须留本页（哪怕挤占图标区）
    let destPage = page
    let dest = findFirstFreeOrigin(pool, hit.size, hit.id, page)

    // 同页实在塞不下这个组件尺寸，才去邻页
    if (!dest) {
      for (const pg of neighborPages(page)) {
        dest = findFirstFreeOrigin(pool, hit.size, hit.id, pg)
        if (dest) {
          destPage = pg
          break
        }
      }
    }

    if (!dest) {
      destPage =
        page === 0 ? 1 : Math.min(page + 1, HOME_WIDGET_PAGE_COUNT - 1)
      if (destPage === page) destPage = page > 0 ? page - 1 : 1
      dest =
        findFirstFreeOrigin(pool, hit.size, hit.id, destPage) ??
        clampOrigin({ col: 0, row: 0 }, hit.size)
    }

    next = next.map((p) =>
      p.id === hit.id
        ? {
            ...p,
            enabled: true,
            page: destPage,
            col: dest.col,
            row: dest.row,
            x: undefined,
            y: undefined,
          }
        : p,
    )
  }

  return next
}

/** 把压在名片 4×3 上的组件挪走（加载时纠偏） */
export function evacuateReservedProfileCells(
  placements: GalleryWidgetPlacement[],
  anchor?: ProfileAnchor,
): GalleryWidgetPlacement[] {
  let next = placements.map((p) => ({ ...p }))
  const a = anchor ?? readHomeProfileAnchor()
  for (const p of next) {
    if (!p.enabled || p.page !== 0) continue
    const o = resolveGridOrigin(p)
    if (!originHitsReserved(o, p.size, homeProfileCells(a))) continue
    const dest = findFirstFreeOrigin(next, p.size, p.id, 0, homeProfileCells(a))
    if (dest) {
      next = next.map((x) =>
        x.id === p.id
          ? { ...x, col: dest.col, row: dest.row, x: undefined, y: undefined }
          : x,
      )
    } else {
      for (const pg of neighborPages(0)) {
        const o1 = findFirstFreeOrigin(next, p.size, p.id, pg)
        if (!o1) continue
        next = next.map((x) =>
          x.id === p.id
            ? {
                ...x,
                page: pg,
                col: o1.col,
                row: o1.row,
                x: undefined,
                y: undefined,
              }
            : x,
        )
        break
      }
    }
  }
  return next
}

/** 组件占用的 1-based 主屏格点（用于排挤图标） */
export function widgetOccupiedHomeCells(
  placements: GalleryWidgetPlacement[],
  page: number,
): Array<{ col: number; row: number }> {
  const out: Array<{ col: number; row: number }> = []
  for (const p of placements) {
    if (!p.enabled || p.page !== page) continue
    for (const c of cellsOfOrigin(resolveGridOrigin(p), p.size)) {
      out.push({ col: c.col + 1, row: c.row + 1 })
    }
  }
  return out
}
