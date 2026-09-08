import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'
import { cameraPoseForDraft } from '../scene3dUtils'
import type { HomeBuildDraft } from '../types'
import {
  consumeWalkJump,
  consumeWalkLook,
  getWalkFov,
  getWalkInput,
} from '../walkInput'
import { resetWalkPose, setWalkPose } from '../walkPose'
import {
  EYE_HEIGHT,
  GRAVITY,
  LANDING_SNAP,
  MAX_FALL_SPEED,
  STEP_UP_HEIGHT,
  findSupportBelow,
  slideWalkPosition,
  spawnFeetY,
  wallsOverlappingBody,
} from '../walkCollision'

const PITCH_MIN = -1.35
const PITCH_MAX = 1.35

type Props = {
  draft: HomeBuildDraft
}

export function FirstPersonCamera({ draft }: Props) {
  const { camera } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0)
  const bodyX = useRef(0)
  const bodyZ = useRef(0)
  const feetY = useRef(0)
  const vy = useRef(0)
  const grounded = useRef(true)

  useEffect(() => {
    const pose = cameraPoseForDraft(draft, 'walk')
    const x = pose.position[0]
    const z = pose.position[2]
    bodyX.current = x
    bodyZ.current = z
    feetY.current = spawnFeetY(draft, x, z, draft.activeFloorId)
    vy.current = 0
    grounded.current = true
    camera.position.set(x, feetY.current + EYE_HEIGHT, z)

    const dx = pose.target[0] - x
    const dz = pose.target[2] - z
    yaw.current = Math.atan2(-dx, -dz)
    pitch.current = 0
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current
    setWalkPose({ x, feetY: feetY.current, z, yaw: yaw.current })
    // 仅切换楼层时重置站位；漫游中 draft 其它字段变化不传送
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, draft.activeFloorId])

  useEffect(() => {
    return () => resetWalkPose()
  }, [])

  useFrame((_, dt) => {
    const clampedDt = Math.min(dt, 0.05)
    const input = getWalkInput()
    const look = consumeWalkLook()
    yaw.current += look.dx
    pitch.current = Math.max(
      PITCH_MIN,
      Math.min(PITCH_MAX, pitch.current + look.dy),
    )

    const nextFov = getWalkFov()
    const persp = camera as PerspectiveCamera
    if ('fov' in persp && Math.abs(persp.fov - nextFov) > 0.01) {
      persp.fov = nextFov
      persp.updateProjectionMatrix()
    }

    const sin = Math.sin(yaw.current)
    const cos = Math.cos(yaw.current)
    const forwardX = -sin
    const forwardZ = -cos
    const rightX = cos
    const rightZ = -sin

    // 轻点右侧转视角区：原地小跳；按住移动摇杆时可向对应方向跳
    if (consumeWalkJump() && grounded.current) {
      grounded.current = false
      // v = √(2gh)，按设置的跳跃高度换算初速度
      vy.current = Math.sqrt(2 * GRAVITY * Math.max(0.05, input.jumpHeight))
    }

    // 地面与空中均可配合摇杆移动（空中小跳带方向）
    const airMul = grounded.current ? 1 : 0.85
    const speed = input.speed * clampedDt * airMul
    const dx = (rightX * input.moveX + forwardX * input.moveZ) * speed
    const dz = (rightZ * input.moveX + forwardZ * input.moveZ) * speed

    const walls = wallsOverlappingBody(draft, feetY.current)
    const next = slideWalkPosition(
      { x: bodyX.current, z: bodyZ.current },
      { x: dx, z: dz },
      walls,
      feetY.current,
    )
    bodyX.current = next.x
    bodyZ.current = next.z

    const x = bodyX.current
    const z = bodyZ.current
    const support = findSupportBelow(draft, x, z, feetY.current + LANDING_SNAP)

    if (grounded.current) {
      const dy = support.floorY - feetY.current
      if (support.kind === 'stair' || support.kind === 'prop') {
        // 贴着楼梯 / 家具顶面走；离开边缘后 support 变低 → 坠落
        if (dy < -LANDING_SNAP) {
          grounded.current = false
          vy.current = Math.min(vy.current, 0)
        } else if (dy <= STEP_UP_HEIGHT) {
          feetY.current = support.floorY
          vy.current = 0
        } else {
          // 顶面突然高很多：仍贴当前，等跳跃
          vy.current = 0
        }
      } else if (Math.abs(dy) <= LANDING_SNAP) {
        feetY.current = support.floorY
        vy.current = 0
      } else if (dy > 0 && dy <= STEP_UP_HEIGHT) {
        // 踏上一级台阶 / 楼板边缘 / 矮家具
        feetY.current = support.floorY
        vy.current = 0
      } else if (dy < -LANDING_SNAP) {
        // 脚下失去支撑 → 坠落（开洞、家具边缘等）
        grounded.current = false
        vy.current = Math.min(vy.current, 0)
      }
    }

    if (!grounded.current) {
      vy.current = Math.max(vy.current - GRAVITY * clampedDt, -MAX_FALL_SPEED)
      feetY.current += vy.current * clampedDt

      // 下落/跳跃：可落到楼板或家具顶；略抬探测避免穿模后卡死
      const land = findSupportBelow(draft, x, z, feetY.current + LANDING_SNAP)
      const canLand =
        vy.current <= 0 &&
        (feetY.current <= land.floorY + LANDING_SNAP ||
          (land.kind === 'prop' &&
            feetY.current <= land.floorY + STEP_UP_HEIGHT &&
            feetY.current >= land.floorY - 0.05))
      if (canLand) {
        feetY.current = land.floorY
        vy.current = 0
        grounded.current = true
      }
    }

    setWalkPose({ x, feetY: feetY.current, z, yaw: yaw.current })

    // 玩家始终第一人称；同住 OC 纸片人是场景里的独立角色
    camera.position.set(x, feetY.current + EYE_HEIGHT, z)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current
  })

  return null
}
