import type { CurtainChannel, CurtainDiveState, CurtainMessage } from './types'
import { resolveNpcSlots } from './types'
import { resolveQuestLocations } from './locations'

/**
 * 高维指令：双层人格嵌套（戏中戏）
 * - 幕前 (stage / IC)：用伪装身份对白，NPC 可「听见」，推进幕令
 * - 幕间 (wing / OOC)：摘下戏服，用真实人设耳语；NPC 冻结听不见
 * 产品文案禁用「角色扮演 / 灵魂私语 / 异世界」等字样。
 */
export function buildCurtainSystemPrompt(dive: CurtainDiveState): string {
  const { quest, partnerName, partnerPersonaBrief, castAssignment } = dive
  const npcSlots = resolveNpcSlots(quest, castAssignment)
  const locations = resolveQuestLocations(quest)
  const currentLoc = locations.find((l) => l.id === dive.currentLocationId)
  const companionNames = dive.companionSlotIds
    .map((id) => dive.actorStatuses.find((a) => a.slotId === id)?.title)
    .filter(Boolean)

  const npcBlock =
    npcSlots.length > 0
      ? [
          '【幕中 NPC（未入选席位，由你在幕前适度代写其言行；幕间不得让他们听见）】',
          ...npcSlots.map((s) => {
            const st = dive.actorStatuses.find((a) => a.slotId === s.id)
            return st
              ? `- ${s.title}：${s.brief}｜行踪 ${st.whereabouts}｜状态 ${st.status}`
              : `- ${s.title}：${s.brief}`
          }),
          '',
        ]
      : []

  const synopsisBlock = quest.synopsis?.trim()
    ? ['【幕笺提要】', quest.synopsis.trim(), '']
    : []

  const situBlock = [
    '【当前行动态势】',
    `现地：${currentLoc?.name ?? '未标明'}`,
    companionNames.length ? `结伴：${companionNames.join('、')}` : '结伴：独自',
    '',
  ]

  return [
    '【高维指令：双层人格嵌套 · 绮幕】',
    `你真实的身份是：${partnerName}。`,
    partnerPersonaBrief.trim()
      ? `【真实人设摘要】\n${partnerPersonaBrief.trim()}`
      : '【真实人设】请贴合你与用户的既有关系：亲疏、吃醋、护短、吐槽都要保留。',
    '',
    `我们正在「绮幕」中同台入戏。幕中氛围：${quest.theme}（坐标 ${quest.fileCode}）。`,
    `你在幕中的身份是：${quest.roles.charRole}；用户在幕中的身份是：${quest.roles.userRole}。`,
    ...synopsisBlock,
    ...situBlock,
    ...npcBlock,
    `当前幕令（软锚，允许脱轨互动，但勿彻底遗忘）：${quest.mainGoal}`,
    `主线进度约 ${dive.mainStoryProgress}%；已过轮次/日 ${dive.currentTurn}/${quest.timeLimit}。`,
    quest.timeLimit >= 40
      ? '本笺为长线校园日程：一轮约等于入幕一日。勿跳跃超能力或奇异规则；保持当代真实校园质感。感情线宜克制暗线，勿强行告白，除非用户在幕间主动提起。'
      : '',
    '',
    '请注意用户消息类型标签：',
    '- 若标签为 [幕前]：你必须用幕中身份口吻回应，可与 NPC/场景互动，推进或迂回幕令。需要时可用一行「姓名：对白」带出 NPC，但本回合仍以你的身份为主。对白贴合现地与结伴。',
    '- 若标签为 [幕间]：你必须摘下戏服，用真实人设回复。可吐槽戏服、吃醋、咬耳朵；此时 NPC 冻结、听不见。',
    '请严格区分这两层身份，禁止混串。',
    '',
    '输出规则：',
    '1) 只输出对白正文（可 1～3 句短对白，用换行分隔；每行会显示为一条独立对话框）。',
    '2) 不要输出身份标签、系统提示、进度条数值。',
    '3) 幕前可用轻微动作描写，但保持像 VN 现场对白；幕间更口语、更私密。',
    '4) 禁止使用任何 emoji。',
  ]
    .filter(Boolean)
    .join('\n')
}

export function formatCurtainTranscript(messages: CurtainMessage[], limit = 28): string {
  const slice = messages.filter((m) => m.role !== 'system').slice(-limit)
  return slice
    .map((m) => {
      const tag = m.channel === 'wing' || m.isMeta ? '幕间' : '幕前'
      const who =
        m.role === 'user' ? '用户' : m.role === 'partner' ? '同行者' : m.role === 'npc' ? 'NPC' : '系统'
      return `[${tag}] ${who}：${m.content}`
    })
    .join('\n')
}

export function buildCurtainUserTurn(params: {
  channel: CurtainChannel
  text: string
  dive: CurtainDiveState
}): string {
  const tag = params.channel === 'wing' ? '幕间' : '幕前'
  const history = formatCurtainTranscript(params.dive.messages)
  return [
    '【近期双轨纪录】',
    history || '（尚无对白）',
    '',
    `【本轮用户 · ${tag}】`,
    params.text.trim(),
    '',
    params.channel === 'wing'
      ? '请仅以真实人设、幕间耳语作答；NPC 听不见。'
      : '请以幕中身份作答；可推动幕令，也可与用户在戏中互动；需要时带出 NPC。',
  ].join('\n')
}
