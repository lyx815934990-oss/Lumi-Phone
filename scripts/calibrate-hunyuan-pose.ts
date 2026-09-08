/**
 * 校准混元「被拎起」姿势：手不过头顶、双脚对称上收。
 */
import fs from 'node:fs'
import path from 'node:path'
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

const rootDir = path.resolve(import.meta.dirname, '..')
function loadFbx(p: string) {
  const buf = fs.readFileSync(p)
  return new FBXLoader().parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    path.basename(p),
  ) as THREE.Group
}

const raw = loadFbx(path.join(rootDir, '建模模型', '骨骼', '示例建模.fbx'))
const { root } = prepareCustomAvatarMesh(raw, 1, [])
let skin: THREE.SkinnedMesh | null = null
root.traverse((o) => {
  if (o instanceof THREE.SkinnedMesh) skin = o
})
if (!skin) throw new Error('no skin')
skin.skeleton.pose()
root.updateMatrixWorld(true)

const core = buildCoreBoneMap(skin.skeleton.bones)
const rest = new Map<string, THREE.Quaternion>()
for (const [k, b] of core) rest.set(k, b.quaternion.clone())

const _q = new THREE.Quaternion()
const _axis = new THREE.Vector3()
const p = new THREE.Vector3()

function reset() {
  for (const [k, b] of core) b.quaternion.copy(rest.get(k)!)
  root.updateMatrixWorld(true)
  skin!.skeleton.update()
}

function apply(ops: Array<{ core: MixamoCore; axis: [number, number, number]; angle: number }>) {
  reset()
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

function tip(name: MixamoCore) {
  core.get(name)!.getWorldPosition(p)
  return p.clone()
}

const bindHead = tip('Head')
const bindLH = tip('LeftHand')
const bindRH = tip('RightHand')
const bindLF = tip('LeftFoot')
const bindRF = tip('RightFoot')
console.log('bind hands Y', bindLH.y.toFixed(2), bindRH.y.toFixed(2), 'head', bindHead.y.toFixed(2))

// Probe RightUpLeg / RightLeg more carefully for symmetric foot raise with Left
const axes6: Array<[string, [number, number, number]]> = [
  ['x+', [1, 0, 0]],
  ['x-', [-1, 0, 0]],
  ['y+', [0, 1, 0]],
  ['y-', [0, -1, 0]],
  ['z+', [0, 0, 1]],
  ['z-', [0, 0, -1]],
]

console.log('\n=== LeftUpLeg alone 0.5 ===')
for (const [name, axis] of axes6) {
  apply([{ core: 'LeftUpLeg', axis, angle: 0.5 }])
  const f = tip('LeftFoot')
  console.log(name, `y=${f.y.toFixed(2)} x=${f.x.toFixed(2)} z=${f.z.toFixed(2)} Δy=${(f.y - bindLF.y).toFixed(2)} Δx=${(f.x - bindLF.x).toFixed(2)}`)
}

console.log('\n=== RightUpLeg alone 0.5 ===')
for (const [name, axis] of axes6) {
  apply([{ core: 'RightUpLeg', axis, angle: 0.5 }])
  const f = tip('RightFoot')
  console.log(name, `y=${f.y.toFixed(2)} x=${f.x.toFixed(2)} z=${f.z.toFixed(2)} Δy=${(f.y - bindRF.y).toFixed(2)} Δx=${(f.x - bindRF.x).toFixed(2)}`)
}

console.log('\n=== LeftArm alone 0.4 / 0.7 ===')
for (const ang of [0.35, 0.5, 0.7]) {
  apply([{ core: 'LeftArm', axis: [0, 0, -1], angle: ang }])
  const h = tip('LeftHand')
  console.log(`z- ${ang}: handY=${h.y.toFixed(2)} (head ${bindHead.y.toFixed(2)}) Δy=${(h.y - bindLH.y).toFixed(2)}`)
}

// Candidate picked-up: mild arms + mirrored legs
const candidates = [
  {
    name: 'mild-A',
    ops: [
      { core: 'LeftArm' as const, axis: [0, 0, -1] as [number, number, number], angle: 0.4 },
      { core: 'RightArm' as const, axis: [0, 0, 1] as [number, number, number], angle: 0.4 },
      { core: 'LeftUpLeg' as const, axis: [-1, 0, 0] as [number, number, number], angle: 0.45 },
      { core: 'RightUpLeg' as const, axis: [1, 0, 0] as [number, number, number], angle: 0.45 },
      { core: 'LeftLeg' as const, axis: [-1, 0, 0] as [number, number, number], angle: 0.6 },
      { core: 'RightLeg' as const, axis: [1, 0, 0] as [number, number, number], angle: 0.6 },
    ],
  },
  {
    name: 'mild-B-legZ',
    ops: [
      { core: 'LeftArm' as const, axis: [0, 0, -1] as [number, number, number], angle: 0.4 },
      { core: 'RightArm' as const, axis: [0, 0, 1] as [number, number, number], angle: 0.4 },
      { core: 'LeftUpLeg' as const, axis: [0, 0, -1] as [number, number, number], angle: 0.45 },
      { core: 'RightUpLeg' as const, axis: [0, 0, 1] as [number, number, number], angle: 0.45 },
      { core: 'LeftLeg' as const, axis: [0, 0, -1] as [number, number, number], angle: 0.55 },
      { core: 'RightLeg' as const, axis: [0, 0, 1] as [number, number, number], angle: 0.55 },
    ],
  },
  {
    name: 'mild-C-uplegBest',
    ops: [
      { core: 'Spine' as const, axis: [1, 0, 0] as [number, number, number], angle: 0.12 },
      { core: 'LeftArm' as const, axis: [0, 0, -1] as [number, number, number], angle: 0.38 },
      { core: 'RightArm' as const, axis: [0, 0, 1] as [number, number, number], angle: 0.38 },
      { core: 'LeftForeArm' as const, axis: [0, 1, 0] as [number, number, number], angle: 0.35 },
      { core: 'RightForeArm' as const, axis: [0, -1, 0] as [number, number, number], angle: 0.35 },
      { core: 'LeftUpLeg' as const, axis: [-1, 0, 0] as [number, number, number], angle: 0.5 },
      { core: 'RightUpLeg' as const, axis: [0, 0, 1] as [number, number, number], angle: 0.5 },
      { core: 'LeftLeg' as const, axis: [-1, 0, 0] as [number, number, number], angle: 0.65 },
      { core: 'RightLeg' as const, axis: [0, 0, -1] as [number, number, number], angle: 0.65 },
    ],
  },
]

for (const c of candidates) {
  apply(c.ops)
  const lh = tip('LeftHand')
  const rh = tip('RightHand')
  const lf = tip('LeftFoot')
  const rf = tip('RightFoot')
  const head = tip('Head')
  const handOk = lh.y < head.y - 0.15 && rh.y < head.y - 0.15
  const footSym = Math.abs(lf.y - rf.y) < 0.35 && Math.abs(Math.abs(lf.x) - Math.abs(rf.x)) < 0.8
  console.log(`\n${c.name}`, {
    handOk,
    footSym,
    LH: [+lh.x.toFixed(2), +lh.y.toFixed(2)],
    RH: [+rh.x.toFixed(2), +rh.y.toFixed(2)],
    LF: [+lf.x.toFixed(2), +lf.y.toFixed(2), +lf.z.toFixed(2)],
    RF: [+rf.x.toFixed(2), +rf.y.toFixed(2), +rf.z.toFixed(2)],
    headY: +head.y.toFixed(2),
  })
}
