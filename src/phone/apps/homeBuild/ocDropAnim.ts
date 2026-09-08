/** 松手后从高处下落 → 着地，避免瞬间贴地 */

export const OC_DROP_HEIGHT_M = 2

export type OcDropPhase = 'idle' | 'air' | 'land'

export type OcDropState = {
  active: boolean
  phase: OcDropPhase
  x: number
  z: number
  floorId: string
  /** 脚底世界 Y（贴地目标） */
  endY: number
  /** 起跳世界 Y（约 endY + 2） */
  startY: number
  /** 当前脚底世界 Y */
  y: number
  /** 下落进度 0→1（air） */
  airT: number
  /** 着地动作已播时长 */
  landT: number
}

const state: OcDropState = {
  active: false,
  phase: 'idle',
  x: 0,
  z: 0,
  floorId: '',
  endY: 0,
  startY: 0,
  y: 0,
  airT: 0,
  landT: 0,
}

/** 下落过程约 0.75s；着地动作最多等 1.1s */
export const OC_DROP_AIR_DURATION = 0.75
export const OC_DROP_LAND_DURATION = 1.1

export function beginOcDrop(opts: {
  x: number
  z: number
  floorId: string
  feetY: number
  floorBaseY: number
  dropHeight?: number
}): void {
  const h = opts.dropHeight ?? OC_DROP_HEIGHT_M
  const endY = opts.floorBaseY + opts.feetY
  const startY = endY + h
  state.active = true
  state.phase = 'air'
  state.x = opts.x
  state.z = opts.z
  state.floorId = opts.floorId
  state.endY = endY
  state.startY = startY
  state.y = startY
  state.airT = 0
  state.landT = 0
}

export function getOcDropState(): OcDropState {
  return state
}

export function isOcDropActive(): boolean {
  return state.active
}

export function clearOcDrop(): void {
  state.active = false
  state.phase = 'idle'
  state.airT = 0
  state.landT = 0
}

/**
 * 推进下落。返回当前阶段。
 * air：ease-in 下坠；触地切 land；land 播完结束。
 */
export function advanceOcDrop(dt: number): OcDropPhase {
  if (!state.active) return 'idle'

  if (state.phase === 'air') {
    state.airT += dt / OC_DROP_AIR_DURATION
    const t = Math.min(1, state.airT)
    // 重力感：前慢后快
    const eased = t * t
    state.y = state.startY + (state.endY - state.startY) * eased
    if (t >= 1) {
      state.y = state.endY
      state.phase = 'land'
      state.landT = 0
    }
    return state.phase
  }

  if (state.phase === 'land') {
    state.y = state.endY
    state.landT += dt
    if (state.landT >= OC_DROP_LAND_DURATION) {
      clearOcDrop()
      return 'idle'
    }
    return 'land'
  }

  return 'idle'
}
