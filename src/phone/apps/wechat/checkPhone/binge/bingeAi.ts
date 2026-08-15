import type { ApiConfig } from '../../../api/types'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../../newFriendsPersona/ai'
import { personaDb } from '../../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../../newFriendsPersona/types'
import { loadOfflineDatingPlotsPromptBlock } from '../../dating/loadOfflineDatingPlotsForWechatPrompt'
import { formatWorldBackgroundForPrompt } from '../../newFriendsPersona/worldBackgroundFormat'
import { buildSystemContent } from '../../wechatChatAi'
import { BINGE_MARKUP_FORMAT, isBingeDatasetReady, parseBingeMarkup } from './bingeMarkup'
import { formatBingeContinuityBrief } from './bingeContinuity'
import type { BingeDataset } from './types'

const APPENDIX = `
---
【任务：生成角色手机「追剧馆」里的观影/阅读痕迹】
用户正在偷看角色手机里的追剧观影记录 App。请基于人设、记忆与近期剧情，生成「像真的被留下的娱乐足迹」。

情绪定位：窝在沙发/被窝里追过的剧、熬夜看的小说、泡过的漫画讨论组——比浏览器更松弛、比通话更私人。

硬性要求：
1) 文案要有情绪颗粒（意难平、嗑到了、弃坑原因、凌晨刷完），禁止空洞占位与「还不错」。
2) 五种类型都要有：剧集、电影、小说、漫画、动漫；同一片海报墙混排。
3) 进度文案严格按类型格式（见下方格式说明）。
4) 至少 3 条收藏；至少 2 个讨论组，且角色本人至少发过 2 条帖（帖行写「角色|…」）。
5) 评论/短评要像人物侧写，不要影评官腔。
6) **站内搜索记录**（<<BG_SEARCH>>）= 角色在「追剧馆 App 内」搜过的内容名 / 演员名 / 作者名 / 题材关键词；**禁止**写成浏览器地址栏搜索（禁止网址、知乎/百度/小红书等站点名、与追剧无关的新闻天气查询）。
7) 这是角色自己的追剧记录，不是用户的；用户只能查看。
8) 若附带【既有追剧记录】：承接已追作品名与进度气质，可推进/新增，勿把已收藏作品改成从未看过。
9) 禁止 JSON；只按下方标记块输出。

${BINGE_MARKUP_FORMAT}
`.trim()

async function askMarkupWithRetry(
  cfg: ApiConfig,
  messages: OpenAiCompatibleMessage[],
  maxRetry = 3,
): Promise<BingeDataset> {
  let lastRaw = ''
  for (let i = 0; i < maxRetry; i += 1) {
    const raw = await openAiCompatibleChat(cfg, messages, {
      temperature: i === 0 ? 0.8 : 0.55,
    })
    lastRaw = raw
    const parsed = parseBingeMarkup(raw)
    if (isBingeDatasetReady(parsed)) return parsed!
  }
  throw new Error(`模型输出格式不稳定（多次重试失败）：${lastRaw.slice(0, 220)}`)
}

export async function generateBingeDatasetWithAi(params: {
  apiConfig: ApiConfig | null
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  useLumiProjectAssistantPrompt: boolean
  bias: string
  previousDataset?: BingeDataset | null
}): Promise<BingeDataset> {
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

  const continuity = formatBingeContinuityBrief(params.previousDataset)
  const playerName = params.playerDisplayName.trim() || '朋友'
  const userTask = `请按标记块格式生成追剧馆数据。内容偏向：${params.bias.trim() || '深夜追更、意难平、嗑糖、弃坑纠结'}。

务必：
1) 8~14 条 <<BG_ITEM>>，五类内容都要有；至少 3 条收藏：是；
2) 6~12 条 <<BG_SESSION>>；2~4 个讨论组，角色本人至少 2 条帖；
3) 4~8 条 **追剧馆站内**搜索记录（作品名/演员/作者/题材关键词）；禁止浏览器式搜索词；
4) 作品名可虚构但要贴人设口味，禁止空洞「作品1」；
5) 若有既有记录：承接作品名与进度气质，可推进/新增，勿整本换片单。

【近期聊天】
${recentChatBrief || '（暂无）'}

${continuity ? `${continuity}\n` : ''}角色名：${character?.name || '未知'}
用户显示名：${playerName}`

  return askMarkupWithRetry(cfg, [
    { role: 'system', content: `${baseSystem}\n\n${APPENDIX}` },
    { role: 'user', content: userTask },
  ])
}
