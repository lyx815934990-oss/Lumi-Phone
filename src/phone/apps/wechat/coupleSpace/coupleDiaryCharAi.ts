/**
 * 情侣空间共写日记 · 求评论 / 邀请续写（只传当前这一条正文）
 */

import type { ApiConfig } from '../../api/types'
import type { Character } from '../newFriendsPersona/types'
import { buildCharacterCard } from '../wechatChatAi'
import {
  buildWeChatSystemPrompt,
  inferWeChatRelationshipStage,
  type RelationshipStage,
} from '../wechatChatPrompt'
import type { CoupleDiaryCharActionKind } from './coupleSpaceTypes'

export type CoupleDiaryCharAiResult = {
  text: string
  kind: CoupleDiaryCharActionKind
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

export async function fetchCoupleDiaryCharAction(params: {
  api: ApiConfig | null
  kind: CoupleDiaryCharActionKind
  diaryContent: string
  character: Character | null
  charDisplayName: string
  userDisplayName: string
  relationshipStage?: RelationshipStage | null
  relationshipLabel?: string | null
  affection?: number | null
}): Promise<CoupleDiaryCharAiResult | null> {
  const kind = params.kind
  const stage = resolveStage({
    stage: params.relationshipStage,
    character: params.character,
    relationshipLabel: params.relationshipLabel,
    affection: params.affection,
  })
  const diary = params.diaryContent.trim()
  const charName = params.charDisplayName.trim() || params.character?.name?.trim() || '我'
  const userName = params.userDisplayName.trim() || '你'

  if (!diary) return null

  const api = params.api
  if (!api?.apiUrl?.trim() || !api.apiKey?.trim() || !api.modelId?.trim()) {
    return null
  }

  const persona = buildCharacterCard(params.character, { bioMaxChars: 420 })
  const stagePrompt = buildWeChatSystemPrompt(stage)
  const task =
    kind === 'comment'
      ? [
          '【任务·求评论】',
          `${userName} 在情侣空间共写日记里写了一段，并请求你评论。`,
          '请用符合当前关系阶段的语气，针对这段内容写一句自然回应（1～3 句即可）。',
          '不要复述全文；不要说「我看到你日记」；像私下收到对方心里话后的反应。',
          '只输出回应正文，不要标题、不要 JSON、不要元说明。',
        ].join('\n')
      : [
          '【任务·邀请续写】',
          `${userName} 在情侣空间共写日记里写了一段，并邀请你在后面续写一页。`,
          '请另起一段日记体正文（第一人称或与你人设一致的口吻），作为你自己写下的那一页。',
          '承接对方情绪与事实，但不要复读对方原文；篇幅约 60～180 字。',
          '只输出续写正文，不要标题、不要 JSON、不要「亲爱的日记」套话模板。',
        ].join('\n')

  const system = [stagePrompt, persona ? `【你的人设卡】\n${persona}` : '', `你的名字：${charName}`]
    .filter(Boolean)
    .join('\n\n')

  const user = [
    task,
    '',
    '【对方这一页日记正文（仅此一条；无其它日记）】',
    diary.slice(0, 1200),
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
        temperature: kind === 'continue' ? 0.9 : 0.82,
        max_tokens: kind === 'continue' ? 520 : 280,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = String(data.choices?.[0]?.message?.content ?? '').trim()
    if (!raw) return null
    return { text: raw.slice(0, 1200), kind, stage }
  } catch {
    return null
  }
}
