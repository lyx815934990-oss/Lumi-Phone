import fs from 'node:fs'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { prepareCustomAvatarMesh } from '../src/phone/apps/homeBuild/avatarMeshPrep.ts'
import { applyHunyuanPose } from '../src/phone/apps/homeBuild/avatarHunyuanPoseLib.ts'
import { buildCoreBoneMap } from '../src/phone/apps/homeBuild/avatarBoneCore.ts'

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
THREE.ImageLoader.prototype.load = function (_u, onLoad) {
  onLoad?.({ width: 1, height: 1 } as unknown as HTMLImageElement)
  return { addEventListener() {}, removeEventListener() {} } as unknown as HTMLImageElement
}
THREE.TextureLoader.prototype.load = function (_u, onLoad) {
  const tex = new THREE.Texture()
  tex.image = { width: 1, height: 1 }
  onLoad?.(tex)
  return tex
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
const p = new THREE.Vector3()
const tip = (n: string) => {
  core.get(n as never)!.getWorldPosition(p)
  return p.clone()
}

applyHunyuanPose(root, 'picked-up')
const head = tip('Head')
const lh = tip('LeftHand')
const rh = tip('RightHand')
const lf = tip('LeftFoot')
const rf = tip('RightFoot')
const ok =
  lh.y < head.y - 0.2 &&
  rh.y < head.y - 0.2 &&
  Math.abs(lf.y - rf.y) < 0.2 &&
  Math.abs(Math.abs(lf.x) - Math.abs(rf.x)) < 0.3
console.log({
  headY: +head.y.toFixed(2),
  LH: [+lh.x.toFixed(2), +lh.y.toFixed(2)],
  RH: [+rh.x.toFixed(2), +rh.y.toFixed(2)],
  LF: [+lf.x.toFixed(2), +lf.y.toFixed(2), +lf.z.toFixed(2)],
  RF: [+rf.x.toFixed(2), +rf.y.toFixed(2), +rf.z.toFixed(2)],
  ok,
})
if (!ok) process.exit(1)
console.log('OK recalibrated pose')
