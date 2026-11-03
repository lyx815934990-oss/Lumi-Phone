/**
 * 线上私聊：薄标签壳（msg / tr / wechat_reply）→ 展成换行协议，供现有气泡解析器消费。
 * 主推英文 XML；兼容【】、别名、漏闭合、全角尖括号。无标签时原样返回。
 */

export type WechatTaggedLineKind = 'msg' | 'tr'

const MSG_ALIASES = ['msg', 'bubble', 'message', '气泡', '正文气泡'] as const
const TR_ALIASES = ['tr', 'translate', 'translation', '译', '翻译'] as const
const SHELL_ALIASES = ['wechat_reply', 'wechat', 'reply', '微信回复', '私聊回复'] as const

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function alt(names: readonly string[]): string {
  return names.map(escapeRegExp).join('|')
}

/** 全角尖括号 → 半角 */
export function normalizeWechatTagAngles(s: string): string {
  return String(s ?? '')
    .replace(/\uFF1C/g, '<')
    .replace(/\uFF1E/g, '>')
    .replace(/＜/g, '<')
    .replace(/＞/g, '>')
}

type OpenHit = { kind: WechatTaggedLineKind; start: number; end: number }

function findNextMsgOrTr(text: string, from: number): OpenHit | null {
  let best: OpenHit | null = null
  const kinds: Array<{ kind: WechatTaggedLineKind; names: string }> = [
    { kind: 'msg', names: alt(MSG_ALIASES) },
    { kind: 'tr', names: alt(TR_ALIASES) },
  ]
  for (const { kind, names } of kinds) {
    const xml = new RegExp(`<\\s*(?:${names})\\b[^>]*>`, 'iu')
    const bracket = new RegExp(`【\\s*(?:${names})\\s*】`, 'iu')
    for (const re of [xml, bracket]) {
      const slice = text.slice(from)
      const m = slice.match(re)
      if (!m || m.index === undefined) continue
      const start = from + m.index
      const end = start + m[0].length
      if (!best || start < best.start) best = { kind, start, end }
    }
  }
  return best
}

function findCloseEnd(
  text: string,
  kind: WechatTaggedLineKind,
  bodyStart: number,
): { bodyEnd: number; closeEnd: number } {
  const names = kind === 'msg' ? alt(MSG_ALIASES) : alt(TR_ALIASES)
  const closers = [
    new RegExp(`<\\s*/\\s*(?:${names})\\s*>`, 'iu'),
    new RegExp(`【\\s*/\\s*(?:${names})\\s*】`, 'iu'),
    new RegExp(`【\\s*(?:${names})\\s*结束\\s*】`, 'iu'),
  ]
  let earliest: { bodyEnd: number; closeEnd: number } | null = null
  for (const re of closers) {
    const slice = text.slice(bodyStart)
    const m = slice.match(re)
    if (!m || m.index === undefined) continue
    const bodyEnd = bodyStart + m.index
    const closeEnd = bodyEnd + m[0].length
    if (!earliest || bodyEnd < earliest.bodyEnd) earliest = { bodyEnd, closeEnd }
  }
  if (earliest) return earliest
  const next = findNextMsgOrTr(text, bodyStart)
  if (next) return { bodyEnd: next.start, closeEnd: next.start }
  return { bodyEnd: text.length, closeEnd: text.length }
}

/** 若有外层 wechat_reply 壳，只取壳内；否则整段 */
export function peelWechatReplyShell(raw: string): string {
  const text = normalizeWechatTagAngles(String(raw ?? '')).trim()
  if (!text) return ''
  const names = alt(SHELL_ALIASES)
  const openXml = new RegExp(`<\\s*(?:${names})\\b[^>]*>`, 'iu')
  const openBr = new RegExp(`【\\s*(?:${names})\\s*】`, 'iu')
  let open: RegExpMatchArray | null = null
  let openEnd = 0
  for (const re of [openXml, openBr]) {
    const m = text.match(re)
    if (m && m.index !== undefined && (!open || m.index < (open.index ?? Infinity))) {
      open = m
      openEnd = m.index + m[0].length
    }
  }
  if (!open || open.index === undefined) return text

  const closers = [
    new RegExp(`<\\s*/\\s*(?:${names})\\s*>`, 'iu'),
    new RegExp(`【\\s*/\\s*(?:${names})\\s*】`, 'iu'),
    new RegExp(`【\\s*(?:${names})\\s*结束\\s*】`, 'iu'),
  ]
  let bodyEnd = text.length
  for (const re of closers) {
    const slice = text.slice(openEnd)
    const m = slice.match(re)
    if (m && m.index !== undefined) {
      const end = openEnd + m.index
      if (end < bodyEnd) bodyEnd = end
    }
  }
  return text.slice(openEnd, bodyEnd).trim()
}

/**
 * 将 `<msg>` / `<tr>` 展成换行协议文本。
 * - 无 msg/tr 开标签：原样返回（兼容旧换行协议）
 * - 有标签：标签外间隙行保留；msg→正文行；tr→`[译]…`
 */
export function expandWechatTaggedReplyToPlain(raw: string): {
  text: string
  /** 是否命中过 msg/tr 标签 */
  hadTags: boolean
} {
  const peeled = peelWechatReplyShell(raw)
  const text = normalizeWechatTagAngles(peeled)
  if (!text.trim()) return { text: '', hadTags: false }

  const first = findNextMsgOrTr(text, 0)
  if (!first) return { text: text.trim(), hadTags: false }

  const lines: string[] = []
  let cursor = 0
  let hadTags = false

  while (cursor < text.length) {
    const open = findNextMsgOrTr(text, cursor)
    if (!open) {
      const tail = text.slice(cursor).trim()
      if (tail) {
        for (const ln of tail.split(/\r?\n/)) {
          const t = ln.trim()
          if (t) lines.push(t)
        }
      }
      break
    }
    const before = text.slice(cursor, open.start).trim()
    if (before) {
      for (const ln of before.split(/\r?\n/)) {
        const t = ln.trim()
        if (t) lines.push(t)
      }
    }
    hadTags = true
    const { bodyEnd, closeEnd } = findCloseEnd(text, open.kind, open.end)
    const inner = text.slice(open.end, bodyEnd).trim()
    if (open.kind === 'msg') {
      if (inner) {
        // 一个 <msg> = 一条气泡。模型常在 msg 内软换行（日文断句/「笑」另起一行），
        // 若按换行拆条会导致：多碎片气泡 + 后面的 <tr> 只挂到最后一片 → 译文错绑/重复。
        // 多气泡请用多个 <msg>；此处只把内部空白压成空格，保持单行协议供下游解析。
        const one = inner.replace(/\s*\n\s*/g, ' ').replace(/[ \t\u3000]{2,}/g, ' ').trim()
        if (one) lines.push(one)
      }
    } else if (inner) {
      // 译文压成单行；剥掉 tr 内误写的 [译]/【译】，避免变成 `[译][译]…` 落库露协议
      const one = inner
        .replace(/\s*\n\s*/g, ' ')
        .replace(/^(?:\[译\]|【译】|\[翻译\]|【翻译】)\s*/u, '')
        .replace(/^(?:\[译\]|【译】|\[翻译\]|【翻译】)\s*/u, '')
        .trim()
      if (one) lines.push(`[译]${one}`)
    }
    cursor = Math.max(closeEnd, open.end)
    if (cursor <= open.start) cursor = open.end + 1
  }

  return { text: lines.join('\n').trim(), hadTags }
}

/** 提示词附录：标签块硬格式（短） */
export function buildWechatTaggedBlocksOutputAppendix(opts?: {
  syncTranslation?: boolean
}): string {
  const syncOn = opts?.syncTranslation === true
  const lines = [
    `【硬性输出格式·标签块 · 最高优先】`,
    `客户端按标签切分气泡；**可见对白写在 msg 内**，禁止把翻译讲义 / 拆解 / 多版本译法写成普通气泡。`,
    `- 每条可见气泡：\`<msg>…</msg>\`（**一条气泡一个 msg**；禁止把多条挤进同一个 msg；msg 内软换行会被客户端压成同一条气泡）`,
  ]
  if (syncOn) {
    lines.push(
      `- 同步翻译：每个文字 msg 后紧跟 \`<tr>该整条 msg 的忠实译文</tr>\`（或旧写法单独一行 \`[译]…\`）；**tr 内只写译文正文，禁止再写 \`[译]\`/\`【译】\` 字样**；**只能一句译文**，禁止「自然口语版 / 拆解参考 / 几种译法 / 强调突然感」等讲义`,
    )
  } else {
    lines.push(`- **禁止**输出 \`<tr>\` / \`[译]\`（本轮未开同步翻译，或译文由客户端副接口生成）`)
  }
  lines.push(
    `- 表情包：单独整行 \`表情包 引用名\`（半角空格）；**禁止** \`[表情包]捂脸/害羞\` 这类方括号写法`,
    `- 动描 / 内心 OS / 指令行仍用原协议：\`【动描】…\`、\`[内心OS]…\`、\`红包\`/\`引用 wxm-…\` 等，写在 msg 外单独成行`,
    `兼容：也接受 \`【气泡】…【/气泡】\`、\`【译】…\`、外层 \`<wechat_reply>…</wechat_reply>\`；无标签的纯换行旧稿仍可解析。`,
  )
  return lines.join('\n')
}
