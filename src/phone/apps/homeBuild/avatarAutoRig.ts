import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Material,
  Mesh,
  SkinnedMesh,
  Skeleton,
  Vector3,
} from 'three'
import {
  createLandmarkSkeletonFromUserJoints,
  landmarkBoneSegments,
} from './avatarLandmarkSkeleton'
import { bindSkinnedInPlace } from './avatarPickedUpClip'
import { prepareCustomAvatarMesh, groundSkinnedContent } from './avatarMeshPrep'
import type { OcJointMap } from './ocJointStore'
import { hasCompleteUserJoints } from './ocJointStore'

/** 超过此顶点数改用「最近骨」快速绑骨（混元高模常见） */
export const AUTO_RIG_FAST_VERTEX_THRESHOLD = 40_000

const _v = new Vector3()
const _ab = new Vector3()
const _ap = new Vector3()

function collectStaticMeshes(root: Group): Mesh[] {
  const meshes: Mesh[] = []
  root.traverse((obj) => {
    if (obj instanceof Mesh && !(obj instanceof SkinnedMesh)) {
      meshes.push(obj)
    }
  })
  return meshes
}

export function countMeshVertices(root: Group): number {
  let total = 0
  root.traverse((obj) => {
    if (obj instanceof Mesh && obj.geometry?.attributes?.position) {
      total += obj.geometry.attributes.position.count
    }
  })
  return total
}

function distToSegment(p: Vector3, a: Vector3, b: Vector3): number {
  _ab.subVectors(b, a)
  const lenSq = _ab.lengthSq()
  if (lenSq < 1e-10) return p.distanceTo(a)
  _ap.subVectors(p, a)
  let t = _ap.dot(_ab) / lenSq
  t = Math.max(0, Math.min(1, t))
  _v.copy(_ab).multiplyScalar(t).add(a)
  return p.distanceTo(_v)
}

function yieldFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

/** 高模快速路径：每顶点只绑最近一根骨（可播动作，略糙但不会因顶点数直接失败） */
export async function applyNearestBoneSkinWeightsAsync(
  geometry: BufferGeometry,
  skeleton: Skeleton,
): Promise<void> {
  const pos = geometry.attributes.position
  if (!pos) return

  const segments = landmarkBoneSegments(skeleton)
  const skinIndex = new Uint16Array(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  const chunk = 12_000

  for (let start = 0; start < pos.count; start += chunk) {
    const end = Math.min(pos.count, start + chunk)
    for (let vi = start; vi < end; vi++) {
      _v.fromBufferAttribute(pos, vi)
      let best = 0
      let bestD = Infinity
      for (let si = 0; si < segments.length; si++) {
        const seg = segments[si]!
        const d = distToSegment(_v, seg.a, seg.b)
        if (d < bestD) {
          bestD = d
          best = seg.boneIndex
        }
      }
      skinIndex[vi * 4] = best
      skinWeight[vi * 4] = 1
    }
    if (end < pos.count) await yieldFrame()
  }

  geometry.setAttribute('skinIndex', new BufferAttribute(skinIndex, 4))
  geometry.setAttribute('skinWeight', new BufferAttribute(skinWeight, 4))
}

/** 普通包络：最多 4 骨（中小模） */
export async function applyEnvelopeSkinWeightsAsync(
  geometry: BufferGeometry,
  skeleton: Skeleton,
  influenceRadius: number,
): Promise<void> {
  const pos = geometry.attributes.position
  if (!pos) return

  const segments = landmarkBoneSegments(skeleton)
  const radius = Math.max(influenceRadius, 0.1)
  const limit = radius * 2.2
  const skinIndex = new Uint16Array(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  const weights = new Float32Array(skeleton.bones.length)
  const chunk = 8_000

  for (let start = 0; start < pos.count; start += chunk) {
    const end = Math.min(pos.count, start + chunk)
    for (let vi = start; vi < end; vi++) {
      _v.fromBufferAttribute(pos, vi)
      weights.fill(0)

      let best = 0
      let bestD = Infinity

      for (let si = 0; si < segments.length; si++) {
        const seg = segments[si]!
        const d = distToSegment(_v, seg.a, seg.b)
        if (d < bestD) {
          bestD = d
          best = seg.boneIndex
        }
        if (d > limit) continue
        const w = 1 / (d * d + 1e-5)
        if (w > weights[seg.boneIndex]!) weights[seg.boneIndex] = w
      }

      const top: { i: number; w: number }[] = []
      for (let bi = 0; bi < weights.length; bi++) {
        const w = weights[bi]!
        if (w <= 0) continue
        if (top.length < 4) {
          top.push({ i: bi, w })
          top.sort((x, y) => y.w - x.w)
        } else if (w > top[3]!.w) {
          top[3] = { i: bi, w }
          top.sort((x, y) => y.w - x.w)
        }
      }

      if (!top.length) top.push({ i: best, w: 1 })

      const sum = top.reduce((s, x) => s + x.w, 0) || 1
      for (let k = 0; k < 4; k++) {
        if (k < top.length) {
          skinIndex[vi * 4 + k] = top[k]!.i
          skinWeight[vi * 4 + k] = top[k]!.w / sum
        }
      }
    }
    if (end < pos.count) await yieldFrame()
  }

  geometry.setAttribute('skinIndex', new BufferAttribute(skinIndex, 4))
  geometry.setAttribute('skinWeight', new BufferAttribute(skinWeight, 4))
}

/** @deprecated 同步版保留给小工具；主流程用 async */
export function applyEnvelopeSkinWeights(
  geometry: BufferGeometry,
  skeleton: Skeleton,
  influenceRadius: number,
): void {
  const pos = geometry.attributes.position
  if (!pos) return
  const segments = landmarkBoneSegments(skeleton)
  const radius = Math.max(influenceRadius, 0.1)
  const limit = radius * 2.2
  const skinIndex = new Uint16Array(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  const weights = new Float32Array(skeleton.bones.length)

  for (let vi = 0; vi < pos.count; vi++) {
    _v.fromBufferAttribute(pos, vi)
    weights.fill(0)
    let best = 0
    let bestD = Infinity
    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si]!
      const d = distToSegment(_v, seg.a, seg.b)
      if (d < bestD) {
        bestD = d
        best = seg.boneIndex
      }
      if (d > limit) continue
      const w = 1 / (d * d + 1e-5)
      if (w > weights[seg.boneIndex]!) weights[seg.boneIndex] = w
    }
    const top: { i: number; w: number }[] = []
    for (let bi = 0; bi < weights.length; bi++) {
      const w = weights[bi]!
      if (w <= 0) continue
      if (top.length < 4) {
        top.push({ i: bi, w })
        top.sort((x, y) => y.w - x.w)
      } else if (w > top[3]!.w) {
        top[3] = { i: bi, w }
        top.sort((x, y) => y.w - x.w)
      }
    }
    if (!top.length) top.push({ i: best, w: 1 })
    const sum = top.reduce((s, x) => s + x.w, 0) || 1
    for (let k = 0; k < 4; k++) {
      if (k < top.length) {
        skinIndex[vi * 4 + k] = top[k]!.i
        skinWeight[vi * 4 + k] = top[k]!.w / sum
      }
    }
  }
  geometry.setAttribute('skinIndex', new BufferAttribute(skinIndex, 4))
  geometry.setAttribute('skinWeight', new BufferAttribute(skinWeight, 4))
}

function cloneMaterial(material: Material | Material[]): Material | Material[] {
  if (Array.isArray(material)) return material.map((m) => m.clone())
  return material.clone()
}

/**
 * 用户点齐关键关节后绑骨。高模（如混元 80 万+ 顶点）走快速最近骨，不再直接拒绝。
 */
export async function autoRigStaticMeshToBuiltin(
  userGroup: Group,
  userScale = 1,
  userJoints?: OcJointMap | null,
): Promise<Group> {
  if (!userJoints || !hasCompleteUserJoints(userJoints)) {
    throw new Error('请先在人物页手动点完关键关节')
  }

  const verts = countMeshVertices(userGroup)
  if (verts <= 0) {
    throw new Error('导入模型没有可用网格')
  }

  const { root: userPrepared } = prepareCustomAvatarMesh(userGroup, userScale)
  userPrepared.updateWorldMatrix(true, true)

  const landmark = createLandmarkSkeletonFromUserJoints(userJoints)
  if (!landmark) {
    throw new Error('关键关节不完整')
  }

  const hips = userJoints.hips!
  const head = userJoints.head!
  const influenceRadius = Math.max(0.12, Math.abs(head.y - hips.y) * 0.35)
  const fast = verts > AUTO_RIG_FAST_VERTEX_THRESHOLD

  if (import.meta.env.DEV && fast) {
    console.info(
      `[homeBuild] 高模 ${verts} 顶点，使用快速最近骨绑骨（可播动作，形变略糙）`,
    )
  }

  const meshes = collectStaticMeshes(userPrepared)
  if (!meshes.length) {
    throw new Error('导入模型没有可用静态网格')
  }

  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false)
    const geo = mesh.geometry.clone()
    geo.applyMatrix4(mesh.matrixWorld)
    if (fast) {
      await applyNearestBoneSkinWeightsAsync(geo, landmark.skeleton)
    } else {
      await applyEnvelopeSkinWeightsAsync(geo, landmark.skeleton, influenceRadius)
    }

    const skinned = new SkinnedMesh(geo, cloneMaterial(mesh.material))
    skinned.name = mesh.name || 'oc-skinned'
    skinned.castShadow = false
    skinned.receiveShadow = false
    skinned.frustumCulled = false
    landmark.root.add(skinned)
  }

  // 贴地进顶点/骨骼，root 保持原点，再用 identity bind
  landmark.root.updateWorldMatrix(true, true)
  groundSkinnedContent(landmark.root)

  let skinnedCount = 0
  landmark.root.traverse((obj) => {
    if (obj instanceof SkinnedMesh) {
      bindSkinnedInPlace(obj, landmark.skeleton)
      skinnedCount += 1
    }
  })

  if (import.meta.env.DEV) {
    const hist = new Map<string, number>()
    landmark.root.traverse((obj) => {
      if (!(obj instanceof SkinnedMesh)) return
      const idx = obj.geometry.getAttribute('skinIndex')
      if (!idx) return
      for (let i = 0; i < idx.count; i++) {
        const bi = idx.getX(i)
        const bone = landmark.skeleton.bones[bi]
        const name = bone?.name ?? `bone${bi}`
        hist.set(name, (hist.get(name) ?? 0) + 1)
      }
    })
    const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    console.info('[homeBuild] 绑骨完成', { skinnedCount, boneCount: landmark.bones.length, topWeights: top })
  }

  landmark.root.updateWorldMatrix(true, true)
  return landmark.root
}
