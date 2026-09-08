import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { createHunyuanPoseClipById } from '../src/phone/apps/homeBuild/avatarPoseLibrary.ts'
import { buildCoreBoneMap } from '../src/phone/apps/homeBuild/avatarBoneCore.ts'

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

const rootDir = path.resolve(import.meta.dirname, '..')
function loadFbx(p: string) {
  const buf = fs.readFileSync(p)
  return new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), path.basename(p)) as THREE.Group
}

const hunyuan = loadFbx(path.join(rootDir, '建模模型', '骨骼', '示例建模.fbx'))
const picked = loadFbx(path.join(rootDir, 'public', 'home-animations', 'picked-up.fbx'))
const clip = picked.animations[0]!
const baked = createHunyuanPoseClipById(hunyuan, picked, clip, 'picked-up')!

let skin: THREE.SkinnedMesh | null = null
hunyuan.traverse((o) => { if (o instanceof THREE.SkinnedMesh) skin = o })
if (!skin) throw new Error('no skin')

skin.skeleton.pose()
const bind = buildCoreBoneMap(skin.skeleton.bones)
const leftArmBind = bind.get('LeftArm')!.quaternion.clone()

const mixer = new THREE.AnimationMixer(skin)
const action = mixer.clipAction(baked.clip)
action.play()
action.time = baked.clip.duration - 1e-4
mixer.update(0)
skin.skeleton.update()

const leftArmPose = bind.get('LeftArm')!.quaternion.clone()
const deg = leftArmBind.angleTo(leftArmPose) * 180 / Math.PI
console.log('LeftArm change after mixer (deg):', deg.toFixed(1))
if (deg < 5) {
  console.error('FAIL: mixer did not move bones')
  process.exit(1)
}
console.log('OK mixer playback moves bones')
