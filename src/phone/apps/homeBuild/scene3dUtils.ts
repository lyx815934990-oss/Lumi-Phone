import { FLOOR_MATERIALS, LEGACY_FLOOR_MATERIAL_IDS, WALL_MATERIALS } from './defaults'
import { floorPlanBounds, floorPlanCenter, wallLength } from './floorPlanGeometry'
import {
  DOOR_HEIGHT,
  WALL_HEIGHT,
  WALL_HEIGHT_MAX,
  WALL_HEIGHT_MIN,
  WINDOW_LINTEL,
  WINDOW_SILL,
} from './sceneConstants'
import type {
  CeilingHole,
  DoorWindowOpening,
  FloorLevel,
  HomeBuildDraft,
  HomeBuildMode,
  OutdoorTimeOfDay,
  RoomZone,
  WallSegment,
} from './types'
import { Color } from 'three'

/** 地砖中心是否落在天花板开洞区域内 */
export function tileInCeilingHole(gx: number, gz: number, holes: CeilingHole[]): boolean {
  const cx = gx + 0.5
  const cz = gz + 0.5
  return holes.some(
    (h) =>
      cx >= h.rect.x &&
      cx <= h.rect.x + h.rect.w &&
      cz >= h.rect.z &&
      cz <= h.rect.z + h.rect.h,
  )
}

/** 当前楼层下方（低一层）的天花板开洞 → 本层地板应留空 */
export function ceilingHolesFromFloorBelow(draft: HomeBuildDraft, floorId: string): CeilingHole[] {
  const idx = floorIndexOf(draft, floorId)
  if (idx <= 0) return []
  return draft.floors[idx - 1]?.ceilingHoles ?? []
}

export type WallPiece3D = {
  ax: number
  az: number
  bx: number
  bz: number
  yMin: number
  yMax: number
}

export function floorIndexOf(draft: HomeBuildDraft, floorId: string): number {
  const idx = draft.floors.findIndex((f) => f.id === floorId)
  return idx >= 0 ? idx : 0
}

export function clampWallHeight(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : WALL_HEIGHT
  return Math.max(WALL_HEIGHT_MIN, Math.min(WALL_HEIGHT_MAX, Math.round(v * 20) / 20))
}

/** 本层墙高（米） */
export function wallHeightOf(floor: Pick<FloorLevel, 'wallHeight'> | undefined): number {
  return clampWallHeight(floor?.wallHeight ?? WALL_HEIGHT)
}

/** 第 index 层楼板世界高度（下层墙高累加） */
export function floorBaseYByIndex(draft: HomeBuildDraft, index: number): number {
  let y = 0
  const n = Math.max(0, Math.min(index, draft.floors.length))
  for (let i = 0; i < n; i++) {
    y += wallHeightOf(draft.floors[i])
  }
  return y
}

export function floorBaseY(draft: HomeBuildDraft, floorId: string): number {
  return floorBaseYByIndex(draft, floorIndexOf(draft, floorId))
}

export function floorCeilingYByIndex(draft: HomeBuildDraft, index: number): number {
  const floor = draft.floors[index]
  if (!floor) return floorBaseYByIndex(draft, index) + WALL_HEIGHT
  return floorBaseYByIndex(draft, index) + wallHeightOf(floor)
}

/** 根据世界高度找最近楼层索引 */
export function floorIndexAtWorldY(draft: HomeBuildDraft, y: number): number {
  if (draft.floors.length === 0) return 0
  for (let i = 0; i < draft.floors.length; i++) {
    const y1 = floorCeilingYByIndex(draft, i)
    if (y < y1 - 0.02) return i
  }
  return draft.floors.length - 1
}

export function doorHeightForWall(wallHeight: number): number {
  return Math.min(DOOR_HEIGHT, Math.max(1.6, wallHeight - 0.3))
}

/** 家具所属楼层：优先 floorId，否则按脚底高度贴最近楼板 */
export function resolveFurnitureFloorId(
  draft: HomeBuildDraft,
  item: { floorId?: string; position: { y: number } },
): string {
  if (item.floorId && draft.floors.some((f) => f.id === item.floorId)) {
    return item.floorId
  }
  let bestId = draft.floors[0]?.id ?? draft.activeFloorId
  let bestDist = Infinity
  for (let i = 0; i < draft.floors.length; i++) {
    const y0 = floorBaseYByIndex(draft, i)
    const d = Math.abs(item.position.y - y0)
    if (d < bestDist) {
      bestDist = d
      bestId = draft.floors[i]!.id
    }
  }
  return bestId
}

export function isFurnitureOnFloor(
  draft: HomeBuildDraft,
  item: { floorId?: string; position: { y: number } },
  floorId: string,
): boolean {
  return resolveFurnitureFloorId(draft, item) === floorId
}

export function materialColor(materialId: string | undefined, kind: 'floor' | 'wall'): string {
  const list = kind === 'floor' ? FLOOR_MATERIALS : WALL_MATERIALS
  const resolved =
    kind === 'floor' && materialId ? (LEGACY_FLOOR_MATERIAL_IDS[materialId] ?? materialId) : materialId
  return list.find((m) => m.id === resolved)?.color ?? (kind === 'floor' ? '#b8956a' : '#f5f3ef')
}

export function materialRoughness(materialId: string | undefined, kind: 'floor' | 'wall'): number {
  const list = kind === 'floor' ? FLOOR_MATERIALS : WALL_MATERIALS
  const resolved =
    kind === 'floor' && materialId ? (LEGACY_FLOOR_MATERIAL_IDS[materialId] ?? materialId) : materialId
  return list.find((m) => m.id === resolved)?.roughness ?? (kind === 'floor' ? 0.65 : 0.9)
}

export function materialMetalness(materialId: string | undefined, kind: 'floor' | 'wall'): number {
  const list = kind === 'floor' ? FLOOR_MATERIALS : WALL_MATERIALS
  const resolved =
    kind === 'floor' && materialId ? (LEGACY_FLOOR_MATERIAL_IDS[materialId] ?? materialId) : materialId
  return list.find((m) => m.id === resolved)?.metalness ?? 0
}

export function resolveFloorMaterialId(materialId?: string): string | undefined {
  if (!materialId) return materialId
  return LEGACY_FLOOR_MATERIAL_IDS[materialId] ?? materialId
}

export function isPoolFloorMaterial(materialId?: string): boolean {
  const resolved = resolveFloorMaterialId(materialId)
  return FLOOR_MATERIALS.some((m) => m.id === resolved && m.family === 'pool')
}

export type SurfaceLightingContext = {
  allowSpecular: boolean
  nightMode: boolean
  timeOfDay: OutdoorTimeOfDay
  surfaceTint: string
  surfaceDim: number
}

/** 按时段/天气给墙地顶乘色调与亮度，避免昼夜切换时仍像建模视图全亮 */
export function surfaceColor(
  materialId: string | undefined,
  surface: 'floor' | 'wall' | 'ceiling',
  ctx: SurfaceLightingContext,
): string {
  const kind = surface === 'floor' ? 'floor' : 'wall'
  const base = new Color(materialColor(materialId, kind))
  base.multiply(new Color(ctx.surfaceTint)).multiplyScalar(ctx.surfaceDim)
  return `#${base.getHexString()}`
}

/** 按天气/材质调整 PBR：晴天墙面反射 > 地板；雨雪天哑光 */
export function surfaceRoughness(
  materialId: string | undefined,
  surface: 'floor' | 'wall' | 'ceiling',
  ctx: SurfaceLightingContext,
): number {
  const kind = surface === 'floor' ? 'floor' : 'wall'
  const base = materialRoughness(materialId, kind)
  if (!ctx.allowSpecular) {
    return surface === 'floor' ? 0.96 : 0.92
  }

  if (ctx.nightMode) {
    if (surface === 'wall' || surface === 'ceiling') return Math.max(base, 0.88)
    return Math.max(base, 0.82)
  }

  if (surface === 'floor') return Math.max(base * 0.9, 0.72)
  if (surface === 'wall' || surface === 'ceiling') return Math.min(Math.max(base * 0.78, 0.62), 0.82)
  return base
}

export function surfaceMetalness(
  materialId: string | undefined,
  surface: 'floor' | 'wall' | 'ceiling',
  ctx: SurfaceLightingContext,
): number {
  if (!ctx.allowSpecular) return 0
  if (ctx.nightMode && (surface === 'wall' || surface === 'ceiling')) return 0
  if (surface === 'wall' || surface === 'ceiling') return 0.04
  return materialMetalness(materialId, 'floor') * (ctx.nightMode ? 0.35 : 1)
}

export function roomWallMaterial(room: RoomZone): string {
  return materialColor(room.wallMaterialId, 'wall')
}

export function roomFloorMaterial(room: RoomZone): string {
  return materialColor(room.floorMaterialId, 'floor')
}

export type WallPieceOptions = {
  /** 水平延伸，消除墙角缝隙 */
  horizontalOverlap?: number
  /** 垂直延伸，消除层间缝隙 */
  verticalOverlap?: number
}

/** 按门窗开洞将墙体切成可渲染片段 */
export function computeWallPieces(
  wall: WallSegment,
  openings: DoorWindowOpening[],
  floorY: number,
  options?: WallPieceOptions,
  wallHeight = WALL_HEIGHT,
): WallPiece3D[] {
  const horizontalOverlap = options?.horizontalOverlap ?? 0
  const verticalOverlap = options?.verticalOverlap ?? 0
  const h = clampWallHeight(wallHeight)
  const len = wallLength(wall)
  if (len < 0.01) return []

  const wallOpenings = openings.filter((o) => o.wallId === wall.id)
  let intervals: { t0: number; t1: number }[] = [{ t0: 0, t1: 1 }]

  for (const op of wallOpenings) {
    const half = op.width / 2 / len
    const hole = { t0: Math.max(0, op.t - half), t1: Math.min(1, op.t + half) }
    const next: typeof intervals = []
    for (const seg of intervals) {
      if (hole.t1 <= seg.t0 || hole.t0 >= seg.t1) {
        next.push(seg)
        continue
      }
      if (hole.t0 > seg.t0) next.push({ t0: seg.t0, t1: hole.t0 })
      if (hole.t1 < seg.t1) next.push({ t0: hole.t1, t1: seg.t1 })
    }
    intervals = next
  }

  const pieces: WallPiece3D[] = []
  const pushPiece = (t0: number, t1: number, yMin: number, yMax: number) => {
    if (t1 - t0 < 0.01 || yMax - yMin < 0.02) return
    let ax = wall.a.x + (wall.b.x - wall.a.x) * t0
    let az = wall.a.z + (wall.b.z - wall.a.z) * t0
    let bx = wall.a.x + (wall.b.x - wall.a.x) * t1
    let bz = wall.a.z + (wall.b.z - wall.a.z) * t1
    if (horizontalOverlap > 0 && len > 0.01) {
      const dx = (wall.b.x - wall.a.x) / len
      const dz = (wall.b.z - wall.a.z) / len
      ax -= dx * horizontalOverlap
      az -= dz * horizontalOverlap
      bx += dx * horizontalOverlap
      bz += dz * horizontalOverlap
    }
    pieces.push({
      ax,
      az,
      bx,
      bz,
      yMin: yMin - verticalOverlap,
      yMax: yMax + verticalOverlap,
    })
  }

  for (const seg of intervals) {
    pushPiece(seg.t0, seg.t1, floorY, floorY + h)
  }

  const sill = Math.min(WINDOW_SILL, h * 0.38)
  const lintel = Math.min(WINDOW_LINTEL, Math.max(sill + 0.45, h * 0.82))
  for (const op of wallOpenings) {
    if (op.kind !== 'window') continue
    const half = op.width / 2 / len
    const t0 = Math.max(0, op.t - half)
    const t1 = Math.min(1, op.t + half)
    pushPiece(t0, t1, floorY, floorY + sill)
    if (lintel < h - 0.05) {
      pushPiece(t0, t1, floorY + lintel, floorY + h)
    }
  }

  return pieces
}

export function cameraPoseForDraft(draft: HomeBuildDraft, mode: HomeBuildMode) {
  const floor = draft.floors.find((f) => f.id === draft.activeFloorId) ?? draft.floors[0]!
  const b = floorPlanBounds(floor)
  const c = floorPlanCenter(floor)
  const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ, 4)
  const floorY = floorBaseY(draft, floor.id)

  if (mode === 'walk') {
    return {
      position: [c.x, floorY + 1.65, c.z + 0.5] as [number, number, number],
      target: [c.x, floorY + 1.5, c.z + 2.5] as [number, number, number],
    }
  }
  if (mode === 'avatar') {
    // 人物工作室：镜头对准房间中心的同住 OC 立绘
    return {
      position: [c.x + 0.15, floorY + 1.35, c.z + Math.max(2.8, span * 0.45)] as [
        number,
        number,
        number,
      ],
      target: [c.x, floorY + 0.95, c.z] as [number, number, number],
    }
  }
  if (mode === 'ghost') {
    return {
      position: [c.x + span * 0.75, floorY + span * 0.55 + 1.5, c.z + span * 0.85] as [
        number,
        number,
        number,
      ],
      target: [c.x, floorY + 1.2, c.z] as [number, number, number],
    }
  }
  return {
    position: [c.x, floorY + span * 1.6, c.z + span * 0.15] as [number, number, number],
    target: [c.x, floorY, c.z] as [number, number, number],
  }
}

export function orbitDistanceLimits(draft: HomeBuildDraft): { min: number; max: number } {
  const floor = draft.floors.find((f) => f.id === draft.activeFloorId) ?? draft.floors[0]!
  const b = floorPlanBounds(floor)
  const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ, 4)
  return { min: span * 0.35, max: span * 2.8 }
}
