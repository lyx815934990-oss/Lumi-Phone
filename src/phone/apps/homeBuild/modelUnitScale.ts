import { Box3, Object3D, Vector3 } from 'three'
import { computeReliableObjectBounds } from './avatarBounds'
import { FLOOR_SPACING } from './sceneConstants'

/** 超过该边长（米）视为导出单位异常，需自动归一 */
const MAX_REASONABLE_M = 12
/** 超大模型归一后的目标最大边长（米） */
const TARGET_MAX_M = 4

const _box = new Box3()
const _size = new Vector3()

/**
 * 部分 GLB/FBX 按厘米/毫米导出。蒙皮模型必须用可靠包围盒，不能 setFromObject。
 * @returns 施加的缩放系数（1 = 未缩放）
 */
export function applyAutoUnitScale(root: Object3D): number {
  root.updateWorldMatrix(true, true)
  computeReliableObjectBounds(root, _box)
  _box.getSize(_size)
  const sx = Math.abs(_size.x)
  const sy = Math.abs(_size.y)
  const sz = Math.abs(_size.z)
  const maxDim = Math.max(sx, sy, sz)
  if (!Number.isFinite(maxDim) || maxDim <= 0) return 1

  // 正常人体尺度：不动
  if (maxDim <= MAX_REASONABLE_M && maxDim >= 0.15) return 1

  let s: number
  if (maxDim > MAX_REASONABLE_M) {
    if (sy >= maxDim * 0.35) {
      s = FLOOR_SPACING / sy
    } else {
      s = TARGET_MAX_M / maxDim
      for (const candidate of [0.01, 0.001]) {
        const after = maxDim * candidate
        if (after >= 0.35 && after <= MAX_REASONABLE_M) {
          s = candidate
          break
        }
      }
    }
  } else {
    // maxDim < 0.15：错盒或毫米级，尝试放大到合理身高
    s = 1
    for (const candidate of [100, 10, 0.01, 0.001]) {
      const after = maxDim * candidate
      if (after >= 0.8 && after <= MAX_REASONABLE_M) {
        s = candidate
        break
      }
    }
    if (s === 1) return 1
  }

  if (!Number.isFinite(s) || s <= 0 || Math.abs(s - 1) < 1e-6) return 1
  root.scale.multiplyScalar(s)
  root.updateMatrixWorld(true)
  return s
}
