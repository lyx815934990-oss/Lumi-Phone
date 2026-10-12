/**
 * 用户自补：中文片名 → 原作原名（日/英/罗马音）。
 * 持久化到 phoneKv；提交后立刻注入检索别名表。
 * GitHub Pages 无公共后端时，仅对本机/该用户数据生效（随手机备份可带走）。
 */

import { personaDb } from '../../wechat/newFriendsPersona/idb'
import { normalizeCnKey, registerLearnedAliases } from './cnTitleAliases'

export const USER_TITLE_ALIASES_KV_KEY = 'fanfic-forum:title-aliases:v1'

export type UserTitleAliasEntry = {
  cn: string
  originals: string[]
  updatedAt: number
}

type StoreShape = {
  byCn: Record<string, UserTitleAliasEntry>
}

let hydrated = false
let hydratePromise: Promise<void> | null = null

function splitOriginals(raw: string): string[] {
  return raw
    .split(/[,，;；|/／\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await personaDb.getPhoneKv(USER_TITLE_ALIASES_KV_KEY)
    if (!raw || typeof raw !== 'object') return { byCn: {} }
    const byCn = (raw as StoreShape).byCn
    if (!byCn || typeof byCn !== 'object') return { byCn: {} }
    return { byCn }
  } catch {
    return { byCn: {} }
  }
}

function applyEntry(entry: UserTitleAliasEntry) {
  registerLearnedAliases(entry.cn, entry.originals)
}

/** 启动时加载用户别名到检索表（幂等） */
export async function hydrateUserTitleAliases(): Promise<void> {
  if (hydrated) return
  if (hydratePromise) return hydratePromise
  hydratePromise = (async () => {
    const store = await readStore()
    for (const entry of Object.values(store.byCn)) {
      if (entry?.cn && entry.originals?.length) applyEntry(entry)
    }
    hydrated = true
  })().finally(() => {
    hydratePromise = null
  })
  return hydratePromise
}

export async function listUserTitleAliases(): Promise<UserTitleAliasEntry[]> {
  await hydrateUserTitleAliases()
  const store = await readStore()
  return Object.values(store.byCn).sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * 提交中文名 + 原作原名。写库并注入检索。
 * @returns 规范化后的中文名（可用于触发重搜）
 */
export async function submitUserTitleAlias(params: {
  cn: string
  originalRaw: string
}): Promise<{ cn: string; originals: string[] }> {
  const cn = params.cn.trim()
  const originals = splitOriginals(params.originalRaw)
  if (!cn) throw new Error('请填写中文片名')
  if (!originals.length) throw new Error('请填写原作原名（日文 / 英文 / 罗马音）')

  const key = normalizeCnKey(cn)
  if (!key) throw new Error('中文片名无效')

  const store = await readStore()
  const prev = store.byCn[key]
  const merged = [...new Set([...(prev?.originals ?? []), ...originals])]
  const entry: UserTitleAliasEntry = {
    cn: prev?.cn || cn,
    originals: merged,
    updatedAt: Date.now(),
  }
  store.byCn[key] = entry
  await personaDb.setPhoneKv(USER_TITLE_ALIASES_KV_KEY, store)
  applyEntry(entry)
  hydrated = true
  return { cn: entry.cn, originals: entry.originals }
}
