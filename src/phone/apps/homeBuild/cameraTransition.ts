import type { HomeBuildMode } from './types'

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
}

const FLOORPLAN_POSE: CameraPose = {
  position: [4, 14, 6],
  target: [4, 0, 3],
}

const GHOST_POSE: CameraPose = {
  position: [6, 5, 8],
  target: [4, 1, 3],
}

const WALK_POSE: CameraPose = {
  position: [2, 1.65, 2],
  target: [2, 1.65, 5],
}

export function cameraPoseForMode(mode: HomeBuildMode): CameraPose {
  if (mode === 'floorplan') return FLOORPLAN_POSE
  if (mode === 'walk') return WALK_POSE
  if (mode === 'avatar') {
    return {
      position: [4, 1.4, 6.5],
      target: [4, 1.0, 3],
    }
  }
  return GHOST_POSE
}

export function lerpPose(a: CameraPose, b: CameraPose, t: number): CameraPose {
  const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
  return {
    position: [
      a.position[0] + (b.position[0] - a.position[0]) * ease,
      a.position[1] + (b.position[1] - a.position[1]) * ease,
      a.position[2] + (b.position[2] - a.position[2]) * ease,
    ],
    target: [
      a.target[0] + (b.target[0] - a.target[0]) * ease,
      a.target[1] + (b.target[1] - a.target[1]) * ease,
      a.target[2] + (b.target[2] - a.target[2]) * ease,
    ],
  }
}
