/**
 * 查手机 · 备忘录 AI 标记块解析（替代易截断的 JSON）
 */

import type { MemoBlock, MemoTextModifier, PaperStyle, PrivateMemo } from './memoTypes'

export type NotesSyncResult = {
  add: PrivateMemo[]
  update: PrivateMemo[]
  deleteIds: string[]
}

const TEXT_MODS: MemoTextModifier[] = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'highlight-yellow',
  'highlight-blue',
  'highlight-pink',
]

function fieldMap(block: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([^：:]{1,24})\s*[：:]\s*(.*)$/)
    if (!m) continue
    const key = m[1]!.trim()
    // 正文/标题等可多行重复，不进 map
    if (/^(正文|标题行|小标题|语音|文件|图片|h1|h2)$/i.test(key)) continue
    map[key] = m[2]!.trim()
  }
  return map
}

function pick(map: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (map[k]?.trim()) return map[k]!.trim()
  }
  return ''
}

function extractBlocks(raw: string, start: string, end: string): string[] {
  const out: string[] = []
  const re = new RegExp(`${start}([\\s\\S]*?)${end}`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) out.push(m[1] || '')
  return out
}

function sanitizeColor(v: string): string | undefined {
  const c = v.trim()
  if (!c) return undefined
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c)) return c
  if (/^rgb(a)?\(\s*[\d.\s,%]+\)$/.test(c)) return c
  if (/^[a-zA-Z]+$/.test(c)) return c
  return undefined
}

function parseModifiers(raw: string): MemoTextModifier[] | undefined {
  const parts = raw
    .split(/[,，|/]/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
  const mods = parts.filter((p): p is MemoTextModifier => (TEXT_MODS as string[]).includes(p))
  return mods.length ? mods : undefined
}

function parsePaperStyle(raw: string): PaperStyle {
  const s = raw.trim().toLowerCase()
  if (s === 'lined' || s === '横线' || s === 'lined纸') return 'lined'
  if (s === 'grid' || s === '方格' || s === '格子') return 'grid'
  return 'solid'
}

function parseBlocks(block: string): MemoBlock[] {
  const out: MemoBlock[] = []
  for (const line of block.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    const h1 = t.match(/^(?:h1|标题行)\s*[：:]\s*(.+)$/i)
    if (h1) {
      out.push({ type: 'h1', content: h1[1]!.trim() })
      continue
    }
    const h2 = t.match(/^(?:h2|小标题)\s*[：:]\s*(.+)$/i)
    if (h2) {
      out.push({ type: 'h2', content: h2[1]!.trim() })
      continue
    }
    // 正文：内容
    // 正文：内容|bold,italic|#D946EF
    const text = t.match(/^正文\s*[：:]\s*(.+)$/)
    if (text) {
      const body = text[1]!.trim()
      const parts = body.split('|').map((x) => x.trim())
      const content = parts[0] || ''
      if (!content) continue
      const mods = parts[1] ? parseModifiers(parts[1]) : undefined
      const color = parts[2] ? sanitizeColor(parts[2]) : undefined
      out.push({
        type: 'text',
        content,
        ...(mods ? { modifiers: mods } : {}),
        ...(color ? { color } : {}),
      })
      continue
    }
    // 语音：00:12|转写
    const voice = t.match(/^语音\s*[：:]\s*(.+?)\s*[|｜]\s*(.+)$/)
    if (voice) {
      out.push({ type: 'voice', duration: voice[1]!.trim() || '00:08', transcript: voice[2]!.trim() })
      continue
    }
    // 文件：pdf|报告.pdf|2.4 MB
    const file = t.match(/^文件\s*[：:]\s*(.+?)\s*[|｜]\s*(.+?)\s*[|｜]\s*(.+)$/)
    if (file) {
      const ftRaw = file[1]!.trim().toLowerCase()
      const fileType =
        ftRaw === 'pdf' || ftRaw === 'doc' || ftRaw === 'docx' || ftRaw === 'txt' ? ftRaw : 'other'
      out.push({
        type: 'file',
        fileType,
        fileName: file[2]!.trim() || '附件.txt',
        size: file[3]!.trim() || '1 MB',
      })
      continue
    }
    // 图片：url|说明
    const image = t.match(/^图片\s*[：:]\s*(.+?)(?:\s*[|｜]\s*(.+))?$/)
    if (image) {
      const url = image[1]!.trim()
      if (/^https?:\/\//i.test(url)) {
        out.push({ type: 'image', url, caption: image[2]?.trim() || undefined })
      }
      continue
    }
  }
  return out
}

function withFallbackTextColor(blocks: MemoBlock[], seed: number): MemoBlock[] {
  const palette = ['#D946EF', '#2563EB', '#DC2626', '#0F766E']
  const cloned = blocks.map((b) => ({ ...b })) as MemoBlock[]
  const textIndexes: number[] = []
  let hasColoredText = false
  for (let i = 0; i < cloned.length; i += 1) {
    const b = cloned[i]
    if (!b || b.type !== 'text') continue
    textIndexes.push(i)
    if (b.color) hasColoredText = true
  }
  if (!hasColoredText && textIndexes.length > 0) {
    const pickTextIdx = textIndexes[Math.abs(seed) % textIndexes.length]!
    const target = cloned[pickTextIdx]
    if (target && target.type === 'text') {
      target.color = palette[Math.abs(seed) % palette.length]!
    }
  }
  return cloned
}

function fallbackDate(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())} ${now.getHours() >= 12 ? 'PM' : 'AM'}`
}

function parseMemo(block: string, index: number): PrivateMemo | null {
  const map = fieldMap(block)
  const title = pick(map, '标题', 'title')
  const blocks = withFallbackTextColor(parseBlocks(block), index)
  if (!title && blocks.length < 2) return null
  const textCount = blocks.filter((b) => b.type === 'text').length
  const ensured =
    textCount > 0
      ? blocks
      : ([...blocks, { type: 'text' as const, content: '……先记一笔，晚点再补。' }] as MemoBlock[])
  // 不足 4 块时补短正文，满足阅读密度
  while (ensured.length < 4) {
    ensured.push({ type: 'text', content: '（随手补了两句，怕自己忘。）' })
  }
  return {
    id: pick(map, 'id', 'ID') || `m_${Date.now()}_${index}`,
    title: title || `未命名备忘录 ${index + 1}`,
    date: pick(map, '日期', '时间', 'date') || fallbackDate(),
    paperStyle: parsePaperStyle(pick(map, '纸张', 'paperStyle') || 'solid'),
    paperColor: pick(map, '底色', 'paperColor') || '#FAFAFA',
    blocks: withFallbackTextColor(ensured, index),
  }
}

export const NOTES_MARKUP_FORMAT = `
【输出格式 · 硬性】
- 禁止 JSON、禁止 markdown 代码围栏、禁止前后解释。
- 只输出标记块；每行「字段名：值」。
- 新增用 <<NM_ADD>>，更新用 <<NM_UPDATE>>（须带已有 id），删除用 <<NM_DELETE>>（可 0~2 个 id）。
- 每条备忘录至少 4 行内容块，且至少 1 行「正文：」；可穿插 h1/小标题/语音/文件/图片。
- 正文可带样式：正文：内容|bold,italic|#D946EF（样式与颜色可选）。
- 至少 1 段正文带颜色（#D946EF / #2563EB / #DC2626 / #0F766E 等）。

<<NM_ADD>>
id：m_new1
标题：今晚不想睡
日期：2026-08-14 01:12 AM
纸张：lined
底色：#FAFAFA
h1：记一笔
正文：聊完又开始胡想
正文：明明说好早点睡|bold|#D946EF
正文：算了，先把心情写下来
语音：00:09|其实有点想见你
<<END_NM_ADD>>

<<NM_UPDATE>>
id：m_old1
标题：改过标题的旧笔记
日期：2026-08-10 09:20 PM
纸张：solid
底色：#FFF8F0
正文：补了两句，怕自己忘
正文：别再嘴硬了|#0F766E
小标题：待办
正文：周末把那家店再去一次
<<END_NM_UPDATE>>

<<NM_DELETE>>
id：m_trash1
<<END_NM_DELETE>>
`.trim()

export function parseNotesMarkup(raw: string): NotesSyncResult | null {
  if (!raw?.trim()) return null
  const text = raw.replace(/```/g, '')
  const add = extractBlocks(text, '<<NM_ADD>>', '<<END_NM_ADD>>')
    .map((b, i) => parseMemo(b, i))
    .filter((x): x is PrivateMemo => !!x)
  const update = extractBlocks(text, '<<NM_UPDATE>>', '<<END_NM_UPDATE>>')
    .map((b, i) => parseMemo(b, i + 40))
    .filter((x): x is PrivateMemo => !!x)
  const deleteIds: string[] = []
  for (const block of extractBlocks(text, '<<NM_DELETE>>', '<<END_NM_DELETE>>')) {
    for (const line of block.split(/\r?\n/)) {
      const m = line.match(/^(?:id|ID|删除)\s*[：:]\s*(.+)$/)
      if (!m) continue
      const id = m[1]!.trim()
      if (id) deleteIds.push(id)
    }
  }
  if (add.length < 1 && update.length < 1) return null
  return {
    add,
    update,
    deleteIds: [...new Set(deleteIds)].slice(0, 2),
  }
}

export function isNotesSyncReady(result: NotesSyncResult | null, expectCount: number): boolean {
  if (!result) return false
  const n = result.add.length + result.update.length
  return n >= Math.max(1, Math.min(expectCount, 2))
}
