import fs from 'node:fs'
import path from 'node:path'
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
const p = new THREE.Vector3()

function dump(label: string) {
  root.updateMatrixWorld(true)
  skin!.skeleton.update()
  const parts = ['Head', 'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'] as const
  const row: Record<string, string> = {}
  for (const name of parts) {
    const b = core.get(name)
    if (!b) continue
    b.getWorldPosition(p)
    row[name] = `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`
  }
  console.log(label, row)
}

dump('bind')
applyHunyuanPose(root, 'picked-up')
dump('picked-up')

const lh = new THREE.Vector3()
const rh = new THREE.Vector3()
const lf = new THREE.Vector3()
const rf = new THREE.Vector3()
core.get('LeftHand')!.getWorldPosition(lh)
core.get('RightHand')!.getWorldPosition(rh)
core.get('LeftFoot')!.getWorldPosition(lf)
core.get('RightFoot')!.getWorldPosition(rf)
core.get('Head')!.getWorldPosition(p)

// sanity: hands should be higher than bind-ish, feet not crossed through torso
const handsAboveFeet = lh.y > lf.y && rh.y > rf.y
const feetApart = Math.abs(lf.x - rf.x) > 0.05
const headAbove = p.y > lf.y
console.log({ handsAboveFeet, feetApart, headAbove, footGap: Math.abs(lf.x - rf.x).toFixed(3) })
if (!handsAboveFeet || !headAbove) {
  console.error('FAIL pose sanity')
  process.exit(1)
}
console.log('OK hunyuan native pose sanity')
