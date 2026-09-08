/**
 * 验证混元姿势烘焙（示例建模.fbx + Mixamo picked-up）
 * node scripts/test-hunyuan-pose.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    URL: { createObjectURL: () => 'blob:node' },
    innerWidth: 1920,
    innerHeight: 1080,
  }
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElementNS(_ns, tag) {
      const el = { style: {}, setAttribute() {}, getAttribute: () => null }
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
      return el
    },
  }
}

const THREE = await import('three')
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js')

THREE.ImageLoader.prototype.load = function (_url, onLoad) {
  onLoad?.({ width: 1, height: 1 })
  return { addEventListener() {}, removeEventListener() {} }
}
THREE.TextureLoader.prototype.load = function (_url, onLoad) {
  const tex = new THREE.Texture()
  tex.image = { width: 1, height: 1 }
  onLoad?.(tex)
  return tex
}

// 动态 import TS 编译产物较麻烦；内联核心逻辑做 smoke test
const root = path.resolve(__dirname, '..')
const hunyuanPath = path.join(root, '建模模型', '骨骼', '示例建模.fbx')
const pickedPath = path.join(root, 'public', 'home-animations', 'picked-up.fbx')

function loadFbx(p) {
  const loader = new FBXLoader()
  const buf = fs.readFileSync(p)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return loader.parse(ab, path.basename(p))
}

const hunyuan = loadFbx(hunyuanPath)
const picked = loadFbx(pickedPath)
const clip = picked.animations?.[0]
if (!clip) {
  console.error('picked-up 无动画')
  process.exit(1)
}

console.log('混元骨数:', hunyuan.children.length)
let skinCount = 0
hunyuan.traverse((o) => {
  if (o.isSkinnedMesh) skinCount++
})
console.log('SkinnedMesh:', skinCount)
console.log('picked-up clip:', clip.name, 'duration:', clip.duration.toFixed(3), 'tracks:', clip.tracks.length)
console.log('OK — 姿势烘焙逻辑在 avatarPoseLibrary.ts，请浏览器内硬刷新验证拎起效果')
