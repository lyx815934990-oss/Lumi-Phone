import { getActivePresetForScene } from './cotStore'
import type { CotRegexRule } from './cotTypes'

const MAX_FIND = 4_000
const MAX_REPLACE = 120_000
const MAX_TEXT = 500_000

export type CotRegexApplyPhase = 'display' | 'prompt'

function unwrapHtmlFenceInReplace(s: string): string {
  if (!s.includes('```')) return s
  let out = s.replace(/```(?:html|HTML)\s*\r?\n?([\s\S]*?)```/g, '\n$1\n')
  // 月读 Vue「ta的物品」等：裸 ``` 包住 <head><script>…，不剥就会整段当代码块
  out = out.replace(/```\s*\r?\n?([\s\S]*?)```/g, (full, inner: string) => {
    const t = String(inner || '').trim()
    if (
      /__vccOpts|<head\b|createApp\s*\(|<!DOCTYPE\s+html|<html[\s>]/i.test(t)
    ) {
      return `\n${inner}\n`
    }
    return full
  })
  return out
}

function decodeReplaceEscapes(s: string): string {
  let out = String(s ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
  // 替换串里整段包在 ``` / ```html 里时剥掉，才能进 iframe
  out = unwrapHtmlFenceInReplace(out)
  return out
}

/** 解析 find：支持 /pattern/flags 或裸模式（默认 g） */
export function compileCotRegexFind(find: string): RegExp | null {
  const raw = String(find ?? '').trim()
  if (!raw || raw.length > MAX_FIND) return null
  try {
    if (raw.startsWith('/')) {
      const last = raw.lastIndexOf('/')
      if (last > 0) {
        const body = raw.slice(1, last)
        let flags = raw.slice(last + 1).replace(/[^gimsuy]/g, '')
        if (!flags.includes('g')) flags = `g${flags}`
        if (!body) return null
        return new RegExp(body, flags)
      }
    }
    return new RegExp(raw, 'g')
  } catch {
    return null
  }
}

/**
 * 推断旧导入规则的作用面（无 promptOnly/markdownOnly 字段时）。
 * 「保留N层正文 / 只发摘要」类应视为仅 prompt，避免展示只剩摘要。
 */
export function inferCotRegexPhaseFlags(rule: CotRegexRule): {
  promptOnly: boolean
  markdownOnly: boolean
} {
  if (rule.promptOnly != null || rule.markdownOnly != null) {
    return {
      promptOnly: rule.promptOnly === true,
      markdownOnly: rule.markdownOnly === true,
    }
  }
  const name = String(rule.name ?? '')
  const find = String(rule.find ?? '')
  const replace = String(rule.replace ?? '').trim()

  const looksBeautify =
    /<\s*(div|details|style|html)\b/i.test(replace) ||
    /美化|状态栏|作家对话|一步隐藏/i.test(name)

  const compressToCapture =
    /^\$\d+$/.test(replace) &&
    (/摘要/.test(find) || /保留\s*\d*\s*层|只发摘要|楼外只发/.test(name))

  const namePromptOnly =
    /保留\s*\d*\s*层|只发摘要|楼外只发|不发历史|不发多余|不发送|去自检|去除文中cot|移除思维链|不发伏笔|不发剧场|不发说书|不发剧情|去除八股|一键去极其|只发两层/i.test(
      name,
    ) && !/美化|状态栏|作家对话|一步隐藏/i.test(name)

  if (looksBeautify && !compressToCapture) {
    return { promptOnly: false, markdownOnly: true }
  }
  if (compressToCapture || namePromptOnly) {
    return { promptOnly: true, markdownOnly: false }
  }
  return { promptOnly: false, markdownOnly: false }
}

/** 该规则是否应在某一阶段执行（对齐酒馆 promptOnly / markdownOnly） */
export function cotRegexRuleAppliesToPhase(
  rule: CotRegexRule,
  phase: CotRegexApplyPhase,
): boolean {
  const { promptOnly, markdownOnly } = inferCotRegexPhaseFlags(rule)
  if (phase === 'display') {
    // 展示：仅 markdown，或「不是 promptOnly」
    return markdownOnly || !promptOnly
  }
  // prompt：仅 prompt，或「不是 markdownOnly」
  return promptOnly || !markdownOnly
}

/**
 * 酒馆「前端 Vue 美化」替换串（依赖页内 Vue/$）。
 * 展示阶段照常套用，由 stVueBeautifyCompat + iframe 注入运行时；
 * prompt 阶段跳过，避免把打包 JS 喂给模型。
 */
export function isStVueFrontendBeautifyReplace(replace: string): boolean {
  const r = String(replace ?? '')
  if (r.length < 400) return false
  return (
    /__vccOpts/i.test(r) ||
    /sourceMappingURL\s*=\s*index\.js\.map/i.test(r) ||
    /createApp\s*\([^)]*\)\s*\.mount\s*\(/i.test(r) ||
    (/const\s+\w+\s*=\s*Vue\b/i.test(r) && /<script\b/i.test(r))
  )
}

export function applyCotRegexRules(
  text: string,
  rules: CotRegexRule[],
  phase: CotRegexApplyPhase = 'display',
): string {
  let out = String(text ?? '')
  if (!out || !rules.length) return out
  if (out.length > MAX_TEXT) out = out.slice(0, MAX_TEXT)

  const ordered = [...rules]
    .filter(
      (r) =>
        r.enabled &&
        String(r.find ?? '').trim() &&
        cotRegexRuleAppliesToPhase(r, phase),
    )
    .sort((a, b) => a.order - b.order)

  for (const rule of ordered) {
    // prompt 不注入 Vue 打包；display 交给沙箱兼容层
    if (phase === 'prompt' && isStVueFrontendBeautifyReplace(rule.replace)) continue
    const re = compileCotRegexFind(rule.find)
    if (!re) continue
    const repl = decodeReplaceEscapes(String(rule.replace ?? '').slice(0, MAX_REPLACE))
    try {
      out = out.replace(re, repl)
    } catch {
      /* 单条失败跳过 */
    }
  }
  return out
}

/** 当前场景下，已启用的提示词 + 思维链预设的正则（先提示词后思维链） */
export function applyActiveCotRegexForScene(
  text: string,
  scene: 'online' | 'offline',
  phase: CotRegexApplyPhase = 'display',
): string {
  const rules: CotRegexRule[] = []
  for (const kind of ['replyStyle', 'thinkingChain'] as const) {
    const preset = getActivePresetForScene(scene, kind)
    if (!preset?.regexRules?.length) continue
    for (const r of preset.regexRules) {
      if (r.enabled && String(r.find ?? '').trim()) rules.push(r)
    }
  }
  if (!rules.length) return String(text ?? '')
  return applyCotRegexRules(text, rules, phase)
}
