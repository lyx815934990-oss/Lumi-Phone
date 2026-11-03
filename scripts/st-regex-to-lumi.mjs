/**
 * 酒馆 extensions.regex_scripts / 诺基基 regexRules → Lumi CotRegexRule[]
 *
 * ST placement：1=用户输入 2=AI 输出（只导入含 2 的，纯用户输入包装跳过）
 */

const MAX_RULES = 64
const MAX_NAME = 40
const MAX_FIND = 4000
const MAX_REPLACE = 120000

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function placementHasAi(placement) {
  if (placement == null) return true
  const arr = Array.isArray(placement) ? placement : [placement]
  return arr.map(Number).includes(2)
}

/** 规范化 find：保留 /pattern/flags；裸模式原样（运行时默认 g） */
function normalizeFind(find, flags) {
  let f = String(find ?? '').slice(0, MAX_FIND)
  if (!f.trim()) return ''
  const fl = String(flags ?? '')
    .replace(/[^gimsuy]/g, '')
    .trim()
  if (f.startsWith('/')) return f
  if (fl) {
    // 转义正文中的 / 以便包成字面量
    const body = f.replace(/\//g, '\\/')
    return `/${body}/${fl.includes('g') ? fl : `g${fl}`}`
  }
  return f
}

function inferGroupFromName(name) {
  const n = String(name ?? '').trim()
  const bracket = n.match(/^【\s*([^】]+?)\s*】/)
  if (bracket?.[1]?.trim()) return bracket[1].trim().slice(0, 24)
  const sq = n.match(/^\[\s*([^\]]+?)\s*\]/)
  if (sq?.[1]?.trim()) return sq[1].trim().slice(0, 24)
  // 月读美化-… / MoM美化-… → 月读 / MoM
  const mom = n.match(/^([A-Za-z\u4e00-\u9fff]{2,16})美化/)
  if (mom?.[1]?.trim()) return mom[1].trim().slice(0, 24)
  // 月读必开-[1]… / 月读选开-…
  const suite = n.match(/^([A-Za-z\u4e00-\u9fff]{2,12})(?:必开|选开|美化)[-—\[（(]/)
  if (suite?.[1]?.trim()) return suite[1].trim().slice(0, 24)
  return ''
}

function mapStScript(s, index) {
  if (!s || typeof s !== 'object') return null
  if (!placementHasAi(s.placement)) return null
  const find = normalizeFind(s.findRegex ?? s.find, s.flags)
  if (!find.trim()) return null
  const name = String(s.scriptName ?? s.name ?? `规则 ${index + 1}`)
    .trim()
    .slice(0, MAX_NAME)
  const replace = String(s.replaceString ?? s.replace ?? '').slice(0, MAX_REPLACE)
  const enabled = s.disabled !== true && s.enabled !== false
  const promptOnly = s.promptOnly === true
  const markdownOnly = s.markdownOnly === true
  const group =
    String(s.group ?? s.pack ?? '').trim().slice(0, 24) || inferGroupFromName(name)
  return {
    id: String(s.id ?? '').trim() || uid('ctr'),
    order: index + 1,
    name: name || `规则 ${index + 1}`,
    find,
    replace,
    enabled,
    promptOnly,
    markdownOnly,
    ...(group ? { group } : {}),
  }
}

function mapNuoRule(s, index) {
  if (!s || typeof s !== 'object') return null
  // role: ai | user | all — 只要作用于 AI/展示
  const role = String(s.role ?? 'ai').toLowerCase()
  if (role === 'user') return null
  if (s.applyOnDisplay === false && s.applyOnPrompt === true) {
    // 仅改 prompt 的，Lumi 输出钩子用不上；仍导入但默认关，避免误伤展示
  }
  const find = normalizeFind(s.pattern ?? s.find ?? s.findRegex, s.flags)
  if (!find.trim()) return null
  const name = String(s.name ?? s.scriptName ?? `规则 ${index + 1}`)
    .trim()
    .slice(0, MAX_NAME)
  const enabled = s.enabled !== false && s.disabled !== true
  const promptOnly = s.applyOnPrompt === true && s.applyOnDisplay === false
  const markdownOnly = s.applyOnDisplay === true && s.applyOnPrompt === false
  const group =
    String(s.group ?? s.pack ?? '').trim().slice(0, 24) || inferGroupFromName(name)
  return {
    id: String(s.id ?? '').trim() || uid('ctr'),
    order: typeof s.order === 'number' ? Math.floor(s.order) + 1 : index + 1,
    name: name || `规则 ${index + 1}`,
    find,
    replace: String(s.replacement ?? s.replaceString ?? s.replace ?? '').slice(0, MAX_REPLACE),
    enabled,
    promptOnly,
    markdownOnly,
    ...(group ? { group } : {}),
  }
}

/** 从酒馆预设 JSON / 诺基基 nuopreset 提取 Lumi regexRules */
export function extractRegexRulesFromPresetJson(j) {
  const out = []
  const seen = new Set()

  const stList = j?.extensions?.regex_scripts
  if (Array.isArray(stList)) {
    for (let i = 0; i < stList.length; i++) {
      const r = mapStScript(stList[i], out.length)
      if (!r || seen.has(r.id)) continue
      seen.add(r.id)
      out.push(r)
      if (out.length >= MAX_RULES) break
    }
  }

  if (out.length < MAX_RULES && Array.isArray(j?.regexRules)) {
    for (let i = 0; i < j.regexRules.length; i++) {
      const r = mapNuoRule(j.regexRules[i], out.length)
      if (!r || seen.has(r.id)) continue
      seen.add(r.id)
      out.push(r)
      if (out.length >= MAX_RULES) break
    }
  }

  if (out.length < MAX_RULES && Array.isArray(j?.regex_scripts)) {
    for (let i = 0; i < j.regex_scripts.length; i++) {
      const r = mapStScript(j.regex_scripts[i], out.length)
      if (!r || seen.has(r.id)) continue
      seen.add(r.id)
      out.push(r)
      if (out.length >= MAX_RULES) break
    }
  }

  return out.map((r, i) => ({ ...r, order: i + 1 }))
}
