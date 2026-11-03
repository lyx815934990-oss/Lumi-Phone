/**
 * 线上动描模式：微信气泡间穿插居中旁白（描写 char 手机侧线下动作），
 * 与对白一起按队列逐条弹出。
 */

export const ONLINE_ACTION_NARRATION_PREFIX = '【动描】'

/** 每轮动描条数硬上下限 */
export const ONLINE_ACTION_NARRATION_COUNT_LIMIT_MIN = 1
export const ONLINE_ACTION_NARRATION_COUNT_LIMIT_MAX = 8
/** 未自定义时默认范围 */
export const ONLINE_ACTION_NARRATION_DEFAULT_COUNT_MIN = 2
export const ONLINE_ACTION_NARRATION_DEFAULT_COUNT_MAX = 4

export type OnlineActionNarrationCountRange = { min: number; max: number }

export function clampOnlineActionNarrationCount(n: number): number {
  if (!Number.isFinite(n)) return ONLINE_ACTION_NARRATION_DEFAULT_COUNT_MIN
  return Math.max(
    ONLINE_ACTION_NARRATION_COUNT_LIMIT_MIN,
    Math.min(ONLINE_ACTION_NARRATION_COUNT_LIMIT_MAX, Math.floor(n)),
  )
}

export function parseStoredOnlineActionNarrationCountRange(
  minRaw?: unknown,
  maxRaw?: unknown,
): OnlineActionNarrationCountRange {
  const hasMin = typeof minRaw === 'number' && Number.isFinite(minRaw)
  const hasMax = typeof maxRaw === 'number' && Number.isFinite(maxRaw)
  let min = hasMin ? clampOnlineActionNarrationCount(minRaw as number) : ONLINE_ACTION_NARRATION_DEFAULT_COUNT_MIN
  let max = hasMax ? clampOnlineActionNarrationCount(maxRaw as number) : ONLINE_ACTION_NARRATION_DEFAULT_COUNT_MAX
  if (min > max) {
    const t = min
    min = max
    max = t
  }
  return { min, max }
}

export function isOnlineActionNarrationCountRangeCustomized(minRaw: unknown, maxRaw: unknown): boolean {
  return (
    (typeof minRaw === 'number' && Number.isFinite(minRaw)) ||
    (typeof maxRaw === 'number' && Number.isFinite(maxRaw))
  )
}

export function formatOnlineActionNarrationCountRangeLabel(range: OnlineActionNarrationCountRange): string {
  return range.min === range.max ? `${range.min}` : `${range.min}～${range.max}`
}

/**
 * 合法输出：`【动描】正文`
 * 另识别模型照抄上下文时的泄漏标签（须当旁白解析/丢弃，勿当气泡展示）：
 * `【动描·角色自知·用户未被告知】` / `[动描·…]` / `[私聊・旁白·角色自知]` 等。
 */
const ONLINE_ACTION_NARRATION_LINE_RE =
  /^(?:【动描(?:[·・][^】]*)?】|\[动描(?:[·・\s][^\]]*)?\]|\[私聊\s*[·・]\s*旁白(?:\s*[·・]\s*[^\]]*)?\])\s*(.*)$/u

/** 识别模型输出的动描行；返回旁白正文（不含前缀）。仅标签无正文时返回 ""（仍算动描行）。 */
export function parseOnlineActionNarrationLine(line: string): string | null {
  const t = String(line ?? '').trim()
  if (!t) return null
  const tagged = t.match(ONLINE_ACTION_NARRATION_LINE_RE)
  if (tagged) return (tagged[1] ?? '').trim()
  // 整行 *旁白*（非 **内心**）
  if (/^\*[^*]+\*$/u.test(t) && !t.includes('**')) {
    return t.slice(1, -1).trim() || null
  }
  return null
}

/** 气泡正文是否整行是动描/泄漏标签（含仅标签） */
export function isOnlineActionNarrationBubbleText(line: string): boolean {
  return parseOnlineActionNarrationLine(line) != null
}

export function formatOnlineActionNarrationStoreContent(text: string): string {
  const body = stripOnlineActionNarrationPrefix(String(text ?? '')).trim()
  if (!body) return ''
  if (body.startsWith(ONLINE_ACTION_NARRATION_PREFIX)) return body
  return `${ONLINE_ACTION_NARRATION_PREFIX}${body}`
}

export function stripOnlineActionNarrationPrefix(text: string): string {
  const t = String(text ?? '').trim()
  const m = t.match(ONLINE_ACTION_NARRATION_LINE_RE)
  return (m ? (m[1] ?? '') : t).trim()
}

/** 关闭时注入：禁止输出旁白行，并禁止照抄历史上下文标签 */
export function buildOnlineActionNarrationDisabledAppendix(): string {
  return `【线上动描模式 · 本会话已关闭】
- **禁止**输出 \`【动描】\` / \`【动描·…】\` / \`[动描·…]\` / \`[私聊・旁白…]\` / \`*旁白*\` 等旁白行；禁止把手机侧动作/神态白描写进可见气泡。
- **禁止**输出剧本分析 / 条目标注（如 \`第 N 条（旁白）\` \`第 N 条（对话）\` \`日文对话翻译（方便参考语气）\`）；你是角色发微信，不是编剧拆解台词。
- 历史上下文**不会**再注入旁白行；若仍看见旧标签，**禁止照抄**进气泡或 \`[译]\`。
- 继续遵守《硬规则》禁小说旁白、禁全角括号神态。`
}

/** 开启时注入：覆盖默认「禁旁白」，约定条数与穿插 */
export function buildOnlineActionNarrationOutputAppendix(
  charLabel: string,
  countRange?: OnlineActionNarrationCountRange,
): string {
  const who = (charLabel || '对方').trim() || '对方'
  const range = countRange ?? {
    min: ONLINE_ACTION_NARRATION_DEFAULT_COUNT_MIN,
    max: ONLINE_ACTION_NARRATION_DEFAULT_COUNT_MAX,
  }
  const label = formatOnlineActionNarrationCountRangeLabel(range)
  const countRule =
    range.min === range.max
      ? `本轮须输出 **恰好 ${range.min} 条** \`【动描】\`（硬性；少于此数不合格）。`
      : `本轮须输出 **${range.min}～${range.max} 条** \`【动描】\`（硬性：至少 ${range.min}、至多 ${range.max}；少于此数不合格）。`
  return `【线上动描模式 · 本会话已开启】
在发微信气泡的同时，用**居中旁白**描写 ${who} 在手机另一侧的线下动作/神态/环境。

【条数（硬性）】
- ${countRule}
- 须与气泡**多行穿插**（动描→气泡→动描→气泡…），禁止把全部动描堆在开头或结尾；顺序即展示队列顺序。
- 例（${label} 条量级）：\`【动描】…\`\\n你好\\n\`【动描】…\`\\n嗯\\n\`【动描】…\`

【认知边界（硬性）】
- 动描是**界面旁白**：真人玩家能看见；**不是**用户在微信里收到的消息。
- 剧情里只有 ${who} **自己知道**自己在做什么；**禁止默认用户也知道**动描内容。
- 除非 ${who} 用**气泡正文**主动说出来（或发图/语音等明确告知），否则气泡里**禁止**写成「你刚看到我…」「你也知道我在…」等，仿佛用户已知情。
- 历史里的 \`【动描】\` 仅供 ${who} 承接自身状态与节奏；**不要**当成用户已读到的聊天内容来接话。
- **禁止**输出 \`【动描·…】\` / \`[私聊・旁白…]\` / \`[动描·…]\` 等非协议标签；旁白行**只能**以 \`【动描】\` 开头。
- **禁止**在 \`[译]\` 或气泡里写 \`第 N 条（旁白/对话）\` 一类剧本分析。

格式（严格）：
- 对白 / 指令 / 表情包 / 语音：仍遵守《线上回复输出协议》（一行一条气泡）。
- 动描：单独一行，必须以 \`【动描】\` 开头，后接短白描。例：\`【动描】他盯着屏幕停了几秒，拇指在输入框上方悬着。\`
- **语言（硬性）**：\`【动描】\` 正文**一律使用简体中文**白描，与气泡回复语言无关；即使对白是外文/双语，动描也**禁止**用日/英/韩等外文写旁白（专有名词可保留原文）。
- 动描用第三人称写 ${who}；指用户用「你」仅作环境方位（如「屏幕那头是你」），**不等于**用户知情；**禁止**把动描写进气泡正文；**禁止**代写用户动作。
- 每条动描宜短（约 8～40 字），忌长篇小说；勿淹没对白。
- 关闭本模式时的「禁括号旁白 / 禁小说式动作描写」对本会话**不适用**（仅动描行可写动作；气泡仍禁括号神态）。`
}

/**
 * 修复历史错序：动描曾用冻结 timestamp 落库，刷新后会全部堆到该轮气泡顶部。
 * 在连续「角色消息」段内，若动描时间戳撞车或与 systemRecordedAt 顺序不一致，
 * 按落库钟点重排并重写单调 timestamp（仅改顺序用字段，不改正文）。
 */
export function repairClumpedOnlineActionNarrationTimestamps<
  T extends {
    id: string
    type: string
    timestamp: number
    systemRecordedAt?: number
    ext?: { actionNarration?: boolean } | null
  },
>(rows: T[]): { rows: T[]; changed: Array<{ id: string; timestamp: number }> } {
  if (rows.length < 2) return { rows, changed: [] }
  const out = rows.map((r) => ({ ...r }))
  const changed: Array<{ id: string; timestamp: number }> = []

  let i = 0
  while (i < out.length) {
    if (out[i]!.type !== 'character') {
      i += 1
      continue
    }
    const start = i
    while (i < out.length && out[i]!.type === 'character') i += 1
    const end = i
    const slice = out.slice(start, end)
    if (slice.length < 2) continue

    const actions = slice.filter((m) => m.ext?.actionNarration === true)
    if (actions.length === 0) continue

    const actionTsCount = new Map<number, number>()
    for (const a of actions) {
      const t = typeof a.timestamp === 'number' ? a.timestamp : 0
      actionTsCount.set(t, (actionTsCount.get(t) ?? 0) + 1)
    }
    const hasClumpedActions = [...actionTsCount.values()].some((c) => c >= 2)

    const recordedOf = (m: T) =>
      typeof m.systemRecordedAt === 'number' && Number.isFinite(m.systemRecordedAt)
        ? m.systemRecordedAt
        : m.timestamp

    const canUseRecorded = slice.some(
      (m) => typeof m.systemRecordedAt === 'number' && Number.isFinite(m.systemRecordedAt),
    )
    if (!canUseRecorded) continue

    const byRecorded = [...slice].sort((a, b) => {
      const dt = recordedOf(a) - recordedOf(b)
      if (dt !== 0) return dt
      return a.id.localeCompare(b.id)
    })
    const byTs = [...slice].sort((a, b) => {
      const dt = a.timestamp - b.timestamp
      if (dt !== 0) return dt
      return a.id.localeCompare(b.id)
    })
    const orderMismatch = byRecorded.some((m, idx) => m.id !== byTs[idx]?.id)
    if (!orderMismatch && !hasClumpedActions) continue
    if (!orderMismatch) continue

    const minTs = Math.min(...slice.map((m) => m.timestamp))
    for (let j = 0; j < byRecorded.length; j += 1) {
      const nextTs = minTs + j
      const src = byRecorded[j]!
      if (src.timestamp !== nextTs) {
        changed.push({ id: src.id, timestamp: nextTs })
      }
      out[start + j] = { ...src, timestamp: nextTs }
    }
  }

  return { rows: out, changed }
}

/** 按上限裁掉多余动描段（保留穿插顺序，从后往前丢弃超出 max 的 action） */
export function limitOnlineActionNarrationSegments<T extends { kind: string }>(
  segments: T[],
  maxCount: number,
): T[] {
  const cap = clampOnlineActionNarrationCount(maxCount)
  let actionTotal = 0
  for (const seg of segments) {
    if (seg.kind === 'action') actionTotal += 1
  }
  if (actionTotal <= cap) return segments
  let keep = cap
  const out: T[] = []
  for (const seg of segments) {
    if (seg.kind !== 'action') {
      out.push(seg)
      continue
    }
    if (keep > 0) {
      out.push(seg)
      keep -= 1
    }
  }
  return out
}
