/**
 * 酒馆 Ako 预设 → Lumi 文心导入包
 * - 含 prompt_order 里全部条目（未开启的也会写入，enabled:false）
 * - 展开 setvar/getvar；纯 setvar 条目写成可注入的明文
 */
import fs from 'fs'
import { extractRegexRulesFromPresetJson } from './st-regex-to-lumi.mjs'

const SRC = 'c:/Users/Administrator/Downloads/【Ako】1.92_正式版.json'
const OUT = 'c:/Users/Administrator/Downloads/Lumi文心_Ako1.92_线下可用.json'

const j = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const byId = new Map((j.prompts || []).map((p) => [p.identifier, p]))
const orderBlock = Array.isArray(j.prompt_order) ? j.prompt_order[0] : j.prompt_order
const order = (orderBlock && orderBlock.order) || []

const SETVAR_RE = /\{\{setvar::([^:]+)::([\s\S]*?)\}\}/g
const GETVAR_RE = /\{\{getvar::([^}]+)\}\}/g
const COMMENT_RE = /\{\{\/\/[\s\S]*?\}\}/g
const RANDOM_RE = /\{\{random::[^}]*\}\}/gi
const ROLL_RE = /\{\{roll\s+[^}]*\}\}/gi

function stripStJunk(s) {
  return String(s || '')
    .replace(COMMENT_RE, '')
    .replace(RANDOM_RE, '')
    .replace(ROLL_RE, '')
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
  const next = t.replace(GETVAR_RE, (_, k) => {
    const key = String(k).trim()
    return vars[key] != null ? String(vars[key]) : ''
  })
  if (next === t) return next
  return expandGetvars(next, vars, depth + 1)
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
  if (/Phase\.|COT|cot|thinking|思维|饺子醋|剧情推演|Pre-check|情绪塑造|文学理论/.test(n))
    return true
  if (/^#\s*Phase\./m.test(b)) return true
  if (/<thinking>/i.test(b) && /Phase\./.test(b)) return true
  if (/🟢输出格式|输出格式/.test(n)) return true
  return false
}

/** 仅跳过纯噪音；说明类也保留为关闭条目，方便查阅 */
function isHardSkip(name) {
  return /防429|破限勿动|破限/.test(name || '')
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
  const choicePrompt = (j.prompts || []).find((p) => /行动选项/.test(String(p.name || '')))
  if (choicePrompt) {
    const m = String(choicePrompt.content || '').match(
      /<ako_choices>\s*\n[\s\S]*?<\/ako_choices>/,
    )
    if (m) blocks.ako_choices = m[0]
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

// 1) 全量 setvar（后写覆盖）— 用于把关闭条目里的定义也展开成可读正文
const varsAll = {}
// 2) 仅「当前开启」的 setvar — 用于展开开启条目里的 getvar（贴近酒馆当下行为）
const varsOn = {}

for (const row of order) {
  const p = byId.get(row.identifier)
  if (!p) continue
  const extracted = extractSetvars(p.content || '')
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

for (const row of order) {
  const p = byId.get(row.identifier)
  if (!p) continue
  const name = String(p.name || '').trim() || row.identifier
  const enabled = row.enabled !== false

  if (isHardSkip(name)) {
    skippedHard++
    continue
  }

  const raw = String(p.content || '')
  const localVars = extractSetvars(raw)
  let body = stripSetvars(raw)
  body = stripStJunk(body)

  // 纯 setvar 开关：把变量值写成明文，开启后才能在 Lumi 里真正注入
  if (!body) {
    const keys = Object.keys(localVars)
    if (!keys.length) continue
    const chunks = []
    for (const k of keys) {
      const v = enrichPointer(String(localVars[k] || '').trim())
      if (!v) continue
      chunks.push(v)
    }
    body = chunks.join('\n\n').trim()
    if (!body) continue
  } else {
    // 有正文：用「全量变量」展开，关闭条目里的 getvar 也能读到完整意思
    const expandMap = { ...varsAll, ...localVars }
    stabilizeVars(expandMap)
    body = expandGetvars(body, expandMap)
    body = stripStJunk(body)
    body = enrichPointer(body)
  }

  if (!body || body.length < 4) continue
  if (/^<\/?[a-zA-Z_\u4e00-\u9fff]+>\s*$/.test(body)) continue

  const item = {
    name,
    body,
    id: row.identifier,
    enabled,
  }
  if (enabled) includedOn++
  else includedOff++

  if (isCotish(name, body)) cotParts.push(item)
  else styleParts.push(item)
}

const lumiAdaptStyle = `【Lumi 适配说明 · 必读】
本预设由酒馆【Ako】1.92 转换：已展开 setvar/getvar；未开启的条目也会导入，默认关闭，可在文心里自行打开。
本套为「自定义提示词」，范围「线下」。线下约会会替换系统扮演/写作核心，并覆盖沙盒与禁词硬钉。
冲突时优先遵守 Lumi 场控：人称、字数、导演、时间推进、评论/小剧场。
{{user}} / {{char}} 会按当前角色与玩家展开。
破限 / 防429 类条目已跳过（与 Lumi 无关或易冲突）。`

const lumiAdaptCot = `【Lumi 适配说明 · 思维链】
含 Ako COT 相关条目（开启与未开启的都在）。须在场控打开「思维链」后，已开启条目才会注入。
Lumi 已自带 <thinking> 输出壳。`

function toEntries(list, startOrder = 1) {
  return list.map((it, i) => ({
    id: `ako-${String(it.id || 'x')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 28)}-${i}`,
    order: startOrder + i,
    title: it.name.slice(0, 64),
    content: it.body.slice(0, 100000),
    enabled: it.enabled === true,
    tags: ['ako', 'converted', it.enabled ? 'st-on' : 'st-off'],
  }))
}

const styleEntries = [
  {
    id: 'ako-lumi-adapt-style',
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
    id: 'ako-lumi-adapt-cot',
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
const stylePreset = {
  id: 'ctp-ako-192-style-offline',
  name: 'Ako1.92 · 自定义提示词（线下）',
  entries: styleEntries,
  regexRules,
  scope: 'offline',
  kind: 'replyStyle',
  tags: ['ako', 'converted', 'offline'],
  updatedAt: now,
}
const cotPreset = {
  id: 'ctp-ako-192-cot-offline',
  name: 'Ako1.92 · 思维链（线下）',
  entries: cotEntries,
  regexRules: [],
  scope: 'offline',
  kind: 'thinkingChain',
  tags: ['ako', 'converted', 'offline'],
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
      hasChoiceEntry: styleEntries.some((e) => /行动选项/.test(e.title)),
      choiceEnabled: styleEntries.find((e) => /行动选项/.test(e.title))?.enabled ?? null,
    },
    null,
    2,
  ),
)
