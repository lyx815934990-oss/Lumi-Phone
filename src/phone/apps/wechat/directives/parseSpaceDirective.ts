/**
 * 方案甲：整行「指令名 参数」拆解。
 * - 行首精确匹配指令名（可多词，如「切下一首」）
 * - 余下按空格拆：含 `=` 的为 key=value；否则为位置参（值含空格可用双引号）
 */

export type SpaceDirectiveParts = {
  name: string
  rest: string
  positional: string[]
  named: Record<string, string>
}

function readQuoted(s: string, start: number): { value: string; end: number } {
  let i = start
  if (s[i] !== '"') return { value: '', end: start }
  i += 1
  let buf = ''
  while (i < s.length && s[i] !== '"') {
    if (s[i] === '\\' && i + 1 < s.length) {
      buf += s[i + 1]!
      i += 2
      continue
    }
    buf += s[i]!
    i += 1
  }
  if (i < s.length && s[i] === '"') i += 1
  return { value: buf, end: i }
}

function tokenizeArgs(rest: string): string[] {
  const out: string[] = []
  const s = rest.trim()
  if (!s) return out
  let i = 0
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i]!)) i += 1
    if (i >= s.length) break
    if (s[i] === '"') {
      const q = readQuoted(s, i)
      out.push(q.value)
      i = q.end
      continue
    }
    // key="value with spaces" → 整段作为一个 token，值为含空格的引号内容
    const eq = s.indexOf('=', i)
    if (eq > i && !/\s/.test(s.slice(i, eq)) && s[eq + 1] === '"') {
      const key = s.slice(i, eq)
      const q = readQuoted(s, eq + 1)
      out.push(`${key}=${q.value}`)
      i = q.end
      continue
    }
    let j = i
    while (j < s.length && !/\s/.test(s[j]!)) j += 1
    out.push(s.slice(i, j))
    i = j
  }
  return out
}

/** 行首是否匹配指令名（整词边界：名后为空或空白） */
export function matchDirectiveName(line: string, name: string): string | null {
  const t = String(line ?? '').trim()
  const n = name.trim()
  if (!t || !n) return null
  if (t === n) return ''
  if (t.startsWith(n) && /\s/.test(t[n.length] ?? '')) return t.slice(n.length).trim()
  return null
}

export function matchAnyDirectiveName(line: string, names: readonly string[]): SpaceDirectiveParts | null {
  const sorted = [...names].sort((a, b) => b.length - a.length)
  for (const name of sorted) {
    const rest = matchDirectiveName(line, name)
    if (rest == null) continue
    return buildSpaceDirectiveParts(name, rest)
  }
  return null
}

export function buildSpaceDirectiveParts(name: string, rest: string): SpaceDirectiveParts {
  const tokens = tokenizeArgs(rest)
  const positional: string[] = []
  const named: Record<string, string> = {}
  for (const tok of tokens) {
    const eq = tok.indexOf('=')
    if (eq > 0) {
      const key = tok.slice(0, eq).trim()
      const val = tok.slice(eq + 1).trim()
      if (key) named[key] = val
      continue
    }
    positional.push(tok)
  }
  return { name, rest: rest.trim(), positional, named }
}

export function pickNamed(
  parts: SpaceDirectiveParts,
  keys: readonly string[],
): string {
  for (const k of keys) {
    const v = parts.named[k]
    if (v?.trim()) return v.trim()
  }
  return ''
}

export function pickPositional(parts: SpaceDirectiveParts, index: number): string {
  return String(parts.positional[index] ?? '').trim()
}

/** 从位置参里找第一个像整数分钟的数字 */
export function pickTrailingInt(parts: SpaceDirectiveParts): number | null {
  for (let i = parts.positional.length - 1; i >= 0; i -= 1) {
    const n = Number(parts.positional[i])
    if (Number.isFinite(n) && String(parts.positional[i]).trim() !== '') {
      return Math.round(n)
    }
  }
  const fromNamed = Number(parts.named.duration ?? parts.named.分钟 ?? parts.named.min)
  if (Number.isFinite(fromNamed)) return Math.round(fromNamed)
  return null
}
