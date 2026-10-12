/**
 * 游乐空间 · LLM 伴玩反应层（仅情绪价值，不参与游戏逻辑）
 */

import type { ApiConfig } from '../../api/types'
import type { Character } from '../newFriendsPersona/types'
import { buildCharacterCard } from '../wechatChatAi'
import {
  RELATIONSHIP_STAGE_MODULES,
  type RelationshipStage,
} from '../wechatChatPrompt'
import { MONOPOLY_ANTI_XIA_TOU_RULES } from './games/monopoly/monopolyBanter'
import type { GameEventType, MiniGameType } from './types'
import { getGameDisplayName } from './gameCatalog'

const EVENT_LABELS: Record<GameEventType, string> = {
  combo: '连击/消除',
  crisis: '危机/快输了',
  gameOver: '游戏结束',
  opponentMove: '对手妙棋',
  milestone: '里程碑',
  win: '胜利',
  lose: '失败',
}

export async function fetchGameReaction(params: {
  api: ApiConfig | null
  character: Character | null
  gameType: MiniGameType
  eventType: GameEventType
  eventDetail?: string
  score?: number
  /** 可选：注入关系阶段语气模块（不全量加载微信核心层） */
  relationshipStage?: RelationshipStage | null
}): Promise<string | null> {
  const { api, character, gameType, eventType, eventDetail, score, relationshipStage } = params
  if (!api?.apiUrl?.trim() || !api.apiKey?.trim() || !api.modelId?.trim()) return null

  const gameName = getGameDisplayName(gameType)
  const eventLabel = EVENT_LABELS[eventType]
  const persona = buildCharacterCard(character, { bioMaxChars: 280 })

  const stageBlock =
    relationshipStage && RELATIONSHIP_STAGE_MODULES[relationshipStage]
      ? `【关系阶段语气】\n${RELATIONSHIP_STAGE_MODULES[relationshipStage].trim()}`
      : ''

  const monopolyRules =
    gameType === 'monopoly'
      ? [
          '【大富翁对战反下头】',
          MONOPOLY_ANTI_XIA_TOU_RULES,
          '赢了或收租后最多一句得意，紧跟软化或进度播报；禁止连续嘲讽。',
        ].join('\n')
      : ''

  const system = [
    '你是微信聊天中的角色，正在旁观或参与用户的小游戏对局。',
    persona ? `【你的人设】\n${persona}` : '【人设】高冷、克制、偶尔毒舌的伴玩者。',
    stageBlock,
    '规则：',
    `- 用户正在玩「${gameName}」。`,
    `- 刚刚触发事件：${eventLabel}${eventDetail ? `（${eventDetail}）` : ''}${typeof score === 'number' ? `，当前分数 ${score}` : ''}。`,
    '- 结合你的人设与关系阶段，给出不超过20个字的一句评价或指导。',
    '- 直接返回一句中文对白，不要引号、不要前缀、不要解释。',
    monopolyRules,
  ]
    .filter(Boolean)
    .join('\n')

  const user = '请给出你的伴玩反应。'

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
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.88,
        max_tokens: 60,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    return raw.replace(/^["「『]|["」』]$/g, '').slice(0, 40) || null
  } catch {
    return null
  }
}
