import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { buildCoreBoneMap } from '../src/phone/apps/homeBuild/avatarBoneCore.ts'
import { buildMixamoSourcePack } from '../src/phone/apps/homeBuild/avatarRetarget.ts'

globalThis.window = { URL: { createObjectURL: () => 'blob:n' }, innerWidth: 1920, innerHeight: 1080 } as Window & typeof globalThis
globalThis.document = {
  createElementNS(_ns: string, tag: string) {
    const el = { style: {}, setAttribute() {}, onload: null as (() => void) | null }
    if (tag === 'img') Object.defineProperty(el, 'src', { set() { queueMicrotask(() => el.onload?.()) }, get() { return '' } })
    return el as unknown as HTMLElement
  },
} as Document
THREE.ImageLoader.prototype.load = function (_u, cb) { cb?.({ width: 1, height: 1 } as unknown as HTMLImageElement); return { addEventListener() {} } as unknown as HTMLImageElement }
THREE.TextureLoader.prototype.load = function (_u, cb) { const t = new THREE.Texture(); t.image = { width: 1, height: 1 }; cb?.(t); return t }

const root = path.resolve(import.meta.dirname, '..')
function loadFbx(p: string) {
  const buf = fs.readFileSync(p)
  return new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), path.basename(p)) as THREE.Group
}

const hunyuan = loadFbx(path.join(root, '建模模型', '骨骼', '示例建模.fbx'))
const picked = loadFbx(path.join(root, 'public', 'home-animations', 'picked-up.fbx'))
const clip = picked.animations[0]!

let skin: THREE.SkinnedMesh | null = null
hunyuan.traverse((o) => {
  if (o instanceof THREE.SkinnedMesh && (!skin || (o.skeleton?.bones.length ?? 0) > (skin.skeleton?.bones.length ?? 0))) skin = o
})
if (!skin) throw new Error('no skin')

const clone = picked.clone(true)
const pack = buildMixamoSourcePack(clone)!
const mixCore = buildCoreBoneMap(pack.bones)
const hunCore = buildCoreBoneMap(skin.skeleton.bones)

pack.source.skeleton.pose()
clone.updateMatrixWorld(true)
const mixBindLocal = new Map<string, THREE.Quaternion>()
for (const [core, bone] of mixCore) mixBindLocal.set(core, bone.quaternion.clone())

const mixer = new THREE.AnimationMixer(clone)
mixer.clipAction(clip).play()
mixer.setTime(Math.max(0, clip.duration - 1e-4))
clone.updateMatrixWorld(true)

skin.skeleton.pose()
hunyuan.updateMatrixWorld(true)

let changed = 0
for (const [core, hBone] of hunCore) {
  const mBone = mixCore.get(core)
  const mBind = mixBindLocal.get(core)
  if (!mBone || !mBind) continue

  const delta = mBone.quaternion.clone().premultiply(mBind.clone().invert())
  const target = hBone.quaternion.clone().multiply(delta)
  const diff = hBone.quaternion.angleTo(target) * 180 / Math.PI
  if (diff > 1) {
    changed++
    console.log(core, 'deg', diff.toFixed(1), 'mixPose', mBone.quaternion.toArray().map(v => +v.toFixed(3)))
  }
}
console.log('bones changed:', changed, 'clip dur', clip.duration, 'tracks', clip.tracks.length)
