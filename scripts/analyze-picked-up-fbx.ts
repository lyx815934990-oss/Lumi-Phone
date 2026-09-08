/**
 * 分析 Mixamo「被拎起来移动.fbx」：骨层级、绑定姿、动画末帧姿势
 * node --import tsx scripts/analyze-picked-up-fbx.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { buildCoreBoneMap, MIXAMO_CORE } from '../src/phone/apps/homeBuild/avatarBoneCore.ts'

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

const rootDir = path.resolve(import.meta.dirname, '..')
const filePath = path.join(rootDir, '建模模型', '骨骼', '被拎起来移动.fbx')

function loadFbx(p: string) {
  const buf = fs.readFileSync(p)
  return new FBXLoader().parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    path.basename(p),
  ) as THREE.Group
}

function eulerDeg(q: THREE.Quaternion): [number, number, number] {
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
  return [
    +((e.x * 180) / Math.PI).toFixed(1),
    +((e.y * 180) / Math.PI).toFixed(1),
    +((e.z * 180) / Math.PI).toFixed(1),
  ]
}

function collectBones(group: THREE.Object3D): THREE.Bone[] {
  const bones: THREE.Bone[] = []
  group.traverse((o) => {
    if (o instanceof THREE.Bone) bones.push(o)
  })
  return bones
}

function printTree(bone: THREE.Object3D, depth = 0) {
  if (!(bone instanceof THREE.Bone) && depth > 0) return
  if (bone instanceof THREE.Bone) {
    console.log(`${'  '.repeat(depth)}${bone.name}`)
  }
  for (const c of bone.children) printTree(c, depth + (bone instanceof THREE.Bone ? 1 : 0))
}

const group = loadFbx(filePath)
const bones = collectBones(group)
const core = buildCoreBoneMap(bones)
const clip = group.animations[0]

console.log('=== 文件 ===')
console.log(filePath)
console.log('size MB', +(fs.statSync(filePath).size / 1024 / 1024).toFixed(3))
console.log('bone count', bones.length)
console.log('animations', group.animations.length)
if (clip) {
  console.log('clip name:', clip.name)
  console.log('duration:', clip.duration.toFixed(4), 's')
  console.log('tracks:', clip.tracks.length)
  console.log(
    'track samples:',
    clip.tracks.slice(0, 5).map((t) => `${t.name} keys=${t.times.length}`),
  )
}

// Find hip root for hierarchy
const hips =
  bones.find((b) => /hips/i.test(b.name)) ??
  bones.find((b) => !b.parent || !(b.parent instanceof THREE.Bone))
console.log('\n=== 骨骼层级（从 Hips） ===')
if (hips) printTree(hips, 0)

// Bind pose
console.log('\n=== 绑定姿（T/A pose）核心骨 local euler XYZ° ===')
for (const name of MIXAMO_CORE) {
  const b = core.get(name)
  if (!b) {
    console.log(`  ${name.padEnd(16)} MISSING`)
    continue
  }
  const parent = b.parent instanceof THREE.Bone ? b.parent.name : String(b.parent?.type ?? '?')
  console.log(
    `  ${name.padEnd(16)} parent=${parent.padEnd(22)} pos=${JSON.stringify(b.position.toArray().map((v) => +v.toFixed(2)))} rot=${JSON.stringify(eulerDeg(b.quaternion))}`,
  )
}

// Animate to end / mid frames
if (!clip) {
  console.log('NO CLIP')
  process.exit(1)
}

function sampleAt(t: number) {
  const g = group // already loaded
  const mixer = new THREE.AnimationMixer(g)
  const action = mixer.clipAction(clip!)
  action.play()
  mixer.setTime(t)
  g.updateMatrixWorld(true)
  const out: Record<string, { local: number[]; worldPos: number[]; worldEuler: number[] }> = {}
  const wp = new THREE.Vector3()
  const wq = new THREE.Quaternion()
  for (const name of MIXAMO_CORE) {
    const b = core.get(name)
    if (!b) continue
    b.getWorldPosition(wp)
    b.getWorldQuaternion(wq)
    out[name] = {
      local: eulerDeg(b.quaternion),
      worldPos: wp.toArray().map((v) => +v.toFixed(2)),
      worldEuler: eulerDeg(wq),
    }
  }
  mixer.stopAllAction()
  mixer.uncacheRoot(g)
  // reset via pose if skinned else just leave
  return out
}

const times = [
  ['start', 0],
  ['mid', clip.duration * 0.5],
  ['end', Math.max(0, clip.duration - 1e-4)],
] as const

for (const [label, t] of times) {
  console.log(`\n=== 动画帧 ${label} t=${Number(t).toFixed(4)} — local euler° / world pos ===`)
  const pose = sampleAt(t as number)
  for (const name of MIXAMO_CORE) {
    const row = pose[name]
    if (!row) continue
    console.log(
      `  ${name.padEnd(16)} local=${JSON.stringify(row.local).padEnd(22)} worldPos=${JSON.stringify(row.worldPos)}`,
    )
  }
}

// Human description of end pose
const end = sampleAt(Math.max(0, clip.duration - 1e-4))
const hipsP = end.Hips?.worldPos
const headP = end.Head?.worldPos
const lHand = end.LeftHand?.worldPos
const rHand = end.RightHand?.worldPos
const lFoot = end.LeftFoot?.worldPos
const rFoot = end.RightFoot?.worldPos

console.log('\n=== 末帧语义（根据世界坐标） ===')
if (hipsP && headP) {
  console.log(`身高方向: headY=${headP[1]} hipsY=${hipsP[1]} → ${headP[1]! > hipsP[1]! ? '头在上(站/悬)' : '头在下'}`)
}
if (lHand && rHand && headP) {
  console.log(
    `双手相对头: LhandY=${lHand[1]} RhandY=${rHand[1]} headY=${headP[1]} → 手${lHand[1]! > headP[1]! - 10 ? '接近/高于头' : '在头下方'}`,
  )
}
if (lFoot && rFoot && hipsP) {
  console.log(
    `双脚相对髋: LfootY=${lFoot[1]} RfootY=${rFoot[1]} hipsY=${hipsP[1]} → 脚${Math.min(lFoot[1]!, rFoot[1]!) > hipsP[1]! - 30 ? '收近躯干' : '自然下垂'}`,
  )
}

// Delta from bind
console.log('\n=== 末帧相对绑定姿的 local 旋转差（度） ===')
// re-bind
for (const b of bones) {
  /* can't easily restore without skeleton.pose - reload */
}
const g2 = loadFbx(filePath)
const bones2 = collectBones(g2)
const core2 = buildCoreBoneMap(bones2)
const bindLocal = new Map<string, THREE.Quaternion>()
for (const [k, b] of core2) bindLocal.set(k, b.quaternion.clone())

const mixer = new THREE.AnimationMixer(g2)
mixer.clipAction(g2.animations[0]!).play()
mixer.setTime(Math.max(0, g2.animations[0]!.duration - 1e-4))
g2.updateMatrixWorld(true)

const _inv = new THREE.Quaternion()
const _d = new THREE.Quaternion()
for (const name of MIXAMO_CORE) {
  const b = core2.get(name)
  const bind = bindLocal.get(name)
  if (!b || !bind) continue
  _d.copy(_inv.copy(bind).invert()).multiply(b.quaternion)
  if (_d.w < 0) _d.set(-_d.x, -_d.y, -_d.z, -_d.w)
  const ang = +((_d.angleTo(new THREE.Quaternion()) * 180) / Math.PI).toFixed(1)
  if (ang < 1) continue
  console.log(`  ${name.padEnd(16)} Δ=${ang}°  euler≈${JSON.stringify(eulerDeg(_d))}`)
}
