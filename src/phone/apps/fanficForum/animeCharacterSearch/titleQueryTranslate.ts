/**
 * 中文片名 → 英/日文检索词。免费、无需 Key。
 *
 * GitHub Pages 等纯静态托管没有 Vite 代理，因此：
 * - 线上只用 MyMemory（浏览器直连、支持 CORS；按每位访客 IP 计额度）
 * - Google gtx 仅本地 `vite` 开发时走 /gtx-proxy
 */

import { hasExactCnAlias, registerLearnedAliases } from './cnTitleAliases'

const memCache = new Map<string, string[]>()

function hasCjk(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s)
}

function isMostlyLatinOrKana(s: string): boolean {
  const t = s.replace(/\s+/g, '')
  if (!t) return false
  const cjk = (t.match(/[\u4e00-\u9fff]/g) || []).length
  return cjk / t.length < 0.3
}

function uniqPush(out: string[], seen: Set<string>, s: string) {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length < 2) return
  const k = t.toLowerCase()
  if (seen.has(k)) return
  seen.add(k)
  out.push(t)
}

function heuristicJaEn(q: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const ja = q.replace(/[与和＆&]/g, 'と').replace(/键/g, '鍵')
  if (ja !== q) uniqPush(out, seen, ja)
  const en = q.replace(/[与和＆&]/g, ' to ')
  if (en !== q && !hasCjk(en)) uniqPush(out, seen, en)
  return out
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      () => {
        clearTimeout(t)
        resolve(null)
      },
    )
  })
}

/** 仅开发态有 Vite /gtx-proxy；GitHub Pages 没有后端，不能用 */
function canUseGtxProxy(): boolean {
  return Boolean(import.meta.env?.DEV)
}

async function gtxTranslate(text: string, tl: string): Promise<string | null> {
  if (!canUseGtxProxy()) return null
  const qs = `/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(`/gtx-proxy${qs}`)
  if (!res.ok) return null
  const json = (await res.json()) as unknown
  if (!Array.isArray(json) || !Array.isArray(json[0])) return null
  const parts = (json[0] as unknown[])
    .map((row) => (Array.isArray(row) && typeof row[0] === 'string' ? row[0] : ''))
    .join('')
    .trim()
  return parts || null
}

async function myMemoryTranslate(text: string, pair: string): Promise<string | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = (await res.json()) as { responseData?: { translatedText?: string } }
  const t = json.responseData?.translatedText?.trim()
  if (!t) return null
  if (/MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(t)) return null
  return t
}

/** 中文查询 → 英/日检索词。免费、无需 Key；GitHub Pages 可用。 */
export async function translateTitleQuery(query: string): Promise<string[]> {
  const q = query.trim()
  if (!q || !hasCjk(q) || isMostlyLatinOrKana(q)) return []
  if (hasExactCnAlias(q)) return []

  const cached = memCache.get(q)
  if (cached) return cached

  const seen = new Set<string>()
  const out: string[] = []
  for (const h of heuristicJaEn(q)) uniqPush(out, seen, h)

  // 线上主路径：MyMemory 直连（按访客 IP 额度，用户互不抢）
  const tasks: Array<Promise<string | null>> = [
    withTimeout(myMemoryTranslate(q, 'zh-CN|ja'), 4000),
    withTimeout(myMemoryTranslate(q, 'zh-CN|en'), 4000),
  ]
  if (canUseGtxProxy()) {
    tasks.push(withTimeout(gtxTranslate(q, 'ja'), 3500), withTimeout(gtxTranslate(q, 'en'), 3500))
  }
  const results = await Promise.all(tasks)
  for (const t of results) {
    if (t) uniqPush(out, seen, t)
  }

  const useful = out.filter((t) => t !== q)
  memCache.set(q, useful)
  if (useful.length) registerLearnedAliases(q, useful)
  return useful
}
