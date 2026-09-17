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
import { REALISTIC_AUTONOMY_APPENDIX } from './realisticAutonomyAppendix'
import { GENTLE_OLDER_BROTHER_APPENDIX } from './gentleOlderBrotherAppendix'
import { AUTONOMOUS_SOCIAL_LIFE_APPENDIX } from './autonomousSocialLifeAppendix'
import { SCHOOL_CAMPUS_COMMON_KNOWLEDGE_APPENDIX } from './schoolCampusCommonKnowledgeAppendix'
import { BODY_SCENT_PERFUME_APPENDIX } from './bodyScentPerfumeAppendix'
import { DAILY_LIFE_COMMON_SENSE_APPENDIX } from './dailyLifeCommonSenseAppendix'
import {
  normalizeArchiveWorldbookPriorityTier,
  type ArchiveWorldbookPriorityTier,
} from './loreArchiveTypes'

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
  | 'realisticAutonomy'
  | 'gentleOlderBrother'
  | 'autonomousSocialLife'
  | 'schoolCampusCommonKnowledge'
  | 'bodyScentPerfume'
  | 'dailyLifeCommonSense'

export type LoreArchiveBuiltinPresetToggles = Partial<Record<LoreArchiveBuiltinPresetId, boolean>>

export type LoreArchiveBuiltinPresetPriorityTiers = Partial<
  Record<LoreArchiveBuiltinPresetId, ArchiveWorldbookPriorityTier>
>

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
      '一句话：让角色对你好得更「实在」——会照顾、给安全感、情绪上托住你，也把你当平等的灵魂，而不是宠物或附属品。已确认恋人时还会叠一层「专一与托底」（偏男德那套，男性恋人时更明显）。开了就会喂给 AI；正文是系统封存的，只能开关不能偷看。',
  },
  {
    id: 'activeConfession',
    title: '角色情感破冰与主动告白',
    description:
      '专治「暧昧拖成无底洞」。火候差不多时，推动角色把心意说清楚、把告白演出来，别永远卡在试探里。开了就注入；正文不可看不可改。',
  },
  {
    id: 'pureRestrainLove',
    title: '纯爱克制',
    description:
      '纯爱番手感：害羞、真心希望你好、喜欢是「1+1＞2」那种成全感；关系慢慢升温，别秒通关、别刚在一起就深度亲密或同居。情侣亲密也要生涩、要征得同意。相处久了再写更深亲密时，可以有点纯情色气，但仍然禁止强制爱。线上线下都会吃到这份设定。',
  },
  {
    id: 'offlineRichInnerOs',
    title: '线下约会·多内心 OS 描写',
    description:
      '只影响线下约会：让角色脑子里多转几圈——内心 OS 更密、更长一点，再配上神态，别整得像只会说话的木偶。线上聊天不吃这条。',
  },
  {
    id: 'offlineFashionStyling',
    title: '线下约会·穿搭造型描写',
    description:
      '只影响线下约会：衣服别再「深灰卫衣+黑运动裤+帆布鞋」糊弄过去。廓形、面料、剪裁、配饰、鞋子都要拉开层次，私密场合服装也会写得更细。',
  },
  {
    id: 'offlineCoupleIntimacyPoses',
    title: '耳后三厘米经济特区',
    description:
      '专治「人贴一起只会复读三个动词」。推拉、指舌、追吻眼神、认真吻闭眼、贴耳软直蜜语（可以喘、可以断句）和细触感都会更丰满。禁油腻小作文、禁侮辱。只进线下约会。',
  },
  {
    id: 'cuisineRecipeAtlas',
    title: '来吃点丰盛的好不好',
    description:
      '专治「随便吃点」「点了个菜」。中外菜系、甜品饮品词库都在里面——写吃饭、下厨、点菜要落到具体菜名和风味。线上私聊和线下约会都会用；寻味外卖还是只能点系统菜单。',
  },
  {
    id: 'directAnswerNoProbe',
    title: '别再问怎么了',
    description:
      '专治默认追问「怎么了」「为什么这样说」。你都说清楚了，角色就该问什么答什么、直接接住——比如你自我贬低，就直接肯定你，别先审讯一遍原因。线上线下都生效。',
  },
  {
    id: 'passionateDirectBall',
    title: '别再嘴硬硬损了',
    description:
      '专治嘴硬硬损，还有「等着」「回去收拾你」那种拖着调情。有心动、喜欢、心疼时要热烈直球说破；损完同一轮也得托住。线上线下都吃。',
  },
  {
    id: 'realisticConflict',
    title: '正经吵架可以的',
    description:
      '允许正经吵架、僵持，别让角色自己说服自己然后一轮秒和好。想吵得真一点就开；可能会下头、冷战，自己掂量。线上线下都会注入。',
  },
  {
    id: 'realisticAutonomy',
    title: '现实一点',
    description:
      '互相独立的健康关系：想好好在一起，但不是「非你不可」；可以为现实取舍；回答会按利害掂量；不必时刻当你的情绪客服；可以拒绝、说累，必要时吵架甚至提分开。拒绝也要说清楚理由和下一步，禁止敷衍甩锅。贴人设，不是故意找茬。可能下头，慎开。',
  },
  {
    id: 'gentleOlderBrother',
    title: '能不能温柔一点',
    description:
      '情绪稳、内核硬的年上大哥哥式照顾：会主动看见你的需要，又说又做，动作轻柔，时时顾及你的感受——但不油腻、不爹。线上线下都生效。',
  },
  {
    id: 'autonomousSocialLife',
    title: '我也有自己的生活',
    description:
      '角色也有自己的日常和社交：线上会主动报备一点生活碎片，线下也有行程、也有别人出现的痕迹。别写成没朋友、没社交、无所事事的空壳。线上线下都吃。',
  },
  {
    id: 'schoolCampusCommonKnowledge',
    title: '校园与升学常识',
    description:
      '补校园/升学常识：高中处分、艺考暑假封闭集训、联考校考和招录比例、高考查分志愿录取时间线、大学课表、大三下起实习这些。学生、艺考生、大学生剧情开着更不容易闹笑话。线上线下都注入。',
  },
  {
    id: 'bodyScentPerfume',
    title: '别再全员牛奶香',
    description:
      '体味和香水别再「淡淡清香」「牛奶香」糊弄。体香一般相对固定、可以承接；香水可以随场合换，别场场同一支；两个人的气味要分得开。线上线下都生效。',
  },
  {
    id: 'dailyLifeCommonSense',
    title: '有点生活常识',
    description:
      '中国大陆城市日常那点常识：进屋换拖鞋、别无中生有地暖；进对方家要钥匙/开门/敲门，别推门就进；公共场合亲密默认最多牵手拥抱、轻碰唇（你主动要求更大尺度另说）；客厅等没床的地方别亲密完直接安稳睡；早晚洗漱；睡觉穿睡衣或裸睡，别无故常服睡。人设另有习惯的，以人设为准。',
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
    realisticAutonomy: raw?.realisticAutonomy === true,
    gentleOlderBrother: raw?.gentleOlderBrother === true,
    autonomousSocialLife: raw?.autonomousSocialLife === true,
    schoolCampusCommonKnowledge: raw?.schoolCampusCommonKnowledge === true,
    bodyScentPerfume: raw?.bodyScentPerfume === true,
    dailyLifeCommonSense: raw?.dailyLifeCommonSense === true,
  }
}

const ALL_BUILTIN_PRESET_IDS: LoreArchiveBuiltinPresetId[] = [
  'lumiDoctrineOfLove',
  'activeConfession',
  'pureRestrainLove',
  'offlineRichInnerOs',
  'offlineFashionStyling',
  'offlineCoupleIntimacyPoses',
  'cuisineRecipeAtlas',
  'directAnswerNoProbe',
  'passionateDirectBall',
  'realisticConflict',
  'realisticAutonomy',
  'gentleOlderBrother',
  'autonomousSocialLife',
  'schoolCampusCommonKnowledge',
  'bodyScentPerfume',
  'dailyLifeCommonSense',
]

export function resolveLoreArchiveBuiltinPresetPriorityTiers(
  raw?: LoreArchiveBuiltinPresetPriorityTiers | null,
): Record<LoreArchiveBuiltinPresetId, ArchiveWorldbookPriorityTier> {
  const out = {} as Record<LoreArchiveBuiltinPresetId, ArchiveWorldbookPriorityTier>
  for (const id of ALL_BUILTIN_PRESET_IDS) {
    out[id] = normalizeArchiveWorldbookPriorityTier(raw?.[id])
  }
  return out
}

/** 线上私聊会注入正文的内置预设（线下专用三条仍走约会通道） */
const ONLINE_ROMANCE_BUILTIN_IDS: LoreArchiveBuiltinPresetId[] = [
  'lumiDoctrineOfLove',
  'activeConfession',
  'pureRestrainLove',
  'cuisineRecipeAtlas',
  'directAnswerNoProbe',
  'passionateDirectBall',
  'realisticConflict',
  'realisticAutonomy',
  'gentleOlderBrother',
  'autonomousSocialLife',
  'schoolCampusCommonKnowledge',
  'bodyScentPerfume',
  'dailyLifeCommonSense',
]

function appendixForBuiltinId(id: LoreArchiveBuiltinPresetId): string {
  switch (id) {
    case 'lumiDoctrineOfLove':
      return LUMI_DOCTRINE_OF_LOVE_APPENDIX
    case 'activeConfession':
      return CHARACTER_EMOTION_CONFESSION_ENGINE_APPENDIX
    case 'pureRestrainLove':
      return PURE_RESTRAIN_LOVE_APPENDIX
    case 'cuisineRecipeAtlas':
      return CUISINE_RECIPE_WORLD_BOOK_APPENDIX
    case 'directAnswerNoProbe':
      return DIRECT_ANSWER_NO_PROBE_APPENDIX
    case 'passionateDirectBall':
      return PASSIONATE_DIRECT_BALL_APPENDIX
    case 'realisticConflict':
      return REALISTIC_CONFLICT_APPENDIX
    case 'realisticAutonomy':
      return REALISTIC_AUTONOMY_APPENDIX
    case 'gentleOlderBrother':
      return GENTLE_OLDER_BROTHER_APPENDIX
    case 'autonomousSocialLife':
      return AUTONOMOUS_SOCIAL_LIFE_APPENDIX
    case 'schoolCampusCommonKnowledge':
      return SCHOOL_CAMPUS_COMMON_KNOWLEDGE_APPENDIX
    case 'bodyScentPerfume':
      return BODY_SCENT_PERFUME_APPENDIX
    case 'dailyLifeCommonSense':
      return DAILY_LIFE_COMMON_SENSE_APPENDIX
    default:
      return ''
  }
}

function efficacyBlurbForTier(tier: ArchiveWorldbookPriorityTier): string {
  if (tier === 1) {
    return '【内置档案·档1·效力】仅次于输出规范提示词，**高于**人设世界书；与人设冲突时以本段为准。气质口吻仍可贴人设表达，硬底线不可破。'
  }
  if (tier === 3) {
    return '【内置档案·档3·效力】**次于**人设世界书；人设明文冲突时以人设为准。硬底线仍建议遵守，但不得覆盖人设核心性格/口癖。'
  }
  return '【内置档案·档2·效力】与人设世界书**同级**；有矛盾时仍**跟随本段全局档案**。气质口吻可贴人设，硬底线不可破。'
}

export function buildWechatReplyRomanceSectionsByTier(params: {
  toggles: LoreArchiveBuiltinPresetToggles | null | undefined
  priorityTiers?: LoreArchiveBuiltinPresetPriorityTiers | null
}): Record<ArchiveWorldbookPriorityTier, string> {
  const resolved = resolveLoreArchiveBuiltinPresetToggles(params.toggles)
  const tiers = resolveLoreArchiveBuiltinPresetPriorityTiers(params.priorityTiers)
  const buckets: Record<ArchiveWorldbookPriorityTier, string[]> = { 1: [], 2: [], 3: [] }
  for (const id of ONLINE_ROMANCE_BUILTIN_IDS) {
    if (!resolved[id]) continue
    const body = appendixForBuiltinId(id).trim()
    if (!body) continue
    buckets[tiers[id]].push(body)
  }
  const out = { 1: '', 2: '', 3: '' } as Record<ArchiveWorldbookPriorityTier, string>
  for (const tier of [1, 2, 3] as const) {
    if (!buckets[tier].length) continue
    out[tier] = [efficacyBlurbForTier(tier), ...buckets[tier]].join('\n\n')
  }
  return out
}

export function buildWechatReplyRomanceSections(
  toggles: LoreArchiveBuiltinPresetToggles | null | undefined,
  priorityTiers?: LoreArchiveBuiltinPresetPriorityTiers | null,
): string {
  const by = buildWechatReplyRomanceSectionsByTier({ toggles, priorityTiers })
  return [by[1], by[2], by[3]].filter(Boolean).join('\n\n')
}

export function buildWechatThinkingChainRomanceSteps(
  toggles: LoreArchiveBuiltinPresetToggles | null | undefined,
): string {
  const resolved = resolveLoreArchiveBuiltinPresetToggles(toggles)
  const steps: string[] = []
  let stepNo = 5
  if (resolved.lumiDoctrineOfLove) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十'][stepNo - 5] ?? String(stepNo)}步：内化「Lumi 高质量爱情观」（含已确认恋人·专一与托底；与人设/全局档案同级；硬底线不可破；条文已在输出协议；禁止复述）`,
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
  if (resolved.realisticAutonomy) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四'][stepNo - 5] ?? String(stepNo)}步：内化「现实一点」（想好好在一起的互相独立；自爱；拒绝须认真沟通禁敷衍；可拒绝/疲惫/必要时吵架或提分开；贴人设非逃责；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.gentleOlderBrother) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'][stepNo - 5] ?? String(stepNo)}步：内化「能不能温柔一点」（稳核年上照顾；又说又做；动作轻柔；时刻考虑感受；禁油腻用力过猛；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.autonomousSocialLife) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六'][stepNo - 5] ?? String(stepNo)}步：内化「我也有自己的生活」（自主日常+群像；线上主动报备碎片；禁没朋友/无所事事真空；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.schoolCampusCommonKnowledge) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七'][stepNo - 5] ?? String(stepNo)}步：若本轮涉校园/艺考/高考/大学：内化「校园与升学常识」（纪律处分、艺考集训与招录、查分志愿时间线、课表与实习；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.bodyScentPerfume) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八'][stepNo - 5] ?? String(stepNo)}步：若本轮涉近距/提气味：内化「别再全员牛奶香」（体香固定可承接、香水可换勿场场同一支；禁清香/牛奶香空词；char与user须可区分；条文在输出协议；禁复述）`,
    )
    stepNo += 1
  }
  if (resolved.dailyLifeCommonSense) {
    steps.push(
      `- 第${['五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九'][stepNo - 5] ?? String(stepNo)}步：若本轮涉进门/公共亲密/过夜/赶路：内化「有点生活常识」（换拖鞋；进对方家须钥匙/开门；公场亲密≤牵手拥抱轻碰唇；没床勿安稳睡；洗漱与睡衣；条文在输出协议；禁复述）`,
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
纯爱最高设定之一（与人设/全局档案同级）。自检：先判阶段；循序渐进禁速通攻略；成全型喜欢（希望对方更好/1+1＞2）；纯情害羞生涩；直球不压迫、禁自恋追问；非情侣禁越级亲密；刚确立禁深亲密/同居；情侣先忍再问；禁强制爱；**招新/加微信等正事社交禁止升格假想敌与社交禁令**。仅当「相处日久·更深亲密」且本轮亲密戏时启用【五附】纯情色气（直白/调情戳破/边做边夸）；未达阶段禁止预习。气质跟人设，硬底线不可破：
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
写亲密时用下面菜单：具体姿势 + 脸上的反应 + 贴耳蜜语（软、直、带喘；有喘时可穿插「哈/啊哈」或拆成多拍短对白；禁油腻小作文、禁侮辱）；含指舌互动与追吻（追时眼神有性张力，认真吻默认闭眼）；禁空词（很动情/电流）、禁跳过前戏、禁哑巴动作、禁羞辱伴侣。关系阶段仍听其他设定：
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
  if (resolved.realisticAutonomy) {
    parts.push(`【现实一点】
自主与健康关系硬约束：想好好在一起的互相独立；非「非你不可」；可为现实取舍；答按利害；拒绝须认真沟通禁敷衍逃责；可表达疲惫/必要时吵架或提分开；贴人设、非故意挑事：
${REALISTIC_AUTONOMY_APPENDIX}`)
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
  if (resolved.schoolCampusCommonKnowledge) {
    parts.push(`【校园与升学常识】
校园/艺考/高考/大学剧情常识锚点：高中纪律与处分、艺考暑假封闭集训、联考校考与招录、查分志愿录取时间线、大学课表与实习节奏：
${SCHOOL_CAMPUS_COMMON_KNOWLEDGE_APPENDIX}`)
  }
  if (resolved.bodyScentPerfume) {
    parts.push(`【别再全员牛奶香】
体味与香水味硬约束：体香通常固定须承接；香水可按场合更换、禁止场场复读同一支；禁「淡淡清香/牛奶香」空词；{{char}} 与 {{user}} 须可区分：
${BODY_SCENT_PERFUME_APPENDIX}`)
  }
  if (resolved.dailyLifeCommonSense) {
    parts.push(`【有点生活常识】
城市日常常识硬约束：进屋换拖鞋；进对方家须钥匙/开门/敲门；公共场合亲密默认最多牵手拥抱与轻碰唇；禁无中生有地暖；没床处禁亲密后安稳睡；早晚洗漱；睡衣/裸睡禁常服睡：
${DAILY_LIFE_COMMON_SENSE_APPENDIX}`)
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
  'realisticAutonomy',
  'gentleOlderBrother',
  'autonomousSocialLife',
  'schoolCampusCommonKnowledge',
  'bodyScentPerfume',
  'dailyLifeCommonSense',
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
