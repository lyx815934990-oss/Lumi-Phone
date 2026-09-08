/**
 * 续：定腿轴对称 + 打印最终姿势坐标
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

const core = buildCoreBoneMap(skin.skeleton.bones)
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

function tip(name: MixamoCore) {
  core.get(name)!.getWorldPosition(p)
  return p.clone()
}

const base = {
  LeftUpLeg: { core: 'LeftUpLeg' as const, axis: [0, 0, 1] as [number, number, number], angle: 0.55 },
  RightUpLeg: { core: 'RightUpLeg' as const, axis: [0, 0, -1] as [number, number, number], angle: 0.55 },
}

const axes6: Array<[number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

console.log('With UpLegs fixed forward-curl, probe knees:')
for (const axis of axes6) {
  apply([
    base.LeftUpLeg,
    base.RightUpLeg,
    { core: 'LeftLeg', axis: axis as [number, number, number], angle: 0.7 },
    { core: 'RightLeg', axis: [-axis[0], -axis[1], -axis[2]] as [number, number, number], angle: 0.7 },
  ])
  const lf = tip('LeftFoot')
  const rf = tip('RightFoot')
  console.log(
    `L${axis.join(',')} Rmirror: LF=(${lf.x.toFixed(2)},${lf.y.toFixed(2)},${lf.z.toFixed(2)}) RF=(${rf.x.toFixed(2)},${rf.y.toFixed(2)},${rf.z.toFixed(2)}) |x|diff=${Math.abs(Math.abs(lf.x) - Math.abs(rf.x)).toFixed(2)} ydiff=${Math.abs(lf.y - rf.y).toFixed(2)}`,
  )
}

// Also try same axis both legs
console.log('\nSame axis both knees:')
for (const axis of axes6) {
  apply([
    base.LeftUpLeg,
    base.RightUpLeg,
    { core: 'LeftLeg', axis: axis as [number, number, number], angle: 0.7 },
    { core: 'RightLeg', axis: axis as [number, number, number], angle: 0.7 },
  ])
  const lf = tip('LeftFoot')
  const rf = tip('RightFoot')
  console.log(
    `${axis.join(',')}: LF=(${lf.x.toFixed(2)},${lf.y.toFixed(2)},${lf.z.toFixed(2)}) RF=(${rf.x.toFixed(2)},${rf.y.toFixed(2)},${rf.z.toFixed(2)}) |x|diff=${Math.abs(Math.abs(lf.x) - Math.abs(rf.x)).toFixed(2)} ydiff=${Math.abs(lf.y - rf.y).toFixed(2)}`,
  )
}

const finalPose: Op[] = [
  { core: 'Spine', axis: [1, 0, 0], angle: 0.15 },
  { core: 'LeftArm', axis: [0, 0, -1], angle: 0.4 },
  { core: 'RightArm', axis: [0, 0, 1], angle: 0.4 },
  { core: 'LeftForeArm', axis: [0, 1, 0], angle: 0.3 },
  { core: 'RightForeArm', axis: [0, -1, 0], angle: 0.3 },
  { core: 'LeftUpLeg', axis: [0, 0, 1], angle: 0.55 },
  { core: 'RightUpLeg', axis: [0, 0, -1], angle: 0.55 },
  { core: 'LeftLeg', axis: [0, 0, 1], angle: 0.7 },
  { core: 'RightLeg', axis: [0, 0, -1], angle: 0.7 },
]

apply(finalPose)
const lh = tip('LeftHand')
const rh = tip('RightHand')
const lf = tip('LeftFoot')
const rf = tip('RightFoot')
const head = tip('Head')
console.log('\nFINAL candidate', {
  headY: +head.y.toFixed(2),
  LH: [+lh.x.toFixed(2), +lh.y.toFixed(2), +lh.z.toFixed(2)],
  RH: [+rh.x.toFixed(2), +rh.y.toFixed(2), +rh.z.toFixed(2)],
  LF: [+lf.x.toFixed(2), +lf.y.toFixed(2), +lf.z.toFixed(2)],
  RF: [+rf.x.toFixed(2), +rf.y.toFixed(2), +rf.z.toFixed(2)],
  handsBelowHead: lh.y < head.y - 0.2 && rh.y < head.y - 0.2,
  feetSymY: Math.abs(lf.y - rf.y) < 0.25,
  feetSymX: Math.abs(Math.abs(lf.x) - Math.abs(rf.x)) < 0.35,
})
