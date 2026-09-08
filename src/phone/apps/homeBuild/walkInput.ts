/** 第一人称漫游输入（由 UI 写入，相机每帧读取） */

import {
  clampPaperDollChroma,
  PAPER_DOLL_CHROMA_DEFAULT,
  type PaperDollChromaSettings,
} from './paperDollChroma'

export type WalkInputState = {
  moveX: number
  moveZ: number
  lookDx: number
  lookDy: number
  speed: number
  lookSensitivity: number
  fov: number
  jumpHeight: number
  /** 轻点右侧转视角区请求小跳；相机每帧 consume */
  jumpQueued: boolean
  /** 同住 OC 纸片人（场景角色，非玩家自己） */
  paperDollEnabled: boolean
  /** 使用内置 Mixamo 3D 人型 + 动作（否则显示纸片人立绘） */
  avatar3dEnabled: boolean
  paperDollChroma: PaperDollChromaSettings
}

export const WALK_SPEED_MIN = 1
export const WALK_SPEED_MAX = 6
export const WALK_SPEED_DEFAULT = 2.5
export const WALK_LOOK_SENSITIVITY_MIN = 0.001
export const WALK_LOOK_SENSITIVITY_MAX = 0.009
export const WALK_LOOK_SENSITIVITY_DEFAULT = 0.0032

export const WALK_FOV_MIN = 55
export const WALK_FOV_MAX = 95
export const WALK_FOV_DEFAULT = 75

/** 跳跃高度（米，相对抬脚高度） */
export const WALK_JUMP_HEIGHT_MIN = 0.2
export const WALK_JUMP_HEIGHT_MAX = 1.6
export const WALK_JUMP_HEIGHT_DEFAULT = 0.45

const state: WalkInputState = {
  moveX: 0,
  moveZ: 0,
  lookDx: 0,
  lookDy: 0,
  speed: WALK_SPEED_DEFAULT,
  lookSensitivity: WALK_LOOK_SENSITIVITY_DEFAULT,
  fov: WALK_FOV_DEFAULT,
  jumpHeight: WALK_JUMP_HEIGHT_DEFAULT,
  jumpQueued: false,
  paperDollEnabled: true,
  avatar3dEnabled: false,
  paperDollChroma: { ...PAPER_DOLL_CHROMA_DEFAULT },
}

export function getWalkInput(): WalkInputState {
  return state
}

export function setWalkMove(x: number, z: number): void {
  state.moveX = x
  state.moveZ = z
}

export function addWalkLook(dx: number, dy: number): void {
  state.lookDx += dx
  state.lookDy += dy
}

export function setWalkSpeed(speed: number): void {
  state.speed = Math.max(WALK_SPEED_MIN, Math.min(WALK_SPEED_MAX, speed))
}

export function setWalkLookSensitivity(sensitivity: number): void {
  state.lookSensitivity = Math.max(
    WALK_LOOK_SENSITIVITY_MIN,
    Math.min(WALK_LOOK_SENSITIVITY_MAX, sensitivity),
  )
}

export function getWalkLookSensitivity(): number {
  return state.lookSensitivity
}

export function setWalkFov(fov: number): void {
  state.fov = Math.max(WALK_FOV_MIN, Math.min(WALK_FOV_MAX, fov))
}

export function getWalkFov(): number {
  return state.fov
}

export function setWalkJumpHeight(height: number): void {
  state.jumpHeight = Math.max(
    WALK_JUMP_HEIGHT_MIN,
    Math.min(WALK_JUMP_HEIGHT_MAX, height),
  )
}

export function getWalkJumpHeight(): number {
  return state.jumpHeight
}

export function setWalkPaperDollEnabled(enabled: boolean): void {
  state.paperDollEnabled = Boolean(enabled)
}

export function getWalkPaperDollEnabled(): boolean {
  return state.paperDollEnabled
}

export function setWalkPaperDollChroma(next: Partial<PaperDollChromaSettings>): void {
  state.paperDollChroma = clampPaperDollChroma({ ...state.paperDollChroma, ...next })
}

export function getWalkPaperDollChroma(): PaperDollChromaSettings {
  return state.paperDollChroma
}

export function setWalkAvatar3dEnabled(enabled: boolean): void {
  state.avatar3dEnabled = Boolean(enabled)
}

export function getWalkAvatar3dEnabled(): boolean {
  return state.avatar3dEnabled
}

export function applyWalkSettings(settings: {
  speed?: number
  lookSensitivity?: number
  fov?: number
  jumpHeight?: number
  paperDollEnabled?: boolean
  avatar3dEnabled?: boolean
  paperDollChroma?: PaperDollChromaSettings
}): void {
  if (settings.speed !== undefined) setWalkSpeed(settings.speed)
  if (settings.lookSensitivity !== undefined) setWalkLookSensitivity(settings.lookSensitivity)
  if (settings.fov !== undefined) setWalkFov(settings.fov)
  if (settings.jumpHeight !== undefined) setWalkJumpHeight(settings.jumpHeight)
  if (settings.paperDollEnabled !== undefined) setWalkPaperDollEnabled(settings.paperDollEnabled)
  if (settings.avatar3dEnabled !== undefined) setWalkAvatar3dEnabled(settings.avatar3dEnabled)
  if (settings.paperDollChroma !== undefined) setWalkPaperDollChroma(settings.paperDollChroma)
}

export function requestWalkJump(): void {
  state.jumpQueued = true
}

export function consumeWalkJump(): boolean {
  if (!state.jumpQueued) return false
  state.jumpQueued = false
  return true
}

export function resetWalkInput(): void {
  state.moveX = 0
  state.moveZ = 0
  state.lookDx = 0
  state.lookDy = 0
  state.jumpQueued = false
}

export function consumeWalkLook(): { dx: number; dy: number } {
  const dx = state.lookDx
  const dy = state.lookDy
  state.lookDx = 0
  state.lookDy = 0
  return { dx, dy }
}
