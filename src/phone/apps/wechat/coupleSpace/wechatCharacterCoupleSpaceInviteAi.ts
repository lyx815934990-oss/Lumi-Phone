/**
 * 情侣空间 · 角色主动发起绑定邀约
 * 稳定格式（禁止 JSON）：【情侣空间邀请】/ 收束：…｜标题：…｜副标题：…
 */
import type { WeChatCoupleSpaceInvitePayload } from '../newFriendsPersona/types'

function normalizeDirectiveLine(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^`+|`+$/g, '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // 全角方括号 → 半角，便于统一匹配 [情侣空间邀请]
    .replace(/［/g, '[')
    .replace(/］/g, ']')
}

export type CharacterCoupleSpaceInviteDirective = {
  replyText?: string
  title?: string
  subtitle?: string
}

export type PendingCharacterCoupleSpaceInvite = {
  insertAfterBubbleStep: number
  invite: WeChatCoupleSpaceInvitePayload
  replyText?: string
}

export type CharacterCoupleSpaceInviteLookupRow = {
  id: string
  from: 'self' | 'other'
  coupleSpaceInvite?: {
    kind?: string
    inviteId?: string
    userResponded?: string
    charResponded?: string
    outcome?: string
    title?: string
    replyText?: string
  }
}

const DEFAULT_TITLE = '开通我们的情侣空间'
const DEFAULT_SUBTITLE = '一起写日记 · 记纪念日 · 留专属称呼'

/**
 * 邀请头标记：兼容模型常见写法
 * - 【情侣空间邀请】（推荐）
 * - [情侣空间邀请]（方括号中文，截图实测）
 * - [COUPLE_SPACE_INVITE]
 */
const INVITE_MARK_RE = /(?:【情侣空间邀请】|\[情侣空间邀请\]|\[COUPLE_SPACE_INVITE\])/i

/** 行首邀请块 */
const INVITE_HEAD_RE =
  /^(?:【情侣空间邀请】|\[情侣空间邀请\]|\[COUPLE_SPACE_INVITE\])(?:\s*(.*))?$/i

/** 行内嵌入的邀请标记 */
const INVITE_EMBED_RE = INVITE_MARK_RE

const FIELD_LINE_RE =
  /^(?:收束|回复|reply|replyText|标题|title|副标题|subtitle)\s*[:：]\s*(.*)$/i

export function buildCharacterCoupleSpaceInvitePayload(params?: {
  inviteId?: string
  replyText?: string
  title?: string
  subtitle?: string
}): WeChatCoupleSpaceInvitePayload {
  const nowMs = Date.now()
  const replyText = params?.replyText?.trim().slice(0, 500)
  const title = params?.title?.trim().slice(0, 64) || DEFAULT_TITLE
  const subtitle = params?.subtitle?.trim().slice(0, 120) || DEFAULT_SUBTITLE
  return {
    kind: 'couple_space_invite',
    inviteId: params?.inviteId ?? `csi-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    subtitle,
    ...(replyText ? { replyText } : {}),
  }
}

function applyField(
  out: CharacterCoupleSpaceInviteDirective,
  keyRaw: string,
  valueRaw: string,
): void {
  const key = keyRaw.trim().toLowerCase()
  const value = valueRaw.trim()
  if (!value) return
  if (key === '收束' || key === '回复' || key === 'reply' || key === 'replytext') {
    out.replyText = value.slice(0, 500)
    return
  }
  if (key === '标题' || key === 'title') {
    out.title = value.slice(0, 64)
    return
  }
  if (key === '副标题' || key === 'subtitle') {
    out.subtitle = value.slice(0, 120)
  }
}

/** 解析「键：值｜键：值」尾部字段串 */
function parsePipeFields(tail: string): CharacterCoupleSpaceInviteDirective {
  const out: CharacterCoupleSpaceInviteDirective = {}
  const parts = String(tail ?? '')
    .split(/[｜|]/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (!parts.length) return out
  for (const part of parts) {
    const m = /^(收束|回复|reply|replyText|标题|title|副标题|subtitle)\s*[:：]\s*(.*)$/i.exec(part)
    if (m) {
      applyField(out, m[1]!, m[2] ?? '')
      continue
    }
    if (!out.replyText && !/[:：]/.test(part)) {
      out.replyText = part.slice(0, 500)
    }
  }
  return out
}

export function parseCharacterCoupleSpaceInviteDirective(
  raw: string,
): CharacterCoupleSpaceInviteDirective | null {
  const normalized = normalizeDirectiveLine(raw)
  if (!normalized) return null

  const head = INVITE_HEAD_RE.exec(normalized)
  if (head) {
    const tail = (head[1] ?? '').trim()
    if (!tail) return {}
    if (tail.startsWith('{')) return {}
    return parsePipeFields(tail)
  }

  // 行内嵌入：口语…【情侣空间邀请】收束：…
  const embedAt = normalized.search(INVITE_EMBED_RE)
  if (embedAt < 0) return null
  const fromMark = normalized.slice(embedAt)
  const embedHead = INVITE_HEAD_RE.exec(fromMark)
  if (!embedHead) return null
  const tail = (embedHead[1] ?? '').trim()
  if (!tail || tail.startsWith('{')) return {}
  return parsePipeFields(tail)
}

/**
 * 从连续行解析邀请块：首行【情侣空间邀请】，后续「收束：」「标题：」等字段行。
 * 若首行前有口语，oralBefore 会带回，供预处理拆成普通气泡。
 */
export function parseCharacterCoupleSpaceInviteBlock(
  lines: string[],
  startIndex: number,
): {
  directive: CharacterCoupleSpaceInviteDirective
  consumed: number
  oralBefore?: string
} | null {
  if (startIndex < 0 || startIndex >= lines.length) return null
  const first = normalizeDirectiveLine(lines[startIndex] ?? '')
  if (!first) return null

  let oralBefore: string | undefined
  let headLine = first
  const headAtStart = INVITE_HEAD_RE.exec(first)
  if (!headAtStart) {
    const embedAt = first.search(INVITE_EMBED_RE)
    if (embedAt < 0) return null
    const before = first.slice(0, embedAt).trim()
    if (before) oralBefore = before
    headLine = first.slice(embedAt).trim()
  }

  const head = INVITE_HEAD_RE.exec(headLine)
  if (!head) return null

  const directive: CharacterCoupleSpaceInviteDirective = {}
  const inlineTail = (head[1] ?? '').trim()
  if (inlineTail && !inlineTail.startsWith('{')) {
    Object.assign(directive, parsePipeFields(inlineTail))
  }

  let consumed = 1
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const t = normalizeDirectiveLine(lines[i] ?? '')
    if (!t) {
      consumed += 1
      continue
    }
    const field = FIELD_LINE_RE.exec(t)
    if (!field) break
    const key = t.split(/[:：]/)[0] ?? ''
    applyField(directive, key, field[1] ?? '')
    consumed += 1
  }

  return { directive, consumed, ...(oralBefore ? { oralBefore } : {}) }
}

export function parseCharacterCoupleSpaceInviteDirectiveFromArtifactLine(
  raw: string,
): CharacterCoupleSpaceInviteDirective | null {
  return parseCharacterCoupleSpaceInviteDirective(raw)
}

export function isCharacterCoupleSpaceInviteDirectiveArtifactLine(line: string): boolean {
  const t = normalizeDirectiveLine(line)
  if (!t) return false
  if (INVITE_HEAD_RE.test(t)) return true
  // 整行几乎只有邀请指令（允许前缀少量空白/标点）
  if (INVITE_EMBED_RE.test(t)) {
    const stripped = t.replace(INVITE_EMBED_RE, '').trim()
    // 去掉标记后只剩字段或为空 → 视为指令行，勿进普通气泡
    if (!stripped) return true
    if (FIELD_LINE_RE.test(stripped) || /^(?:收束|标题|副标题)\s*[:：]/u.test(stripped)) return true
    if (/^(?:收束|标题|副标题)\s*[:：]/u.test(stripped.split(/[｜|]/)[0] ?? '')) return true
    // 口语与指令粘连：也视为含指令伪影（预处理会拆开）
    return true
  }
  return false
}

function expandBubbleLines(raw: string): string[] {
  const normalized = String(raw ?? '')
    .trim()
    .replace(/\\n/g, '\n')
    .trim()
  if (!normalized) return []
  const parts = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts : [normalized]
}

export function preprocessCharacterCoupleSpaceInviteBubblesForChat(params: {
  bubbles: string[]
}): { bubbles: string[]; pendingInvites: PendingCharacterCoupleSpaceInvite[] } {
  const flat: string[] = []
  for (const raw of params.bubbles) {
    flat.push(...expandBubbleLines(raw))
  }

  const next: string[] = []
  const pendingInvites: PendingCharacterCoupleSpaceInvite[] = []
  let bubbleStep = 0
  let i = 0

  while (i < flat.length) {
    const block = parseCharacterCoupleSpaceInviteBlock(flat, i)
    if (block) {
      if (block.oralBefore?.trim()) {
        next.push(block.oralBefore.trim())
        bubbleStep += 1
      }
      const invite = buildCharacterCoupleSpaceInvitePayload({
        replyText: block.directive.replyText,
        title: block.directive.title,
        subtitle: block.directive.subtitle,
      })
      pendingInvites.push({
        insertAfterBubbleStep: bubbleStep,
        invite,
        replyText: block.directive.replyText,
      })
      i += block.consumed
      continue
    }

    next.push(flat[i]!)
    bubbleStep += 1
    i += 1
  }

  return { bubbles: next, pendingInvites }
}

export function formatCharacterCoupleSpaceInviteTranscriptLine(
  messageId: string,
  data: WeChatCoupleSpaceInvitePayload,
): string {
  const mid = messageId.trim() || data.inviteId
  const reply = data.replyText?.trim()
  const head = reply
    ? `（你向用户发来情侣空间绑定邀约；${reply}；messageId=${mid}；inviteId=${data.inviteId}）`
    : `（你向用户发来情侣空间绑定邀约；messageId=${mid}；inviteId=${data.inviteId}）`
  if (data.userResponded === 'accepted') {
    return `${head}；用户已通过邀约卡接受，情侣空间已开通`
  }
  if (data.userResponded === 'declined') {
    return `${head}；**用户已拒绝本次绑定邀约**（勿假装已开通；下次须重新发【情侣空间邀请】）`
  }
  return `${head}；用户尚未回应邀约卡（等待接受/拒绝）`
}

export function formatUserCoupleSpaceInviteTranscriptLine(
  messageId: string,
  data: WeChatCoupleSpaceInvitePayload,
): string {
  const mid = messageId.trim() || data.inviteId
  const head = `（用户向你发来情侣空间绑定邀约；messageId=${mid}；inviteId=${data.inviteId}）`
  if (data.outcome === 'full_accept' || data.charResponded === 'accepted') {
    return `${head}；你已接受，情侣空间已开通`
  }
  if (data.outcome === 'reluctant_accept') {
    return `${head}；你勉强接受，情侣空间已开通`
  }
  if (data.outcome === 'soft_reject' || data.outcome === 'hard_reject' || data.charResponded === 'declined') {
    return `${head}；你已婉拒/拒绝`
  }
  return `${head}；你尚未用指令回应`
}

export function findLatestCharacterCoupleSpaceInvite(
  msgs: readonly CharacterCoupleSpaceInviteLookupRow[],
): { messageId: string; invite: WeChatCoupleSpaceInvitePayload } | null {
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const m = msgs[i]
    if (!m || m.from !== 'other') continue
    const inv = m.coupleSpaceInvite
    if (inv?.kind === 'couple_space_invite') {
      return { messageId: m.id, invite: inv as WeChatCoupleSpaceInvitePayload }
    }
  }
  return null
}

export function findLatestPendingCharacterCoupleSpaceInvite(
  msgs: readonly CharacterCoupleSpaceInviteLookupRow[],
): { messageId: string; invite: WeChatCoupleSpaceInvitePayload } | null {
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const m = msgs[i]
    if (!m || m.from !== 'other') continue
    const inv = m.coupleSpaceInvite
    if (!inv || inv.kind !== 'couple_space_invite') continue
    if (!inv.inviteId?.trim()) continue
    if (inv.userResponded === 'accepted' || inv.userResponded === 'declined') continue
    return { messageId: m.id, invite: inv as WeChatCoupleSpaceInvitePayload }
  }
  return null
}

export function buildCharacterCoupleSpaceInviteStateBias(
  msgs: readonly CharacterCoupleSpaceInviteLookupRow[],
  opts?: { alreadyBound?: boolean },
): string {
  if (opts?.alreadyBound) {
    return '[情侣空间·状态] 你们已开通情侣空间。勿再发【情侣空间邀请】；口语可自然提到一起写日记等，但不要假装重新绑定。'
  }
  const latest = findLatestCharacterCoupleSpaceInvite(msgs)
  if (!latest) return ''
  if (!latest.invite.userResponded) {
    return '[情侣空间·状态] 你已向用户发出情侣空间绑定邀约，用户尚未接受/拒绝。等待回应，勿重复刷屏发邀约。'
  }
  if (latest.invite.userResponded === 'accepted') {
    return '[情侣空间·状态] 用户已接受你的绑定邀约，情侣空间已开通；口语可自然接话，勿再发【情侣空间邀请】。'
  }
  if (latest.invite.userResponded === 'declined') {
    return '[情侣空间·状态] 用户已拒绝你的绑定邀约。勿假装已开通；想再约须新口语 + 新的【情侣空间邀请】。'
  }
  return ''
}

export const WECHAT_CHARACTER_COUPLE_SPACE_INVITE_OUTPUT_BLOCK = `
---------------------
【情侣空间：角色主动邀约（对用户不可见）】
---------------------
- 想邀请用户开通情侣空间时，先有 1～3 句符合人设的口语（心动 / 试探 / 认真均可），再**单独一行**输出稳定指令（**禁止 JSON**）：
  - 最简：\`【情侣空间邀请】\`
  - 带收束：\`【情侣空间邀请】收束：想和你一起开个空间\`
  - 多字段（用全角｜分隔）：\`【情侣空间邀请】收束：……｜标题：开通我们的情侣空间｜副标题：一起写日记\`
- **指令必须单独成行**，不要粘在口语同一行末尾；括号请用中文【】（也兼容英文方括号写法）。
- 指令行会生成**情侣空间邀请卡**（卡片 UI，不是普通文字气泡）；用户点击接受后才真正开通。
- **禁止**只用口语说「开情侣空间吧」却不输出 \`【情侣空间邀请】\`；禁止在用户**未接受**时假装已开通。
- 已绑定、或你已发出仍待用户回应的邀约：勿重复刷屏。
- **用户主动发来的邀约卡**用 \`【情侣空间绑定】结果：完全接受/勉强接受/婉拒/完全拒绝\` 回应，与本节不同。
`.trim()
