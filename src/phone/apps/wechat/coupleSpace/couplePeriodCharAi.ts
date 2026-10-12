/**
 * 情侣空间经期 · 求一句暖心关心（只传当前这一段已填的阶段/流量/痛感/心情）
 */

import type { ApiConfig } from '../../api/types'
import type { Character } from '../newFriendsPersona/types'
import { buildCharacterCard } from '../wechatChatAi'
import {
  buildWeChatSystemPrompt,
  inferWeChatRelationshipStage,
  type RelationshipStage,
} from '../wechatChatPrompt'
import {
  PERIOD_FLOW_LABEL,
  PERIOD_MOOD_LABEL,
  PERIOD_PAIN_LABEL,
} from './couplePeriodLogic'
import {
  formatFlowChain,
  formatMoodChain,
  formatPainChain,
} from './couplePeriodDayRecords'
import type { CouplePeriodCycle } from './coupleSpaceTypes'

export type CouplePeriodCharAiResult = {
  text: string
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

function buildPeriodSnapshot(params: {
  cycle: CouplePeriodCycle
  dayIndex?: number | null
}): string {
  const lines: string[] = []
  if (params.dayIndex != null && params.dayIndex > 0) {
    lines.push(`经期大约第 ${params.dayIndex} 天`)
  }
  const flowChain = formatFlowChain(params.cycle)
  const painChain = formatPainChain(params.cycle)
  const moodChain = formatMoodChain(params.cycle)
  if (flowChain) lines.push(`流量（按天）：${flowChain}`)
  else if (params.cycle.flow) {
    lines.push(`流量：${PERIOD_FLOW_LABEL[params.cycle.flow] ?? params.cycle.flow}`)
  }
  if (painChain) lines.push(`痛感（按天）：${painChain}`)
  else if (params.cycle.pain != null) {
    lines.push(`痛感：${PERIOD_PAIN_LABEL[params.cycle.pain] ?? String(params.cycle.pain)}`)
  }
  if (moodChain) lines.push(`心情（按天）：${moodChain}`)
  else if (params.cycle.mood) {
    lines.push(`心情：${PERIOD_MOOD_LABEL[params.cycle.mood] ?? params.cycle.mood}`)
  }
  if (lines.length <= (params.dayIndex != null && params.dayIndex > 0 ? 1 : 0)) {
    lines.push('对方标记了经期，但还没细填流量/痛感/心情')
  }
  return lines.join('\n')
}

export async function fetchCouplePeriodCharCare(params: {
  api: ApiConfig | null
  cycle: CouplePeriodCycle
  dayIndex?: number | null
  character: Character | null
  charDisplayName: string
  userDisplayName: string
  relationshipStage?: RelationshipStage | null
  relationshipLabel?: string | null
  affection?: number | null
}): Promise<CouplePeriodCharAiResult | null> {
  const stage = resolveStage({
    stage: params.relationshipStage,
    character: params.character,
    relationshipLabel: params.relationshipLabel,
    affection: params.affection,
  })
  const charName = params.charDisplayName.trim() || params.character?.name?.trim() || '我'
  const userName = params.userDisplayName.trim() || '你'
  const snapshot = buildPeriodSnapshot({
    cycle: params.cycle,
    dayIndex: params.dayIndex,
  })

  const api = params.api
  if (!api?.apiUrl?.trim() || !api.apiKey?.trim() || !api.modelId?.trim()) {
    return null
  }

  const persona = buildCharacterCard(params.character, { bioMaxChars: 420 })
  const stagePrompt = buildWeChatSystemPrompt(stage)
  const task = [
    '【任务·经期暖心关心】',
    `${userName} 在情侣空间经期记录里，请你看一眼她的经期情况并留下一句关心。`,
    '语气要暖、贴着关系阶段，像恋人私下的关心，不要说教、不要监控口吻、不要医学诊断。',
    '可自然体现这些常识（点到为止，别写成健康科普）：',
    '- 经期常伴随情绪敏感、起伏大、易怒、身体不适；对方若烦躁或低落，多包容、少顶撞。',
    '- 一般不宜吃冰饮/冰冷食物，容易加重痛经；若对方本身有原发性痛经，也别假定「忍一忍就好」，多体贴、问要不要热水袋或休息。',
    '根据已提供的流量/痛感/心情回应 1～3 句即可；没填的项不要追问。',
    '不要复述「我看到了你的经期记录」；不要提及私密备注；不要 JSON、不要标题、不要元说明。',
    '只输出关心正文。',
  ].join('\n')

  const system = [stagePrompt, persona ? `【你的人设卡】\n${persona}` : '', `你的名字：${charName}`]
    .filter(Boolean)
    .join('\n\n')

  const user = [
    task,
    '',
    '【对方本次经期情况（仅下列信息；无备注）】',
    snapshot.slice(0, 600),
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
        max_tokens: 280,
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
    return { text: raw.slice(0, 1200), stage }
  } catch {
    return null
  }
}
