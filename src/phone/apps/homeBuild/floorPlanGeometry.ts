import type { FloorLevel, RoomZone, Vec2, WallSegment } from './types'

export function distPointToSegment(
  p: Vec2,
  a: Vec2,
  b: Vec2,
): { dist: number; t: number; closest: Vec2 } {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const lenSq = dx * dx + dz * dz
  if (lenSq < 1e-8) {
    const d = Math.hypot(p.x - a.x, p.z - a.z)
    return { dist: d, t: 0, closest: { ...a } }
  }
  let t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq
  t = Math.max(0, Math.min(1, t))
  const closest = { x: a.x + t * dx, z: a.z + t * dz }
  const dist = Math.hypot(p.x - closest.x, p.z - closest.z)
  return { dist, t, closest }
}

export function findClosestWall(
  p: Vec2,
  walls: WallSegment[],
  maxDist = 0.6,
): { wall: WallSegment; t: number; closest: Vec2 } | null {
  let best: { wall: WallSegment; t: number; closest: Vec2; dist: number } | null = null
  for (const wall of walls) {
    const hit = distPointToSegment(p, wall.a, wall.b)
    if (hit.dist <= maxDist && (!best || hit.dist < best.dist)) {
      best = { wall, t: hit.t, closest: hit.closest, dist: hit.dist }
    }
  }
  return best ? { wall: best.wall, t: best.t, closest: best.closest } : null
}

/** 画墙时吸附到水平/垂直/45° */
export function snapWallEnd(start: Vec2, end: Vec2): Vec2 {
  const dx = end.x - start.x
  const dz = end.z - start.z
  const len = Math.hypot(dx, dz)
  if (len < 0.15) return end
  const angle = Math.atan2(dz, dx)
  const step = Math.PI / 4
  const snapped = Math.round(angle / step) * step
  return {
    x: start.x + Math.cos(snapped) * len,
    z: start.z + Math.sin(snapped) * len,
  }
}

export function wallsForRect(rect: RoomZone['rect'], thickness = 0.2): Omit<WallSegment, 'id'>[] {
  const { x, z, w, h } = rect
  return [
    { a: { x, z }, b: { x: x + w, z }, thickness },
    { a: { x: x + w, z }, b: { x: x + w, z: z + h }, thickness },
    { a: { x: x + w, z: z + h }, b: { x, z: z + h }, thickness },
    { a: { x, z: z + h }, b: { x, z }, thickness },
  ]
}

export function floorPlanBounds(floor: FloorLevel): { minX: number; minZ: number; maxX: number; maxZ: number } {
  const pts: Vec2[] = []
  for (const w of floor.walls) {
    pts.push(w.a, w.b)
  }
  for (const r of floor.rooms) {
    pts.push(
      { x: r.rect.x, z: r.rect.z },
      { x: r.rect.x + r.rect.w, z: r.rect.z + r.rect.h },
    )
  }
  if (!pts.length) return { minX: 0, minZ: 0, maxX: 8, maxZ: 6 }
  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    minZ = Math.min(minZ, p.z)
    maxX = Math.max(maxX, p.x)
    maxZ = Math.max(maxZ, p.z)
  }
  return { minX, minZ, maxX, maxZ }
}

export function floorPlanCenter(floor: FloorLevel): Vec2 {
  const b = floorPlanBounds(floor)
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 }
}

export function rotatePoint(p: Vec2, center: Vec2, rad: number): Vec2 {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = p.x - center.x
  const dz = p.z - center.z
  return {
    x: center.x + dx * cos - dz * sin,
    z: center.z + dx * sin + dz * cos,
  }
}

export function openingWorldPoint(wall: WallSegment, t: number): Vec2 {
  return {
    x: wall.a.x + (wall.b.x - wall.a.x) * t,
    z: wall.a.z + (wall.b.z - wall.a.z) * t,
  }
}

export function wallAngle(wall: WallSegment): number {
  return Math.atan2(wall.b.z - wall.a.z, wall.b.x - wall.a.x)
}

export function wallLength(wall: WallSegment): number {
  return Math.hypot(wall.b.x - wall.a.x, wall.b.z - wall.a.z)
}

function segSegDistance(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2,
): number {
  const hits = [
    distPointToSegment(a1, b1, b2).dist,
    distPointToSegment(a2, b1, b2).dist,
    distPointToSegment(b1, a1, a2).dist,
    distPointToSegment(b2, a1, a2).dist,
  ]
  return Math.min(...hits)
}

function pointInRect(p: Vec2, rect: { x: number; z: number; w: number; h: number }): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.w && p.z >= rect.z && p.z <= rect.z + rect.h
}

function segmentIntersectsRect(
  a: Vec2,
  b: Vec2,
  rect: { x: number; z: number; w: number; h: number },
): boolean {
  if (pointInRect(a, rect) || pointInRect(b, rect)) return true
  const edges: [Vec2, Vec2][] = [
    [{ x: rect.x, z: rect.z }, { x: rect.x + rect.w, z: rect.z }],
    [{ x: rect.x + rect.w, z: rect.z }, { x: rect.x + rect.w, z: rect.z + rect.h }],
    [{ x: rect.x + rect.w, z: rect.z + rect.h }, { x: rect.x, z: rect.z + rect.h }],
    [{ x: rect.x, z: rect.z + rect.h }, { x: rect.x, z: rect.z }],
  ]
  for (const [e1, e2] of edges) {
    if (segmentsIntersect(a, b, e1, e2)) return true
  }
  return false
}

function segmentsIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
  const cross = (p: Vec2, q: Vec2, r: Vec2) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x)
  const d1 = cross(a1, a2, b1)
  const d2 = cross(a1, a2, b2)
  const d3 = cross(b1, b2, a1)
  const d4 = cross(b1, b2, a2)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/** 与拖拽线段贴近或相交的墙体 */
export function wallsMatchingSegment(
  walls: WallSegment[],
  a: Vec2,
  b: Vec2,
  tolerance = 0.45,
): string[] {
  return walls
    .filter((wall) => {
      const d = segSegDistance(a, b, wall.a, wall.b)
      if (d <= tolerance) return true
      return segmentsIntersect(a, b, wall.a, wall.b)
    })
    .map((w) => w.id)
}

/** 与矩形区域相交的墙体 */
export function wallsMatchingRect(
  walls: WallSegment[],
  rect: { x: number; z: number; w: number; h: number },
): string[] {
  return walls.filter((wall) => segmentIntersectsRect(wall.a, wall.b, rect)).map((w) => w.id)
}
