/**
 * 情侣空间绑定邀约 · 与小游戏邀约同路径：
 * 发卡后不自动拉模型；用户正常触发回复时注入 bias，由线上模型自行裁决四选项。
 */

import type { WeChatCoupleSpaceInvitePayload } from '../newFriendsPersona/types'

export type CoupleSpaceInviteOutcome =
  | 'full_accept'
  | 'reluctant_accept'
  | 'soft_reject'
  | 'hard_reject'

export const COUPLE_SPACE_OUTCOME_PANEL_COPY: Record<CoupleSpaceInviteOutcome, string> = {
  full_accept:
    '我靠！对方仅思考了 0.01 秒就签下了同意！系统已为你们焊死双人席——你也快来试试吧！',
  reluctant_accept:
    '嘶……对方犹豫了八百回，最后还是点了「算了就你吧」。系统勉强开绿灯，进来瞅瞅？',
  soft_reject:
    '叮～申请已读。对方回了个「再处八百天」。钥匙被系统暂时藏起来了，下个平行宇宙见，别灰心呀。',
  hard_reject:
    '404 Romance Not Found！啊哦~对方把同意键直接粉碎了！！可恶！！！咱们努努力让对方后悔这个决定好不好？！！。',
}

const OUTCOME_LABEL: Record<CoupleSpaceInviteOutcome, string> = {
  full_accept: '完全接受',
  reluctant_accept: '勉强接受',
  soft_reject: '婉拒',
  hard_reject: '完全拒绝',
}

export function isCoupleSpaceAcceptOutcome(outcome: CoupleSpaceInviteOutcome): boolean {
  return outcome === 'full_accept' || outcome === 'reluctant_accept'
}

export function coupleSpaceOutcomeToCharResponded(
  outcome: CoupleSpaceInviteOutcome,
): NonNullable<WeChatCoupleSpaceInvitePayload['charResponded']> {
  return isCoupleSpaceAcceptOutcome(outcome) ? 'accepted' : 'declined'
}

export function getCoupleSpaceOutcomePanelCopy(outcome: CoupleSpaceInviteOutcome): string {
  return COUPLE_SPACE_OUTCOME_PANEL_COPY[outcome]
}

type CoupleInviteMsgLike = {
  id: string
  from?: string
  coupleSpaceInvite?: WeChatCoupleSpaceInvitePayload
}

export function findLatestPendingCoupleSpaceInvite(
  msgs: readonly CoupleInviteMsgLike[],
): { messageId: string; invite: WeChatCoupleSpaceInvitePayload } | null {
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const m = msgs[i]!
    if (m.from !== 'self') continue
    const inv = m.coupleSpaceInvite
    if (!inv || inv.kind !== 'couple_space_invite') continue
    if (!inv.inviteId?.trim()) continue
    if (inv.charResponded === 'accepted' || inv.charResponded === 'declined') continue
    if (inv.outcome) continue
    return { messageId: m.id, invite: inv }
  }
  return null
}

export function resolvePendingCoupleSpaceInviteMessageId(params: {
  messageIdHint?: string
  msgs: readonly CoupleInviteMsgLike[]
}): string | null {
  const hint = params.messageIdHint?.trim()
  const pending = findLatestPendingCoupleSpaceInvite(params.msgs)
  if (!pending) return null
  if (!hint) return pending.messageId
  for (let i = params.msgs.length - 1; i >= 0; i -= 1) {
    const m = params.msgs[i]!
    const inv = m.coupleSpaceInvite
    if (!inv || inv.kind !== 'couple_space_invite') continue
    if (m.id === hint || inv.inviteId === hint) {
      if (inv.charResponded || inv.outcome) return null
      return m.id
    }
  }
  return pending.messageId
}

export function buildCoupleSpaceInviteReplyBias(params: {
  messageId: string
  invite: WeChatCoupleSpaceInvitePayload
}): string {
  return `[系统裁决·情侣空间绑定邀约] 用户刚向你发来「开通情侣空间」绑定邀请（messageId=${params.messageId}，inviteId=${params.invite.inviteId}）。
你必须在本轮回复中：
1) 输出 1～4 行符合人设的口语对白（惊喜 / 犹豫 / 慌乱 / 不悦均可，贴合关系与性格；禁止客服腔、禁止只回「是/否」）；
2) 在口语对白之间的任意位置单独占一行输出下列稳定指令之一（**禁止 JSON**，缺一不可）：
   - 完全接受：\`【情侣空间绑定】结果：完全接受\`
   - 勉强接受：\`【情侣空间绑定】结果：勉强接受\`
   - 婉拒：\`【情侣空间绑定】结果：婉拒\`
   - 完全拒绝：\`【情侣空间绑定】结果：完全拒绝\`
   可选附加（全角｜分隔）：\`｜收束：收束语｜消息id：${params.messageId}\`
请结合人设、好感与当下关系**自行判断**选哪一档；不要无脑全盘接受，也不要无视邀约。
禁止只回复口语而不输出指令行；禁止在未输出接受类指令时假装已开通情侣空间。`
}

export const WECHAT_COUPLE_SPACE_INVITE_OUTPUT_BLOCK = `
---------------------
【用户发来的情侣空间绑定邀约】
---------------------
- 会话里若出现「[情侣空间邀请]」或用户刚发来**情侣空间邀请卡**，表示对方想与你开通情侣空间（共写日记、记纪念日、留专属称呼）。
- 你必须结合人设、好感、关系阶段，**自主决定**下列四档之一；不要无脑答应，也不要无视邀约。
- **稳定指令（禁止 JSON）**：先有自然口语，再单独一行输出其一：
  - \`【情侣空间绑定】结果：完全接受\`
  - \`【情侣空间绑定】结果：勉强接受\`
  - \`【情侣空间绑定】结果：婉拒\`
  - \`【情侣空间绑定】结果：完全拒绝\`
  - 可选：\`｜收束：……｜消息id：邀约消息id\`
- **禁止**用普通文字假装已接受/已拒绝却不输出对应指令行；不写指令则界面不会更新邀请卡状态。
- 若是**你主动邀用户**开通，用 \`【情侣空间邀请】\`（见「角色主动邀约」协议），不要用本节四档标签。
`.trim()

const TAG_TO_OUTCOME: Array<{ tag: string; outcome: CoupleSpaceInviteOutcome }> = [
  { tag: 'COUPLE_SPACE_FULL_ACCEPT', outcome: 'full_accept' },
  { tag: 'COUPLE_SPACE_RELUCTANT_ACCEPT', outcome: 'reluctant_accept' },
  { tag: 'COUPLE_SPACE_SOFT_REJECT', outcome: 'soft_reject' },
  { tag: 'COUPLE_SPACE_HARD_REJECT', outcome: 'hard_reject' },
]

function normalizeCoupleSpaceDirectiveLine(raw: string): string {
  return String(raw ?? '')
    .replace(/```(?:json)?/gi, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
}

export function parseCoupleSpaceInviteActionDirective(raw: string): {
  outcome: CoupleSpaceInviteOutcome
  messageId?: string
  replyText?: string
} | null {
  const normalized = normalizeCoupleSpaceDirectiveLine(raw)
  if (!normalized) return null

  for (const { tag, outcome } of TAG_TO_OUTCOME) {
    const tagOnly = new RegExp(`^\\[${tag}\\]$`, 'i').exec(normalized)
    if (tagOnly) return { outcome }

    const withJson = new RegExp(`^\\[${tag}\\]\\s*(\\{[\\s\\S]*\\})\\s*$`, 'i').exec(normalized)
    if (withJson?.[1]) {
      try {
        const j = JSON.parse(withJson[1]) as Record<string, unknown>
        const messageId =
          typeof j.messageId === 'string'
            ? j.messageId.trim()
            : typeof j.inviteId === 'string'
              ? j.inviteId.trim()
              : undefined
        const replyText = typeof j.replyText === 'string' ? j.replyText.trim() : undefined
        return {
          outcome,
          ...(messageId ? { messageId } : {}),
          ...(replyText ? { replyText } : {}),
        }
      } catch {
        return { outcome }
      }
    }

    // 宽松：行内含指令标签
    if (new RegExp(`\\[${tag}\\]`, 'i').test(normalized) && normalized.length < 500) {
      const inline = new RegExp(`\\[${tag}\\]\\s*(\\{[\\s\\S]*\\})?`, 'i').exec(normalized)
      if (inline) {
        if (inline[1]) {
          try {
            const j = JSON.parse(inline[1]) as Record<string, unknown>
            const messageId =
              typeof j.messageId === 'string'
                ? j.messageId.trim()
                : typeof j.inviteId === 'string'
                  ? j.inviteId.trim()
                  : undefined
            const replyText = typeof j.replyText === 'string' ? j.replyText.trim() : undefined
            return {
              outcome,
              ...(messageId ? { messageId } : {}),
              ...(replyText ? { replyText } : {}),
            }
          } catch {
            return { outcome }
          }
        }
        return { outcome }
      }
    }
  }

  // 稳定中文标记：【情侣空间绑定】结果：完全接受｜收束：…｜消息id：…
  const cn =
    /【情侣空间绑定】\s*结果\s*[:：]\s*(完全接受|勉强接受|婉拒|完全拒绝)(.*)$/.exec(normalized)
  if (cn?.[1]) {
    const map: Record<string, CoupleSpaceInviteOutcome> = {
      完全接受: 'full_accept',
      勉强接受: 'reluctant_accept',
      婉拒: 'soft_reject',
      完全拒绝: 'hard_reject',
    }
    const outcome = map[cn[1]]
    if (outcome) {
      const tail = (cn[2] ?? '').trim()
      let messageId: string | undefined
      let replyText: string | undefined
      if (tail) {
        for (const part of tail.split(/[｜|]/).map((p) => p.trim()).filter(Boolean)) {
          const idM = /^(?:消息id|messageId|inviteId)\s*[:：]\s*(.+)$/i.exec(part)
          if (idM) {
            messageId = idM[1]!.trim()
            continue
          }
          const replyM = /^(?:收束|回复|replyText|reply)\s*[:：]\s*(.+)$/i.exec(part)
          if (replyM) {
            replyText = replyM[1]!.trim()
          }
        }
      }
      return {
        outcome,
        ...(messageId ? { messageId } : {}),
        ...(replyText ? { replyText } : {}),
      }
    }
  }

  return null
}

export function isCoupleSpaceDirectiveArtifactLine(line: string): boolean {
  const t = normalizeCoupleSpaceDirectiveLine(line)
  if (!t) return false
  if (parseCoupleSpaceInviteActionDirective(t)) return true
  if (/^\[COUPLE_SPACE_(FULL_ACCEPT|RELUCTANT_ACCEPT|SOFT_REJECT|HARD_REJECT)\]/i.test(t)) {
    return true
  }
  if (/【情侣空间绑定】\s*结果\s*[:：]/.test(t)) return true
  return false
}

/** 模型未写指令时，从口语粗判四档（仅兜底） */
export function adjudicateCoupleSpaceFromCharacterText(
  combinedText: string,
): CoupleSpaceInviteOutcome | null {
  const t = combinedText.trim()
  if (!t) return null

  const hard =
    /(?:绝对不行|休想|做梦|门都没有|不可能|别恶心|恶心人|滚|别烦我|少来这套|完全拒绝)/u.test(t)
  const soft =
    /(?:再等等|还没到|不太合适|先这样|下次吧|再说吧|再处|还早|婉拒|暂时不行|再等等看)/u.test(t)
  const reluctant =
    /(?:勉强|也不是不行|那就试试|先这样吧|看在|行吧|……好吧|算了就|挤一脚)/u.test(t)
  const full =
    /(?:当然|立刻|马上就|太好了|终于|求之不得|一起吧|开通吧|答应你|我愿意|完全同意)/u.test(t)

  if (hard && !full && !reluctant) return 'hard_reject'
  if (soft && !full && !reluctant) return 'soft_reject'
  if (reluctant && !full) return 'reluctant_accept'
  if (full) return 'full_accept'
  if (/(?:情侣空间|绑定|契约|日记|纪念日)/u.test(t) && !hard && !soft) return 'reluctant_accept'
  return null
}

export function coupleSpaceOutcomeLabel(outcome: CoupleSpaceInviteOutcome): string {
  return OUTCOME_LABEL[outcome]
}
