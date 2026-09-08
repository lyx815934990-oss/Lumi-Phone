import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { retargetMixamoClipToTarget } from '../src/phone/apps/homeBuild/avatarRetarget.ts'
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

;(import.meta as { env?: { DEV?: boolean } }).env = { DEV: true }

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

const raw = loadFbx(path.join(root, '建模模型', '骨骼', '示例建模.fbx'))
const prepared = prepareCustomAvatarMesh(raw, 1, [])
const fallAir = loadFbx(path.join(root, 'public', 'home-animations', 'fall-air.fbx'))
const clip = fallAir.animations[0]!

console.log('prepared root children', prepared.root.children.length)
const rRaw = retargetMixamoClipToTarget(raw, fallAir, clip)
const rPrep = retargetMixamoClipToTarget(prepared.root, fallAir, clip)
console.log('raw retarget', rRaw?.clip.tracks.length ?? 'NULL')
console.log('prepared retarget', rPrep?.clip.tracks.length ?? 'NULL')
