import type { ApiConfig } from '../../../api/types'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../../newFriendsPersona/ai'
import { personaDb } from '../../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../../newFriendsPersona/types'
import { loadOfflineDatingPlotsPromptBlock } from '../../dating/loadOfflineDatingPlotsForWechatPrompt'
import { formatWorldBackgroundForPrompt } from '../../newFriendsPersona/worldBackgroundFormat'
import { buildSystemContent } from '../../wechatChatAi'
import { HEALTH_MARKUP_FORMAT, isHealthDatasetReady, parseHealthMarkup } from './healthMarkup'
import { applyHealthContinuityLock, formatHealthContinuityBrief } from './healthContinuity'
import type { HealthDataset } from './types'

const APPENDIX = `
---
【任务：生成角色手机「健康」App 里的电子病历痕迹】
用户正在偷看角色手机健康档案。请基于人设、记忆与近期剧情，生成「像真去过医院/体检中心留下的记录」。

情绪定位：冷静纸质病历夹，信息密度高；禁止真实医疗 App 大红警报腔，禁止恐吓绝症堆砌。

硬性要求：
1) 就诊记录 3~8 条，含医院/科室/时间/主诉/检查/诊断/医嘱。
2) 全身健康册必须写满 10 个系统章节（surface…lifestyle），正文要「非常详细」但仍是病历口吻；心理章写门诊印象。
3) 至少 1 份体检报告：必须写齐年龄、身高、体重、BMI、血糖、体脂率（可加血压），再写多项检验指标与结论。
4) 可含用药清单；生殖相关克制。
5) 面诊记录 2~5 条：每条须含「病案记录单」（来诊原因、多条问诊要点、脉诊/望诊/舌诊、诊断、处方药行与煎服）+ 患/医当面问诊对话；对话贴合人设口语，可关联就诊 id。
6) 这是角色自己的健康记录，用户只能查看；禁止挂号/支付按钮文案。
7) 若提示中附带【既有健康档案】：血型/过敏/身高体重量级等体质字段必须与之一致；就诊与用药须承接历史，可新增后续记录，禁止整份换成另一套互斥病史。
8) 禁止 JSON；只按标记块输出。

${HEALTH_MARKUP_FORMAT}
`.trim()

async function askMarkupWithRetry(
  cfg: ApiConfig,
  messages: OpenAiCompatibleMessage[],
  maxRetry = 3,
): Promise<HealthDataset> {
  let lastRaw = ''
  for (let i = 0; i < maxRetry; i += 1) {
    const raw = await openAiCompatibleChat(cfg, messages, {
      temperature: i === 0 ? 0.75 : 0.5,
    })
    lastRaw = raw
    const parsed = parseHealthMarkup(raw)
    if (isHealthDatasetReady(parsed)) return parsed!
  }
  throw new Error(`模型输出格式不稳定（多次重试失败）：${lastRaw.slice(0, 220)}`)
}

export async function generateHealthDatasetWithAi(params: {
  apiConfig: ApiConfig | null
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  useLumiProjectAssistantPrompt: boolean
  bias: string
  /** 上一轮已落库档案：再生成时锚定连续性 */
  previousDataset?: HealthDataset | null
}): Promise<HealthDataset> {
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

  const continuity = formatHealthContinuityBrief(params.previousDataset)
  const playerName = params.playerDisplayName.trim() || '朋友'
  const userTask = `请按标记块格式生成健康档案。内容偏向：${params.bias.trim() || '体检复查、熬夜伤肝、心理随访、运动损伤'}。

务必：
1) 就诊≥3；全身10系统都要详细正文；体检≥1（须含年龄/身高/体重/BMI/血糖/体脂率）；面诊≥2（每条须有病案单字段 + ≥6句患/医交替）；
2) 贴合人设体质与近期剧情，禁止空洞「未见异常」糊弄全身册；身高体重 BMI 自洽；
3) 心理章有人物侧写，勿贴网文病娇标签；
4) 面诊病案单像纸质门诊记录（问诊要点、脉望舌、诊断、处方用意批注）；对话像真实门诊，勿书面复读；
5) 若有既有档案：体质字段（尤其血型）必须一致；就诊/用药在承接历史基础上可新增，勿整本换人。

【近期聊天】
${recentChatBrief || '（暂无）'}

${continuity ? `${continuity}\n` : ''}角色名：${character?.name || '未知'}
用户显示名：${playerName}`

  const generated = await askMarkupWithRetry(cfg, [
    { role: 'system', content: `${baseSystem}\n\n${APPENDIX}` },
    { role: 'user', content: userTask },
  ])
  return applyHealthContinuityLock(generated, params.previousDataset)
}
