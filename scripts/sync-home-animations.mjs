/**
 * 将 Mixamo 动作 FBX 同步到 public/home-animations/
 *
 * 用法（在项目根目录）：
 *   node scripts/sync-home-animations.mjs
 *   node scripts/sync-home-animations.mjs "D:/示例1/建模模型/骨骼"
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'home-animations')

const DEFAULT_SOURCES = [
  path.join(root, '建模模型', '骨骼'),
  path.join(root, '建模模型', '已整理', '骨骼'),
]

/** 源文件名关键词 → 目标文件名 */
const NAME_MAP = [
  [/慢走|walk.?slow|slow.?walk/i, 'walk-slow.fbx'],
  [/正常走路|walk.?normal|normal.?walk|走路中/i, 'walk-normal.fbx'],
  [/左转|turn.?left/i, 'turn-left.fbx'],
  [/被拎|picked.?up|pick.?up|carry/i, 'picked-up.fbx'],
  [/下落过程|fall.?air|falling/i, 'fall-air.fbx'],
  [/下落着地|fall.?land|landing|落地/i, 'fall-land.fbx'],
  [/sleep|睡觉|待机/i, 'sleep.fbx'],
  [/run|跑/i, 'run.fbx'],
  [/angry|生气/i, 'angry.fbx'],
  [/curious|好奇/i, 'curious.fbx'],
  [/kiss/i, 'kiss.fbx'],
  [/avatar.?base|base.?mesh|人型/i, 'avatar-base.fbx'],
]

function walkFbx(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walkFbx(full, out)
    else if (name.toLowerCase().endsWith('.fbx')) out.push(full)
  }
  return out
}

function targetName(filePath) {
  const base = path.basename(filePath)
  for (const [re, target] of NAME_MAP) {
    if (re.test(base)) return target
  }
  return null
}

function main() {
  const argSrc = process.argv[2]
  const sources = argSrc ? [path.resolve(argSrc)] : DEFAULT_SOURCES
  fs.mkdirSync(outDir, { recursive: true })

  const files = sources.flatMap((s) => walkFbx(s))
  if (!files.length) {
    console.warn('[sync-home-animations] 未找到 FBX。请把 Mixamo 动作放到：')
    for (const s of sources) console.warn('  -', s)
    process.exit(1)
  }

  let copied = 0
  for (const file of files) {
    const target = targetName(file)
    if (!target) continue
    const dest = path.join(outDir, target)
    fs.copyFileSync(file, dest)
    console.log('✓', path.basename(file), '→', target)
    copied++
  }

  if (!copied) {
    console.warn('[sync-home-animations] 找到 FBX 但无法匹配文件名，请检查 NAME_MAP')
    process.exit(1)
  }

  console.log(`\n已同步 ${copied} 个文件到 public/home-animations/`)
}

main()
