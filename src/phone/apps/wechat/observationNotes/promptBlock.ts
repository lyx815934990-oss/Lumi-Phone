import { personaDb } from '../newFriendsPersona/idb'
import type { PlayerIdentity } from '../newFriendsPersona/types'
import { loadObservationNotes } from './store'
import type { ObservationNotesDoc } from './types'
import { BASIC_FIELD_META, fieldText } from './types'
import {
  formatKnownUserFactsForObservationNotes,
  isObservationNotesMostlyEmpty,
} from './knownUserFacts'
import { formatObservationNotesUpdateContextBlock } from './previousVersion'

/** 注入 system：char 对 user 的深层认知（与可变人生账本同级最高设定：规范对待方式） */
export function formatObservationNotesPromptBlock(doc: ObservationNotesDoc): string {
  const lines: string[] = [
    '【私藏侧写 · 对 {{user}} 的深层认知｜与人生账本同级｜规范我如何看待/称呼/对待对方｜第一人称整理稿】',
    `笔记标题：${doc.title}`,
    `更新于：${new Date(doc.updatedAt).toISOString()}`,
    '',
    '— 基础认知 —',
  ]
  for (const meta of BASIC_FIELD_META) {
    lines.push(`${meta.label}：${fieldText(doc.basic[meta.key])}`)
  }
  if (doc.intimate.length) {
    lines.push('', '— 亲密偏好认知（性向身体亲密：节奏/XP/敏感处/方式；私密，勿无故宣之于口）—')
    for (const row of doc.intimate) {
      lines.push(`${row.label}：${fieldText(row.field)}`)
    }
  }
  if (doc.strengths.length || doc.weaknesses.length) {
    lines.push('', '— 优点 —')
    for (const s of doc.strengths) lines.push(`· ${s}`)
    lines.push('— 缺点 —')
    for (const s of doc.weaknesses) lines.push(`· ${s}`)
  }
  if (doc.remarkNickname.trim()) {
    lines.push(
      '',
      `给你的线上备注（须匹配好感/关系；深爱可腻称；禁XX狗/XX猫；非公开昵称）：${doc.remarkNickname.trim()}`,
    )
  }
  if (doc.preferredAddress.trim()) {
    lines.push(`你喜欢的称呼（我怎么叫你）：${doc.preferredAddress.trim()}`)
  }
  if (doc.personalityRadar.axes.length) {
    lines.push(
      '',
      '人格倾向（MBTI）：' +
        doc.personalityRadar.axes.map((a) => `${a.label}${Math.round(a.value)}`).join(' / '),
    )
  }
  if (doc.abilityRadar.axes.length) {
    lines.push(
      '内在能力：' + doc.abilityRadar.axes.map((a) => `${a.label}${Math.round(a.value)}`).join(' / '),
    )
  }
  if (doc.overallEvaluation.trim()) {
    lines.push('', '— 总体评价 —', doc.overallEvaluation.trim())
  }
  lines.push(
    `自认好感：${Math.round(doc.affection)}（${doc.affectionStageLabel}）`,
    `目前关系：${doc.relationshipLabel}`,
    '',
    '【侧写定位｜活的认知，不是铁律】',
    '- 本档只是「我（char）目前以为自己了解的 {{user}}」——**第一人称**观察笔记，会随对话持续改写，**不代表我永远这么认定**。',
    '- 全文须像我会私下整理的笔记：贴人设、贴当前亲密关系；禁止中立档案腔或把关系/称呼压成百科短标签。',
    '- 称呼、食物、雷点、爱好、以及亲密/XP/敏感处/亲密方式（均为**性向身体亲密**认知，非感情节奏）：一律以 **{{user}} 本轮反应与亲口自述** 为准；与本档冲突时，本档立刻作废该条旧认知。',
    '- **学校/专业/职业等客观背景**：以系统注入的玩家身份卡为准；用户改过身份卡后，旧侧写里的普通大学等残留必须覆盖。',
    '- **「不知道」vs 本轮召回**：侧写某栏写着尚不清楚/暂时不知道时，若本轮【向量召回】/【关键词命中】已写出对应事实，**以召回为准接话与答卷覆盖**，禁止仍当不知道；本轮未注入的旧记忆不得凭空当作已知。',
    '- 「线上备注」须与上方**好感数值 + 目前关系**匹配：好感低→全名/克制；好感高/深爱→可小名/缩写+emoji，也可宝宝/宝贝/老公老婆等；**禁止动物系宠称**（XX狗/XX猫/小狗狗等）。',
    '- 冲突时的接话范式：可承认旧印象并收下新说法（例：「这样吗？我以为你喜欢吃辣的，我记住了。」），**禁止**用旧侧写抬杠、反问「你不是喜欢吗」、装作没听见纠正。',
    '- 亲密字段同理：对方说不想要/不喜欢某种身体靠近、吻触或玩法时，立刻按对方当前意愿接话，并在答卷覆盖亲密/XP/敏感处/亲密方式；禁止写成慢热恋爱、催告白一类感情空话。',
    '- 有冲突或本轮召回补齐了「不知道」时答卷必须改写对应字段；无新证据才可「无变化」。',
  )
  return lines.join('\n').trim()
}

export async function loadObservationNotesPromptBlock(params: {
  conversationCharacterId: string
  playerIdentityId: string
  /** 为 true 时附带上一版对照 + 已知线索（自动更新开启时用） */
  includePreviousVersion?: boolean
  playerIdentity?: PlayerIdentity | null
  playerDisplayName?: string
}): Promise<string> {
  const cid = params.conversationCharacterId.trim()
  const pid = params.playerIdentityId.trim()
  if (!cid || !pid || pid === '__none__') return ''
  try {
    const doc = await loadObservationNotes({
      conversationCharacterId: cid,
      playerIdentityId: pid,
      charDisplayName: 'TA',
      seedIfEmpty: false,
    })
    if (!doc) return ''
    if (params.includePreviousVersion) {
      let identity = params.playerIdentity ?? null
      if (!identity) {
        try {
          identity = (await personaDb.getPlayerIdentity(pid)) as PlayerIdentity | null
        } catch {
          identity = null
        }
      }
      const known = formatKnownUserFactsForObservationNotes(identity, params.playerDisplayName)
      return formatObservationNotesUpdateContextBlock(doc, { knownUserFactsBlock: known })
    }
    return formatObservationNotesPromptBlock(doc)
  } catch {
    return ''
  }
}

/** 供自动更新附录判断是否首次补齐 */
export async function loadObservationNotesInitialFillFlag(params: {
  conversationCharacterId: string
  playerIdentityId: string
}): Promise<boolean> {
  const doc = await loadObservationNotes({
    conversationCharacterId: params.conversationCharacterId,
    playerIdentityId: params.playerIdentityId,
    charDisplayName: 'TA',
    seedIfEmpty: false,
  })
  if (!doc) return true
  return isObservationNotesMostlyEmpty(doc)
}
