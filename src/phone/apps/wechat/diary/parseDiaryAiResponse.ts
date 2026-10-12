import type { DiaryAiResult, DiaryFontStyleCode, DiaryMemorySummary } from './diaryTypes'
import { repairMemorySummaryBodyFromModel } from '../memory/memorySummarySchemaLeakRepair'
import {
  normalizeStoryTimelineRowKeywords,
  normalizeStoryTimelineRowTitle,
} from '../memory/storyTimelineTypes'

export class DiaryAiParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DiaryAiParseError'
  }
}

function stripFence(s: string): string {
  const t = String(s ?? '').trim()
  const fence = t.match(/```(?:(?:json|text|diary)?)\s*([\s\S]*?)```/i)
  if (fence?.[1]) return fence[1].trim()
  return t
    .replace(/^```(?:json|text|diary)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function normalizeFontStyle(raw: unknown): DiaryFontStyleCode | undefined {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'sharp' || v === 'neat' || v === 'lazy' || v === 'elegant' || v === 'wild') return v
  return undefined
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function takeLineValue(block: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(
      `(?:^|\\n)\\s*(?:${label})\\s*[:：]\\s*(.+)`,
      'i',
    )
    const m = block.match(re)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return ''
}

/** 取某标签到下一标签/结束之间的多行正文 */
function takeBlockValue(block: string, labels: string[], stopLabels: string[]): string {
  for (const label of labels) {
    const startRe = new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:：]\\s*\\n?`, 'i')
    const m = block.match(startRe)
    if (!m || m.index == null) continue
    const from = m.index + m[0].length
    let rest = block.slice(from)
    if (stopLabels.length) {
      const stopRe = new RegExp(
        `\\n\\s*(?:${stopLabels.join('|')})\\s*[:：]`,
        'i',
      )
      const stop = rest.search(stopRe)
      if (stop >= 0) rest = rest.slice(0, stop)
    }
    // 截到下一个 <<< 分隔符
    const delim = rest.search(/\n\s*<<</)
    if (delim >= 0) rest = rest.slice(0, delim)
    const out = rest.replace(/^\n+/, '').replace(/\n+$/, '').trim()
    if (out) return out
  }
  return ''
}

function buildResult(params: {
  title: string
  inUniverseTime: string
  content: string
  memorySummary: DiaryMemorySummary
  fontStyle?: DiaryFontStyleCode
}): DiaryAiResult | null {
  const title = params.title.trim()
  const content = params.content.trim()
  const summaryContent = params.memorySummary.content.trim()
  if (!title || !content || !summaryContent) return null
  const result: DiaryAiResult = {
    title,
    inUniverseTime: params.inUniverseTime.trim(),
    content,
    memorySummary: {
      rowTitle: normalizeStoryTimelineRowTitle(params.memorySummary.rowTitle) || '',
      rowKeywords: normalizeStoryTimelineRowKeywords(params.memorySummary.rowKeywords),
      content: repairMemorySummaryBodyFromModel(summaryContent).trim(),
    },
  }
  if (!result.memorySummary.content) return null
  if (params.fontStyle) result.font_style = params.fontStyle
  return result
}

/**
 * 主格式：标签分隔纯文本（正文可含任意引号/换行，无需转义）
 *
 * <<<DIARY>>>
 * 标题：...
 * 时间：...
 * 笔迹：neat   （可选）
 * 正文：
 * ...
 * <<<SUMMARY>>>
 * 摘要标题：...
 * 关键词：词1、词2、词3
 * 摘要：
 * ...
 * <<<END>>>
 */
function parseDiaryTaggedFormat(raw: string): DiaryAiResult | null {
  const t = stripFence(raw).replace(/\r\n/g, '\n')

  let diaryBlock = ''
  let summaryBlock = ''

  const diaryM = t.match(/<<<\s*DIARY\s*>>>([\s\S]*?)(?=<<<\s*SUMMARY\s*>>>|<<<\s*END\s*>>>|$)/i)
  const summaryM = t.match(/<<<\s*SUMMARY\s*>>>([\s\S]*?)(?=<<<\s*END\s*>>>|$)/i)

  if (diaryM?.[1]) {
    diaryBlock = diaryM[1]
    summaryBlock = summaryM?.[1] ?? ''
  } else {
    // 无分隔符：整段当标签文本
    diaryBlock = t
    summaryBlock = t
  }

  const title = takeLineValue(diaryBlock, ['标题', 'TITLE', 'title'])
  const time = takeLineValue(diaryBlock, ['时间', '剧情时间', 'TIME', 'inUniverseTime', 'IN_UNIVERSE_TIME'])
  const fontRaw = takeLineValue(diaryBlock, ['笔迹', '字体', 'FONT', 'font_style', 'FONT_STYLE'])
  const content = takeBlockValue(
    diaryBlock,
    ['正文', 'CONTENT', 'content', '日记正文'],
    ['摘要标题', '关键词', '摘要', '笔迹', '字体', 'ROW_TITLE', 'KEYWORDS', 'SUMMARY', 'TITLE', '标题', '时间'],
  )

  const rowTitle = takeLineValue(summaryBlock || diaryBlock, [
    '摘要标题',
    'ROW_TITLE',
    'row_title',
    '记忆标题',
  ])
  const keywordsLine = takeLineValue(summaryBlock || diaryBlock, [
    '关键词',
    'KEYWORDS',
    'ROW_KEYWORDS',
    'row_keywords',
  ])
  const summaryBody = takeBlockValue(
    summaryBlock || diaryBlock,
    ['摘要', '摘要正文', 'SUMMARY', 'SUMMARY_BODY', 'memory_summary', '记忆摘要'],
    ['标题', 'TITLE', '关键词', 'KEYWORDS', '摘要标题', 'ROW_TITLE', '笔迹', '正文'],
  )

  const rowKeywords = normalizeStoryTimelineRowKeywords(
    keywordsLine.split(/[,，、|/；;]+/).map((x) => x.trim()),
  )

  return buildResult({
    title,
    inUniverseTime: time,
    content,
    memorySummary: { rowTitle, rowKeywords, content: summaryBody },
    fontStyle: normalizeFontStyle(fontRaw),
  })
}

/** 旧 JSON 兜底（仍尽量修；新提示词已不再要求 JSON） */
function parseDiaryJsonLegacy(raw: string): DiaryAiResult | null {
  const t = stripFence(raw)
  const start = t.indexOf('{')
  if (start < 0) return null
  const slice = t.slice(start)
  const end = slice.lastIndexOf('}')
  if (end <= 0) return null
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(slice.slice(0, end + 1)) as Record<string, unknown>
  } catch {
    // 容错：按字段抽字符串
    const title = extractLooseJsonString(slice, 'title')
    const content = extractLooseJsonString(slice, 'content')
    const time =
      extractLooseJsonString(slice, 'inUniverseTime') ||
      extractLooseJsonString(slice, 'in_universe_time') ||
      ''
    const rowTitle =
      extractLooseJsonString(slice, 'row_title') || extractLooseJsonString(slice, 'rowTitle') || ''
    const summaryContent = extractLooseJsonStringFromMemorySummary(slice)
    const kwMatch = slice.match(/"row_keywords"\s*:\s*\[([\s\S]*?)\]/i)?.[1] ?? ''
    const rowKeywords = normalizeStoryTimelineRowKeywords(
      [...kwMatch.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((x) => unescapeJsonString(x[1] ?? '')),
    )
    if (!title || !content || !summaryContent) return null
    return buildResult({
      title,
      inUniverseTime: time,
      content,
      memorySummary: { rowTitle, rowKeywords, content: summaryContent },
      fontStyle: normalizeFontStyle(
        extractLooseJsonString(slice, 'font_style') || extractLooseJsonString(slice, 'fontStyle'),
      ),
    })
  }

  const title = String(obj.title ?? '').trim()
  const content = String(obj.content ?? '').trim()
  const inUniverseTime = String(
    obj.inUniverseTime ?? obj.in_universe_time ?? obj.time ?? '',
  ).trim()
  const ms = (obj.memory_summary ?? obj.memorySummary) as Record<string, unknown> | undefined
  const rowTitle = String(ms?.row_title ?? ms?.rowTitle ?? '').trim()
  const rowKeywords = Array.isArray(ms?.row_keywords)
    ? (ms!.row_keywords as unknown[]).map((x) => String(x ?? '').trim())
    : Array.isArray(ms?.rowKeywords)
      ? (ms!.rowKeywords as unknown[]).map((x) => String(x ?? '').trim())
      : []
  const summaryContent = String(ms?.content ?? ms?.body ?? '').trim()
  return buildResult({
    title,
    inUniverseTime,
    content,
    memorySummary: { rowTitle, rowKeywords, content: summaryContent },
    fontStyle: normalizeFontStyle(obj.font_style ?? obj.fontStyle),
  })
}

function extractLooseJsonString(raw: string, field: string): string {
  const re = new RegExp(`"${field}"\\s*:\\s*"`, 'i')
  const m = raw.match(re)
  if (!m || m.index == null) return ''
  let i = m.index + m[0].length
  let out = ''
  while (i < raw.length) {
    const c = raw[i]!
    if (c === '\\' && i + 1 < raw.length) {
      out += c + raw[i + 1]!
      i += 2
      continue
    }
    if (c === '"') {
      const after = raw.slice(i + 1)
      if (/^\s*[,}\]]/.test(after)) return unescapeJsonString(out).trim()
      out += c
      i += 1
      continue
    }
    out += c
    i += 1
  }
  return unescapeJsonString(out).trim()
}

function extractLooseJsonStringFromMemorySummary(raw: string): string {
  const idx = raw.search(/"memory_summary"\s*:|"memorySummary"\s*:/i)
  if (idx < 0) return ''
  return extractLooseJsonString(raw.slice(idx), 'content')
}

export function parseDiaryAiModelText(raw: string, opts?: { allowFontStyle?: boolean }): DiaryAiResult {
  const allowFont = opts?.allowFontStyle !== false

  const tagged = parseDiaryTaggedFormat(raw)
  if (tagged) {
    if (!allowFont) delete tagged.font_style
    return tagged
  }

  const legacy = parseDiaryJsonLegacy(raw)
  if (legacy) {
    if (!allowFont) delete legacy.font_style
    return legacy
  }

  throw new DiaryAiParseError(
    '日记解析失败：模型未按约定标签格式输出。请重试；若反复出现可换模型或稍缩短上下文。',
  )
}

export function formatDiaryGenerateError(err: unknown): string {
  if (err instanceof DiaryAiParseError) return err.message
  if (err instanceof Error) {
    if (/JSON|Unterminated string|Unexpected token|Unrecognized token|解析失败/i.test(err.message)) {
      return '日记解析失败：模型输出格式不对（请确认以 <<<DIARY>>> 开头）。请重试一次。'
    }
    return err.message
  }
  return '生成失败'
}

/** 提示词里贴给模型的格式说明（主格式，非 JSON） */
export function buildDiaryOutputFormatSpec(params: {
  needsFontBinding: boolean
  contentMin: number
  contentMax: number
}): string {
  const fontLine = params.needsFontBinding
    ? `笔迹：neat`
    : `（已绑定笔迹，不要输出「笔迹」行）`

  return `
【输出格式·硬｜不要 JSON｜不要 Markdown 代码块｜不要前言后语】
只输出下面标签块，从 <<<DIARY>>> 起、到 <<<END>>> 止。正文里可用中文引号「」、任意换行，**禁止**英文双引号 "。

<<<DIARY>>>
标题：符合你性格的极简日记标题
时间：须含公历年份（如：2026年7月2日 傍晚）
${params.needsFontBinding ? `${fontLine}\n` : ''}正文：
第一段……

第二段……（共 ${params.contentMin}-${params.contentMax} 字；段与段之间空一行）
<<<SUMMARY>>>
摘要标题：4～10字检索标题
关键词：词1、词2、词3
摘要：
第三人称备忘 60～200 字（{{char}}＝写日记者，{{user}}＝玩家；禁止第一人称「我」；禁止抄写日记正文）
<<<END>>>
`.trim()
}
