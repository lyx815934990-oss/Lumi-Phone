import type { ArchiveWorldbookPriorityTier, LoreEntry } from './loreArchiveTypes'
import {
  ARCHIVE_WORLDBOOK_PRIORITY_TIER_LABELS,
  normalizeArchiveWorldbookPriorityTier,
} from './loreArchiveTypes'
import { formatGlobalWorldBookItemLineForPrompt } from './buildGlobalWechatWorldBooksPrompt'
import type { GlobalWechatPlate, GlobalWechatWorldBookScope } from './globalWorldBookTypes'
import { GLOBAL_WECHAT_PLATE_LABELS, normalizeGlobalWechatWorldBookScope } from './globalWorldBookTypes'
import { DATING_AI_REFERENCE_SECTION_CHAR_CAP } from '../apps/wechat/dating/types'
import {
  listEnabledBuiltinPresetTitlesForTrace,
  type LoreArchiveBuiltinPresetToggles,
} from './loreArchiveBuiltinPresets'

/** 与线下约会参考资料同量级；具体能吃掉多少仍取决于所选模型的 context window */
const MAX_LORE_INJECT_CHARS = DATING_AI_REFERENCE_SECTION_CHAR_CAP

function normalizeMemberSet(currentChatMembers: string[]): Set<string> {
  return new Set(currentChatMembers.map((x) => String(x ?? '').trim()).filter(Boolean))
}

function entryMatchesPlate(scope: GlobalWechatWorldBookScope, plate: GlobalWechatPlate | undefined): boolean {
  const s = normalizeGlobalWechatWorldBookScope(scope)
  if (s.mode === 'all') return true
  if (plate == null) return false
  return s.plates.includes(plate)
}

function entryMatchesCharacterScope(entry: LoreEntry, inScene: Set<string>): boolean {
  const cs = entry.characterScope
  if (!cs || cs.mode === 'all') return true
  const ids = cs.mode === 'characters' ? cs.ids ?? [] : []
  // 限定角色但未勾选任何 id：视为无效配置，回退为「全部角色」以免条目静默永不注入
  if (!ids.length) return true
  return ids.some((id) => inScene.has(String(id ?? '').trim()))
}

function plateScopeLabel(scope: GlobalWechatWorldBookScope): string {
  const s = normalizeGlobalWechatWorldBookScope(scope)
  if (s.mode === 'all') return '全部板块'
  return s.plates.map((p) => GLOBAL_WECHAT_PLATE_LABELS[p]).join('、')
}

function characterScopeLabel(entry: LoreEntry): string {
  const cs = entry.characterScope
  if (!cs || cs.mode === 'all') return '全部角色（档案相关场景）'
  const ids = cs.ids ?? []
  if (!ids.length) return '未指定角色'
  return `限定 ${ids.length} 名角色`
}

function entryPriorityTier(entry: LoreEntry): ArchiveWorldbookPriorityTier {
  return normalizeArchiveWorldbookPriorityTier(entry.priorityTier)
}

function efficacyLineForTier(tier: ArchiveWorldbookPriorityTier): string {
  if (tier === 1) {
    return '【效力·档1】仅次于输出规范提示词，**高于**人设世界书；与人设冲突时以本段全局档案为准。客户端硬格式（换行分条等）仍须遵守。'
  }
  if (tier === 3) {
    return '【效力·档3】**次于**人设世界书；人设明文冲突时以人设为准。禁止用本段软参考覆盖人设核心性格/口癖。'
  }
  return '【效力·档2】与人设世界书**同级**；有矛盾时仍**跟随本段全局档案**。禁止以人设气质为由整段忽略本段硬规则；亦禁止用本段软参考覆盖人设明文口癖与性格。'
}

function filterOrderedCandidates(
  currentChatMembers: string[],
  entries: LoreEntry[],
  plate?: GlobalWechatPlate | null,
): LoreEntry[] {
  const inScene = normalizeMemberSet(currentChatMembers)
  const plateArg = plate ?? undefined

  const candidates = (entries ?? []).filter((e) => {
    if (e.enabled === false) return false
    if (!String(e.content ?? '').trim()) return false
    if (!entryMatchesPlate(e.plateScope, plateArg)) return false
    const cs = e.characterScope
    const targetedIds =
      cs?.mode === 'characters' ? (cs.ids ?? []).map((x) => String(x ?? '').trim()).filter(Boolean) : []
    if (!inScene.size && targetedIds.length > 0) return false
    return entryMatchesCharacterScope(e, inScene)
  })

  const allFirst = candidates.filter((e) => e.characterScope?.mode !== 'characters')
  const targeted = candidates.filter((e) => e.characterScope?.mode === 'characters')
  const sortedAll = [...allFirst].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  const sortedTargeted = [...targeted].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  return [...sortedAll, ...sortedTargeted]
}

function renderEntriesBlock(
  ordered: LoreEntry[],
  tier: ArchiveWorldbookPriorityTier,
  options?: BuildWorldbookContextOptions | null,
): string {
  if (!ordered.length) return ''
  if (options?.plainUserEntriesOnly) {
    const chunks: string[] = []
    for (const e of ordered) {
      const title = String(e.title ?? '').trim() || '未命名'
      const body = String(e.content ?? '').trim()
      chunks.push(`《${title}》\n${body}`)
    }
    return chunks.join('\n\n')
  }
  const lines: string[] = []
  lines.push(`【档案与世界书·${ARCHIVE_WORLDBOOK_PRIORITY_TIER_LABELS[tier].short}】`)
  lines.push(
    '请务必在叙事与设定理解中严格遵守下列条目。条目按标注的生效板块与作用角色筛选；正文建议统一使用占位符「{{char}}」指当前人设角色本人、「{{user}}」指玩家本人（注入前已替换为姓名）。若条目限定具体角色：仅该角色在台词、心理与知情范围内受其约束；未点名的其他角色不受该条约束。',
  )
  lines.push(efficacyLineForTier(tier))
  let n = 1
  for (const e of ordered) {
    const title = String(e.title ?? '').trim() || '未命名'
    const plateL = plateScopeLabel(e.plateScope)
    const charL = characterScopeLabel(e)
    const bodyLine = formatGlobalWorldBookItemLineForPrompt(title, String(e.content).trim())
    lines.push(`${n}. [${plateL}｜${charL}｜档${tier}]`)
    lines.push(bodyLine)
    n += 1
  }
  return lines.join('\n')
}

export type BuildWorldbookContextOptions = {
  /**
   * 为 true 时不截断总长度（仅供思维溯源 UI 等与模型 context 无关的展示）。
   * 默认仍按 {@link MAX_LORE_INJECT_CHARS} 截断，与聊天注入一致。
   */
  skipLengthCap?: boolean
  /**
   * 为 true 时只拼接档案室条目的标题与正文，不含注入用前言、「效力层级」说明、
   * 条目前的编号/板块标签，以及 {@link formatGlobalWorldBookItemLineForPrompt} 中的内置尾注（仅供思维溯源等展示）。
   */
  plainUserEntriesOnly?: boolean
}

export type WorldbookContextByTier = Record<ArchiveWorldbookPriorityTier, string>

/**
 * 按优先级档次拆分档案室注入块（1/2/3）。
 */
export function buildWorldbookContextByTier(
  currentChatMembers: string[],
  entries: LoreEntry[],
  plate?: GlobalWechatPlate | null,
  options?: BuildWorldbookContextOptions | null,
): WorldbookContextByTier {
  const ordered = filterOrderedCandidates(currentChatMembers, entries, plate)
  const buckets: Record<ArchiveWorldbookPriorityTier, LoreEntry[]> = { 1: [], 2: [], 3: [] }
  for (const e of ordered) {
    buckets[entryPriorityTier(e)].push(e)
  }
  const out = { 1: '', 2: '', 3: '' } as WorldbookContextByTier
  let used = 0
  for (const tier of [1, 2, 3] as const) {
    let block = renderEntriesBlock(buckets[tier], tier, options)
    if (!options?.skipLengthCap && block && used + block.length > MAX_LORE_INJECT_CHARS) {
      const remain = Math.max(0, MAX_LORE_INJECT_CHARS - used)
      if (remain < 80) {
        block = ''
      } else {
        block = `${block.slice(0, remain)}\n…（档案与世界书因长度已截断）`
      }
    }
    out[tier] = block
    used += block.length
  }
  return out
}

/**
 * 按当前会话成员与所在微信/约会板块，从档案室统一条目组装注入块。
 * `plate === undefined` 时：仅注入「全部板块」类条目（与旧全局世界书行为一致）。
 */
export function buildWorldbookContext(
  currentChatMembers: string[],
  entries: LoreEntry[],
  plate?: GlobalWechatPlate | null,
  options?: BuildWorldbookContextOptions | null,
): string {
  const by = buildWorldbookContextByTier(currentChatMembers, entries, plate, {
    ...options,
    skipLengthCap: true,
  })
  let out = [by[1], by[2], by[3]].filter(Boolean).join('\n\n')
  if (!options?.skipLengthCap && out.length > MAX_LORE_INJECT_CHARS) {
    out = `${out.slice(0, MAX_LORE_INJECT_CHARS)}\n…（档案与世界书因长度已截断）`
  }
  return out
}

/** 与 {@link buildWorldbookContext} 相同筛选规则，返回用于 UI 的条目标题（全局 / 专属） */
export function listWorldbookTracePills(
  currentChatMembers: string[],
  entries: LoreEntry[],
  plate?: GlobalWechatPlate | null,
): Array<{ type: 'global' | 'personal'; title: string }> {
  const ordered = filterOrderedCandidates(currentChatMembers, entries, plate)
  return ordered.map((e) => ({
    type: e.characterScope?.mode === 'characters' ? ('personal' as const) : ('global' as const),
    title: String(e.title ?? '').trim() || '未命名',
  }))
}

/**
 * 思维溯源「档案室」名称列表：自建条目 + 系统内置预设（纯爱克制等）。
 */
export function listArchiveWorldbookTracePills(
  currentChatMembers: string[],
  entries: LoreEntry[],
  plate: GlobalWechatPlate | null | undefined,
  builtinToggles: LoreArchiveBuiltinPresetToggles | null | undefined,
): Array<{ type: 'global' | 'personal'; title: string }> {
  const lore = listWorldbookTracePills(currentChatMembers, entries, plate)
  const builtins = listEnabledBuiltinPresetTitlesForTrace(builtinToggles, plate ?? null)
  const seen = new Set<string>()
  const out: Array<{ type: 'global' | 'personal'; title: string }> = []
  for (const row of [...builtins, ...lore]) {
    const key = row.title.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}
