import type { ApiConfig } from '../../../api/types'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../../newFriendsPersona/ai'
import { personaDb } from '../../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../../newFriendsPersona/types'
import { loadOfflineDatingPlotsPromptBlock } from '../../dating/loadOfflineDatingPlotsForWechatPrompt'
import { formatWorldBackgroundForPrompt } from '../../newFriendsPersona/worldBackgroundFormat'
import { buildSystemContent } from '../../wechatChatAi'
import { isMarketDatasetReady, MARKET_MARKUP_FORMAT, parseMarketMarkup } from './marketMarkup'
import { formatMarketContinuityBrief } from './marketContinuity'
import type { MarketDataset } from './types'

const APPENDIX = `
---
【任务：生成角色手机「团购中心」里的生活消费痕迹】
用户正在偷看角色手机里的团购/生活服务记录。请基于人设、记忆与近期剧情，生成「像真的订过房、订过位、买过券、写过评价」的账本。

情绪定位：附近生活的烟火气——比浏览器少悬疑、比追剧更实物（票/券/订单），禁止美团式广告腔。

硬性要求：
1) 订单须覆盖酒店/餐厅/团购券/娱乐游玩；状态含待使用、已完成等，至少 1 条「待使用」。
2) 评价必须两类都有：<<MK_REVIEW>> 里 **团购体验 ≥2**（可关联订单），**地点评价 ≥2**（类别写「地点评价」，写探店/路过感，不要挂订单 id）。禁止「还可以/还不错」。
3) 浏览记录是**团购 App 站内**看过的商家/项目，不是浏览器搜索。
4) 团购券券码只露后4位。
5) 这是角色自己的记录，用户只能查看；禁止生成可核销/退款操作文案。
6) 若附带【既有团购记录】：承接口味与常去商家气质，可新增订单，勿整本换成无关消费人设。
7) 禁止 JSON；只按标记块输出。

${MARKET_MARKUP_FORMAT}
`.trim()

async function askMarkupWithRetry(
  cfg: ApiConfig,
  messages: OpenAiCompatibleMessage[],
  maxRetry = 3,
): Promise<MarketDataset> {
  let lastRaw = ''
  for (let i = 0; i < maxRetry; i += 1) {
    const raw = await openAiCompatibleChat(cfg, messages, {
      temperature: i === 0 ? 0.78 : 0.55,
    })
    lastRaw = raw
    const parsed = parseMarketMarkup(raw)
    if (isMarketDatasetReady(parsed)) return parsed!
  }
  throw new Error(`模型输出格式不稳定（多次重试失败）：${lastRaw.slice(0, 220)}`)
}

export async function generateMarketDatasetWithAi(params: {
  apiConfig: ApiConfig | null
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  useLumiProjectAssistantPrompt: boolean
  bias: string
  previousDataset?: MarketDataset | null
}): Promise<MarketDataset> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    throw new Error('未配置 AI API')
  }

  const cid = params.characterId.trim()
  const piid = params.playerIdentityId.trim()
  const character = cid ? ((await personaDb.getCharacter(cid)) as Character | null) : null
  const playerIdentity =
    piid && piid !== '__none__' ? ((await personaDb.getPlayerIdentity(piid)) as PlayerIdentity | null) : null
  const memoryNotes = (await personaDb.formatCharacterMemoriesForPrompt(cid)).trim() || undefined

  let worldBackgroundPrompt: string | undefined
  if (character?.worldBackgroundId?.trim()) {
    const bg = await personaDb.getWorldBackground(character.worldBackgroundId.trim())
    const block = formatWorldBackgroundForPrompt(bg)
    if (block.trim()) worldBackgroundPrompt = block
  }

  const promptMode = params.useLumiProjectAssistantPrompt ? 'lumi-assistant' : 'persona'
  const offlineDatingPlotsContext =
    promptMode === 'persona' && cid ? await loadOfflineDatingPlotsPromptBlock(cid, character?.name ?? null) : ''

  const baseSystem = buildSystemContent({
    character,
    playerIdentity,
    playerDisplayName: params.playerDisplayName.trim() || '朋友',
    promptMode,
    longTermMemoryNotes: memoryNotes,
    worldBackgroundPrompt,
    offlineDatingPlotsContext: offlineDatingPlotsContext || undefined,
    chatMemberIds: [cid].filter(Boolean),
  })

  const recentChatRows = cid
    ? await personaDb.listWeChatChatMessagesRecentByCharacter({ characterId: cid, limit: 36 })
    : []
  const recentChatBrief = recentChatRows
    .slice(-20)
    .map((m) => {
      const text = String(m.content || '').replace(/\s+/g, ' ').trim()
      if (!text) return null
      return `${m.type === 'character' ? '[角色]' : '[用户]'} ${text.slice(0, 72)}`
    })
    .filter((x): x is string => !!x)
    .join('\n')

  const continuity = formatMarketContinuityBrief(params.previousDataset)
  const playerName = params.playerDisplayName.trim() || '朋友'
  const userTask = `请按标记块格式生成团购生活记录。内容偏向：${params.bias.trim() || '周末出游、深夜觅食、随手买券、踩雷吐槽'}。

务必：
1) 6~12 条订单，四类都要有；至少 1 条待使用；
2) 评价两类都要写满：团购体验≥2、地点评价≥2（地点评价类别必须写「地点评价」）；
3) 浏览记录贴人设口味；评价禁止敷衍；
4) 商家名可虚构但要像本地生活，禁止「商家1」；
5) 若有既有记录：承接口味与商家气质，可新增，勿整本换人。

【近期聊天】
${recentChatBrief || '（暂无）'}

${continuity ? `${continuity}\n` : ''}角色名：${character?.name || '未知'}
用户显示名：${playerName}`

  return askMarkupWithRetry(cfg, [
    { role: 'system', content: `${baseSystem}\n\n${APPENDIX}` },
    { role: 'user', content: userTask },
  ])
}
