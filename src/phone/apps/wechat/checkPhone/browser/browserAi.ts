import type { ApiConfig } from '../../../api/types'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../../newFriendsPersona/ai'
import { personaDb } from '../../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../../newFriendsPersona/types'
import { loadOfflineDatingPlotsPromptBlock } from '../../dating/loadOfflineDatingPlotsForWechatPrompt'
import { formatWorldBackgroundForPrompt } from '../../newFriendsPersona/worldBackgroundFormat'
import { buildSystemContent } from '../../wechatChatAi'
import { BROWSER_MARKUP_FORMAT, parseBrowserMarkup } from './browserMarkup'
import type { BrowserDataset } from './types'

const APPENDIX = `
---
【任务：生成角色手机浏览器里的私密浏览痕迹】
用户正在偷看角色手机浏览器。请基于人设、记忆与近期剧情，生成「像真的被留下的痕迹」。

硬性要求：
1) 文案要有情绪颗粒感（深夜emo、关系试探、隐秘兴趣、纠结），禁止空洞占位句。
2) 每条可点预览（历史里的文章/论坛、收藏、分享、搜索结果、常去、标签）都必须能打开对应文章或论坛正文。
2b) 论坛块须标明楼主身份（角色/网友）；回复行写成「回：角色|昵称|…」或「回：网友|昵称|…」。角色本人发言会显示其微信头像。
3) 必须生成「搜索记录」<<BR_SEARCH>> 至少 5 条（角色深夜会搜的中文短句），并配合 <<BR_SUGGEST>>。
4) 收藏夹必须是角色自己起的中文夹名（先 <<BR_FOLDER>> 再收藏引用），禁止内置默认夹（深夜/不想被看见/学习相关/emo/secret/study）；至少 2 个自建夹，收藏分散放入。
5) 每篇文章写「画面：…」具体中文场景描述（会出现在配图占位中间）。
6) 常去站名必须用中文（知乎/豆瓣/小红书等），禁止英文域名当站名。
7) 这是角色自己的浏览痕迹，不是用户的；用户只能查看。
8) 禁止 JSON；只按下方标记块输出。

${BROWSER_MARKUP_FORMAT}
`.trim()

async function askMarkupWithRetry(
  cfg: ApiConfig,
  messages: OpenAiCompatibleMessage[],
  maxRetry = 3,
): Promise<BrowserDataset> {
  let lastRaw = ''
  for (let i = 0; i < maxRetry; i += 1) {
    const raw = await openAiCompatibleChat(cfg, messages, {
      temperature: i === 0 ? 0.78 : 0.55,
    })
    lastRaw = raw
    const parsed = parseBrowserMarkup(raw)
    if (parsed && (Object.keys(parsed.articles).length > 0 || Object.keys(parsed.forums).length > 0)) {
      return parsed
    }
  }
  throw new Error(`模型输出格式不稳定（多次重试失败）：${lastRaw.slice(0, 220)}`)
}

export async function generateBrowserDatasetWithAi(params: {
  apiConfig: ApiConfig | null
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  useLumiProjectAssistantPrompt: boolean
  bias: string
}): Promise<BrowserDataset> {
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

  const recentChatRows = cid ? await personaDb.listWeChatChatMessagesRecentByCharacter({ characterId: cid, limit: 36 }) : []
  const recentChatBrief = recentChatRows
    .slice(-20)
    .map((m) => {
      const text = String(m.content || '').replace(/\s+/g, ' ').trim()
      if (!text) return null
      return `${m.type === 'character' ? '[角色]' : '[用户]'} ${text.slice(0, 72)}`
    })
    .filter((x): x is string => !!x)
    .join('\n')

  const userTask = `请按标记块格式生成浏览器痕迹。内容偏向：${params.bias.trim() || '深夜情绪、关系试探、隐秘兴趣'}。

务必：
1) 先写够文章/论坛正文；
2) 再写角色自建收藏夹 <<BR_FOLDER>>（夹名贴合人设，禁止默认三夹）；
3) 再写历史/收藏/分享；
4) 必须写满至少 5 条 <<BR_SEARCH>> 搜索记录（中文搜索词）；
5) 列表里的「页面」字段指向真实正文 id。

【近期聊天】
${recentChatBrief || '（暂无）'}

角色名：${character?.name || '未知'}`

  return askMarkupWithRetry(cfg, [
    { role: 'system', content: `${baseSystem}\n\n${APPENDIX}` },
    { role: 'user', content: userTask },
  ])
}
