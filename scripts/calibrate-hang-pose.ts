/**
 * 按 Mixamo「被拎起来」语义校准混元：前倾 + 手臂下垂 + 腿略弯
 */
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

const bind = {
  head: tip('Head'),
  hips: tip('Hips'),
  lh: tip('LeftHand'),
  rh: tip('RightHand'),
  lf: tip('LeftFoot'),
  rf: tip('RightFoot'),
}
console.log('bind', {
  headY: +bind.head.y.toFixed(2),
  handY: [+bind.lh.y.toFixed(2), +bind.rh.y.toFixed(2)],
  footY: [+bind.lf.y.toFixed(2), +bind.rf.y.toFixed(2)],
  headZ: +bind.head.z.toFixed(2),
})

// Spine lean: maximize head +Z
console.log('\nSpine lean (want +Δz head):')
for (const [name, axis] of [
  ['x+', [1, 0, 0]],
  ['x-', [-1, 0, 0]],
  ['z+', [0, 0, 1]],
  ['z-', [0, 0, -1]],
] as const) {
  apply([{ core: 'Spine', axis: [...axis] as [number, number, number], angle: 0.5 }])
  const h = tip('Head')
  console.log(name, `Δz=${(h.z - bind.head.z).toFixed(3)} Δy=${(h.y - bind.head.y).toFixed(3)}`)
}

// Arms hang: minimize hand Y
console.log('\nLeftArm hang (want -Δy hand):')
for (const [name, axis] of [
  ['x+', [1, 0, 0]],
  ['x-', [-1, 0, 0]],
  ['z+', [0, 0, 1]],
  ['z-', [0, 0, -1]],
] as const) {
  apply([{ core: 'LeftArm', axis: [...axis] as [number, number, number], angle: 0.5 }])
  const h = tip('LeftHand')
  console.log(name, `Δy=${(h.y - bind.lh.y).toFixed(3)} y=${h.y.toFixed(2)}`)
}

console.log('\nRightArm hang (want -Δy hand):')
for (const [name, axis] of [
  ['x+', [1, 0, 0]],
  ['x-', [-1, 0, 0]],
  ['z+', [0, 0, 1]],
  ['z-', [0, 0, -1]],
] as const) {
  apply([{ core: 'RightArm', axis: [...axis] as [number, number, number], angle: 0.5 }])
  const h = tip('RightHand')
  console.log(name, `Δy=${(h.y - bind.rh.y).toFixed(3)} y=${h.y.toFixed(2)}`)
}

// Final Mixamo-like candidate
const pose: Op[] = [
  { core: 'Hips', axis: [1, 0, 0], angle: 0.2 },
  { core: 'Spine', axis: [1, 0, 0], angle: 0.45 },
  { core: 'Spine1', axis: [1, 0, 0], angle: 0.25 }, // may skip if bad on hunyuan
  { core: 'Neck', axis: [1, 0, 0], angle: 0.15 },
  { core: 'Head', axis: [1, 0, 0], angle: 0.12 },
  { core: 'LeftShoulder', axis: [0, 0, 1], angle: 0.2 },
  { core: 'RightShoulder', axis: [0, 0, -1], angle: 0.2 },
  { core: 'LeftArm', axis: [0, 0, 1], angle: 0.55 },
  { core: 'RightArm', axis: [0, 0, -1], angle: 0.55 },
  { core: 'LeftForeArm', axis: [0, 0, 1], angle: 0.08 },
  { core: 'RightForeArm', axis: [0, 0, -1], angle: 0.2 },
  { core: 'LeftUpLeg', axis: [1, 0, 0], angle: 0.2 },
  { core: 'RightUpLeg', axis: [1, 0, 0], angle: 0.25 },
  { core: 'LeftLeg', axis: [1, 0, 0], angle: 0.08 },
  { core: 'RightLeg', axis: [1, 0, 0], angle: 0.12 },
  { core: 'LeftFoot', axis: [1, 0, 0], angle: -0.35 },
  { core: 'RightFoot', axis: [1, 0, 0], angle: -0.5 },
]

// First probe without Spine1 (dangerous on hunyuan)
const poseSafe: Op[] = [
  { core: 'Hips', axis: [1, 0, 0], angle: 0.18 },
  { core: 'Spine', axis: [1, 0, 0], angle: 0.5 },
  { core: 'Neck', axis: [1, 0, 0], angle: 0.18 },
  { core: 'Head', axis: [1, 0, 0], angle: 0.15 },
  { core: 'LeftArm', axis: [0, 0, 1], angle: 0.6 },
  { core: 'RightArm', axis: [0, 0, -1], angle: 0.6 },
  { core: 'LeftForeArm', axis: [0, 0, 1], angle: 0.1 },
  { core: 'RightForeArm', axis: [0, 0, -1], angle: 0.25 },
  { core: 'LeftUpLeg', axis: [1, 0, 0], angle: 0.22 },
  { core: 'RightUpLeg', axis: [1, 0, 0], angle: 0.28 },
  { core: 'LeftLeg', axis: [1, 0, 0], angle: 0.1 },
  { core: 'RightLeg', axis: [1, 0, 0], angle: 0.15 },
  { core: 'LeftFoot', axis: [1, 0, 0], angle: -0.4 },
  { core: 'RightFoot', axis: [1, 0, 0], angle: -0.55 },
]

apply(poseSafe)
const head = tip('Head')
const hips = tip('Hips')
const lh = tip('LeftHand')
const rh = tip('RightHand')
const lf = tip('LeftFoot')
const rf = tip('RightFoot')
console.log('\nSAFE pose result', {
  head: [+head.x.toFixed(2), +head.y.toFixed(2), +head.z.toFixed(2)],
  ΔheadZ: +(head.z - bind.head.z).toFixed(2),
  hands: [
    [+lh.x.toFixed(2), +lh.y.toFixed(2)],
    [+rh.x.toFixed(2), +rh.y.toFixed(2)],
  ],
  handBelowHead: lh.y < head.y - 0.5 && rh.y < head.y - 0.5,
  handLowered: lh.y < bind.lh.y - 0.1 && rh.y < bind.rh.y - 0.1,
  feet: [
    [+lf.x.toFixed(2), +lf.y.toFixed(2), +lf.z.toFixed(2)],
    [+rf.x.toFixed(2), +rf.y.toFixed(2), +rf.z.toFixed(2)],
  ],
  feetStillLow: lf.y < hips.y - 2 && rf.y < hips.y - 2,
  feetSym: Math.abs(lf.y - rf.y) < 0.4,
})
