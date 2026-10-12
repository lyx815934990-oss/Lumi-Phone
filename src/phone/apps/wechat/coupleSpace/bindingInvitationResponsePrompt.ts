/**
 * 情侣空间 · 绑定邀请场景模块（遗留独立请求仍可读；主路径已改走 ChatRoom flushAiReplies + coupleSpaceInviteAi）
 */

import {
  buildWeChatSystemPrompt,
  type RelationshipStage,
} from '../wechatChatPrompt'
import type { CoupleSpaceInviteOutcome } from './coupleSpaceInviteAi'
import {
  adjudicateCoupleSpaceFromCharacterText,
  getCoupleSpaceOutcomePanelCopy,
  isCoupleSpaceAcceptOutcome,
  WECHAT_COUPLE_SPACE_INVITE_OUTPUT_BLOCK,
} from './coupleSpaceInviteAi'

export const BINDING_INVITATION_RESPONSE_MODULE = `
【场景模块 · 情侣空间绑定邀请回应】
{{user}} 刚刚向你发出「开通情侣空间」的绑定邀请（一起写日记、记纪念日、留专属称呼的私密空间）。
你不是在点「同意/拒绝」按钮，而是用**有情绪层次的微信口语**回应，并自行选择四档之一。

【四档裁决 · 结合人设与关系自行判断】
- 完全接受：惊喜 / 郑重 / 开心，明确愿意开通。
- 勉强接受：明显犹豫，但仍点头（「这么快就……不过、也不是不行」一类）。
- 婉拒：留有余地，先不开放（暗恋慌乱找借口、单相思说「还没到这一步」等）。
- 完全拒绝：态度明确；可困惑或不悦——被邀请在这阶段本身就奇怪。

【输出格式 · 硬约束】
1. 先输出 1～4 条微信气泡体感的角色对白；禁止只输出「是」「否」「同意」「拒绝」。
2. 正文中另起一行输出稳定指令（禁止 JSON）：\`【情侣空间绑定】结果：完全接受|勉强接受|婉拒|完全拒绝\`

${WECHAT_COUPLE_SPACE_INVITE_OUTPUT_BLOCK}
`.trim()

export function buildBindingInvitationSystemPrompt(stage: RelationshipStage): string {
  return `${buildWeChatSystemPrompt(stage)}\n\n${BINDING_INVITATION_RESPONSE_MODULE}`
}

/** 解析失败时的阶段兜底 */
export function defaultOutcomeForStage(stage: RelationshipStage): CoupleSpaceInviteOutcome {
  if (stage === 'confirmed_lover') return 'full_accept'
  if (stage === 'active_pursuit') return 'reluctant_accept'
  if (
    stage === 'secret_crush' ||
    stage === 'unrequited_open' ||
    stage === 'slight_fondness'
  ) {
    return 'soft_reject'
  }
  return 'hard_reject'
}

/** @deprecated 兼容旧二值解析 */
export function defaultAcceptedForStage(stage: RelationshipStage): boolean {
  return isCoupleSpaceAcceptOutcome(defaultOutcomeForStage(stage))
}

const LEGACY_MARKER_RE = /【情侣空间绑定】\s*接受\s*[:：]\s*(是|否|true|false|yes|no)/i

export function parseBindingInvitationResponse(
  raw: string,
  stage: RelationshipStage,
): { replyText: string; accepted: boolean; outcome: CoupleSpaceInviteOutcome } {
  const text = String(raw ?? '').trim()
  const fromSpeech = adjudicateCoupleSpaceFromCharacterText(text)
  let outcome = fromSpeech ?? defaultOutcomeForStage(stage)

  const legacy = text.match(LEGACY_MARKER_RE)
  if (legacy?.[1]) {
    const v = legacy[1].toLowerCase()
    const yes = v === '是' || v === 'true' || v === 'yes'
    outcome = yes
      ? stage === 'active_pursuit'
        ? 'reluctant_accept'
        : 'full_accept'
      : stage === 'secret_crush' || stage === 'unrequited_open' || stage === 'slight_fondness'
        ? 'soft_reject'
        : 'hard_reject'
  }

  const cn = /【情侣空间绑定】\s*结果\s*[:：]\s*(完全接受|勉强接受|婉拒|完全拒绝)/.exec(text)
  if (cn?.[1]) {
    const map: Record<string, CoupleSpaceInviteOutcome> = {
      完全接受: 'full_accept',
      勉强接受: 'reluctant_accept',
      婉拒: 'soft_reject',
      完全拒绝: 'hard_reject',
    }
    outcome = map[cn[1]] ?? outcome
  }

  const replyText = text
    .replace(LEGACY_MARKER_RE, '')
    .replace(/【情侣空间绑定】\s*结果\s*[:：]\s*(完全接受|勉强接受|婉拒|完全拒绝)/g, '')
    .replace(/\[COUPLE_SPACE_(FULL_ACCEPT|RELUCTANT_ACCEPT|SOFT_REJECT|HARD_REJECT)\][^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    replyText: replyText || getCoupleSpaceOutcomePanelCopy(outcome),
    accepted: isCoupleSpaceAcceptOutcome(outcome),
    outcome,
  }
}
