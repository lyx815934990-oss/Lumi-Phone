import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { createHunyuanPoseClipById } from '../src/phone/apps/homeBuild/avatarPoseLibrary.ts'

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

THREE.ImageLoader.prototype.load = function (_url, onLoad) {
  onLoad?.({ width: 1, height: 1 } as unknown as HTMLImageElement)
  return { addEventListener() {}, removeEventListener() {} } as unknown as HTMLImageElement
}
THREE.TextureLoader.prototype.load = function (_url, onLoad) {
  const tex = new THREE.Texture()
  tex.image = { width: 1, height: 1 }
  onLoad?.(tex)
  return tex
}

const root = path.resolve(import.meta.dirname, '..')

function loadFbx(filePath: string) {
  const buf = fs.readFileSync(filePath)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return new FBXLoader().parse(ab, path.basename(filePath)) as THREE.Group
}

const hunyuan = loadFbx(path.join(root, '建模模型', '骨骼', '示例建模.fbx'))
const picked = loadFbx(path.join(root, 'public', 'home-animations', 'picked-up.fbx'))
const clip = picked.animations[0]
if (!clip) throw new Error('no clip')

const baked = createHunyuanPoseClipById(hunyuan, picked, clip, 'picked-up')
if (!baked) {
  console.error('FAIL: pose bake returned null')
  process.exit(1)
}

console.log('OK picked-up bake:', {
  tracks: baked.clip.tracks.length,
  duration: baked.clip.duration,
  bones: baked.clip.tracks.filter((t) => t.name.includes('quaternion')).length,
})
