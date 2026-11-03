/**
 * 酒馆宏 → Lumi 注入兼容。
 * - setvar/getvar：转换期已尽量展开；此处清残留
 * - getglobalvar：原靠酒馆助手脚本写全局表；Lumi 用轻量全局表 + 注入时展开
 * - {{user}}/{{char}}：默认保留（模型指称约定），可选展开为显示名
 */

const COMMENT_RE = /\{\{\/\/[\s\S]*?\}\}/g
const TRIM_RE = /\{\{trim\}\}/gi
const GETVAR_RE = /\{\{getvar::([^}]+)\}\}/gi
const GETGLOBAL_RE = /\{\{getglobalvar::([^}]+)\}\}/gi
const SETGLOBAL_RE = /\{\{setglobalvar::([^:]+)::([\s\S]*?)\}\}/g

export type CotMacroExpandOpts = {
  /** 聊天变量（一般转换期已烘焙） */
  vars?: Record<string, string>
  /** 全局变量（对齐酒馆 getglobalvar） */
  globals?: Record<string, string>
  /** 若提供则把 {{user}}/{{char}} 换成显示名；默认不换，留给模型占位 */
  userName?: string
  charName?: string
  /** 未命中的 getglobalvar：'empty' | 'keep' | 'stub' */
  missingGlobal?: 'empty' | 'keep' | 'stub'
}

/** 从正文抽出 setglobalvar，供导入/调试 */
export function extractSetGlobalVars(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = new RegExp(SETGLOBAL_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(String(text || ''))) !== null) {
    out[m[1].trim()] = m[2]
  }
  return out
}

/**
 * 注入前展开/清理酒馆宏。默认：清 trim/注释，展开已知变量，未知 getglobalvar 置空。
 */
export function expandCotInjectMacros(
  text: string,
  opts?: CotMacroExpandOpts,
): string {
  let s = String(text ?? '')
  if (!s) return ''

  s = s.replace(COMMENT_RE, '')
  s = s.replace(TRIM_RE, '')

  // 先吃掉正文里的 setglobalvar（避免泄漏指令），并入本轮 globals
  const localGlobals: Record<string, string> = { ...(opts?.globals ?? {}) }
  s = s.replace(SETGLOBAL_RE, (_full, key: string, val: string) => {
    localGlobals[String(key).trim()] = String(val ?? '')
    return ''
  })

  const vars = opts?.vars ?? {}
  s = s.replace(GETVAR_RE, (_full, key: string) => {
    const k = String(key).trim()
    return vars[k] != null ? String(vars[k]) : ''
  })

  const missing = opts?.missingGlobal ?? 'empty'
  s = s.replace(GETGLOBAL_RE, (_full, key: string) => {
    const k = String(key).trim()
    if (localGlobals[k] != null) return String(localGlobals[k])
    if (missing === 'keep') return `{{getglobalvar::${k}}}`
    if (missing === 'stub') return `（Lumi未提供全局变量：${k}）`
    return ''
  })

  if (opts?.userName != null && opts.userName !== '') {
    const u = opts.userName
    s = s.replace(/\{\{user\}\}/gi, u).replace(/\{\{player\}\}/gi, u)
  }
  if (opts?.charName != null && opts.charName !== '') {
    s = s.replace(/\{\{char\}\}/gi, opts.charName)
  }

  return s.replace(/\n{3,}/g, '\n\n').trim()
}
