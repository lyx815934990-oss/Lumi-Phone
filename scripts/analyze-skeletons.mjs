/**
 * 对比 Mixamo 动作 FBX 与混元绑骨 FBX 的骨骼结构 / 绑定姿
 * node scripts/analyze-skeletons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// FBXLoader 在 Node 里需要 browser globals
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
      const el = {
        style: {},
        setAttribute() {},
        getAttribute: () => null,
      }
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

// 跳过贴图 IO，只解析骨架
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
const root = path.resolve(__dirname, '..')
const boneDir = path.join(root, '建模模型', '骨骼')

const MIXAMO_CORE = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
  'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
]

const ALIAS_TO_CORE = {
  hips: 'Hips', pelvis: 'Hips', hip: 'Hips', root: 'Hips',
  spine: 'Spine', spine1: 'Spine1', spine2: 'Spine2', spine3: 'Spine2', chest: 'Spine2',
  neck: 'Neck', head: 'Head',
  leftshoulder: 'LeftShoulder', rightshoulder: 'RightShoulder',
  leftarm: 'LeftArm', leftupperarm: 'LeftArm', upperarm_l: 'LeftArm', l_upperarm: 'LeftArm',
  rightarm: 'RightArm', rightupperarm: 'RightArm', upperarm_r: 'RightArm', r_upperarm: 'RightArm',
  leftforearm: 'LeftForeArm', leftlowerarm: 'LeftForeArm', lowerarm_l: 'LeftForeArm', l_forearm: 'LeftForeArm',
  rightforearm: 'RightForeArm', rightlowerarm: 'RightForeArm', lowerarm_r: 'RightForeArm', r_forearm: 'RightForeArm',
  lefthand: 'LeftHand', hand_l: 'LeftHand', l_hand: 'LeftHand',
  righthand: 'RightHand', hand_r: 'RightHand', r_hand: 'RightHand',
  leftupleg: 'LeftUpLeg', leftthigh: 'LeftUpLeg', leftupperleg: 'LeftUpLeg', upperleg_l: 'LeftUpLeg', l_upleg: 'LeftUpLeg',
  rightupleg: 'RightUpLeg', rightthigh: 'RightUpLeg', rightupperleg: 'RightUpLeg', upperleg_r: 'RightUpLeg', r_upleg: 'RightUpLeg',
  leftleg: 'LeftLeg', leftcalf: 'LeftLeg', leftlowerleg: 'LeftLeg', lowerleg_l: 'LeftLeg', l_leg: 'LeftLeg',
  rightleg: 'RightLeg', rightcalf: 'RightLeg', rightlowerleg: 'RightLeg', lowerleg_r: 'RightLeg', r_leg: 'RightLeg',
  leftfoot: 'LeftFoot', foot_l: 'LeftFoot', l_foot: 'LeftFoot',
  rightfoot: 'RightFoot', foot_r: 'RightFoot', r_foot: 'RightFoot',
  lefttoebase: 'LeftToeBase', lefttoe: 'LeftToeBase',
  righttoebase: 'RightToeBase', righttoe: 'RightToeBase',
}

function normalizeBoneKey(name) {
  return name.replace(/^mixamorig[:_\-]?/i, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function resolveCoreName(boneName) {
  const key = normalizeBoneKey(boneName)
  if (!key) return null
  for (const core of MIXAMO_CORE) {
    if (normalizeBoneKey(core) === key) return core
  }
  return ALIAS_TO_CORE[key] ?? null
}

function findFbx(dir, pattern) {
  if (!fs.existsSync(dir)) return null
  for (const name of fs.readdirSync(dir)) {
    if (name.toLowerCase().endsWith('.fbx') && pattern.test(name)) {
      return path.join(dir, name)
    }
  }
  return null
}

function loadFbx(filePath) {
  const loader = new FBXLoader()
  const buf = fs.readFileSync(filePath)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return loader.parse(ab, path.basename(filePath))
}

function isBone(obj) {
  return obj?.isBone === true
}

function isSkinnedMesh(obj) {
  return obj?.isSkinnedMesh === true
}

function findPrimarySkinned(group) {
  let best = null
  let bestCount = 0
  group.traverse((obj) => {
    if (!isSkinnedMesh(obj) || !obj.skeleton?.bones?.length) return
    const n = obj.skeleton.bones.length
    if (n > bestCount) {
      best = obj
      bestCount = n
    }
  })
  return best
}

function collectBones(group) {
  const bones = []
  const seen = new Set()
  group.traverse((obj) => {
    if (isBone(obj) && !seen.has(obj)) {
      seen.add(obj)
      bones.push(obj)
    }
  })
  return bones
}

function quatToEulerDeg(q) {
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
  return [
    +(e.x * 180 / Math.PI).toFixed(1),
    +(e.y * 180 / Math.PI).toFixed(1),
    +(e.z * 180 / Math.PI).toFixed(1),
  ]
}

function extractSkeletonInfo(group, label) {
  const skin = findPrimarySkinned(group)
  let bones = skin?.skeleton?.bones ?? collectBones(group)
  if (skin) {
    skin.skeleton.pose()
    skin.updateMatrixWorld(true)
  } else {
    group.updateMatrixWorld(true)
  }

  const entries = bones.map((bone) => {
    const parent = isBone(bone.parent) ? bone.parent.name : bone.parent?.name ?? '(root)'
    const core = resolveCoreName(bone.name)
    const pos = bone.position
    const rot = quatToEulerDeg(bone.quaternion)
    return {
      name: bone.name,
      core,
      parent,
      pos: [+pos.x.toFixed(4), +pos.y.toFixed(4), +pos.z.toFixed(4)],
      rotDeg: rot,
    }
  })

  const coreMap = new Map()
  for (const e of entries) {
    if (e.core && !coreMap.has(e.core)) coreMap.set(e.core, e.name)
  }

  return { label, boneCount: bones.length, entries, coreMap, skinName: skin?.name ?? null }
}

function extractAnimPose(group, clip, time) {
  const mixer = new THREE.AnimationMixer(group)
  const action = mixer.clipAction(clip)
  action.play()
  mixer.setTime(time)
  group.updateMatrixWorld(true)

  const skin = findPrimarySkinned(group)
  const bones = skin?.skeleton?.bones ?? collectBones(group)
  const pose = new Map()
  for (const bone of bones) {
    const core = resolveCoreName(bone.name)
    if (!core) continue
    pose.set(core, {
      name: bone.name,
      rotDeg: quatToEulerDeg(bone.quaternion),
      pos: [+bone.position.x.toFixed(4), +bone.position.y.toFixed(4), +bone.position.z.toFixed(4)],
    })
  }
  mixer.stopAllAction()
  return pose
}

function printHierarchy(info) {
  console.log(`\n=== ${info.label} (${info.boneCount} bones, skin=${info.skinName}) ===`)
  console.log('Core mapping:')
  for (const core of MIXAMO_CORE) {
    const name = info.coreMap.get(core)
    console.log(`  ${core.padEnd(16)} → ${name ?? '(missing)'}`)
  }
  console.log('\nAll bones (bind pose):')
  for (const e of info.entries) {
    const tag = e.core ? `[${e.core}]` : ''
    console.log(
      `  ${e.name.padEnd(28)} parent=${String(e.parent).padEnd(20)} pos=${JSON.stringify(e.pos)} rot=${JSON.stringify(e.rotDeg)} ${tag}`,
    )
  }
}

function compareBindPoses(hunyuan, mixamo) {
  console.log('\n=== Bind pose delta (Mixamo core bones, euler deg XYZ) ===')
  console.log('core'.padEnd(16), 'hunyuan_rot'.padEnd(24), 'mixamo_rot'.padEnd(24), 'delta')
  for (const core of MIXAMO_CORE) {
    const hName = hunyuan.coreMap.get(core)
    const mName = mixamo.coreMap.get(core)
    if (!hName || !mName) continue
    const h = hunyuan.entries.find((e) => e.name === hName)
    const m = mixamo.entries.find((e) => e.name === mName)
    if (!h || !m) continue
    const delta = h.rotDeg.map((v, i) => +(v - m.rotDeg[i]).toFixed(1))
    console.log(core.padEnd(16), JSON.stringify(h.rotDeg).padEnd(24), JSON.stringify(m.rotDeg).padEnd(24), JSON.stringify(delta))
  }
}

function compareAnimPose(hunyuanBind, mixamoPose, animLabel) {
  console.log(`\n=== ${animLabel} pose vs 混元 bind (core bones, euler deg) ===`)
  console.log('core'.padEnd(16), 'mixamo_anim'.padEnd(24), 'hunyuan_bind'.padEnd(24), 'delta')
  for (const core of MIXAMO_CORE) {
    const anim = mixamoPose.get(core)
    const hName = hunyuanBind.coreMap.get(core)
    if (!anim || !hName) continue
    const h = hunyuanBind.entries.find((e) => e.name === hName)
    if (!h) continue
    const delta = anim.rotDeg.map((v, i) => +(v - h.rotDeg[i]).toFixed(1))
    console.log(core.padEnd(16), JSON.stringify(anim.rotDeg).padEnd(24), JSON.stringify(h.rotDeg).padEnd(24), JSON.stringify(delta))
  }
}

async function main() {
  const hunyuanPath = findFbx(boneDir, /示例建模/i) ?? path.join(boneDir, '示例建模.fbx')
  const pickedUpPath = findFbx(boneDir, /被拎|picked/i)
  const walkPath = findFbx(boneDir, /慢走|walk.?slow/i)
  const idlePath = findFbx(boneDir, /待机|idle|tpose|t.?pose/i)

  console.log('Files:')
  console.log('  混元:', hunyuanPath)
  console.log('  被拎起:', pickedUpPath)
  console.log('  慢走:', walkPath)

  if (!fs.existsSync(hunyuanPath)) {
    console.error('找不到混元 FBX')
    process.exit(1)
  }

  const hunyuanGroup = loadFbx(hunyuanPath)
  const hunyuanInfo = extractSkeletonInfo(hunyuanGroup, '混元 示例建模 (bind)')

  let mixamoBindInfo = null
  let mixamoPoseInfo = null

  if (pickedUpPath) {
    const pickedGroup = loadFbx(pickedUpPath)
    mixamoBindInfo = extractSkeletonInfo(pickedGroup, 'Mixamo 被拎起 FBX (bind/T-pose)')
    const clip = pickedGroup.animations?.[0]
    if (clip) {
      const t = Math.max(0, clip.duration - 1e-4)
      const pose = extractAnimPose(pickedGroup.clone(true), clip, t)
      compareAnimPose(hunyuanInfo, pose, '被拎起 末帧')
    }
  }

  if (walkPath) {
    const walkGroup = loadFbx(walkPath)
    if (!mixamoBindInfo) {
      mixamoBindInfo = extractSkeletonInfo(walkGroup, 'Mixamo 慢走 FBX (bind)')
    }
    const clip = walkGroup.animations?.[0]
    if (clip) {
      const pose0 = extractAnimPose(walkGroup.clone(true), clip, 0)
      compareAnimPose(hunyuanInfo, pose0, '慢走 第0帧')
    }
  }

  printHierarchy(hunyuanInfo)
  if (mixamoBindInfo) {
    printHierarchy(mixamoBindInfo)
    compareBindPoses(hunyuanInfo, mixamoBindInfo)
  }

  const mapped = [...hunyuanInfo.coreMap.keys()]
  const missing = MIXAMO_CORE.filter((c) => !hunyuanInfo.coreMap.has(c))
  console.log('\n=== 映射摘要 ===')
  console.log(`混元可映射核心骨: ${mapped.length}/${MIXAMO_CORE.length}`)
  console.log('已映射:', mapped.join(', '))
  console.log('缺失:', missing.join(', ') || '(无)')

  const unmapped = hunyuanInfo.entries.filter((e) => !e.core)
  if (unmapped.length) {
    console.log(`\n混元未映射骨 (${unmapped.length}):`)
    for (const e of unmapped.slice(0, 30)) {
      console.log(`  ${e.name} (parent=${e.parent})`)
    }
    if (unmapped.length > 30) console.log(`  ... +${unmapped.length - 30} more`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
