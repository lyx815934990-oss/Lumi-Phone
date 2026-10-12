import type { WorldBookPriority } from './types'

export type WorldBookOptimizeOp =
  | { op: 'update_book'; wbId: string; name?: string; enabled?: boolean }
  | { op: 'delete_book'; wbId: string }
  | {
      op: 'add_book'
      name: string
      enabled?: boolean
      items?: Array<{
        name: string
        keywords?: string
        content: string
        priority?: WorldBookPriority
        enabled?: boolean
      }>
    }
  | {
      op: 'update_item'
      wbId: string
      itemId: string
      name?: string
      keywords?: string
      content?: string
      priority?: WorldBookPriority
      enabled?: boolean
    }
  | { op: 'delete_item'; wbId: string; itemId: string }
  | {
      op: 'add_item'
      wbId: string
      name: string
      keywords?: string
      content: string
      priority?: WorldBookPriority
      enabled?: boolean
    }

export class WorldBookOptimizeParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorldBookOptimizeParseError'
  }
}

function stripFence(s: string): string {
  const t = String(s ?? '').trim()
  const fence = t.match(/```(?:(?:json|text|wb|worldbook)?)\s*([\s\S]*?)```/i)
  if (fence?.[1]) return fence[1].trim()
  return t
    .replace(/^```(?:json|text|wb|worldbook)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function asPriority(v: string): WorldBookPriority | undefined {
  const t = v.trim().toLowerCase()
  if (t === 'before' || t === '序言' || t === 'before_chat') return 'before'
  if (t === 'after' || t === '尾声' || t === 'after_chat') return 'after'
  if (/序言|开场|before/.test(t)) return 'before'
  if (/尾声|after/.test(t)) return 'after'
  return undefined
}

function asBool(v: string): boolean | undefined {
  const t = v.trim().toLowerCase()
  if (!t) return undefined
  if (/^(true|1|是|开|启用|开启|yes|y)$/i.test(t)) return true
  if (/^(false|0|否|关|禁用|关闭|no|n)$/i.test(t)) return false
  return undefined
}

function takeLineValue(block: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:：]\\s*(.+)`, 'i')
    const m = block.match(re)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return ''
}

/** 取「正文：」到块尾（或下一字段标签）的多行内容 */
function takeContentBody(block: string): string {
  const startRe = /(?:^|\n)\s*(?:正文|content)\s*[:：]\s*\n?/i
  const m = block.match(startRe)
  if (!m || m.index == null) return ''
  let rest = block.slice(m.index + m[0].length)
  // 正文后一般不再跟其它字段；若模型又写了字段名则截断
  const stopRe = /\n\s*(?:名称|关键词|时机|启用|书id|条目id|书名|操作|op|name|keywords|priority|enabled|wbId|itemId)\s*[:：]/i
  const stop = rest.search(stopRe)
  if (stop >= 0) rest = rest.slice(0, stop)
  return rest.replace(/^\n+/, '').replace(/\n+$/, '').trim()
}

function normalizeOpName(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/[\s_-]+/g, '_')
  const map: Record<string, string> = {
    update_book: 'update_book',
    改卷: 'update_book',
    更新书: 'update_book',
    更新卷: 'update_book',
    delete_book: 'delete_book',
    删卷: 'delete_book',
    删除书: 'delete_book',
    删除卷: 'delete_book',
    add_book: 'add_book',
    新卷: 'add_book',
    加卷: 'add_book',
    新增书: 'add_book',
    新增卷: 'add_book',
    update_item: 'update_item',
    改条: 'update_item',
    更新条目: 'update_item',
    修改条目: 'update_item',
    delete_item: 'delete_item',
    删条: 'delete_item',
    删除条目: 'delete_item',
    add_item: 'add_item',
    加条: 'add_item',
    新增条目: 'add_item',
    添加条目: 'add_item',
  }
  if (map[t]) return map[t]
  if (map[raw.trim()]) return map[raw.trim()]
  return t
}

type DraftItem = {
  name: string
  keywords?: string
  content: string
  priority?: WorldBookPriority
  enabled?: boolean
}

function parseItemBlock(block: string): DraftItem | null {
  const name = takeLineValue(block, ['名称', 'name', '标题']) || '新法则'
  const keywords = takeLineValue(block, ['关键词', 'keywords', '关键字'])
  const priority = asPriority(takeLineValue(block, ['时机', 'priority', '优先级']))
  const enabled = asBool(takeLineValue(block, ['启用', 'enabled', '开关']))
  const content = takeContentBody(block)
  if (!content.trim() && !takeLineValue(block, ['名称', 'name'])) return null
  return {
    name,
    keywords: keywords || '',
    content,
    priority: priority ?? 'before',
    enabled: enabled ?? true,
  }
}

function parseOpBlock(block: string): WorldBookOptimizeOp | null {
  const opRaw = takeLineValue(block, ['操作', 'op', '类型'])
  const op = normalizeOpName(opRaw)
  if (!op) return null

  if (op === 'update_book') {
    const wbId = takeLineValue(block, ['书id', 'wbId', '卷id', '世界书id'])
    if (!wbId) return null
    const name = takeLineValue(block, ['书名', '名称', 'name'])
    const enabled = asBool(takeLineValue(block, ['启用', 'enabled', '开关']))
    return {
      op: 'update_book',
      wbId,
      ...(name ? { name } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    }
  }

  if (op === 'delete_book') {
    const wbId = takeLineValue(block, ['书id', 'wbId', '卷id', '世界书id'])
    if (!wbId) return null
    return { op: 'delete_book', wbId }
  }

  if (op === 'delete_item') {
    const wbId = takeLineValue(block, ['书id', 'wbId', '卷id', '世界书id'])
    const itemId = takeLineValue(block, ['条目id', 'itemId', '法则id'])
    if (!wbId || !itemId) return null
    return { op: 'delete_item', wbId, itemId }
  }

  if (op === 'add_item') {
    const wbId = takeLineValue(block, ['书id', 'wbId', '卷id', '世界书id'])
    if (!wbId) return null
    const name = takeLineValue(block, ['名称', 'name', '标题']) || '新法则'
    const keywords = takeLineValue(block, ['关键词', 'keywords', '关键字'])
    const priority = asPriority(takeLineValue(block, ['时机', 'priority', '优先级']))
    const enabled = asBool(takeLineValue(block, ['启用', 'enabled', '开关']))
    const content = takeContentBody(block)
    return {
      op: 'add_item',
      wbId,
      name,
      keywords: keywords || '',
      content,
      priority: priority ?? 'before',
      enabled: enabled ?? true,
    }
  }

  if (op === 'update_item') {
    const wbId = takeLineValue(block, ['书id', 'wbId', '卷id', '世界书id'])
    const itemId = takeLineValue(block, ['条目id', 'itemId', '法则id'])
    if (!wbId || !itemId) return null
    const name = takeLineValue(block, ['名称', 'name', '标题'])
    const keywordsLine = takeLineValue(block, ['关键词', 'keywords', '关键字'])
    const hasKeywords = /(?:^|\n)\s*(?:关键词|keywords|关键字)\s*[:：]/i.test(block)
    const priority = asPriority(takeLineValue(block, ['时机', 'priority', '优先级']))
    const enabled = asBool(takeLineValue(block, ['启用', 'enabled', '开关']))
    const hasContent = /(?:^|\n)\s*(?:正文|content)\s*[:：]/i.test(block)
    const content = hasContent ? takeContentBody(block) : undefined
    return {
      op: 'update_item',
      wbId,
      itemId,
      ...(name ? { name } : {}),
      ...(hasKeywords ? { keywords: keywordsLine } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(priority ? { priority } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    }
  }

  if (op === 'add_book') {
    const name = takeLineValue(block, ['书名', '名称', 'name', '卷名']) || '未命名世界书'
    const enabled = asBool(takeLineValue(block, ['启用', 'enabled', '开关']))
    const items: DraftItem[] = []
    // 嵌套 <<<ITEM>>> … 直到本 OP 结束
    const itemParts = block.split(/<<<\s*ITEM\s*>>>/i).slice(1)
    if (itemParts.length) {
      for (const part of itemParts) {
        const chunk = part.split(/<<<\s*(?:ITEM|OP|END)\s*>>>/i)[0] ?? part
        const it = parseItemBlock(chunk)
        if (it) items.push(it)
      }
    } else {
      // 无 ITEM 分隔时：若本块自带正文，当作单条
      const solo = parseItemBlock(block)
      if (solo && solo.content.trim()) items.push(solo)
    }
    return {
      op: 'add_book',
      name,
      enabled: enabled ?? true,
      items,
    }
  }

  return null
}

/**
 * 主格式：标签分隔纯文本（正文可含任意引号/换行，无需转义）
 *
 * <<<WB_OPT>>>
 * 摘要：…
 * <<<OP>>>
 * 操作：update_item
 * 书id：…
 * 条目id：…
 * 正文：
 * …
 * <<<OP>>>
 * …
 * <<<END>>>
 */
export function parseWorldBookOptimizeTaggedText(raw: string): {
  summary: string
  ops: WorldBookOptimizeOp[]
} {
  const t = stripFence(raw).replace(/\r\n/g, '\n')
  if (!t.trim()) {
    throw new WorldBookOptimizeParseError('模型返回为空')
  }

  let body = t
  const start = body.search(/<<<\s*WB_OPT\s*>>>/i)
  if (start >= 0) body = body.slice(start)
  const end = body.search(/<<<\s*END\s*>>>/i)
  if (end >= 0) body = body.slice(0, end)

  const summary =
    takeLineValue(body, ['摘要', 'summary', '说明']) ||
    takeLineValue(t, ['摘要', 'summary', '说明']) ||
    ''

  const opChunks = body.split(/<<<\s*OP\s*>>>/i).slice(1)
  const ops: WorldBookOptimizeOp[] = []
  for (const chunk of opChunks) {
    const block = chunk.split(/<<<\s*(?:OP|END|WB_OPT)\s*>>>/i)[0] ?? chunk
    const op = parseOpBlock(block)
    if (op) ops.push(op)
  }

  if (!ops.length) {
    // 兼容：全文只有一个操作块、未写 <<<OP>>>
    const fallback = parseOpBlock(body)
    if (fallback) ops.push(fallback)
  }

  if (!ops.length) {
    throw new WorldBookOptimizeParseError(
      '未能解析出任何操作块。请确认输出含 <<<WB_OPT>>>、至少一个 <<<OP>>>，并以 <<<END>>> 结束。',
    )
  }

  return { summary: summary.trim() || '已按要求优化世界书', ops }
}

/** 给模型的输出格式说明（禁止 JSON） */
export function buildWorldBookOptimizeOutputFormatSpec(): string {
  return `
【输出格式 · 标签纯文本（禁止 JSON）】
只输出下面结构，不要 markdown 代码围栏，不要 JSON，不要前言后记。
正文里可用「」与任意换行，**无需转义**。

<<<WB_OPT>>>
摘要：一两句中文，说明本次实际改动
<<<OP>>>
操作：update_item
书id：快照里的真实书id
条目id：快照里的真实条目id
名称：（可选）新标题
关键词：（可选）
时机：before 或 after
启用：是 或 否
正文：
这里写完整新正文（若改正文必须给全文，不是差量补丁）
<<<OP>>>
操作：add_item
书id：已有书id
名称：新法则名
关键词：
时机：before
启用：是
正文：
完整正文
<<<OP>>>
操作：add_book
书名：新卷名
启用：是
<<<ITEM>>>
名称：条目名
关键词：
时机：before
启用：是
正文：
完整正文
<<<ITEM>>>
名称：另一条
正文：
……
<<<OP>>>
操作：update_book
书id：…
书名：（可选）
启用：（可选）是/否
<<<OP>>>
操作：delete_book
书id：…
<<<OP>>>
操作：delete_item
书id：…
条目id：…
<<<END>>>

操作名也可用中文：改条 / 加条 / 删条 / 新卷 / 改卷 / 删卷（与 update_item / add_item / delete_item / add_book / update_book / delete_book 等价）。
`.trim()
}
