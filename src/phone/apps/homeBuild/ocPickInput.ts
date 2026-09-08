/** OC 拎起放置：指针 → 世界坐标（Canvas 内写入） */

/** 拎起悬空高度（相对楼面）；与松手下落高度一致 */
export const OC_PICK_LIFT = 2

export type OcPickWorld = {
  x: number
  y: number
  z: number
  /** 高亮格子整数坐标 */
  gx: number
  gz: number
  ready: boolean
}

const world: OcPickWorld = { x: 0, y: 0, z: 0, gx: 0, gz: 0, ready: false }
let picking = false

/** 吸附到 1×1 地板格中心 */
export function snapOcToCellCenter(x: number, z: number): { x: number; z: number; gx: number; gz: number } {
  const gx = Math.floor(x)
  const gz = Math.floor(z)
  return { x: gx + 0.5, z: gz + 0.5, gx, gz }
}

export function setOcPickingActive(active: boolean): void {
  picking = active
  if (!active) world.ready = false
}

export function getOcPickingActive(): boolean {
  return picking
}

export function setOcPickWorld(x: number, y: number, z: number): void {
  const snapped = snapOcToCellCenter(x, z)
  world.x = snapped.x
  world.y = y
  world.z = snapped.z
  world.gx = snapped.gx
  world.gz = snapped.gz
  world.ready = true
}

export function getOcPickWorld(): OcPickWorld {
  return world
}

export function resetOcPickWorld(): void {
  world.ready = false
}
