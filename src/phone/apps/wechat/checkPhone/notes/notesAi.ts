import type { ApiConfig } from '../../../api/types'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../../newFriendsPersona/ai'
import { personaDb } from '../../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../../newFriendsPersona/types'
import { loadOfflineDatingPlotsPromptBlock } from '../../dating/loadOfflineDatingPlotsForWechatPrompt'
import { formatWorldBackgroundForPrompt } from '../../newFriendsPersona/worldBackgroundFormat'
import { buildSystemContent } from '../../wechatChatAi'
import type { PrivateMemo } from './memoTypes'
import {
  isNotesSyncReady,
  NOTES_MARKUP_FORMAT,
  parseNotesMarkup,
  type NotesSyncResult,
} from './notesMarkup'

export type { NotesSyncResult }

const NOTES_SYNC_SYSTEM_APPENDIX = `
---
【任务：同步角色手机里的私密备忘录】
你现在要扮演该角色本人，基于“现有备忘录”做增删改同步，必须贴合：
- 角色档案/世界书
- 长期记忆
- 线上对话与线下剧情上下文

情绪定位：私密手账，短句、碎念、可带一点情绪颗粒；禁止客服腔。

硬性要求：
1) 禁止 JSON；只按标记块输出（见下方格式）。
2) 新增 <<NM_ADD>> / 更新 <<NM_UPDATE>> / 删除 <<NM_DELETE>>；add+update 总数尽量接近用户要求条数；delete 0~2。
3) 每条至少 4 个内容行，且至少 1 行「正文：」；可有 h1/小标题/语音/文件/图片。
4) 至少 1 段正文带颜色（正文：…|#D946EF）。
5) 内容偏向必须明显体现；不要编造与既有记忆明显冲突的人设行为。
6) 对于“谁给谁发红包/转账/礼物”等方向性事件，必须严格以角色视角复述：
   - 角色是第一人称“我”，玩家是“你”。
   - 不允许把“角色给玩家”写反成“玩家给角色”。
7) 设备归属与偷窥视角硬约束（高优先）：
   - 当前是“用户正在查看角色手机里的私密备忘录”。
   - 允许写主观情绪、占有欲、吃醋等，但不得把行为写成“我去翻你的手机/查你通讯录”，除非上游记忆已明确发生。
8) 对话方向硬约束（高优先）：
   - 锚点 [角色→用户] / [用户→角色] 必须按箭头方向复述称呼与动作施受，禁止反写。
9) 动作施动方/承受方不可反转（最高优先）：安慰、道歉、称呼、邀约、送礼、红包/转账、捏肩等严禁写反；不确定时用中性表述。

${NOTES_MARKUP_FORMAT}
`.trim()

function summarizeExistingNotes(notes: PrivateMemo[]): string {
  if (!notes.length) return '（当前为空，请全部用 NM_ADD 新建）'
  return notes
    .slice(0, 24)
    .map((n, i) => {
      const preview = n.blocks
        .filter((b) => b.type === 'text' || b.type === 'h1' || b.type === 'h2')
        .slice(0, 2)
        .map((b) => ('content' in b ? b.content : ''))
        .filter(Boolean)
        .join(' / ')
      return `${i + 1}. id=${n.id}｜${n.title}｜${n.date}${preview ? `｜${preview.slice(0, 48)}` : ''}`
    })
    .join('\n')
}

async function askMarkupWithRetry(
  cfg: ApiConfig,
  messages: OpenAiCompatibleMessage[],
  expectCount: number,
  maxRetry = 3,
): Promise<NotesSyncResult> {
  let lastRaw = ''
  for (let i = 0; i < maxRetry; i += 1) {
    const raw = await openAiCompatibleChat(cfg, messages, {
      temperature: i === 0 ? 0.78 : 0.5,
    })
    lastRaw = raw
    const parsed = parseNotesMarkup(raw)
    if (isNotesSyncReady(parsed, expectCount)) {
      const count = Math.min(10, Math.max(1, expectCount))
      return {
        add: parsed!.add.slice(0, count),
        update: parsed!.update.slice(0, Math.max(1, count)),
        deleteIds: parsed!.deleteIds,
      }
    }
  }
  throw new Error(`模型输出格式不稳定（多次重试失败）：${lastRaw.slice(0, 220)}`)
}

export async function syncPrivateMemosWithAi(params: {
  apiConfig: ApiConfig | null
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  useLumiProjectAssistantPrompt: boolean
  count: number
  bias: string
  currentNotes: PrivateMemo[]
}): Promise<NotesSyncResult> {
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

  const wbNotesIds = [cid].map((x) => String(x ?? '').trim()).filter((x) => x && x !== '__none__')
  const baseSystem = buildSystemContent({
    character,
    playerIdentity,
    playerDisplayName: params.playerDisplayName.trim() || '朋友',
    promptMode,
    longTermMemoryNotes: memoryNotes,
    worldBackgroundPrompt,
    offlineDatingPlotsContext: offlineDatingPlotsContext || undefined,
    chatMemberIds: wbNotesIds,
  })

  const recentChatRows = cid
    ? await personaDb.listWeChatChatMessagesRecentByCharacter({ characterId: cid, limit: 60 })
    : []
  const recentChatDirectionAnchors = recentChatRows
    .slice(-40)
    .map((m) => {
      const text = String(m.content || '').replace(/\s+/g, ' ').trim()
      if (!text) return null
      const dir = m.type === 'character' ? '[角色→用户]' : '[用户→角色]'
      return `${dir} ${text.slice(0, 80)}`
    })
    .filter((x): x is string => !!x)
    .join('\n')

  const count = Math.min(10, Math.max(1, Math.round(params.count)))
  const userTask = `请按标记块格式同步备忘录。期望变化条数：${count}。内容偏向：${params.bias.trim() || '情绪、关系与日常观察'}。

务必：
1) 主要用 <<NM_ADD>> 新建；若要改旧笔记用 <<NM_UPDATE>>（id 必须来自下方清单）；
2) 删除可选，最多 2 条 <<NM_DELETE>>；
3) 禁止 JSON；每条至少 4 行内容块。

【现有备忘录清单（仅 id/标题摘要，供 update/delete）】
${summarizeExistingNotes(params.currentNotes)}

【最近聊天方向锚点（严格按箭头方向理解称呼归属）】
${recentChatDirectionAnchors || '（暂无）'}`

  return askMarkupWithRetry(
    cfg,
    [
      { role: 'system', content: `${baseSystem}\n\n${NOTES_SYNC_SYSTEM_APPENDIX}` },
      { role: 'user', content: userTask },
    ],
    count,
  )
}
