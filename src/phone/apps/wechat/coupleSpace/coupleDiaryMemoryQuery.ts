/**
 * 情侣空间共写日记 → {{char}} 记忆注入（查询层过滤）
 * 仅返回 includeInMemory === true 的条目；禁止全量传入再靠提示词装看不见。
 */

import { personaDb } from '../newFriendsPersona/idb'
import {
  COUPLE_SPACE_KV_KEY,
  normalizeCoupleDiaryEntry,
  normalizeCoupleMemoryShareState,
  type CoupleDiaryEntry,
  type CoupleSpacePersistedRoot,
} from './coupleSpaceTypes'
import { useCoupleSpaceStore } from './useCoupleSpaceStore'

const DEFAULT_LIMIT = 4
const MAX_SCAN = 48

function tokenizeQuery(text: string): string[] {
  const t = text.trim().toLowerCase()
  if (!t) return []
  const parts = t.split(/[\s，。！？、；：,.!?;:"'（）()【】[\]…·]+/).filter((p) => p.length >= 2)
  return Array.from(new Set(parts)).slice(0, 12)
}

function scoreDiaryEntry(entry: CoupleDiaryEntry, tokens: string[], now: number): number {
  let score = 0
  const ageDays = Math.max(0, (now - entry.createdAt) / 86_400_000)
  // 时间衰减：越新越高
  score += Math.max(0, 40 - ageDays * 1.5)
  if (!tokens.length) return score
  const body = entry.content.toLowerCase()
  let hits = 0
  for (const tok of tokens) {
    if (body.includes(tok)) hits += 1
  }
  score += hits * 18
  return score
}

async function loadRoomDiary(
  accountId: string,
  characterId: string,
): Promise<CoupleDiaryEntry[]> {
  const acc = accountId.trim()
  const cid = characterId.trim()
  if (!acc || !cid) return []

  const snap = useCoupleSpaceStore.getState()
  if (snap.hydrated && snap.currentAccountId === acc) {
    return snap.root.byAccount[acc]?.rooms[cid]?.diary ?? []
  }

  try {
    const raw = await personaDb.getPhoneKv(COUPLE_SPACE_KV_KEY)
    if (!raw || typeof raw !== 'object') return []
    const root = raw as CoupleSpacePersistedRoot
    const diary = root.byAccount?.[acc]?.rooms?.[cid]?.diary
    if (!Array.isArray(diary)) return []
    return diary.map((e) => normalizeCoupleDiaryEntry(e)).filter((e): e is CoupleDiaryEntry => !!e)
  } catch {
    return []
  }
}

/**
 * 组装 {{char}} 上下文时的唯一日记记忆入口。
 * 硬过滤 includeInMemory；再按相关度 / 时间衰减截断。
 */
export async function listCoupleDiaryEntriesForCharMemory(params: {
  accountId: string | null | undefined
  characterId: string
  queryText?: string | null
  limit?: number
}): Promise<CoupleDiaryEntry[]> {
  const acc = params.accountId?.trim()
  const cid = params.characterId.trim()
  if (!acc || !cid) return []

  // 模块总闸：日记未开则查询层直接空
  const snap = useCoupleSpaceStore.getState()
  let diaryModuleOn = false
  if (snap.hydrated && snap.currentAccountId === acc) {
    diaryModuleOn =
      normalizeCoupleMemoryShareState(snap.root.byAccount[acc]?.rooms[cid]?.memoryShare).modules
        .diary === true
  } else {
    try {
      const raw = await personaDb.getPhoneKv(COUPLE_SPACE_KV_KEY)
      const root = raw as CoupleSpacePersistedRoot | null
      diaryModuleOn =
        normalizeCoupleMemoryShareState(root?.byAccount?.[acc]?.rooms?.[cid]?.memoryShare).modules
          .diary === true
    } catch {
      diaryModuleOn = false
    }
  }
  if (!diaryModuleOn) return []

  const all = await loadRoomDiary(acc, cid)
  // 查询层物理隔离：未勾选纳入记忆的条目根本不存在于结果中
  const eligible = all.filter(
    (e) => e.includeInMemory === true && e.author === 'user' && e.content.trim(),
  )
  if (!eligible.length) return []

  const limit = Math.max(1, Math.min(5, Math.floor(params.limit ?? DEFAULT_LIMIT)))
  const now = Date.now()
  const tokens = tokenizeQuery(String(params.queryText ?? ''))
  const ranked = eligible
    .slice(0, MAX_SCAN)
    .map((e) => ({ e, score: scoreDiaryEntry(e, tokens, now) }))
    .sort((a, b) => b.score - a.score || b.e.createdAt - a.e.createdAt)

  return ranked.slice(0, limit).map((r) => r.e)
}

/** 注入块：仅包装已筛选条目；引用规则克制自然 */
export function formatCoupleDiaryMemoryBlock(entries: CoupleDiaryEntry[]): string {
  const rows = entries.filter((e) => e.includeInMemory === true && e.content.trim())
  if (!rows.length) return ''

  const lines = rows.map((e, i) => {
    const d = new Date(e.createdAt)
    const label = Number.isFinite(d.getTime())
      ? `${d.getMonth() + 1}/${d.getDate()}`
      : '某日'
    return `${i + 1}. [${label}] ${e.content.trim().slice(0, 280)}`
  })

  return (
    `【情侣空间·共写日记（用户主动分享进你记忆的片段）】\n` +
    `以下内容是用户**主动勾选「同步进你的记忆」**后才存在于此的碎碎念；未勾选的日记你永远看不到。\n` +
    `【引用铁律】\n` +
    `- 这些是「了解对方」的背景素材，**不是**每轮必提的谈资；多数回合应完全不提。\n` +
    `- 仅当当前话题与某条明显相关，或时间点自然联想到时，才可轻提；禁止突兀插入打断当下。\n` +
    `- 措辞用「你之前说过」「我记得你提到过」这类**记得**语气；**禁止**「我看到你日记里写」「我翻到你日记」等监控式说法。\n` +
    `- 禁止复述整段日记；一笔带过即可。\n` +
    lines.join('\n')
  )
}

export async function buildCoupleDiaryMemoryInjection(params: {
  accountId: string | null | undefined
  characterId: string
  queryText?: string | null
  limit?: number
}): Promise<string> {
  const entries = await listCoupleDiaryEntriesForCharMemory(params)
  return formatCoupleDiaryMemoryBlock(entries)
}
