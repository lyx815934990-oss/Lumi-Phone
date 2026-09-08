import type { Vec2 } from './types'

export const PX_PER_M = 40
export const CANVAS_ORIGIN = { x: 24, y: 24 }

export function worldToCanvas(p: Vec2, ox: number, oy: number): { x: number; y: number } {
  return { x: ox + p.x * PX_PER_M, y: oy + p.z * PX_PER_M }
}

export { findClosestWall, openingWorldPoint, snapWallEnd, wallAngle, wallLength } from './floorPlanGeometry'
