import type { PlayerIdentity } from '../newFriendsPersona/types'
import type { ObservationNotesDoc } from './types'
import { fieldText } from './types'

/** 侧写是否几乎空白（尚未真正写过） */
export function isObservationNotesMostlyEmpty(doc: ObservationNotesDoc): boolean {
  const isPlaceholder = (t: string) => !t || t === '尚不清楚' || t === '私密'
  const basicEmpty = (Object.keys(doc.basic) as Array<keyof typeof doc.basic>).every((k) =>
    isPlaceholder(fieldText(doc.basic[k])),
  )
  const intimateEmpty = doc.intimate.every((r) => isPlaceholder(fieldText(r.field)))
  return (
    basicEmpty &&
    intimateEmpty &&
    !doc.remarkNickname.trim() &&
    !doc.preferredAddress.trim() &&
    !doc.overallEvaluation.trim() &&
    doc.strengths.length === 0 &&
    doc.weaknesses.length === 0 &&
    doc.changeHistory.length === 0
  )
}

/** 从玩家身份档案抽出「已可知」的客观线索，供侧写首次落笔 */
export function formatKnownUserFactsForObservationNotes(
  playerIdentity: PlayerIdentity | null | undefined,
  playerDisplayName?: string,
  opts?: { evidenceMode?: 'chat_recall' | 'recent_rounds' },
): string {
  if (!playerIdentity && !playerDisplayName?.trim()) {
    return opts?.evidenceMode === 'recent_rounds'
      ? '【关于 {{user}} 的已知档案线索】\n（暂无玩家身份档案；仅能根据近端对话与侧写原稿推断。）'
      : '【关于 {{user}} 的已知档案线索】\n（暂无玩家身份档案；仅能根据对话与记忆推断。）'
  }
  const lines: string[] = [
    '【关于 {{user}} 的已知档案线索（可写入侧写；须用你本人的口吻转述，勿照抄公文）】',
  ]
  const realName = playerIdentity?.name?.trim() || ''
  const wxNick = playerIdentity?.wechatNickname?.trim() || ''
  const display = playerDisplayName?.trim() || ''
  if (realName) {
    lines.push(
      `- 真实姓名：${realName} → 答卷「姓名｜……」写全名/常用本名；「线上备注」在好感低/关系浅时优先用此全名。`,
    )
  } else if (display && display !== wxNick) {
    lines.push(`- 常用名线索：${display} → 答卷「姓名｜……」可据此落笔。`)
  }
  if (wxNick && wxNick !== realName) {
    lines.push(
      `- 对方微信**公开昵称**：${wxNick}（只是对方自己设的展示名，**禁止**原样当作「线上备注」；备注可姓名/小名/深爱腻称；**禁XX狗/XX猫**，勿抄公开昵称）。`,
    )
  }
  if (playerIdentity?.gender) {
    const g =
      playerIdentity.gender === 'female' ? '女' : playerIdentity.gender === 'male' ? '男' : '其他'
    lines.push(`- 性别：${g} → 答卷可写：性别｜${g}`)
  }
  if (typeof playerIdentity?.age === 'number' && Number.isFinite(playerIdentity.age)) {
    lines.push(`- 年龄线索：约 ${playerIdentity.age} 岁（仅作参考，侧写可写「大概…」）`)
  }
  if (playerIdentity?.identity?.trim()) {
    lines.push(
      `- 身份/职业线索（**玩家身份卡当前权威**）：${playerIdentity.identity.trim()} → 侧写里学校/专业/主业须跟此一致；旧侧写或旧对话写的普通大学等若冲突，必须按本卡改写。`,
    )
  }
  if (playerIdentity?.bio?.trim()) {
    lines.push(
      `- 简介线索（身份卡）：${playerIdentity.bio.trim().slice(0, 200)} → 学校/专业等背景以本简介为准，压过旧侧写与修订前聊天残留。`,
    )
  }
  if (playerIdentity?.motto?.trim()) {
    lines.push(`- 座右铭线索：${playerIdentity.motto.trim().slice(0, 120)}`)
  }
  lines.push(
    '- 「线上备注」vs「称呼」vs「姓名」：姓名＝对方是谁；线上备注＝你通讯录备注（跟好感/关系对齐；默认像人设，深爱可腻称含宝宝/宝贝等；**禁止XX狗/XX猫等动物系宠称**）；称呼＝你口头怎么叫。勿抄公开昵称。',
    '- **身份卡修订优先**：用户改过身份卡后，学校/专业/职业等客观背景以**当前身份卡**为准；旧侧写、旧记忆、旧聊天里的旧大学/旧专业视为残留，须覆盖，禁止「无变化」硬留。',
    '- 食物/称呼/雷点/爱好：若对话里出现过更具体说法，优先用剧情证据；与用户最近反应冲突时以用户当前反应为准。',
    '- 亲密/XP/敏感处/亲密方式：只记**性向身体亲密**（节奏如热烈/慢慢/半推半就；部位 XP；敏感处；接吻拥抱等具体方式），禁止写成感情节奏；冲突时以用户当前意愿为准。',
    opts?.evidenceMode === 'recent_rounds'
      ? '- **暂时不知道**：事实栏无依据可写「尚不清楚／暂时不知道」；但若近端轮次或当前侧写原稿/上一版已写出该事实，必须以之为准覆盖，禁止仍写不知道。本轮未注入的旧记忆不得当作已知。'
      : '- **暂时不知道**：事实栏无依据可写「尚不清楚／暂时不知道」；但若本轮【向量召回】/【关键词命中】已写出该事实，必须以召回为准覆盖，禁止仍写不知道。未出现在本轮注入材料里的旧记忆，不得当作已知。',
  )
  return lines.join('\n')
}

/**
 * 若模型把对方微信公开昵称原样写成「线上备注」，改回全名（或清空待下次重写）。
 */
export function sanitizeObservationRemarkNickname(
  remark: string,
  opts: { realName?: string | null; wechatNickname?: string | null; displayName?: string | null },
): string {
  const r = String(remark ?? '').trim()
  if (!r) return ''
  const real = String(opts.realName ?? '').trim()
  const wx = String(opts.wechatNickname ?? '').trim()
  const disp = String(opts.displayName ?? '').trim()
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const rn = norm(r)
  const isWxCopy =
    (wx && (rn === norm(wx) || rn === norm(`${wx}。`) || rn === norm(`${wx}！`))) ||
    (disp && disp !== real && rn === norm(disp) && (!real || rn !== norm(real)))
  if (isWxCopy) {
    return real || ''
  }
  return r
}

/** path 别名归一（模型常漏写 basic. 前缀或用中文） */
export function normalizeObservationNotesPatchPath(raw: string): string {
  let p = String(raw ?? '').trim()
  if (!p) return ''
  p = p.replace(/^字段\s*[:：]\s*/i, '').trim()
  const aliases: Record<string, string> = {
    name: 'basic.name',
    姓名: 'basic.name',
    名字: 'basic.name',
    gender: 'basic.gender',
    性别: 'basic.gender',
    orientation: 'basic.orientation',
    性取向: 'basic.orientation',
    取向: 'basic.orientation',
    favoriteFoods: 'basic.favoriteFoods',
    喜欢的食物: 'basic.favoriteFoods',
    食物: 'basic.favoriteFoods',
    taboos: 'basic.taboos',
    雷点: 'basic.taboos',
    hobbies: 'basic.hobbies',
    兴趣爱好: 'basic.hobbies',
    爱好: 'basic.hobbies',
    备注: 'remarkNickname',
    线上备注: 'remarkNickname',
    称呼: 'preferredAddress',
    喜欢的称呼: 'preferredAddress',
    总体评价: 'overallEvaluation',
    好感: 'affection',
    好感度: 'affection',
    关系: 'relationshipLabel',
    目前关系: 'relationshipLabel',
    优点: 'strengths',
    缺点: 'weaknesses',
    亲密: 'intimate.pref',
    亲密偏好: 'intimate.pref',
    XP: 'intimate.xp',
    亲密XP: 'intimate.xp',
    xp: 'intimate.xp',
    敏感处: 'intimate.sensitive',
    身体敏感处: 'intimate.sensitive',
    敏感: 'intimate.sensitive',
    亲密方式: 'intimate.ways',
    喜欢的亲密方式: 'intimate.ways',
    方式: 'intimate.ways',
    人格: 'personalityRadar',
    人格倾向: 'personalityRadar',
    人格注: 'personalityRadar.note',
    能力: 'abilityRadar',
    能力注: 'abilityRadar.note',
  }
  if (aliases[p]) return aliases[p]
  const lower = p.toLowerCase()
  if (aliases[lower]) return aliases[lower]
  return p
}
