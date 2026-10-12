/**
 * 情侣空间 · 绑定邀请独立 AI 请求
 */

import type { ApiConfig } from '../../api/types'
import type { Character } from '../newFriendsPersona/types'
import { buildCharacterCard } from '../wechatChatAi'
import {
  inferWeChatRelationshipStage,
  type RelationshipStage,
} from '../wechatChatPrompt'
import {
  buildBindingInvitationSystemPrompt,
  defaultOutcomeForStage,
  parseBindingInvitationResponse,
} from './bindingInvitationResponsePrompt'
import {
  getCoupleSpaceOutcomePanelCopy,
  isCoupleSpaceAcceptOutcome,
  type CoupleSpaceInviteOutcome,
} from './coupleSpaceInviteAi'

export type BindingInvitationAiResult = {
  replyText: string
  accepted: boolean
  outcome: CoupleSpaceInviteOutcome
  stage: RelationshipStage
}

function resolveStage(params: {
  stage?: RelationshipStage | null
  character?: Character | null
  relationshipLabel?: string | null
  affection?: number | null
}): RelationshipStage {
  if (params.stage) return params.stage
  const wbSnippet = (params.character?.worldBooks ?? [])
    .flatMap((wb) => wb.items ?? [])
    .filter((it) => it.enabled !== false)
    .map((it) => it.content)
    .filter(Boolean)
    .slice(0, 6)
    .join('\n')
  return inferWeChatRelationshipStage({
    affection: params.affection ?? null,
    relationshipLabel: params.relationshipLabel ?? null,
    epilogueOrWorldBookSnippet: wbSnippet || params.character?.bio || null,
  })
}

export async function fetchBindingInvitationResponse(params: {
  api: ApiConfig | null
  character: Character | null
  userDisplayName: string
  relationshipStage?: RelationshipStage | null
  relationshipLabel?: string | null
  affection?: number | null
}): Promise<BindingInvitationAiResult> {
  const stage = resolveStage({
    stage: params.relationshipStage,
    character: params.character,
    relationshipLabel: params.relationshipLabel,
    affection: params.affection,
  })

  const fallback = (): BindingInvitationAiResult => {
    const outcome = defaultOutcomeForStage(stage)
    return {
      replyText: getCoupleSpaceOutcomePanelCopy(outcome),
      accepted: isCoupleSpaceAcceptOutcome(outcome),
      outcome,
      stage,
    }
  }

  const api = params.api
  if (!api?.apiUrl?.trim() || !api.apiKey?.trim() || !api.modelId?.trim()) {
    return fallback()
  }

  const persona = buildCharacterCard(params.character, { bioMaxChars: 420 })
  const system = [
    buildBindingInvitationSystemPrompt(stage),
    persona ? `【你的人设卡】\n${persona}` : '',
    `玩家显示名：${params.userDisplayName.trim() || '用户'}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const user = [
    '【本轮事件】',
    `${params.userDisplayName.trim() || '用户'} 向你发出了情侣空间绑定邀请，文案大意是：想和你一起开通情侣空间，共同写日记、记纪念日、留下专属称呼。`,
    '请按当前关系阶段模块与场景模块回应，并在末行输出【情侣空间绑定】接受：是/否。',
  ].join('\n')

  try {
    const base = api.apiUrl.trim().replace(/\/+$/, '')
    const endpoint = base.endsWith('/chat/completions') ? base : `${base}/v1/chat/completions`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: api.modelId.trim(),
        temperature: 0.85,
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!res.ok) return fallback()
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = String(data.choices?.[0]?.message?.content ?? '').trim()
    if (!raw) return fallback()
    const parsed = parseBindingInvitationResponse(raw, stage)
    return { ...parsed, stage }
  } catch {
    return fallback()
  }
}
