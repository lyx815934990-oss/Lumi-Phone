/**
 * 用与游戏相同的 prepareCustomAvatarMesh 扶正后，探测混元抬臂/屈腿局部轴。
 */
import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { buildCoreBoneMap } from '../src/phone/apps/homeBuild/avatarBoneCore.ts'
import { prepareCustomAvatarMesh } from '../src/phone/apps/homeBuild/avatarMeshPrep.ts'

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
root.updateMatrixWorld(true)

let skin: THREE.SkinnedMesh | null = null
root.traverse((o) => {
  if (o instanceof THREE.SkinnedMesh && (!skin || o.skeleton.bones.length > skin.skeleton.bones.length)) {
    skin = o
  }
})
if (!skin) throw new Error('no skin')
skin.skeleton.pose()
root.updateMatrixWorld(true)

const model = root.children[0]
console.log('model rot', model?.rotation.toArray().slice(0, 3))

const core = buildCoreBoneMap(skin.skeleton.bones)
const head = core.get('Head')
const foot = core.get('LeftFoot')
const hp = new THREE.Vector3()
const fp = new THREE.Vector3()
head?.getWorldPosition(hp)
foot?.getWorldPosition(fp)
console.log('headY', hp.y.toFixed(3), 'footY', fp.y.toFixed(3), 'upright?', hp.y > fp.y)

const probes = [
  { bone: 'LeftArm', tip: 'LeftHand', prefer: 'up' as const },
  { bone: 'RightArm', tip: 'RightHand', prefer: 'up' as const },
  { bone: 'LeftUpLeg', tip: 'LeftFoot', prefer: 'curl' as const },
  { bone: 'RightUpLeg', tip: 'RightFoot', prefer: 'curl' as const },
  { bone: 'LeftLeg', tip: 'LeftFoot', prefer: 'curl' as const },
  { bone: 'RightLeg', tip: 'RightFoot', prefer: 'curl' as const },
]

const axes = [
  ['x+', new THREE.Vector3(1, 0, 0)],
  ['x-', new THREE.Vector3(-1, 0, 0)],
  ['y+', new THREE.Vector3(0, 1, 0)],
  ['y-', new THREE.Vector3(0, -1, 0)],
  ['z+', new THREE.Vector3(0, 0, 1)],
  ['z-', new THREE.Vector3(0, 0, -1)],
] as const

const angle = 0.6
const _q = new THREE.Quaternion()
const _tip = new THREE.Vector3()
const _base = new THREE.Vector3()

for (const probe of probes) {
  const bone = core.get(probe.bone as never)
  const tipBone = core.get(probe.tip as never)
  if (!bone || !tipBone) continue
  const rest = bone.quaternion.clone()
  tipBone.getWorldPosition(_base)
  console.log(`\n${probe.bone} tip@bind=${_base.toArray().map((v) => +v.toFixed(3))}`)

  let best = { name: '?', score: -Infinity }
  for (const [name, axis] of axes) {
    bone.quaternion.copy(rest)
    _q.setFromAxisAngle(axis, angle)
    bone.quaternion.multiply(_q)
    root.updateMatrixWorld(true)
    tipBone.getWorldPosition(_tip)
    const dy = _tip.y - _base.y
    const dLen = _tip.distanceTo(_base)
    // arms: maximize tip Y; legs curl: tip should move toward hips (higher Y for feet when standing, or closer to pelvis)
    const score = probe.prefer === 'up' ? dy : dy // curl also raise foot toward body when standing
    console.log(`  ${name}: Δy=${dy.toFixed(3)} move=${dLen.toFixed(3)}`)
    if (score > best.score) best = { name, score }
  }
  bone.quaternion.copy(rest)
  root.updateMatrixWorld(true)
  console.log(`  BEST → ${best.name}`)
}
