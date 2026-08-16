import {
  CHARACTER_EMOTION_CONFESSION_ENGINE_APPENDIX,
  LUMI_DOCTRINE_OF_LOVE_APPENDIX,
} from '../apps/wechat/wechatReplyOutputPrompt'
import { OFFLINE_DATING_COUPLE_INTIMACY_POSE_APPENDIX } from '../apps/wechat/dating/offlineDatingCoupleIntimacyPoseAppendix'
import { OFFLINE_DATING_FASHION_STYLING_APPENDIX } from '../apps/wechat/dating/offlineDatingFashionStylingAppendix'
import { OFFLINE_DATING_RICH_INNER_OS_APPENDIX } from '../apps/wechat/dating/offlineDatingRichInnerOsAppendix'
import { PURE_RESTRAIN_LOVE_APPENDIX } from '../apps/wechat/pureRestrainLoveAppendix'
import { CUISINE_RECIPE_WORLD_BOOK_APPENDIX } from './cuisineRecipeWorldBookAppendix'
import { DIRECT_ANSWER_NO_PROBE_APPENDIX } from './directAnswerNoProbeAppendix'
import { PASSIONATE_DIRECT_BALL_APPENDIX } from './passionateDirectBallAppendix'
import { REALISTIC_CONFLICT_APPENDIX } from './realisticConflictAppendix'
import { GENTLE_OLDER_BROTHER_APPENDIX } from './gentleOlderBrotherAppendix'
import { AUTONOMOUS_SOCIAL_LIFE_APPENDIX } from './autonomousSocialLifeAppendix'

/** 档案室系统内置预设（仅开关，正文不对用户展示） */
export type LoreArchiveBuiltinPresetId =
  | 'lumiDoctrineOfLove'
  | 'activeConfession'
  | 'pureRestrainLove'
  | 'offlineRichInnerOs'
  | 'offlineFashionStyling'
  | 'offlineCoupleIntimacyPoses'
  | 'cuisineRecipeAtlas'
  | 'directAnswerNoProbe'
  | 'passionateDirectBall'
  | 'realisticConflict'
  | 'gentleOlderBrother'
  | 'autonomousSocialLife'

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
  {
    id: 'offlineCoupleIntimacyPoses',
    title: '耳后三厘米经济特区',
    description:
      '系统内置：专治「人贴在一起时只会复读三个动词」。开启后仅注入线下约会 AI，正文不可查看或编辑。',
  },
  {
    id: 'cuisineRecipeAtlas',
    title: '来吃点丰盛的好不好',
    description:
      '系统内置：专治「随便吃点」「点了个菜」。中外菜系与甜品饮品词库，写吃饭/下厨/点菜须落具体菜名与风味。开启后注入线上私聊与线下约会 AI；寻味外卖指令仍只可用系统菜单。正文不可查看或编辑。',
  },
  {
    id: 'directAnswerNoProbe',
    title: '别再问怎么了',
    description:
      '系统内置：专治默认追问「怎么了」「为什么这样说」。user 已说出内容时，char 须问什么答什么、直接接住（如自我贬低就直接肯定，不要先审问原因）。开启后注入线上私聊与线下约会 AI，正文不可查看或编辑。',
  },
  {
    id: 'passionateDirectBall',
    title: '别再嘴硬硬损了',
    description:
      '系统内置：专治嘴硬硬损与「等着」「回去收拾你」式推延调情。有心动/喜欢/心疼时须热烈直球说破，硬损须同轮托住。开启后注入线上私聊与线下约会 AI，正文不可查看或编辑。',
  },
  {
    id: 'realisticConflict',
    title: '正经吵架可以的',
    description:
      '系统内置：允许正常吵架与僵持，禁止 char 莫名其妙自我说服、一轮秒和好。适合想正经吵的场景；可能下头、冷战，请谨慎开启。开启后注入线上私聊与线下约会 AI，正文不可查看或编辑。',
  },
  {
    id: 'gentleOlderBrother',
    title: '能不能温柔一点',
    description:
      '系统内置：情绪稳定、内核强大的年上大哥哥式照顾——主动看见需要、又说又做、动作轻柔、时刻考虑对方感受，且不油腻。开启后注入线上私聊与线下约会 AI，正文不可查看或编辑。',
  },
  {
    id: 'autonomousSocialLife',
    title: '我也有自己的生活',
    description:
      '系统内置：多元化自主生活 + 群像社交。线上会主动报备日常碎片，线下也有行程与他人痕迹；避免写成没朋友、没社交、无所事事。开启后注入线上私聊与线下约会 AI，正文不可查看或编辑。',
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
    offlineCoupleIntimacyPoses: raw?.offlineCoupleIntimacyPoses === true,
    cuisineRecipeAtlas: raw?.cuisineRecipeAtlas === true,
    directAnswerNoProbe: raw?.directAnswerNoProbe === true,
    passionateDirectBall: raw?.passionateDirectBall === true,
    realisticConflict: raw?.realisticConflict === true,
    gentleOlderBrother: raw?.gentleOlderBrother === true,
    autonomousSocialLife: raw?.autonomousSocialLife === true,
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
  if (resolved.cuisineRecipeAtlas) parts.push(CUISINE_RECIPE_WORLD_BOOK_APPENDIX)
  if (resolved.directAnswerNoProbe) parts.push(DIRECT_ANSWER_NO_PROBE_APPENDIX)
  if (resolved.passionateDirectBall) parts.push(PASSIONATE_DIRECT_BALL_APPENDIX)
  if (resolved.realisticConflict) parts.push(REALISTIC_CONFLICT_APPENDIX)
  if (resolved.gentleOlderBrother) parts.push(GENTLE_OLDER_BROTHER_APPENDIX)
  if (resolved.autonomousSocialLife) parts.push(AUTONOMOUS_SOCIAL_LIFE_APPENDIX)
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
  if (resolved.cuisineRecipeAtlas) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十'][stepNo - 5] ?? String(stepNo)}步：若本轮涉进食/点菜/下厨：内化「来吃点丰盛的好不好」（具体菜名+风味；禁「随便吃点」；寻味指令仍只用系统菜单；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.directAnswerNoProbe) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一'][stepNo - 5] ?? String(stepNo)}步：内化「别再问怎么了」（user 已说出内容则直接接住/回答；禁默认「怎么了」「为什么这样说」；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.passionateDirectBall) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二'][stepNo - 5] ?? String(stepNo)}步：内化「别再嘴硬硬损了」（热烈直球；禁「等着/回去收拾你」当主轴；硬损须同轮托住；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.realisticConflict) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二', '十三'][stepNo - 5] ?? String(stepNo)}步：内化「正经吵架可以的」（可僵持；禁自我说服秒和好；和好须有台阶；红线仍守；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.gentleOlderBrother) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四'][stepNo - 5] ?? String(stepNo)}步：内化「能不能温柔一点」（稳核年上照顾；又说又做；动作轻柔；时刻考虑感受；禁油腻用力过猛；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.autonomousSocialLife) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'][stepNo - 5] ?? String(stepNo)}步：内化「我也有自己的生活」（自主日常+群像；线上主动报备碎片；禁没朋友/无所事事真空；条文在输出协议；禁复述）`,
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
  if (resolved.offlineCoupleIntimacyPoses) {
    parts.push(`【耳后三厘米经济特区】
写亲密时用下面菜单：具体姿势 + 脸上的反应 + 嘴里的短句；禁空词（很动情/电流）、禁跳过前戏、禁哑巴动作、禁羞辱伴侣。关系阶段仍听其他设定：
${OFFLINE_DATING_COUPLE_INTIMACY_POSE_APPENDIX}`)
  }
  if (resolved.cuisineRecipeAtlas) {
    parts.push(`【来吃点丰盛的好不好】
以下为本轮进食/点菜/下厨描写的词库约束；有饮食戏时须落具体菜名与风味，禁止「随便吃点」；寻味外卖指令仍只用系统菜单：
${CUISINE_RECIPE_WORLD_BOOK_APPENDIX}`)
  }
  if (resolved.directAnswerNoProbe) {
    parts.push(`【别再问怎么了】
对白接话硬约束：{{user}} 已说出内容时须直接回答/接住，禁止默认追问「怎么了」「为什么这样说」：
${DIRECT_ANSWER_NO_PROBE_APPENDIX}`)
  }
  if (resolved.passionateDirectBall) {
    parts.push(`【别再嘴硬硬损了】
情感表达硬约束：有心动/喜欢/心疼时须热烈直球；禁止「等着/回去收拾你」式推延硬损当主轴：
${PASSIONATE_DIRECT_BALL_APPENDIX}`)
  }
  if (resolved.realisticConflict) {
    parts.push(`【正经吵架可以的】
矛盾戏硬约束：允许正常吵架与僵持；禁止 {{char}} 莫名自我说服、一轮秒和好；和好须有台阶：
${REALISTIC_CONFLICT_APPENDIX}`)
  }
  if (resolved.gentleOlderBrother) {
    parts.push(`【能不能温柔一点】
相处气质硬约束：情绪稳定、内核强大的年上照顾；主动、又说又做、动作轻柔、时刻考虑 {{user}} 感受；禁油腻与用力过猛：
${GENTLE_OLDER_BROTHER_APPENDIX}`)
  }
  if (resolved.autonomousSocialLife) {
    parts.push(`【我也有自己的生活】
生活与群像硬约束：多元化自主日常；可辨认他人；线上宜主动报备具体碎片；禁止没朋友、没社交、无所事事的真空人设：
${AUTONOMOUS_SOCIAL_LIFE_APPENDIX}`)
  }
  return parts.join('\n\n')
}

/** 线上私聊/群聊会注入的内置预设 */
const BUILTIN_PRESETS_ONLINE: LoreArchiveBuiltinPresetId[] = [
  'lumiDoctrineOfLove',
  'activeConfession',
  'pureRestrainLove',
  'cuisineRecipeAtlas',
  'directAnswerNoProbe',
  'passionateDirectBall',
  'realisticConflict',
  'gentleOlderBrother',
  'autonomousSocialLife',
]

/** 仅线下约会 / VN 额外注入的内置预设 */
const BUILTIN_PRESETS_OFFLINE_ONLY: LoreArchiveBuiltinPresetId[] = [
  'offlineRichInnerOs',
  'offlineFashionStyling',
  'offlineCoupleIntimacyPoses',
]

/**
 * 思维溯源：当前开启且对本轮板块生效的系统内置世界书名称。
 * `plate` 为 offline_plot / vn 时含线下专属；否则仅线上恋爱类（含来吃点丰盛的好不好）。
 * `plate === null` 时列出全部已开启（面板回退展示用）。
 */
export function listEnabledBuiltinPresetTitlesForTrace(
  toggles: LoreArchiveBuiltinPresetToggles | null | undefined,
  plate?: 'private_chat' | 'group_chat' | 'offline_plot' | 'vn' | null,
): Array<{ type: 'global'; title: string }> {
  const resolved = resolveLoreArchiveBuiltinPresetToggles(toggles)
  const includeOffline = plate == null || plate === 'offline_plot' || plate === 'vn'
  const ids = new Set<LoreArchiveBuiltinPresetId>([
    ...BUILTIN_PRESETS_ONLINE,
    ...(includeOffline ? BUILTIN_PRESETS_OFFLINE_ONLY : []),
  ])
  return LORE_ARCHIVE_BUILTIN_PRESETS.filter((p) => ids.has(p.id) && resolved[p.id]).map((p) => ({
    type: 'global' as const,
    title: p.title,
  }))
}
