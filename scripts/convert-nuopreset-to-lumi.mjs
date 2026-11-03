/**
 * 诺基基 / nuojiji `.nuopreset` → Lumi 文心导入包
 * 用法: node convert-nuopreset-to-lumi.mjs <src.nuopreset.json> [out.json] [显示名]
 */
import fs from 'fs'
import path from 'path'
import { extractRegexRulesFromPresetJson } from './st-regex-to-lumi.mjs'

const SRC = process.argv[2]
const OUT_ARG = process.argv[3]
const LABEL_ARG = process.argv[4]

if (!SRC) {
  console.error('用法: node convert-nuopreset-to-lumi.mjs <src.json> [out.json] [显示名]')
  process.exit(1)
}

const j = JSON.parse(fs.readFileSync(SRC, 'utf8'))
if (!j || !Array.isArray(j.blocks)) {
  console.error('不是 nuojiji 预设（缺少 blocks）')
  process.exit(1)
}

const baseName = path.basename(SRC, path.extname(SRC)).replace(/\.nuopreset(\(\d+\))?$/i, '')
const LABEL = (LABEL_ARG || j.name || baseName).trim().slice(0, 40)
const mode = String(j.mode || 'online').toLowerCase() === 'offline' ? 'offline' : 'online'
const scopeLabel = mode === 'offline' ? '线下' : '线上'
const OUT =
  OUT_ARG ||
  path.join(
    path.dirname(SRC),
    `Lumi文心_${LABEL.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 48)}_${scopeLabel}可用.json`,
  )

const SETVAR_RE = /\{\{setvar::([^:]+)::([\s\S]*?)\}\}/g
const GETVAR_RE = /\{\{getvar::([^}]+)\}\}/g
const COMMENT_RE = /\{\{\/\/[\s\S]*?\}\}/g
const RANDOM_RE = /\{\{random::[^}]*\}\}/gi
const ROLL_RE = /\{\{roll\s+[^}]*\}\}/gi

function stripStJunk(s) {
  return String(s || '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(COMMENT_RE, '')
    .replace(RANDOM_RE, '')
    .replace(ROLL_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractSetvars(text) {
  const vars = {}
  const re = new RegExp(SETVAR_RE.source, 'g')
  let m
  while ((m = re.exec(String(text || ''))) !== null) {
    vars[m[1].trim()] = m[2]
  }
  return vars
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

function stabilize(vars) {
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
  const n = String(name || '')
  const b = String(body || '')
  if (/思维链|推理链|^COT\b|\bCoT\b|Phase\./i.test(n)) return true
  if (/^#\s*Phase\./m.test(b)) return true
  // 极短开 thinking 标记（如「A必开勿动」）
  const compact = b.replace(/\\n/g, '\n').trim()
  if (/^<\/?think(?:ing)?>\s*$/i.test(compact)) return true
  if (/^<thinking>\s*$/i.test(compact)) return true
  if (/必开勿动/.test(n) && /thinking|think/i.test(compact) && compact.length < 40) {
    return true
  }
  return false
}

const slug = LABEL.replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '')
  .slice(0, 16)
  .toLowerCase() || 'nuo'

const varsAll = {}
for (const b of j.blocks || []) Object.assign(varsAll, extractSetvars(b.content || ''))
stabilize(varsAll)

const styleParts = []
const cotParts = []
let on = 0
let off = 0
let skipped = 0

for (const b of j.blocks || []) {
  if (String(b.type || '') === 'marker') {
    skipped++
    continue
  }
  const name = String(b.name || '').trim()
  const raw = String(b.content || '')
  if (!name && raw.trim().length < 8) {
    skipped++
    continue
  }
  const title = name || '未命名条目'
  const enabled = b.enabled !== false
  const local = extractSetvars(raw)
  let body = raw.replace(SETVAR_RE, '')
  body = stripStJunk(body)
  if (!body) {
    const chunks = Object.keys(local)
      .map((k) => String(local[k] || '').trim())
      .filter(Boolean)
    body = chunks.join('\n\n').trim()
  } else {
    const map = { ...varsAll, ...local }
    stabilize(map)
    body = stripStJunk(expandGetvars(body, map))
  }
  if (!body || body.length < 2) {
    skipped++
    continue
  }
  const item = {
    name: title,
    body,
    id: b.id || b.key || title,
    enabled,
    role: String(b.role || 'system'),
  }
  if (enabled) on++
  else off++
  if (isCotish(title, body)) cotParts.push(item)
  else styleParts.push(item)
}

const regexRules = extractRegexRulesFromPresetJson(j)

const toEntries = (list, start, prefix) =>
  list.map((it, i) => ({
    id: `${prefix}-${String(it.id)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 28)}-${i}`.slice(0, 80),
    order: start + i,
    title: it.name.slice(0, 64),
    content: it.body.slice(0, 100_000),
    enabled: it.enabled === true,
    tags: [
      'converted',
      it.enabled ? 'st-on' : 'st-off',
      'nuojiji',
      it.role === 'user' ? 'role-user' : it.role === 'assistant' ? 'role-assistant' : 'role-system',
    ],
  }))

const adapt = `【Lumi 适配说明 · 必读】
本预设由 nuojiji「${LABEL}」转换：未开启条目也会导入（默认关闭，可在文心里打开）。
本套为「自定义提示词」，范围「${scopeLabel}」（原预设 mode=${j.mode || mode}）。
冲突时优先遵守 Lumi 聊天设置与沙盒/输出格式。
{{user}} / {{char}} 会按当前角色与玩家展开。`

const styleEntries = [
  {
    id: `${slug}-adapt-style`,
    order: 1,
    title: 'Lumi适配说明',
    content: adapt,
    enabled: true,
    tags: ['lumi', 'meta'],
  },
  ...toEntries(styleParts, 2, `${slug}-s`),
]

const cotEntries =
  cotParts.length > 0
    ? [
        {
          id: `${slug}-adapt-cot`,
          order: 1,
          title: 'Lumi思维链适配说明',
          content:
            '含原预设中偏思维/开链标记的条目；须在会话打开思维链后，已开启条目才会注入。',
          enabled: true,
          tags: ['lumi', 'meta'],
        },
        ...toEntries(cotParts, 2, `${slug}-c`),
      ]
    : [
        {
          id: `${slug}-adapt-cot`,
          order: 1,
          title: 'Lumi思维链适配说明',
          content: '本包思维链侧几乎无独立 COT 条目；主要文风在「自定义提示词」里。',
          enabled: true,
          tags: ['lumi', 'meta'],
        },
      ]

const now = Date.now()
const styleId = `ctp-${slug}-style-${mode}`.slice(0, 64)
const cotId = `ctp-${slug}-cot-${mode}`.slice(0, 64)

const stylePreset = {
  id: styleId,
  name: `${LABEL} · 自定义提示词（${scopeLabel}）`.slice(0, 40),
  entries: styleEntries,
  regexRules,
  scope: mode,
  kind: 'replyStyle',
  tags: ['converted', mode, 'nuojiji'],
  updatedAt: now,
}
const cotPreset = {
  id: cotId,
  name: `${LABEL} · 思维链（${scopeLabel}）`.slice(0, 40),
  entries: cotEntries,
  regexRules: [],
  scope: mode,
  kind: 'thinkingChain',
  tags: ['converted', mode, 'nuojiji'],
  updatedAt: now,
}

const payload = {
  version: 2,
  kind: 'lumi-prompt-cot',
  exportedAt: now,
  activeReplyStyleOnlineId: mode === 'online' ? styleId : 'system',
  activeReplyStyleOfflineId: mode === 'offline' ? styleId : 'system',
  activeThinkingOnlineId:
    mode === 'online' && cotParts.some((x) => x.enabled) ? cotId : 'system',
  activeThinkingOfflineId:
    mode === 'offline' && cotParts.some((x) => x.enabled) ? cotId : 'system',
  presets: [stylePreset, cotPreset],
}

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      out: OUT,
      label: LABEL,
      scope: mode,
      styleEntries: styleEntries.length,
      cotEntries: cotEntries.length,
      includedOn: on,
      includedOff: off,
      skippedMarkersOrEmpty: skipped,
      styleOn: styleEntries.filter((e) => e.enabled).length,
      styleOff: styleEntries.filter((e) => !e.enabled).length,
      regexRules: regexRules.length,
      fileMB: +(fs.statSync(OUT).size / 1024 / 1024).toFixed(2),
    },
    null,
    2,
  ),
)
