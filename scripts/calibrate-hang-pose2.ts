import fs from 'node:fs'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { prepareCustomAvatarMesh } from '../src/phone/apps/homeBuild/avatarMeshPrep.ts'
import { buildCoreBoneMap, type MixamoCore } from '../src/phone/apps/homeBuild/avatarBoneCore.ts'

globalThis.window = {
  URL: { createObjectURL: () => 'blob:n' },
  innerWidth: 1920,
  innerHeight: 1080,
} as Window & typeof globalThis
globalThis.document = {
  createElementNS(_ns: string, tag: string) {
    const el = { style: {}, setAttribute() {}, onload: null as (() => void) | null }
    if (tag === 'img') {
      Object.defineProperty(el, 'src', {
        set() {
          queueMicrotask(() => el.onload?.())
        },
        get() {
          return ''
        },
      })
    }
    return el as unknown as HTMLElement
  },
} as Document
THREE.ImageLoader.prototype.load = function (_u, cb) {
  cb?.({ width: 1, height: 1 } as unknown as HTMLImageElement)
  return { addEventListener() {} } as unknown as HTMLImageElement
}
THREE.TextureLoader.prototype.load = function (_u, cb) {
  const t = new THREE.Texture()
  t.image = { width: 1, height: 1 }
  cb?.(t)
  return t
}

const buf = fs.readFileSync('建模模型/骨骼/示例建模.fbx')
const raw = new FBXLoader().parse(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  'x',
) as THREE.Group
const { root } = prepareCustomAvatarMesh(raw, 1, [])
let skin: THREE.SkinnedMesh | null = null
root.traverse((o) => {
  if (o instanceof THREE.SkinnedMesh) skin = o
})
const core = buildCoreBoneMap(skin!.skeleton.bones)
const rest = new Map<string, THREE.Quaternion>()
for (const [k, b] of core) rest.set(k, b.quaternion.clone())
const _q = new THREE.Quaternion()
const _axis = new THREE.Vector3()
const p = new THREE.Vector3()

type Op = { core: MixamoCore; axis: [number, number, number]; angle: number }

function apply(ops: Op[]) {
  for (const [k, b] of core) b.quaternion.copy(rest.get(k)!)
  for (const op of ops) {
    const bone = core.get(op.core)
    if (!bone) continue
    _axis.set(...op.axis).normalize()
    _q.setFromAxisAngle(_axis, op.angle)
    bone.quaternion.multiply(_q)
  }
  root.updateMatrixWorld(true)
  skin!.skeleton.update()
}
function tip(n: MixamoCore) {
  core.get(n)!.getWorldPosition(p)
  return p.clone()
}

const bindHead = tip('Head')
const bindLH = tip('LeftHand')
const bindRH = tip('RightHand')
const bindLF = tip('LeftFoot')
const bindRF = tip('RightFoot')
const bindHips = tip('Hips')

/** Mixamo 语义：前倾 + 臂下垂 + 腿略弯下垂 */
const candidates: Array<{ name: string; ops: Op[] }> = [
  {
    name: 'hang-v1',
    ops: [
      { core: 'Spine', axis: [0, 0, 1], angle: 0.55 },
      { core: 'Neck', axis: [0, 0, 1], angle: 0.15 },
      { core: 'Head', axis: [0, 0, 1], angle: 0.12 },
      { core: 'LeftArm', axis: [0, 0, 1], angle: 0.65 },
      { core: 'RightArm', axis: [0, 0, -1], angle: 0.65 },
      { core: 'LeftForeArm', axis: [0, 0, 1], angle: 0.1 },
      { core: 'RightForeArm', axis: [0, 0, -1], angle: 0.25 },
      { core: 'LeftUpLeg', axis: [1, 0, 0], angle: 0.2 },
      { core: 'RightUpLeg', axis: [1, 0, 0], angle: 0.25 },
      { core: 'LeftLeg', axis: [1, 0, 0], angle: 0.1 },
      { core: 'RightLeg', axis: [1, 0, 0], angle: 0.12 },
      { core: 'LeftFoot', axis: [1, 0, 0], angle: -0.4 },
      { core: 'RightFoot', axis: [1, 0, 0], angle: -0.55 },
    ],
  },
  {
    name: 'hang-v2-mild',
    ops: [
      { core: 'Spine', axis: [0, 0, 1], angle: 0.4 },
      { core: 'Neck', axis: [0, 0, 1], angle: 0.1 },
      { core: 'LeftArm', axis: [0, 0, 1], angle: 0.5 },
      { core: 'RightArm', axis: [0, 0, -1], angle: 0.5 },
      { core: 'RightForeArm', axis: [0, 0, -1], angle: 0.2 },
      { core: 'LeftUpLeg', axis: [1, 0, 0], angle: 0.18 },
      { core: 'RightUpLeg', axis: [1, 0, 0], angle: 0.22 },
      { core: 'LeftLeg', axis: [1, 0, 0], angle: 0.08 },
      { core: 'RightLeg', axis: [1, 0, 0], angle: 0.1 },
      { core: 'LeftFoot', axis: [1, 0, 0], angle: -0.35 },
      { core: 'RightFoot', axis: [1, 0, 0], angle: -0.5 },
    ],
  },
  {
    name: 'hang-v3-hips',
    ops: [
      { core: 'Hips', axis: [0, 0, 1], angle: 0.15 },
      { core: 'Spine', axis: [0, 0, 1], angle: 0.45 },
      { core: 'Neck', axis: [0, 0, 1], angle: 0.12 },
      { core: 'Head', axis: [0, 0, 1], angle: 0.1 },
      { core: 'LeftShoulder', axis: [0, 0, 1], angle: 0.15 },
      { core: 'RightShoulder', axis: [0, 0, -1], angle: 0.15 },
      { core: 'LeftArm', axis: [0, 0, 1], angle: 0.55 },
      { core: 'RightArm', axis: [0, 0, -1], angle: 0.55 },
      { core: 'LeftForeArm', axis: [0, 0, 1], angle: 0.08 },
      { core: 'RightForeArm', axis: [0, 0, -1], angle: 0.22 },
      { core: 'LeftUpLeg', axis: [1, 0, 0], angle: 0.2 },
      { core: 'RightUpLeg', axis: [1, 0, 0], angle: 0.25 },
      { core: 'LeftLeg', axis: [1, 0, 0], angle: 0.08 },
      { core: 'RightLeg', axis: [1, 0, 0], angle: 0.12 },
      { core: 'LeftFoot', axis: [1, 0, 0], angle: -0.4 },
      { core: 'RightFoot', axis: [1, 0, 0], angle: -0.55 },
    ],
  },
]

for (const c of candidates) {
  apply(c.ops)
  const head = tip('Head')
  const lh = tip('LeftHand')
  const rh = tip('RightHand')
  const lf = tip('LeftFoot')
  const rf = tip('RightFoot')
  const hips = tip('Hips')
  const leanOk = head.z > bindHead.z + 0.15
  const hangOk = lh.y < bindLH.y - 0.15 && rh.y < bindRH.y - 0.15 && lh.y < head.y - 0.6 && rh.y < head.y - 0.6
  const legsHang = lf.y < hips.y - 2 && rf.y < hips.y - 2 && Math.abs(lf.y - rf.y) < 0.35
  console.log(c.name, {
    leanOk,
    hangOk,
    legsHang,
    ΔheadZ: +(head.z - bindHead.z).toFixed(2),
    headY: +head.y.toFixed(2),
    LH: [+lh.x.toFixed(2), +lh.y.toFixed(2)],
    RH: [+rh.x.toFixed(2), +rh.y.toFixed(2)],
    LF: [+lf.x.toFixed(2), +lf.y.toFixed(2)],
    RF: [+rf.x.toFixed(2), +rf.y.toFixed(2)],
    all: leanOk && hangOk && legsHang,
  })
}
