/**
 * Lumi 侧「全局变量」表：对齐酒馆 getglobalvar / 预设助手注入。
 * 键值可被文心注入展开；后续可接场控 UI。
 */

const LS_KEY = 'lumi-cot-global-vars:v1'

type Listener = () => void
const listeners = new Set<Listener>()

let cache: Record<string, string> | null = null

function read(): Record<string, string> {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const o = JSON.parse(raw) as unknown
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        const out: Record<string, string> = {}
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          if (typeof v === 'string') out[k] = v
        }
        cache = out
        return cache
      }
    }
  } catch {
    /* ignore */
  }
  cache = {}
  return cache
}

function write(next: Record<string, string>) {
  cache = next
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  for (const l of listeners) l()
}

export function subscribeCotGlobalVars(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCotGlobalVars(): Record<string, string> {
  return { ...read() }
}

export function setCotGlobalVar(key: string, value: string): void {
  const k = String(key || '').trim()
  if (!k) return
  const cur = read()
  write({ ...cur, [k]: String(value ?? '') })
}

export function setCotGlobalVars(patch: Record<string, string>): void {
  const cur = read()
  const next = { ...cur }
  for (const [k, v] of Object.entries(patch)) {
    const key = String(k || '').trim()
    if (!key) continue
    next[key] = String(v ?? '')
  }
  write(next)
}

export function clearCotGlobalVars(): void {
  write({})
}
