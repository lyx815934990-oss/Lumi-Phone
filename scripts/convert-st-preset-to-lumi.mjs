/**
 * 酒馆 OpenAI 预设 → Lumi 文心导入包
 * 用法: node convert-st-preset-to-lumi.mjs <src.json> [out.json] [显示名]
 * - 含 prompt_order 全部条目（未开启 → enabled:false）
 * - 展开 setvar/getvar；纯 setvar 写成可注入明文
 */
import fs from 'fs'
import path from 'path'
import { extractRegexRulesFromPresetJson } from './st-regex-to-lumi.mjs'

const SRC = process.argv[2]
const OUT_ARG = process.argv[3]
const LABEL_ARG = process.argv[4]

if (!SRC) {
  console.error('用法: node convert-st-preset-to-lumi.mjs <src.json> [out.json] [显示名]')
  process.exit(1)
}

const baseName = path.basename(SRC, path.extname(SRC))
const LABEL = LABEL_ARG || baseName.replace(/^【|】$/g, '')
const OUT =
  OUT_ARG ||
  path.join(path.dirname(SRC), `Lumi文心_${LABEL.replace(/[\\/:*?"<>|]/g, '_')}_线下可用.json`)

const j = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const byId = new Map((j.prompts || []).map((p) => [p.identifier, p]))
const orderBlock = Array.isArray(j.prompt_order) ? j.prompt_order[0] : j.prompt_order
const order = (orderBlock && orderBlock.order) || []

// 若 order 缺条目，把 prompts 里剩余的接在后面（默认关闭）
const orderedIds = new Set(order.map((r) => r.identifier))
const extraRows = (j.prompts || [])
  .filter((p) => p.identifier && !orderedIds.has(p.identifier))
  .map((p) => ({ identifier: p.identifier, enabled: p.enabled !== false }))

const fullOrder = [...order, ...extraRows]

const SETVAR_RE = /\{\{setvar::([^:]+)::([\s\S]*?)\}\}/g
const GETVAR_RE = /\{\{getvar::([^}]+)\}\}/g
const SETGLOBAL_RE = /\{\{setglobalvar::([^:]+)::([\s\S]*?)\}\}/g
const GETGLOBAL_RE = /\{\{getglobalvar::([^}]+)\}\}/g
const COMMENT_RE = /\{\{\/\/[\s\S]*?\}\}/g
const RANDOM_RE = /\{\{random::[^}]*\}\}/gi
const ROLL_RE = /\{\{roll\s+[^}]*\}\}/gi
const TRIM_RE = /\{\{trim\}\}/gi

function stripStJunk(s) {
  return String(s || '')
    .replace(COMMENT_RE, '')
    .replace(RANDOM_RE, '')
    .replace(ROLL_RE, '')
    .replace(TRIM_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractSetvars(text) {
  const vars = {}
  const t = String(text || '')
  const re = new RegExp(SETVAR_RE.source, 'g')
  let m
  while ((m = re.exec(t)) !== null) {
    vars[m[1].trim()] = m[2]
  }
  return vars
}

function stripSetvars(text) {
  return String(text || '').replace(SETVAR_RE, '')
}

function expandGetvars(text, vars, depth = 0) {
  if (depth > 12) return text
  const t = String(text || '')
  let next = t.replace(GETVAR_RE, (_, k) => {
    const key = String(k).trim()
    return vars[key] != null ? String(vars[key]) : ''
  })
  // getglobalvar：预设内若有 setglobalvar 可烘焙；否则置空（运行时再读 Lumi 全局表）
  next = next.replace(GETGLOBAL_RE, (_, k) => {
    const key = String(k).trim()
    return vars[`global:${key}`] != null ? String(vars[`global:${key}`]) : ''
  })
  if (next === t) return next
  return expandGetvars(next, vars, depth + 1)
}

function extractSetglobals(text) {
  const vars = {}
  const t = String(text || '')
  const re = new RegExp(SETGLOBAL_RE.source, 'g')
  let m
  while ((m = re.exec(t)) !== null) {
    vars[`global:${m[1].trim()}`] = m[2]
  }
  return vars
}

function stripSetglobals(text) {
  return String(text || '').replace(SETGLOBAL_RE, '')
}

function stabilizeVars(vars) {
  for (let i = 0; i < 10; i++) {
    let changed = false
    for (const k of Object.keys(vars)) {
      const e = expandGetvars(vars[k], vars)
      if (e !== vars[k]) {
        vars[k] = e
        changed = true
      }
    }
    if (!changed) break
  }
}

function isCotish(name, body) {
  const n = name || ''
  const b = body || ''
  if (/Phase\.|COT|cot|thinking|思维|饺子醋|剧情推演|Pre-check|情绪塑造|文学理论|推理链/.test(n))
    return true
  if (/^#\s*Phase\./m.test(b)) return true
  if (/<thinking>/i.test(b) && /Phase\./.test(b)) return true
  if (/🟢输出格式|输出格式/.test(n) && /thinking|Phase/i.test(b)) return true
  return false
}

function isHardSkip(name) {
  return /防429|破限勿动|^破限$|破限·/.test(name || '')
}

function collectTagBlocks() {
  const blocks = {}
  const re = /<([a-zA-Z_][\w-]*)>\s*\n([\s\S]*?)<\/\1>/g
  for (const p of j.prompts || []) {
    const c = String(p.content || '')
    let m
    const local = new RegExp(re.source, 'g')
    while ((m = local.exec(c)) !== null) {
      const tag = m[1]
      const inner = m[0]
      if (inner.length < 40) continue
      if (!blocks[tag] || inner.length > blocks[tag].length) blocks[tag] = inner
    }
  }
  return blocks
}

const tagBlocks = collectTagBlocks()

function enrichPointer(text) {
  let t = String(text || '')
  const refs = [...t.matchAll(/<([a-zA-Z_][\w-]*)>/g)].map((m) => m[1])
  const seen = new Set()
  for (const tag of refs) {
    if (seen.has(tag)) continue
    seen.add(tag)
    const block = tagBlocks[tag]
    if (block && !t.includes(`</${tag}>`)) t += `\n\n${block}`
  }
  return t
}

const varsAll = {}
const varsOn = {}

for (const row of fullOrder) {
  const p = byId.get(row.identifier)
  if (!p) continue
  const extracted = {
    ...extractSetvars(p.content || ''),
    ...extractSetglobals(p.content || ''),
  }
  Object.assign(varsAll, extracted)
  if (row.enabled !== false) Object.assign(varsOn, extracted)
}

stabilizeVars(varsAll)
stabilizeVars(varsOn)
for (const k of Object.keys(varsAll)) varsAll[k] = enrichPointer(varsAll[k])
for (const k of Object.keys(varsOn)) varsOn[k] = enrichPointer(varsOn[k])

const styleParts = []
const cotParts = []
let skippedHard = 0
let includedOff = 0
let includedOn = 0

for (const row of fullOrder) {
  const p = byId.get(row.identifier)
  if (!p) continue
  const name = String(p.name || '').trim() || row.identifier
  const enabled = row.enabled !== false

  if (isHardSkip(name)) {
    skippedHard++
    continue
  }

  const raw = String(p.content || '')
  const localVars = {
    ...extractSetvars(raw),
    ...extractSetglobals(raw),
  }
  let body = stripSetglobals(stripSetvars(raw))
  body = stripStJunk(body)

  if (!body) {
    const keys = Object.keys(localVars)
    if (!keys.length) continue
    const chunks = []
    for (const k of keys) {
      // 纯 setvar 条目：把变量正文展开成可注入内容（跳过 global: 前缀键的空壳）
      if (k.startsWith('global:')) continue
      const v = enrichPointer(String(localVars[k] || '').trim())
      if (!v) continue
      chunks.push(v)
    }
    body = chunks.join('\n\n').trim()
    if (!body) continue
  } else {
    const expandMap = { ...varsAll, ...localVars }
    stabilizeVars(expandMap)
    body = expandGetvars(body, expandMap)
    body = stripStJunk(body)
    body = enrichPointer(body)
  }

  if (!body || body.length < 4) continue
  if (/^<\/?[a-zA-Z_\u4e00-\u9fff]+>\s*$/.test(body)) continue

  const item = { name, body, id: row.identifier, enabled }
  if (enabled) includedOn++
  else includedOff++

  if (isCotish(name, body)) cotParts.push(item)
  else styleParts.push(item)
}

const slug = LABEL.replace(/[^\w\u4e00-\u9fff-]+/g, '-').slice(0, 40)

const lumiAdaptStyle = `【Lumi 适配说明 · 必读】
本预设由酒馆「${LABEL}」转换：已展开 setvar/getvar（及预设内 setglobalvar）；未开启条目也会导入（默认关闭，可在文心里打开）。
本套为「自定义提示词」，范围「线下」。线下约会会替换系统扮演/写作核心，并覆盖沙盒与禁词硬钉。
冲突时优先遵守 Lumi 场控：人称、字数、导演、时间推进、评论/小剧场。
{{user}} / {{char}} 默认保留为模型指称占位（与 Lumi 记忆/场控一致），注入时不会强行换成姓名。
getglobalvar：原依赖酒馆助手脚本写全局表；转换时能烘焙的已烘焙，其余注入时读 Lumi 全局变量表（无值则置空）。
破限 / 防429 类条目已跳过。`

const lumiAdaptCot = `【Lumi 适配说明 · 思维链】
含原预设 COT / 思维相关条目（开启与未开启都在）。须在场控打开「思维链」后，已开启条目才会注入。
Lumi 已自带 <thinking> 输出壳。`

function toEntries(list, startOrder = 1) {
  return list.map((it, i) => ({
    id: `${slug}-${String(it.id || 'x')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 28)}-${i}`.slice(0, 80),
    order: startOrder + i,
    title: it.name.slice(0, 64),
    content: it.body.slice(0, 100000),
    enabled: it.enabled === true,
    tags: ['converted', it.enabled ? 'st-on' : 'st-off'],
  }))
}

const styleEntries = [
  {
    id: `${slug}-lumi-adapt-style`,
    order: 1,
    title: 'Lumi适配说明',
    content: lumiAdaptStyle,
    enabled: true,
    tags: ['lumi', 'meta'],
  },
  ...toEntries(styleParts, 2),
]

const cotEntries = [
  {
    id: `${slug}-lumi-adapt-cot`,
    order: 1,
    title: 'Lumi思维链适配说明',
    content: lumiAdaptCot,
    enabled: true,
    tags: ['lumi', 'meta'],
  },
  ...toEntries(cotParts, 2),
]

const regexRules = extractRegexRulesFromPresetJson(j)
const now = Date.now()
const styleId = `ctp-${slug}-style-offline`.slice(0, 64)
const cotId = `ctp-${slug}-cot-offline`.slice(0, 64)

const stylePreset = {
  id: styleId,
  name: `${LABEL} · 自定义提示词（线下）`.slice(0, 40),
  entries: styleEntries,
  /** 输出美化/清理正则挂在提示词预设上（启用后生效） */
  regexRules,
  scope: 'offline',
  kind: 'replyStyle',
  tags: ['converted', 'offline'],
  updatedAt: now,
}
const cotPreset = {
  id: cotId,
  name: `${LABEL} · 思维链（线下）`.slice(0, 40),
  entries: cotEntries,
  regexRules: [],
  scope: 'offline',
  kind: 'thinkingChain',
  tags: ['converted', 'offline'],
  updatedAt: now,
}

const payload = {
  version: 2,
  kind: 'lumi-prompt-cot',
  exportedAt: now,
  activeReplyStyleOnlineId: 'system',
  activeReplyStyleOfflineId: stylePreset.id,
  activeThinkingOnlineId: 'system',
  activeThinkingOfflineId: cotPreset.id,
  presets: [stylePreset, cotPreset],
}

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      out: OUT,
      label: LABEL,
      styleEntries: styleEntries.length,
      cotEntries: cotEntries.length,
      includedOn,
      includedOff,
      skippedHard,
      styleOn: styleEntries.filter((e) => e.enabled).length,
      styleOff: styleEntries.filter((e) => !e.enabled).length,
      cotOn: cotEntries.filter((e) => e.enabled).length,
      cotOff: cotEntries.filter((e) => !e.enabled).length,
      regexRules: regexRules.length,
      regexOn: regexRules.filter((r) => r.enabled).length,
      fileMB: +(fs.statSync(OUT).size / 1024 / 1024).toFixed(2),
    },
    null,
    2,
  ),
)
