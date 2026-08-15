import type { ApiConfig } from '../../api/types'
import { openAiCompatibleChat } from '../newFriendsPersona/ai'
import { personaDb } from '../newFriendsPersona/idb'
import { buildCharacterCard } from '../wechatChatAi'
import { buildCurtainSystemPrompt, buildCurtainUserTurn } from './prompt'
import type { CurtainChannel, CurtainDiveState } from './types'

export async function loadPartnerPersonaBrief(characterId: string): Promise<string> {
  try {
    const ch = await personaDb.getCharacter(characterId)
    if (!ch) return ''
    return buildCharacterCard(ch, { bioMaxChars: 900 }).trim()
  } catch {
    return ''
  }
}

export async function requestCurtainPartnerReply(params: {
  apiConfig: ApiConfig | null
  dive: CurtainDiveState
  channel: CurtainChannel
  userText: string
}): Promise<string> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    throw new Error('未配置 AI API')
  }

  const system = buildCurtainSystemPrompt(params.dive)
  const user = buildCurtainUserTurn({
    channel: params.channel,
    text: params.userText,
    dive: params.dive,
  })

  const text = await openAiCompatibleChat(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], {
    temperature: params.channel === 'wing' ? 0.82 : 0.78,
  })

  return text
    .replace(/^\s*【[^】]+】\s*/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .trim()
}

export function splitPartnerBubbles(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
}
