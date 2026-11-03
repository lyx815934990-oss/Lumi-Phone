/**
 * 每轮可见回复气泡条数范围（聊天设置 · 回复 tab）。
 * 仅当 `replyBubbleCountEnabled` 开启时注入硬性范围；关闭则由模型自行判断条数。
 */

/** 下限至少 1；最多条数不设产品封顶 */
export const REPLY_BUBBLE_COUNT_FLOOR = 1
/** 开启后若尚未填写时的预填（与文风软引导同量级） */
export const REPLY_BUBBLE_DEFAULT_COUNT_MIN = 6
export const REPLY_BUBBLE_DEFAULT_COUNT_MAX = 12

export type ReplyBubbleCountRange = { min: number; max: number }

export function clampReplyBubbleCount(n: number): number {
  if (!Number.isFinite(n)) return REPLY_BUBBLE_DEFAULT_COUNT_MIN
  return Math.max(REPLY_BUBBLE_COUNT_FLOOR, Math.floor(n))
}

export function parseStoredReplyBubbleCountRange(
  minRaw?: unknown,
  maxRaw?: unknown,
): ReplyBubbleCountRange {
  const hasMin = typeof minRaw === 'number' && Number.isFinite(minRaw)
  const hasMax = typeof maxRaw === 'number' && Number.isFinite(maxRaw)
  let min = hasMin ? clampReplyBubbleCount(minRaw as number) : REPLY_BUBBLE_DEFAULT_COUNT_MIN
  let max = hasMax ? clampReplyBubbleCount(maxRaw as number) : REPLY_BUBBLE_DEFAULT_COUNT_MAX
  if (min > max) {
    const t = min
    min = max
    max = t
  }
  return { min, max }
}

export function isReplyBubbleCountEnabled(enabledRaw: unknown): boolean {
  return enabledRaw === true
}

export function formatReplyBubbleCountRangeLabel(range: ReplyBubbleCountRange): string {
  return range.min === range.max ? `${range.min}` : `${range.min}～${range.max}`
}

/**
 * 本会话开启了条数限制时注入；压过文风里「日常约 6～12」等软引导。
 * 条数指用户可见文字/语音等气泡行（不含 `[译]` / `[内心OS]` / 动描旁白）。
 */
export function buildReplyBubbleCountAppendix(range: ReplyBubbleCountRange): string {
  const label = formatReplyBubbleCountRangeLabel(range)
  const countRule =
    range.min === range.max
      ? `本轮用户可见气泡须 **恰好 ${range.min} 条**（硬性；少于此数不合格，多于则拆并到此数）。`
      : `本轮用户可见气泡须 **${range.min}～${range.max} 条**（硬性：至少 ${range.min}、至多 ${range.max}；少于此数不合格）。`
  return `【每轮回复条数 · 本会话已开启限制 · 最高优先·压过文风软引导】
- ${countRule}
- 「一条」= 一个 \`<msg>…</msg>\` 或旧写法下一行独立可见气泡（文字/语音/表情包/发图等协议行均计）。
- **不计入**：\`[译]\`/\`<tr>\`、\`[内心OS]\`、\`【动描】\`、心语 XML、纯指令行（如仅 \`撤回\`）。
- 禁止为凑条数连环损/空回；禁止为压条数把整轮糊成 1～2 条长文（除非本范围允许）。
- 文风或 CoT 里若仍写「日常约 6～12」「3～6 行」等，**以本段范围 ${label} 为准**。`
}
