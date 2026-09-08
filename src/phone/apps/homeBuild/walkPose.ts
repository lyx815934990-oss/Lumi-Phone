/** 漫游玩家位姿（由 FirstPersonCamera 每帧写入；同住 OC 据此侧后跟随） */

export type WalkPoseState = {
  x: number
  feetY: number
  z: number
  yaw: number
  /** 是否有有效位姿 */
  ready: boolean
}

const pose: WalkPoseState = {
  x: 0,
  feetY: 0,
  z: 0,
  yaw: 0,
  ready: false,
}

export function setWalkPose(next: Omit<WalkPoseState, 'ready'>): void {
  pose.x = next.x
  pose.feetY = next.feetY
  pose.z = next.z
  pose.yaw = next.yaw
  pose.ready = true
}

export function getWalkPose(): WalkPoseState {
  return pose
}

export function resetWalkPose(): void {
  pose.ready = false
}
