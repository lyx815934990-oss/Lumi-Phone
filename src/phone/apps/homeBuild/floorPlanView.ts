import { CANVAS_ORIGIN, PX_PER_M } from './floorPlanCanvasDraw'
import type { Vec2 } from './types'

export const PLAN_ZOOM_MIN = 0.35
export const PLAN_ZOOM_MAX = 2.8
export const PLAN_ZOOM_DEFAULT = 1

export type PlanView = {
  scale: number
  panX: number
  panY: number
}

export function defaultPlanView(): PlanView {
  return { scale: PLAN_ZOOM_DEFAULT, panX: 0, panY: 0 }
}

export function clampZoom(scale: number): number {
  return Math.max(PLAN_ZOOM_MIN, Math.min(PLAN_ZOOM_MAX, scale))
}

export function worldToScreen(p: Vec2, view: PlanView): { x: number; y: number } {
  return {
    x: view.panX + view.scale * (CANVAS_ORIGIN.x + p.x * PX_PER_M),
    y: view.panY + view.scale * (CANVAS_ORIGIN.y + p.z * PX_PER_M),
  }
}

export function screenToWorld(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  view: PlanView,
): Vec2 {
  const lx = clientX - canvasRect.left
  const ly = clientY - canvasRect.top
  return {
    x: ((lx - view.panX) / view.scale - CANVAS_ORIGIN.x) / PX_PER_M,
    z: ((ly - view.panY) / view.scale - CANVAS_ORIGIN.y) / PX_PER_M,
  }
}

/** 以屏幕点为锚点缩放，保持锚点下的世界坐标不变 */
export function zoomAtScreenPoint(
  view: PlanView,
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  nextScale: number,
): PlanView {
  const scale = clampZoom(nextScale)
  const lx = screenX - canvasRect.left
  const ly = screenY - canvasRect.top
  const anchorWorldPxX = (lx - view.panX) / view.scale
  const anchorWorldPxY = (ly - view.panY) / view.scale
  return {
    scale,
    panX: lx - scale * anchorWorldPxX,
    panY: ly - scale * anchorWorldPxY,
  }
}

export function zoomPercentLabel(scale: number): string {
  return `${Math.round(scale * 100)}%`
}

export function panView(view: PlanView, dx: number, dy: number): PlanView {
  return { ...view, panX: view.panX + dx, panY: view.panY + dy }
}
