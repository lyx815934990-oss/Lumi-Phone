import {
  WALK_FOV_DEFAULT,
  WALK_FOV_MAX,
  WALK_FOV_MIN,
  WALK_JUMP_HEIGHT_DEFAULT,
  WALK_JUMP_HEIGHT_MAX,
  WALK_JUMP_HEIGHT_MIN,
  WALK_LOOK_SENSITIVITY_DEFAULT,
  WALK_LOOK_SENSITIVITY_MAX,
  WALK_LOOK_SENSITIVITY_MIN,
  WALK_SPEED_DEFAULT,
  WALK_SPEED_MAX,
  WALK_SPEED_MIN,
} from './walkInput'
import {
  clampPaperDollChroma,
  PAPER_DOLL_CHROMA_DEFAULT,
  type PaperDollChromaSettings,
} from './paperDollChroma'

const LS_KEY = 'lumi.homeBuild.walkSettings.v1'

export type WalkSettings = {
  speed: number
  lookSensitivity: number
  fov: number
  jumpHeight: number
  /** 显示同住 OC 纸片人（玩家始终第一人称） */
  paperDollEnabled: boolean
  /** 3D Mixamo 人型 + 内置动作（关则回纸片人立绘） */
  avatar3dEnabled: boolean
  /** 色度抠图与立绘参数 */
  paperDollChroma: PaperDollChromaSettings
}

export const WALK_SETTINGS_DEFAULT: WalkSettings = {
  speed: WALK_SPEED_DEFAULT,
  lookSensitivity: WALK_LOOK_SENSITIVITY_DEFAULT,
  fov: WALK_FOV_DEFAULT,
  jumpHeight: WALK_JUMP_HEIGHT_DEFAULT,
  paperDollEnabled: true,
  avatar3dEnabled: false,
  paperDollChroma: { ...PAPER_DOLL_CHROMA_DEFAULT },
}

export function clampWalkSettings(raw: Partial<WalkSettings>): WalkSettings {
  return {
    speed: Math.max(WALK_SPEED_MIN, Math.min(WALK_SPEED_MAX, raw.speed ?? WALK_SPEED_DEFAULT)),
    lookSensitivity: Math.max(
      WALK_LOOK_SENSITIVITY_MIN,
      Math.min(WALK_LOOK_SENSITIVITY_MAX, raw.lookSensitivity ?? WALK_LOOK_SENSITIVITY_DEFAULT),
    ),
    fov: Math.max(WALK_FOV_MIN, Math.min(WALK_FOV_MAX, raw.fov ?? WALK_FOV_DEFAULT)),
    jumpHeight: Math.max(
      WALK_JUMP_HEIGHT_MIN,
      Math.min(WALK_JUMP_HEIGHT_MAX, raw.jumpHeight ?? WALK_JUMP_HEIGHT_DEFAULT),
    ),
    paperDollEnabled: raw.paperDollEnabled !== false,
    avatar3dEnabled: raw.avatar3dEnabled === true,
    paperDollChroma: clampPaperDollChroma(raw.paperDollChroma),
  }
}

export function loadWalkSettings(): WalkSettings {
  if (typeof localStorage === 'undefined') return { ...WALK_SETTINGS_DEFAULT }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...WALK_SETTINGS_DEFAULT }
    return clampWalkSettings(JSON.parse(raw) as Partial<WalkSettings>)
  } catch {
    return { ...WALK_SETTINGS_DEFAULT }
  }
}

export function saveWalkSettings(settings: WalkSettings): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(clampWalkSettings(settings)))
  } catch {
    /* ignore quota */
  }
}

/** 滑杆显示用：灵敏度 25%–200% */
export function lookSensitivityToPercent(sensitivity: number): number {
  return Math.round((sensitivity / WALK_LOOK_SENSITIVITY_DEFAULT) * 100)
}

export function lookSensitivityFromPercent(percent: number): number {
  const v = WALK_LOOK_SENSITIVITY_DEFAULT * (percent / 100)
  return Math.max(WALK_LOOK_SENSITIVITY_MIN, Math.min(WALK_LOOK_SENSITIVITY_MAX, v))
}
