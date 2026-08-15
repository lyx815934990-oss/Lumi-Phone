import {
  CHARACTER_EMOTION_CONFESSION_ENGINE_APPENDIX,
  LUMI_DOCTRINE_OF_LOVE_APPENDIX,
} from '../apps/wechat/wechatReplyOutputPrompt'
import { OFFLINE_DATING_FASHION_STYLING_APPENDIX } from '../apps/wechat/dating/offlineDatingFashionStylingAppendix'
import { OFFLINE_DATING_RICH_INNER_OS_APPENDIX } from '../apps/wechat/dating/offlineDatingRichInnerOsAppendix'
import { PURE_RESTRAIN_LOVE_APPENDIX } from '../apps/wechat/pureRestrainLoveAppendix'

/** 档案室系统内置预设（仅开关，正文不对用户展示） */
export type LoreArchiveBuiltinPresetId =
  | 'lumiDoctrineOfLove'
  | 'activeConfession'
  | 'pureRestrainLove'
  | 'offlineRichInnerOs'
  | 'offlineFashionStyling'

export type LoreArchiveBuiltinPresetToggles = Partial<Record<LoreArchiveBuiltinPresetId, boolean>>

export type LoreArchiveBuiltinPresetMeta = {
  id: LoreArchiveBuiltinPresetId
  title: string
  description: string
}

export const LORE_ARCHIVE_BUILTIN_PRESETS: LoreArchiveBuiltinPresetMeta[] = [
  {
    id: 'lumiDoctrineOfLove',
    title: 'Lumi 高质量爱情观',
    description:
      '系统内置：约束角色对玩家的具象付出、安全感、情绪托底与灵魂尊重。开启后注入 AI，正文不可查看或编辑。',
  },
  {
    id: 'activeConfession',
    title: '角色情感破冰与主动告白',
    description:
      '系统内置：打破暧昧循环，在适当时机完成情感交付与告白演绎。开启后注入 AI，正文不可查看或编辑。',
  },
  {
    id: 'pureRestrainLove',
    title: '纯爱克制',
    description:
      '系统内置：纯爱番式相处——纯情害羞、成全型喜欢（希望对方更好/1+1＞2）、循序渐进；禁速通攻略、自恋追问、刚在一起就深亲密或同居；情侣亲密须生涩征得同意。相处日久进入更深亲密戏时，可解锁纯情色气写法（直白/边做边夸等，仍禁强制爱）。开启后注入线上/线下 AI，正文不可查看或编辑。',
  },
  {
    id: 'offlineRichInnerOs',
    title: '线下约会·多内心 OS 描写',
    description:
      '系统内置：线下约会剧情中增加内心 OS 条数、句数与字数，并配合神态外化，减少「只会说话、没有心思」的木偶感。开启后仅注入线下约会 AI，正文不可查看或编辑。',
  },
  {
    id: 'offlineFashionStyling',
    title: '线下约会·穿搭造型描写',
    description:
      '系统内置：拉开衣着描写层次（廓形、面料、剪裁、配饰与鞋履），禁止「深灰卫衣+黑运动裤+帆布鞋」等敷衍模板。开启后仅注入线下约会 AI，正文不可查看或编辑。',
  },
]

export function resolveLoreArchiveBuiltinPresetToggles(
  raw?: LoreArchiveBuiltinPresetToggles | null,
): Record<LoreArchiveBuiltinPresetId, boolean> {
  // 未写入 / 未勾选 → 关闭；用户在档案室自行打开
  return {
    lumiDoctrineOfLove: raw?.lumiDoctrineOfLove === true,
    activeConfession: raw?.activeConfession === true,
    pureRestrainLove: raw?.pureRestrainLove === true,
    offlineRichInnerOs: raw?.offlineRichInnerOs === true,
    offlineFashionStyling: raw?.offlineFashionStyling === true,
  }
}

export function buildWechatReplyRomanceSections(
  toggles: LoreArchiveBuiltinPresetToggles | null | undefined,
): string {
  const resolved = resolveLoreArchiveBuiltinPresetToggles(toggles)
  const parts: string[] = []
  if (resolved.lumiDoctrineOfLove || resolved.activeConfession || resolved.pureRestrainLove) {
    parts.push(
      '【内置恋爱参考·效力说明】下列爱情观/告白/纯爱克制引擎与**人设世界书、全局档案室同级最高设定**（线上私聊与线下剧情均生效）。气质与口吻仍按人设表达；「尊重边界、禁止强制爱、关系阶段闸门」等硬底线**不得**以人设气质为由绕过；禁止写成霸总或强势主导。',
    )
  }
  if (resolved.lumiDoctrineOfLove) parts.push(LUMI_DOCTRINE_OF_LOVE_APPENDIX)
  if (resolved.activeConfession) parts.push(CHARACTER_EMOTION_CONFESSION_ENGINE_APPENDIX)
  if (resolved.pureRestrainLove) parts.push(PURE_RESTRAIN_LOVE_APPENDIX)
  return parts.filter(Boolean).join('\n\n')
}

export function buildWechatThinkingChainRomanceSteps(
  toggles: LoreArchiveBuiltinPresetToggles | null | undefined,
): string {
  const resolved = resolveLoreArchiveBuiltinPresetToggles(toggles)
  const steps: string[] = []
  let stepNo = 5
  if (resolved.lumiDoctrineOfLove) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十'][stepNo - 5] ?? String(stepNo)}步：内化「Lumi 高质量爱情观」（与人设/全局档案同级；硬底线不可破；条文已在输出协议；禁止复述）`,
    )
    stepNo += 1
  }
  if (resolved.activeConfession) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十'][stepNo - 5] ?? String(stepNo)}步：内化「情感破冰与告白引擎」（与人设/全局档案同级；推进节奏用人设口吻表达；条文已在输出协议；禁止复述）`,
    )
    stepNo += 1
  }
  if (resolved.pureRestrainLove) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十'][stepNo - 5] ?? String(stepNo)}步：内化「纯爱克制」（先判阶段；循序渐进禁速通；成全型喜欢；禁强制爱/刚确立深亲密；仅相处日久更深亲密戏可解锁【五附】纯情色气；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  return steps.join('\n')
}

export function buildOfflineRomanceThinkingChainSections(
  toggles: LoreArchiveBuiltinPresetToggles | null | undefined,
): string {
  const resolved = resolveLoreArchiveBuiltinPresetToggles(toggles)
  const parts: string[] = []
  if (resolved.lumiDoctrineOfLove) {
    parts.push(`【Lumi高质量爱情观】
以下为恋爱相处最高设定之一（与人设世界书/全局档案室同级；线上线下均生效）。须在思维链中对照自检；气质与表达强度用人设口吻落地，禁止借本节写成霸总/强势主导；硬底线不可破：
${LUMI_DOCTRINE_OF_LOVE_APPENDIX}`)
  }
  if (resolved.activeConfession) {
    parts.push(`【{{char}} 情感破冰与告白演绎引擎】
以下为情感推进最高设定之一（与人设/全局档案同级）。须在思维链中校准是否触发破冰/告白；语气用人设表达，禁止为「推进」改成霸总腔：
${CHARACTER_EMOTION_CONFESSION_ENGINE_APPENDIX}`)
  }
  if (resolved.pureRestrainLove) {
    parts.push(`【纯爱克制】
纯爱最高设定之一（与人设/全局档案同级）。自检：先判阶段；循序渐进禁速通攻略；成全型喜欢（希望对方更好/1+1＞2）；纯情害羞生涩；直球不压迫、禁自恋追问；非情侣禁越级亲密；刚确立禁深亲密/同居；情侣先忍再问；禁强制爱。仅当「相处日久·更深亲密」且本轮亲密戏时启用【五附】纯情色气（直白/调情戳破/边做边夸）；未达阶段禁止预习。气质跟人设，硬底线不可破：
${PURE_RESTRAIN_LOVE_APPENDIX}`)
  }
  if (resolved.offlineRichInnerOs) {
    parts.push(`【线下约会·多内心 OS 描写引擎】
以下规则为本轮线下约会内心 OS 的**硬性约束**；须在思维链中先规划 OS 分布与字数，再写正文；**覆盖**默认 OS 篇幅规则（单条不少于 40 汉字）：
${OFFLINE_DATING_RICH_INNER_OS_APPENDIX}`)
  }
  if (resolved.offlineFashionStyling) {
    parts.push(`【线下约会·穿搭造型描写引擎】
以下规则为本轮线下约会衣着描写的**硬性约束**；须在思维链中避开敷衍三件套，再写正文：
${OFFLINE_DATING_FASHION_STYLING_APPENDIX}`)
  }
  return parts.join('\n\n')
}
