/**
 * 将包含多个子模型的 GLB 拆分为独立 .glb 文件，并写入 manifest.json
 *
 * 用法:
 *   node scripts/split-glb.mjs [输入.glb] [--category 05-绿植] [--prefix 绿植] [--auto-category]
 *
 * 默认输入（按顺序尝试）:
 *   建模模型/绿植1.glb
 *   建模模型/05-绿植/绿植1.glb
 *   建模模型 目录下唯一的 .glb
 */
import fs from 'node:fs'
import path from 'node:path'
import { Document, NodeIO } from '@gltf-transform/core'
import {
  copyToDocument,
  createDefaultPropertyResolver,
  dedup,
  prune,
} from '@gltf-transform/functions'

const ROOT = path.resolve('建模模型')
const OUT_ROOT = path.join(ROOT, '已整理')

const CN_PARTS = {
  bamboo: '竹',
  plant: '绿植',
  pot: '花盆',
  grass: '草',
  flower: '花',
  tree: '树',
  cactus: '仙人掌',
  fern: '蕨类',
  succulent: '多肉',
  trough: '长条盆',
  orange: '橙',
  white: '白',
  black: '黑',
  brown: '棕',
  small: '小',
  large: '大',
  medium: '中',
  murphy: '墨菲',
  bed: '床',
  love: '爱',
  seat: '座',
  loveseat: '双人沙发',
  sofa: '沙发',
  botanical: '植物',
  bookends: '书挡',
  media: '媒体',
  coffee: '咖啡',
  table: '桌',
  armchair: '单人沙发',
  chair: '椅',
  lamp: '灯',
  light: '灯',
  fixture: '灯具',
  dresser: '梳妆台',
  mirror: '镜',
  garden: '花园',
  shelf: '架',
  sink: '水槽',
  vanity: '洗漱台',
  dining: '餐',
  desk: '书桌',
  pouffe: '脚凳',
  carpet: '地毯',
  art: '挂画',
  lavatory: '马桶',
  bookcase: '书柜',
  console: '玄关柜',
  orbital: '轨道',
  sitting: '坐',
  storage: '储物',
  modern: '现代',
  compact: '紧凑',
  tiered: '分层',
  open: '开放',
  lovely: 'Lovely',
  simple: '简约',
  clean: '简洁',
  contemporary: '现代',
  vertical: '垂直',
  mini: '迷你',
  power: 'Power',
  tower: '塔式',
  stubby: '矮款',
  cubby: '格柜',
  zen: '禅意',
  peek: 'Peek',
}

const CATEGORY_RULES = [
  [/loveseat|sofa|couch|settee/i, '02-沙发'],
  [/lamp|light|fixture|desklamp/i, '08-灯光'],
  [/bed|murphy/i, '01-床'],
  [/chair|armchair|pouffe|stool|sitting(?!.*table)/i, '15-椅子'],
  [/desk|table|coffee|dining(?!chair)/i, '03-桌'],
  [/dresser|bookcase|shelf|console|cubby|tower|cabinet|vanity|media|marathoner/i, '07-收纳柜'],
  [/mirror|art|carpet|bookend|decor/i, '06-装饰'],
  [/bathroom|lavatory|sink/i, '10-卫浴'],
  [/garden|botanical|plant/i, '05-绿植'],
  [/tv|monitor|speaker/i, '12-办公电子'],
]

const KNOWN_LABELS = {
  TinyLiving_MurphyBed_2: '墨菲床',
  TinyLiving_MurphyLoveSeat_4: '墨菲双人沙发',
  TinyLiving_BotanicalBookends_5: '植物书挡',
  TinyLiving_MediaMarathoner_8: '媒体电视柜',
  TinyLiving_MediaMarathoner_AllontheWall_10: '壁挂媒体柜',
  TinyLiving_SirCumferenceCoffeeTable_11: '圆形咖啡桌',
  TinyLiving_LovelyLoveseat_12: 'Lovely双人沙发',
  'TinyLiving_Space-SavingSingle_13': '省空间单人件',
  TinyLiving_JustALittlePeek_18: '窥视装饰',
  TinyLiving_DonTrippLightFixture_19: '吊灯',
  TinyLiving_LampWithoutStorage_20: '无储物台灯',
  TinyLiving_MyKindaZen_22: '禅意装饰',
  TinyLiving_TheModernDeskLamp_23: '现代台灯',
  TinyLiving_PowerTowerDresser_24: 'Power塔式梳妆台',
  TinytLiving_MiracleMirror_26: '全身镜',
  TinyLiving_VerticalMiniGarden_27: '垂直迷你花园',
  TinyLiving_TieredShelf_29: '分层置物架',
  TinyLiving_OpenShelf_31: '开放置物架',
  TinyLiving_TheSinkzBathroomVanity_32: '浴室洗漱台',
  TinyLiving_LovelyArmchair_33: 'Lovely单人沙发',
  TinyLiving_OrbitalHighDining_35: '轨道高脚餐桌',
  TinyLiving_ModernPouffe_36: '现代脚凳',
  TinyLiving_TinyDeskForTinyLiving_37: 'TinyLiving小书桌',
  TinyLiving_StubbyCubbyDresser_38: '矮款格柜梳妆台',
  TinyLiving_SimpleandCleanArt_39: '简洁挂画',
  TinyLiving_ContemporaryCarpet_40: '现代地毯',
  TinyLiving_NotQuiteOrbitalSitting_41: '轨道餐椅',
  TinyLiving_LovelyDiningChair_42: 'Lovely餐椅',
  TinyLiving_NotATableEnd_43: '边几',
  TinyLiving_TinyConsole_44: '玄关柜',
  TinyLiving_CompactLavatory_45: '紧凑马桶',
  TinyLiving_PowerTowerBookcase_47: 'Power塔式书柜',
}

function parseArgs(argv) {
  const positional = []
  let category = '05-绿植'
  let prefix = '绿植'
  let autoCategory = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--category') category = argv[++i] ?? category
    else if (a === '--prefix') prefix = argv[++i] ?? prefix
    else if (a === '--auto-category') autoCategory = true
    else if (!a.startsWith('--')) positional.push(a)
  }
  return { input: positional[0], category, prefix, autoCategory }
}

function inferDefaultsFromInput(inputPath, overrides) {
  const base = path.basename(inputPath, '.glb')
  if (overrides.autoCategory) return overrides
  if (/家具/i.test(base)) {
    return { ...overrides, prefix: overrides.prefix === '绿植' ? '家具' : overrides.prefix, autoCategory: true }
  }
  if (/绿植/i.test(base)) {
    return { ...overrides, prefix: overrides.prefix === '绿植' ? overrides.prefix : overrides.prefix, category: '05-绿植' }
  }
  return overrides
}

function inferCategory(nodeName) {
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(nodeName)) return category
  }
  return '06-装饰'
}

function findDefaultInput() {
  const candidates = [
    path.join(ROOT, '绿植1.glb'),
    path.join(ROOT, '绿植', '绿植1.glb'),
    path.join(ROOT, '05-绿植', '绿植1.glb'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  const all = []
  if (fs.existsSync(ROOT)) {
    walkGlbs(ROOT, all)
  }
  if (all.length === 1) return all[0]
  return null
}

function walkGlbs(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory() && ent.name !== '已整理') walkGlbs(full, out)
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.glb')) out.push(full)
  }
}

function nodeHasMesh(node) {
  if (node.getMesh()) return true
  return node.listChildren().some(nodeHasMesh)
}

function collectSplitNodes(scene) {
  let nodes = scene.listChildren()
  while (nodes.length === 1 && !nodes[0].getMesh()) {
    const inner = nodes[0].listChildren()
    if (!inner.length) break
    nodes = inner
  }
  nodes = nodes.filter(nodeHasMesh)
  if (nodes.length >= 2) return nodes

  const meshNodes = []
  const visit = (node) => {
    if (node.getMesh()) meshNodes.push(node)
    for (const c of node.listChildren()) visit(c)
  }
  for (const c of scene.listChildren()) visit(c)
  return meshNodes.length >= 2 ? meshNodes : nodes
}

function toChineseLabel(raw, index, prefix) {
  const name = (raw || `part-${index}`).trim()
  if (KNOWN_LABELS[name]) return KNOWN_LABELS[name]

  const pot = name.match(/^Pot_(?:(\d+)_)?Low_PolyPlant/i)
  if (pot) {
    const num = pot[1] !== undefined ? pot[1] : '0'
    return `${prefix}-花盆${num}`
  }

  const stripped = name
    .replace(/^Tiny(?:t)?Living_/i, '')
    .replace(/_\d+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()

  const base = stripped.toLowerCase()
  const tokens = base.split(/\s+/).filter(Boolean)
  const cn = tokens
    .map((t) => CN_PARTS[t] ?? (/^\d+$/.test(t) ? t : ''))
    .filter(Boolean)
    .join('')

  const suffix = cn || stripped.replace(/\s+/g, '') || `部件${index}`
  return prefix ? `${prefix}-${suffix}` : suffix
}

function uniqueFilename(dir, baseName) {
  let name = `${baseName}.glb`
  let i = 2
  while (fs.existsSync(path.join(dir, name))) {
    name = `${baseName}-${i}.glb`
    i++
  }
  return name
}

function copyExtensions(source, target) {
  for (const ext of source.getRoot().listExtensionsUsed()) {
    const targetExt = target.createExtension(ext.constructor)
    if (ext.isRequired()) targetExt.setRequired(true)
  }
}

async function exportNode(io, source, node, outPath) {
  const target = new Document()
  copyExtensions(source, target)
  const resolve = createDefaultPropertyResolver(target, source)
  const map = copyToDocument(target, source, [node], resolve)
  const copied = map.get(node)
  if (!copied) throw new Error(`无法复制节点: ${node.getName()}`)

  const scene = target.createScene('Scene')
  scene.addChild(copied)
  await target.transform(dedup(), prune())
  await io.write(outPath, target)
}

function mergeManifest(outDir, category, entries) {
  const manifestPath = path.join(OUT_ROOT, 'manifest.json')
  let manifest = {
    generatedAt: new Date().toISOString(),
    totalOutput: 0,
    categories: {},
    items: [],
  }
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    } catch {
      /* fresh */
    }
  }

  const existingIds = new Set((manifest.items ?? []).map((x) => x.id))
  for (const e of entries) {
    if (existingIds.has(e.id)) continue
    manifest.items.push(e)
    existingIds.add(e.id)
  }

  manifest.generatedAt = new Date().toISOString()
  manifest.totalOutput = manifest.items.length
  manifest.categories = {}
  for (const item of manifest.items) {
    manifest.categories[item.category] = (manifest.categories[item.category] || 0) + 1
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
}

function removePreviousSplit(splitFromBasename) {
  const manifestPath = path.join(OUT_ROOT, 'manifest.json')
  if (!fs.existsSync(manifestPath)) return 0

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const kept = []
  let removed = 0

  for (const item of manifest.items ?? []) {
    if (item.splitFrom === splitFromBasename) {
      const filePath = path.join(ROOT, item.output)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      removed++
      continue
    }
    kept.push(item)
  }

  if (!removed) return 0

  manifest.items = kept
  manifest.generatedAt = new Date().toISOString()
  manifest.totalOutput = kept.length
  manifest.categories = {}
  for (const item of kept) {
    manifest.categories[item.category] = (manifest.categories[item.category] || 0) + 1
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  return removed
}

function syncToPublic() {
  const pubRoot = path.resolve('public/home-models')
  if (!fs.existsSync(OUT_ROOT)) return

  const copyTree = (srcDir, destDir) => {
    fs.mkdirSync(destDir, { recursive: true })
    for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
      const src = path.join(srcDir, ent.name)
      const dest = path.join(destDir, ent.name)
      if (ent.isDirectory()) copyTree(src, dest)
      else if (ent.isFile() && (ent.name.endsWith('.glb') || ent.name === 'manifest.json')) {
        fs.copyFileSync(src, dest)
      }
    }
  }

  copyTree(OUT_ROOT, pubRoot)
}

async function main() {
  let { input: argInput, category, prefix, autoCategory } = parseArgs(process.argv.slice(2))
  const clean = process.argv.includes('--clean')
  const resplit = process.argv.includes('--resplit')
  const input = argInput && !argInput.startsWith('--') ? path.resolve(argInput) : findDefaultInput()

  if (!input || !fs.existsSync(input)) {
    console.error('未找到输入 GLB。请指定路径，或将 绿植1.glb 放到 建模模型/ 后重试。')
    console.error('')
    console.error('示例:')
    console.error('  node scripts/split-glb.mjs 建模模型/绿植1.glb')
    process.exit(1)
  }

  ;({ category, prefix, autoCategory } = inferDefaultsFromInput(input, { category, prefix, autoCategory }))

  if (resplit) {
    const removed = removePreviousSplit(path.basename(input))
    if (removed) console.log(`已清除上次拆分记录 ${removed} 条（${path.basename(input)}）`)
  }

  const io = new NodeIO()
  const source = await io.read(input)
  const srcScene = source.getRoot().getDefaultScene() || source.getRoot().listScenes()[0]
  if (!srcScene) {
    console.error('GLB 中没有 Scene')
    process.exit(1)
  }

  const nodes = collectSplitNodes(srcScene)
  if (!nodes.length) {
    console.error('未找到可拆分的子模型（无 mesh 节点）')
    process.exit(1)
  }

  console.log(`输入: ${input}`)
  console.log(
    `检测到 ${nodes.length} 个子模型${autoCategory ? '（按名称自动分类）' : ''}，输出 → ${path.join(OUT_ROOT, autoCategory ? '{分类}/' : category)}`,
  )

  const manifestEntries = []
  let index = 1

  for (const node of nodes) {
    const nodeName = node.getName() || `part-${index}`
    const itemCategory = autoCategory ? inferCategory(nodeName) : category
    const outDir = path.join(OUT_ROOT, itemCategory)
    if (clean && index === 1 && !autoCategory && fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true, force: true })
    }
    fs.mkdirSync(outDir, { recursive: true })

    const label = toChineseLabel(nodeName, index, autoCategory ? '' : prefix)
    const fileName = uniqueFilename(outDir, label)
    const outPath = path.join(outDir, fileName)
    await exportNode(io, source, node, outPath)

    const relOut = path.relative(ROOT, outPath).replace(/\\/g, '/')
    manifestEntries.push({
      id: path.basename(fileName, '.glb'),
      category: itemCategory,
      chineseName: path.basename(fileName, '.glb'),
      englishKey: nodeName,
      source: path.relative(ROOT, input).replace(/\\/g, '/'),
      output: relOut,
      splitFrom: path.basename(input),
    })

    console.log(`  ✓ [${itemCategory}] ${fileName}  ←  ${nodeName}`)
    index++
  }

  mergeManifest(OUT_ROOT, category, manifestEntries)
  syncToPublic()

  console.log('')
  console.log(`完成：共导出 ${manifestEntries.length} 个 GLB`)
  console.log(`manifest 已更新: ${path.join(OUT_ROOT, 'manifest.json')}`)
  console.log(`已同步到 public/home-models/（开发环境可直接加载）`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
