import type { CoTEntry, CoTPreset } from './cotTypes'

/**
 * 粗估 token（中英混合启发式，仅供管理页参考）：
 * CJK ≈ 1 token/字；其它字符 ≈ 4 字/token
 */
export function estimateTextTokens(text: string): number {
  const s = String(text ?? '')
  if (!s) return 0
  let cjk = 0
  let other = 0
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3000 && code <= 0x303f) ||
      (code >= 0xff00 && code <= 0xffef)
    ) {
      cjk += 1
    } else if (/\s/.test(ch)) {
      /* skip whitespace weight */
    } else {
      other += 1
    }
  }
  return Math.max(0, Math.ceil(cjk + other / 4))
}

/** 展示 / 注入统一排序：仅按 order 升序（开关不影响位置） */
export function sortCotEntriesDisplay(entries: CoTEntry[]): CoTEntry[] {
  return entries.slice().sort((a, b) => a.order - b.order)
}

/** 单条已开启条目的注入正文（与 assemble 一致） */
export function formatEnabledEntryInjectText(e: CoTEntry): string {
  const title = e.title.trim()
  const body = e.content.trim()
  if (!body) return ''
  return title ? `【${title}】\n${body}` : body
}

/** 预设内已开启条目按 order 从上到下拼接（关闭的跳过，不重排位置） */
export function buildPresetEffectiveText(preset: CoTPreset): string {
  return sortCotEntriesDisplay(preset.entries)
    .filter((e) => e.enabled && e.content.trim())
    .map(formatEnabledEntryInjectText)
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

export function estimatePresetEffectiveTokens(preset: CoTPreset): number {
  return estimateTextTokens(buildPresetEffectiveText(preset))
}
