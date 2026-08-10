export type GalleryWidgetSize = '2x2' | '4x2'

/**
 * 桌面组件 kind。新增组件时同步更新
 * `storage.ts` / `widgets/registry.tsx`。
 */
export type GalleryWidgetKind =
  | 'polaroid'
  | 'polaroidTriple'
  | 'anniversary'
  | 'stickyNote'
  | 'retroCamera'
  | 'musicVinylSleeve'
  | 'musicPlayerCard'
  | 'musicNowPlaying'
  | 'musicVinylDeck'

export type GalleryWidgetPlacement = {
  id: string
  kind: GalleryWidgetKind
  size: GalleryWidgetSize
  /** 组件库内分页（0-based） */
  page: number
  /** 同页内排序（兼容；主布局以 col/row 为准） */
  order: number
  /** 网格左上角列（0-based，占位布局） */
  col?: number
  /** 网格左上角行（0-based） */
  row?: number
  /** @deprecated 旧自由悬浮坐标，解析时会映射到网格 */
  x?: number
  /** @deprecated 旧自由悬浮坐标 */
  y?: number
  characterId?: string
  enabled: boolean
  config?: Record<string, unknown>
}

export type WidgetGalleryState = {
  version: 1
  placements: GalleryWidgetPlacement[]
}

export type WidgetMeta = {
  kind: GalleryWidgetKind
  title: string
  subtitle: string
  defaultSize: GalleryWidgetSize
  decoLabel: string
}

export const SIZE_SPAN: Record<
  GalleryWidgetSize,
  { col: number; row: number }
> = {
  '2x2': { col: 2, row: 2 },
  '4x2': { col: 4, row: 2 },
}
