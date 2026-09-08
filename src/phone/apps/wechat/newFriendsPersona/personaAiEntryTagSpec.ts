/**
 * 人设世界书条目正文 `<>` 分区标签规范（提示词共用；不做解析校验）。
 * 每条只用**一个根标签**包裹全文；禁止在根标签内再嵌套小标签；场景/分段用中文写在根标签内。
 */

import {
  PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME,
  PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME,
  PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME,
  PERSONA_AI_NSFW_ENTRY_NAME,
  PERSONA_AI_SPEECH_HABIT_ENTRY_NAME,
  PERSONA_AI_TOWARD_USER_ENTRY_NAME,
  PERSONA_AI_USER_SPEECH_ENTRY_NAME,
  canonicalizePersonaAiCompactEntryName,
  isPersonaAiOccupationEpilogueName,
  isPersonaAiOrientationEpilogueName,
  isPersonaAiRelationshipHistoryEntryName,
  isPersonaAiNsfwEntryName,
} from './personaAiWorldBooks'

export type PersonaAiEntryTagDef = {
  /** 标准条目标题 */
  name: string
  root: string
  /** 一行骨架示例（仅根标签 + 中文提示） */
  skeleton: string
  /** 写入提示的简短说明 */
  hint: string
}

const DEFS: PersonaAiEntryTagDef[] = [
  {
    name: '名片基础',
    root: 'profile_card',
    skeleton:
      '<profile_card>\n身份摘要……\n年龄层……\n职业……（可变时写「详见职业快照」）\n对外标签……\n雷点……\n</profile_card>',
    hint: '身份摘要、年龄层、职业（固定时）、对外标签、雷点；全写在同一根标签内',
  },
  {
    name: PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME,
    root: 'occupation_snapshot',
    skeleton: '<occupation_snapshot>\n当下职业/社会身份……\n日常节奏……\n</occupation_snapshot>',
    hint: '当下职业与日常节奏',
  },
  {
    name: '形象与气质',
    root: 'appearance',
    skeleton:
      '<appearance>\n发色发型……\n身形体态……\n场合穿搭……\n气质与第一印象……\n</appearance>',
    hint: '发色发型、身形、场合穿搭、气质第一印象',
  },
  {
    name: '性格内核',
    root: 'personality',
    skeleton:
      '<personality>\n面具与底色……\n三观与优缺……\n身世成因……\n反差萌……\n取向……（可变时写「详见取向快照」）\n</personality>',
    hint: '面具底色、三观、身世、反差萌、取向（固定时）',
  },
  {
    name: PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME,
    root: 'orientation_snapshot',
    skeleton: '<orientation_snapshot>\n当下自我取向认同……\n边界（审美≠恋爱）……\n</orientation_snapshot>',
    hint: '当下取向认同与边界',
  },
  {
    name: '能力与日常',
    root: 'lifestyle',
    skeleton:
      '<lifestyle>\n技能爱好……\n社交态度……\n生活癖好与小习惯……\n</lifestyle>',
    hint: '技能爱好、社交态度、生活习惯；口语口头禅另条「口语习惯」',
  },
  {
    name: PERSONA_AI_SPEECH_HABIT_ENTRY_NAME,
    root: 'speech_habit',
    skeleton:
      '<speech_habit>\n语气与口头禅概要……\n日常：「……」「……」\n生气：「……」\n委屈：「……」\n难过：「……」\n撒娇：「……」\n害羞：「……」\n开心：「……」\n亲密时：「……」\n</speech_habit>',
    hint: '独立条目：说话风格 + 中文场景引语；禁止写对 {{user}} 怎么称呼；引语禁爹味/油腻（如「听话」「别闹了」）',
  },
  {
    name: '亲密与恋爱观',
    root: 'romance',
    skeleton:
      '<romance>\n一般亲密观与边界……\n恋爱前……\n恋爱后……\n吃醋……\n与恋人冲突……\n</romance>',
    hint: '一般亲密观 + 恋爱前/后/吃醋/冲突；指恋人写「对方」；露骨性爱写「亲密身体与性爱偏好」',
  },
  {
    name: PERSONA_AI_NSFW_ENTRY_NAME,
    root: 'intimate_nsfw',
    skeleton:
      '<intimate_nsfw>\n身体敏感点：……\n亲密偏好：……\n接吻：…… 口语：「……」\n被抚摸：…… 口语：「……」\n抚摸对方：…… 口语：「……」\n前戏：…… 口语：「……」\n发生关系时：…… 口语：「……」\n</intimate_nsfw>',
    hint: '成人向：敏感点、偏好、接吻/抚摸/前戏/性爱动作场景与口语；偏荤直白，偶可夹纯情；指恋人写「对方」',
  },
  {
    name: PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME,
    root: 'love_history',
    skeleton:
      '<love_history>\n过往对象与余波……\n（若母胎单身等无经历，直接写明即可）\n</love_history>',
    hint: '过往感情或母胎单身等；禁止写成与 {{user}} 当前关系',
  },
  {
    name: '人际与秘密',
    root: 'social_secret',
    skeleton:
      '<social_secret>\n对不同关系的态度差异……\n自身秘密与软肋……\n</social_secret>',
    hint: '关系态度差异 / 秘密软肋；禁止与 {{user}} 相关',
  },
  {
    name: '周边NPC',
    root: 'npc_roster',
    skeleton:
      '<npc_roster>\n姓名A：与 {{char}} 关系；性格近况；（必要时）对 {{user}}\n姓名B：……\n</npc_roster>',
    hint: '每人一段中文简介写在同一根标签内；禁止把配角写成 {{user}}',
  },
  {
    name: '相遇羁绊',
    root: 'meeting',
    skeleton:
      '<meeting>\n如何相识……\n早期互动与过程节点……\n</meeting>',
    hint: '如何相识 + 早期过程；禁止写当前关系/态度总结',
  },
  {
    name: PERSONA_AI_TOWARD_USER_ENTRY_NAME,
    root: 'toward_user',
    skeleton:
      '<toward_user>\n当前看法与关系定位……\n相处边界……\n心里分量……\n</toward_user>',
    hint: '当前看法、关系定位、边界、分量；禁止堆口语引语（用语另条）',
  },
  {
    name: PERSONA_AI_USER_SPEECH_ENTRY_NAME,
    root: 'user_speech',
    skeleton:
      '<user_speech>\n{{char}}对{{user}}的常用称呼……\n（可写何时换称呼；禁止写日常/生气等说话场景）\n</user_speech>',
    hint: '独立尾声：只写对 {{user}} 怎么叫；禁止写说话场景引语（那些只在「口语习惯」）',
  },
]

const BY_NAME = new Map(DEFS.map((d) => [d.name, d]))

export function getPersonaAiEntryTagDef(entryName: string): PersonaAiEntryTagDef | null {
  const raw = String(entryName ?? '').trim()
  if (!raw) return null
  if (BY_NAME.has(raw)) return BY_NAME.get(raw)!
  if (isPersonaAiOccupationEpilogueName(raw)) {
    return BY_NAME.get(PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME) ?? null
  }
  if (isPersonaAiOrientationEpilogueName(raw)) {
    return BY_NAME.get(PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME) ?? null
  }
  if (isPersonaAiRelationshipHistoryEntryName(raw)) {
    return BY_NAME.get(PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME) ?? null
  }
  if (isPersonaAiNsfwEntryName(raw)) {
    return BY_NAME.get(PERSONA_AI_NSFW_ENTRY_NAME) ?? null
  }
  const compact = canonicalizePersonaAiCompactEntryName(raw)
  if (compact && BY_NAME.has(compact)) return BY_NAME.get(compact)!
  return null
}

/** 单条：骨架 + 提示（用于格式说明 / 单条生成） */
export function formatPersonaAiEntryTagBlock(entryName: string): string {
  const def = getPersonaAiEntryTagDef(entryName)
  if (!def) return ''
  return `标签骨架：\n${def.skeleton}\n（${def.hint}；仅一个根标签，禁止再嵌套任何小标签；场景用中文写在根标签内）`
}

/** 整卷：所有标准条目的标签总表 */
export function buildPersonaAiEntryTagRulesBlock(): string {
  const lines = [
    '【世界书正文 · <> 分区标签 · 硬】',
    '每条【标题】下的正文必须包在**唯一对应根标签**内；**禁止**在根标签里再套小标签（如禁止 <relation>、<daily> 等子标签）。',
    '根标签内用中文分段或场景举例书写（如「日常：……」「生气：……」）。',
    '禁止只写无标签散文；禁止为凑字堆空话。旧档无标签不强制改；新生成/补全/重写必须带唯一根标签。',
    '',
  ]
  for (const d of DEFS) {
    lines.push(`· ${d.name} → <${d.root}>…</${d.root}>`)
  }
  return lines.join('\n')
}

/** 写入【条目】格式说明下的短骨架行 */
export function personaAiEntryTagSkeletonLine(entryName: string): string {
  const def = getPersonaAiEntryTagDef(entryName)
  if (!def) return ''
  return `须用唯一根标签：<${def.root}>…</${def.root}>；禁止嵌套子标签`
}
