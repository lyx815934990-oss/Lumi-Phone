import {
  composePersonaAiAppearanceSeed,
  composePersonaAiIdentityArcSeed,
  composePersonaAiLoveContrastSeed,
  composePersonaAiSocialCircleSeed,
  type PersonaAiGenerateForm,
} from './personaAiGenerateTypes'
import type { Gender, PlayerIdentity } from './types'
import {
  MEET_ENCOUNTER_AI_AGE_AND_BIRTHDAY_RULES,
  MEET_ENCOUNTER_AI_MOTTO_STYLE_TAIL,
  NPC_AI_HEIGHT_WEIGHT_MOTTO_RULES_CORE,
} from './npcBasicProfileAiRules'
import { buildWechatSignatureAiRulesBlock } from './wechatSignatureStyleRules'
import { MEET_MBTI_SIXTEEN } from '../../lumiMeet/meetPersonaPrompt'
import { LUMI_SYSTEM_OVERRIDE_APPENDIX } from '../wechatReplyOutputPrompt'
import {
  PERSONA_AI_COMPACT_ENTRY_NAMES,
  PERSONA_AI_TOWARD_USER_ENTRY_NAME,
  PERSONA_AI_MEETING_BOND_ENTRY_NAME,
  PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME,
  PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME,
  PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME,
  personaAiOrientationHostEntryName,
  isPersonaAiPlatonicRelation,
  isPersonaAiRomanticRelation,
} from './personaAiWorldBooks'
import { buildPersonaAiMarkupFormatSpec } from './personaAiGenerateMarkup'
import { playerIdentityGenderRulesForAi } from './personaIdentityGenderRules'
import { formatWorldBookItemLineForPrompt } from './worldBookPronounGuide'
import { genderLabelZh } from './utils'

const PERSONA_AI_PLAYER_IDENTITY_CONTEXT_MAX_CHARS = 9000

/** 全局健康基调：中性措辞、禁止超雄/极端/八股油腻（人设生成 / 补全 / 世界书单条生成共用） */
export function buildPersonaAiHealthyToneRules(): string {
  return `
【健康人设基调 · 全局铁律（全部世界书条目须遵守）】
- 角色须像现实中可认识的**成年**人：立体、有边界、可演；**禁止**把任何字段写成超雄、极端或病态 caricature。
- **独立个体**：亲近不等于放弃自我；禁止写成绝对顺从、交权讨好、宿命绑定、人格消解式偏爱。
- **禁止超雄 / toxic 支配 caricature**：动不动暴力压制、羞辱践踏、驯服跪服、ALPHA 狼性碾压、「不听话就毁掉你」式恐怖占有；可写强势或在意，但须**有分寸、有人味**。
- **禁止极端化 / 病态猎奇**：禁止跟踪监禁、PUA、美化精神疾病；心结可写但是可演困扰。
- **NSFW 仍须双方自愿、可拒绝**；禁止非自愿与性暴力 glorification。

${buildPersonaAiNeutralProseRules()}`.trim()
}

/**
 * 中性、朴实文风：禁用超雄/极端用语与八股油腻形容词。
 * 人设世界书条目、补全、单条生成共用。
 */
export function buildPersonaAiNeutralProseRules(): string {
  return `
【中性措辞 · 朴实文风（最高优先级）】
- **描述词一律中性、具体**：写可核对的外貌、习惯、态度、行为；少用程度副词与情绪堆砌。
- **禁止超雄 / 霸总 / 极端用语**（出现即改写）：侵略性、碾压、压制、驯服、猎物、支配、征服、不容置疑、ALPHA、狼性、杀伐果断、生人勿近、俯视众生、掌控全局、毁灭性、恐怖占有；以及「极其/极度/极具/近乎/无法自拔」等程度爆炸词。
- **禁止八股油腻、花里胡哨形容词**（出现即改写）：清冷贵气、矜贵、神性、邪魅、少年感拉满、氛围感拉满、破碎感、人间清醒、生人勿近、疏离感拉满、禁欲系、高岭之花、荷尔蒙、蛊惑、摄人心魄、惊艳全场、目光如炬、气场全开、骨子里透着、浑身上下都是戏、故事感、宿命感拉满等网文标签腔。
- **正向写法**：用日常可观察事实——「话不多」「回消息慢」「穿得干净简单」「跟人熟了才会开玩笑」「会提醒对方吃药」；勿用形容词叠床代替信息。
- 拿不准时**宁可用平实短句**，也不要堆华丽空词。`.trim()
}

/** 世界书条目目标篇幅 */
export const PERSONA_AI_COMPACT_ENTRY_TARGET_CHARS = 500

export function buildPersonaAiCompactEntryLengthRules(opts?: {
  referencePersonaDirectGenerate?: boolean
}): string {
  const refDirect = opts?.referencePersonaDirectGenerate === true
  const npcLen = refDirect
    ? `- 「周边NPC」：**不设 3–5 人上限**；按原著开篇及与 {{char}}（若 {{user}} 同作相关则亦含与 {{user}}）有稳定关系的具名配角**尽量写全**（每人一小段，约 60–120 字，须含与 {{char}}、必要时与 {{user}}、以及与名单内其他配角的原著关系）；本条总字数可达 800–2500，勿为凑「约 500 字」而砍角色。仅露脸一次的无名路人可略。`
    : `- 「周边NPC」按 3–5 个具名配角分条写满，合计仍约 ${PERSONA_AI_COMPACT_ENTRY_TARGET_CHARS} 字。`
  return `
【世界书条目篇幅】
- 除「周边NPC」在直接生成模式下的特殊规则外：每条 content **约 ${PERSONA_AI_COMPACT_ENTRY_TARGET_CHARS} 字**（含标点，允许 420–580）；信息写满，勿用空形容词凑字。
- 全部 ${PERSONA_AI_COMPACT_ENTRY_NAMES.length} 条均须达到信息量级；禁止只写一两句或标签罗列就结束。
${npcLen}`.trim()
}

/** 顶层【简介】：只写稳定人设名片，禁止开局可变关系/现状 */
export function buildPersonaAiBioRules(): string {
  return `
【简介 · 铁律】
- 写 {{char}} 的**稳定名片**：气质、性格底色、身份/职业印象、兴趣与处事风格；第三人称，80–220 字，至少 2 次 {{char}}，禁止出现 {{user}}。
- **禁止写可变现状**：禁止写当前和谁恋爱/暧昧/同居/冷战/关系升温；禁止写「现在和××是…」「开局已是…」「正和某人…」等随剧情会变的关系句。
- **禁止写对某人的当下态度**：对 {{user}}、前缘对象、配角的当前好感/称呼/相处边界一律不写（留给「对你现在」「过往感情史」「周边NPC」等条目）。
- 简介是**不变的自我介绍**，不是关系状态栏；可变内容写别处。`.trim()
}

/** 亲密偏向：指恋人一律写「对方」 */
export function buildPersonaAiIntimatePartnerWordingRules(): string {
  return `
【亲密偏向 · 对方称谓铁律（「亲密与恋爱观」条目）】
写恋爱/亲密模板时，指恋爱关系里的另一方：
- **一律写汉字「对方」**；禁止「男人/女人」等按性别指称伴侣
- 对绑定玩家 {{user}} 的**当下**态度/称呼/攻略**只**写在「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」`.trim()
}

/** 绑定玩家身份基础资料 + 世界书，供生成/补全/纠正时对齐 {{user}} */
export function buildPersonaAiPlayerIdentityContextBlock(
  playerIdentity: PlayerIdentity | null | undefined,
): string {
  if (!playerIdentity) return ''
  const lines: string[] = [
    '【绑定玩家身份 · 必须完整参考】',
    '撰写「相遇羁绊」「对你现在」等**明确指 {{user}}** 的字段时，须与下列玩家基础资料与世界书一致；禁止把 {{user}} 写成与此矛盾的性别、身份、性格或经历。',
    '「亲密与恋爱观」指恋人/亲密对象一律写「对方」，禁止男人/女人，不在该条用 {{user}} 代指泛化恋人。',
  ]
  const name = playerIdentity.name?.trim() || playerIdentity.wechatNickname?.trim()
  if (name) lines.push(`姓名/称呼参考：${name}（正文仍用 {{user}}，勿写此汉字名）`)
  lines.push(`性别：${genderLabelZh(playerIdentity.gender)}`)
  if (playerIdentity.age != null && Number.isFinite(playerIdentity.age)) {
    lines.push(`年龄：${playerIdentity.age}岁`)
  }
  if (playerIdentity.birthdayMD?.trim()) lines.push(`生日：${playerIdentity.birthdayMD.trim()}`)
  if (playerIdentity.zodiac?.trim()) lines.push(`星座：${playerIdentity.zodiac.trim()}`)
  if (playerIdentity.identity?.trim()) lines.push(`职业/身份：${playerIdentity.identity.trim()}`)
  if (playerIdentity.mbti?.trim()) lines.push(`MBTI：${playerIdentity.mbti.trim()}`)
  if (playerIdentity.bio?.trim()) lines.push(`简介：${playerIdentity.bio.trim()}`)
  if (playerIdentity.motto?.trim()) lines.push(`个性签名/座右铭：${playerIdentity.motto.trim()}`)
  if (playerIdentity.wechatSignature?.trim()) {
    lines.push(`微信个性签名：${playerIdentity.wechatSignature.trim()}`)
  }
  if (playerIdentity.interests?.length) {
    lines.push(`兴趣爱好：${playerIdentity.interests.join('、')}`)
  }
  if (playerIdentity.painPoints?.length) {
    lines.push(`雷点：${playerIdentity.painPoints.join('、')}`)
  }

  const wbLines: string[] = []
  for (const wb of playerIdentity.worldBooks ?? []) {
    const wbName = String(wb?.name || '未命名世界书').trim()
    for (const it of wb.items ?? []) {
      const content = String(it?.content ?? '').trim()
      if (!content) continue
      const flag = wb.enabled && it.enabled ? '' : '（当前关闭，仍勿与之下矛盾）'
      wbLines.push(
        `${formatWorldBookItemLineForPrompt({
          priority: it.priority === 'after' ? 'after' : 'before',
          name: `${wbName} · ${it.name || '未命名条目'}${flag}`,
          content,
          voice: 'player_identity',
        })}`,
      )
    }
  }
  if (wbLines.length) {
    lines.push('', '【绑定玩家世界书条目（须作为 {{user}} 事实依据，勿矛盾）】', ...wbLines)
  } else {
    lines.push('', '【绑定玩家世界书条目】（未设定）')
  }

  const text = lines.join('\n')
  return text.length <= PERSONA_AI_PLAYER_IDENTITY_CONTEXT_MAX_CHARS
    ? text
    : `${text.slice(0, PERSONA_AI_PLAYER_IDENTITY_CONTEXT_MAX_CHARS)}…（玩家身份上下文已截断，仍以已列信息为准）`
}
function formMentionsAestheticAdmiration(form: PersonaAiGenerateForm): boolean {
  const blob = [
    form.relationDetailHint,
    form.extraNotes,
    form.personalityKeywords,
    form.socialMaskHint,
    form.relationToUser,
    form.loveAttitudeHint,
    form.loveContrastHint,
    form.backgroundHint,
  ].join(' ')
  return /颜值|好看|长得[很挺]|相貌|俊|貌美|帅气|甘拜下风|自愧不如|赏心悦目|佩服|服气|审美|承认.*帅|承认.*美|仅.*颜|只.*颜/.test(
    blob,
  )
}

/** UI「取向可变」= 单独抽出尾声条目，非正文写取向会动摇 */
export function buildPersonaAiOrientationMutableSemanticsRule(orientationMutable: boolean): string {
  if (!orientationMutable) return ''
  return `
【取向「可变」= 独立尾声条目 · 铁律】
用户勾选的「可变」**仅**表示把性取向正文从「性格内核」**单独抽出**为尾声延展条目「${PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME}」（priority=after，可随剧情更新快照）；**不是**要求正文写「取向可能会变」。
- 「性格内核」改为序言介入：只写面具/三观/身世/反差萌等，**禁止**再写性取向段落。
- 「${PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME}」写 {{char}} 当下**稳定**自我认同与由来；禁止因勾选「可变」或欣赏 {{user}} 颜值就写取向动摇。`.trim()
}

/** UI「职业可变」= 单独抽出尾声条目，非正文写职业悬空 */
export function buildPersonaAiOccupationMutableSemanticsRule(occupationMutable: boolean): string {
  if (!occupationMutable) return ''
  return `
【职业「可变」= 独立尾声条目 · 铁律】
用户勾选的「可变」**仅**表示把职业/社会身份详述从「名片基础」**单独抽出**为尾声延展条目「${PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME}」（priority=after，可随剧情更新快照）；**不是**要求正文写「职业待定/悬空」。
- 「名片基础」仍可一句话点到身份，但**禁止**展开职业长段。
- 「${PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME}」写 {{char}} 当下**稳定**的职业/社会身份、工作内容与日常节奏；禁止因勾选「可变」写成开局无业或身份空白。`.trim()
}

/** 审美欣赏 {{user}} ≠ 恋爱 ≠ 取向自我动摇 */
function buildPersonaAiAestheticAdmirationOrientationRules(form: PersonaAiGenerateForm): string {
  if (!formMentionsAestheticAdmiration(form)) return ''
  const orientHost = personaAiOrientationHostEntryName(form.orientationMutable)
  return `
【颜值欣赏 ≠ 恋爱 ≠ 取向动摇 · 铁律】
用户种子表明：{{char}} 对 {{user}} 仅为**审美层面**的欣赏——**不是**恋爱/暗恋/性吸引，也**不是**取向自我怀疑的触发点。
- 「${orientHost}」内取向段落：禁止因欣赏 {{user}} 外貌写取向动摇。
- 对 {{user}} 的颜值服气写在「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」，勿写进取向段落。`.trim()
}

export function buildPersonaAiPlayerUserGenderRules(playerGender: Gender | undefined | null): string {
  const base = playerIdentityGenderRulesForAi(playerGender)
  if (playerGender === 'male') {
    return `${base}
【{{user}} 性别铁律 · 男】适用于「${PERSONA_AI_MEETING_BOND_ENTRY_NAME}」「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」等明确以 {{user}} 为对象的字段：
- 须按**男性身体**描写；禁止把 {{user}} 写成女性。
- 「亲密与恋爱观」仍写「对方」，禁止男人/女人；不在该条用 {{user}} 代指泛化恋人。`
  }
  if (playerGender === 'female') {
    return `${base}
【{{user}} 性别铁律 · 女】适用于「${PERSONA_AI_MEETING_BOND_ENTRY_NAME}」「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」等明确以 {{user}} 为对象的字段：
- 须按**女性身体**描写；禁止把 {{user}} 写成男性。
- 「亲密与恋爱观」仍写「对方」，禁止男人/女人；不在该条用 {{user}} 代指泛化恋人。`
  }
  return base
}

function buildPersonaAiAdmirationVsRomanceRules(form: PersonaAiGenerateForm): string {
  if (!formMentionsAestheticAdmiration(form)) return ''
  const platonic =
    isPersonaAiPlatonicRelation(form.relationToUser) && !isPersonaAiRomanticRelation(form.relationToUser)
  const lines = [buildPersonaAiAestheticAdmirationOrientationRules(form)]
  if (platonic) {
    lines.push(`
- 「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」：可写觉得 {{user}} 好看，但仍是同学/朋友分寸，无心动/暗恋/性幻想。`.trim())
  }
  return lines.filter(Boolean).join('\n')
}

function buildPersonaAiPlatonicIntimacyRules(relationToUser: string): string {
  const rel = relationToUser.trim() || '普通熟人'
  if (isPersonaAiRomanticRelation(rel)) return ''
  return `
【非恋爱关系 · 亲密条目分工】
先自行判断用户关系原文「${rel}」是否已确立暧昧/恋爱：
- 若尚未确立： 「亲密与恋爱观」只写一般亲密观/恋爱反差模板（指恋人写「对方」），禁止把 {{user}} 写成当前暗恋或性幻想对象。
- 对 {{user}} 的当下态度只写在「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」；相识过程只写在「${PERSONA_AI_MEETING_BOND_ENTRY_NAME}」（禁写当前关系/态度总结）。`.trim()
}

function buildPersonaAiRelationTowardUserRules(relationToUser: string, orientationMutable: boolean): string {
  const rel = relationToUser.trim() || '普通熟人'
  const lines = [
    `【关系向铁律 · 由你读原文判断投入程度】`,
    `与 {{user}} 的关系原文是「${rel}」。请先理解其投入程度（陌生 / 认识但不在意 / 熟人 / 朋友 / 暧昧 / 恋人等），再写「${PERSONA_AI_MEETING_BOND_ENTRY_NAME}」与「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」。`,
    `- **分工**：「${PERSONA_AI_MEETING_BOND_ENTRY_NAME}」**只写**如何相识（场合/契机/早期互动与过程）；「${PERSONA_AI_TOWARD_USER_ENTRY_NAME}」**独占**当前关系、当前态度、称呼分寸、相处边界与心里分量。`,
    `- **相遇羁绊禁写当前关系（硬）**：禁止在「相遇羁绊」文末或全文写「当前/如今/开局关系是…」「对 {{user}} 的态度是…」等关系标签或态度总结；禁止写称呼、回消息节奏、心里分量——这些只属于「对你现在」，避免与尾声延展冲突。`,
    `- **强度对齐**：「对你现在」里心里真实分量、称呼分寸、回消息节奏必须与原文一致；原文偏淡就写淡，原文已亲近就写亲近。禁止无依据抬高或压低。`,
    `- **禁止默认恋爱化**：关系原文未表达好感/暧昧/恋爱/暗恋时，禁止写成暗恋、好感萌芽、嘴硬心软、暗中关注、「其实有点在意」，也禁止用「持续加分后可能心动」「勿写死永不可能恋爱」当开局心声。`,
    `- **暗恋/单相思例外**：若关系原文为暗恋对方、单相思等，须在「对你现在」写清心里喜欢；口头可否说破跟人设；**必须**写可见在意破绽（暗戳戳吃醋、多留意、别扭关心等），禁止写成完全不在意。禁止写成已官宣恋人。勿把暗恋总结写进「相遇羁绊」。`,
    `- **禁止错位陌生化**：原文已表明互相认识或更近时，「对你现在」禁止写成完全不认识的陌生人话术。`,
    `- 禁止输出【开场白】。`,
  ]
  if (orientationMutable) lines.push(buildPersonaAiOrientationMutableSemanticsRule(true))
  return lines.join('\n')
}

export function buildPersonaAiRelationContextRules(form: PersonaAiGenerateForm): string {
  return [
    buildPersonaAiRelationTowardUserRules(form.relationToUser, form.orientationMutable),
    buildPersonaAiPlatonicIntimacyRules(form.relationToUser),
    buildPersonaAiAdmirationVsRomanceRules(form),
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** 参考人物：气质借鉴 vs 直接生成原著人物（含绑定身份对应相关角色时的原著关系） */
export function buildPersonaAiReferencePersonaRules(form: PersonaAiGenerateForm): string {
  const seed = form.referencePersonaHint.trim()
  if (!seed) return ''
  if (!form.referencePersonaDirectGenerate) {
    return [
      '【参考人物使用规则 · 气质借鉴】',
      `- 参考种子：「${seed}」`,
      '- 仅提炼性格、口吻、相处节奏、反差与习惯作灵感；须原创姓名与经历，禁止把原作角色名/真实全名当成本角色真名。',
      '- 禁止大段复述原作剧情或照搬完整人设档案；输出须是可独立使用的原创微信人设。',
      '- 与上方表单其它明确种子冲突时：以表单字段为准，参考人物只补气质与节奏。',
    ].join('\n')
  }
  return [
    '【参考人物使用规则 · 直接生成 · 最高优先级硬约束】',
    `- 用户指定直接生成：「${seed}」`,
    '- **本输出的 {{char}} 必须就是该人物本体**，不是「受其启发的原创角色」。',
    '- **姓名落点**：汉字全名/常用名只写在顶层「真实姓名」「微信昵称」；世界书与简介正文里指本角色**只用** `{{char}}`，禁止「佐佐木{{char}}」「{{char}}佐佐木」「佐佐木（{{char}}）」等同指叠写。',
    '- **禁止另起炉灶**：禁止换成无关姓名、无关性别、无关职业与无关世界观（例如把原作男学生改成便利店女性、都市白领等）。',
    '- 姓名、性别、年龄层、外貌、性格、口吻、兴趣、身份/学年职业，一律按该人物原著或已知公开形象落实。',
    '- 世界观、校园/时代背景须贴合该作品；允许非「都市职场」设定。',
    '- 表单里的默认性别、默认年龄区间、默认「都市接地气职业」**全部无效**，不得据此改写原著人物。',
    '- 仅当用户在「真实姓名偏向 / 年龄 / 职业 / 外貌 / 性格 / 补充说明」等栏**亲手写了明确改写**时，才可按改写微调；未填写处一律原著。',
    '- 若只写了姓氏或简称（如「佐佐木」），须识别为该常见原作人物并生成其完整档案，禁止借同名另创路人。',
    '',
    '【绑定身份 × 原著关系】',
    '- 先对照上方【绑定玩家身份】的姓名、简介、职业等，判断 {{user}} 是否对应参考人物所在作品中的相关角色（含同作搭档、同学、恋人线对象等；姓名可简称/谐音/部分匹配）。',
    '- **若是相关角色**：',
    '  1) 初始关系、相识背景、互动习惯一律按原著开篇/已知早期关系生成，可覆盖「陌生人/普通熟人」等表单关系标签（除非用户在「初始关系」或「相识过程」明确要求改时间线）。',
    '  2) 「相遇羁绊」只写原著开篇时二人如何相识/已有何种交集（过程），禁止写当前关系标签或态度总结；「对你现在」写开篇时 {{char}} 对该对应角色的真实看法、距离感与相处状态（含已有好感/在意/照顾欲等，开篇已有则如实写）。',
    '  3) 世界书须体现原著关系网与日常互动；「周边NPC」见下方【周边NPC · 原著硬约束】与【周边NPC × 绑定身份】：配角除与 {{char}} 的关系外，还须写清对 {{user}} 对应人物的原著看法（护短/熟悉/敌意等），禁止配角对 {{user}} 像路人。',
    '- **若无关或无法对应**：仍必须生成该参考人物本体；与 {{user}} 的关系按表单「初始关系/相识过程」落实，勿强行塞入原著搭档线；周边配角不必硬写对 {{user}} 的原著关系。',
    '',
    buildPersonaAiReferencePersonaNpcRules(form),
  ]
    .filter(Boolean)
    .join('\n')
}

/** 直接生成模式下「周边NPC」须对齐原著开篇的身份/年龄，禁止都市魔改 */
export function buildPersonaAiReferencePersonaNpcRules(form: PersonaAiGenerateForm): string {
  const seed = form.referencePersonaHint.trim()
  if (!seed || !form.referencePersonaDirectGenerate) return ''
  return [
    '【周边NPC · 原著硬约束】',
    `- 参考作品/人物：「${seed}」`,
    '- 「周边NPC」须写该作品**原著开篇/故事起点及日常圈**里出现的具名配角，不是另起都市原创路人。',
    '- **数量：不设 3–5 人硬上限**。凡开篇已出场、或与 {{char}}（及同作 {{user}} 对应人物）有稳定互动/亲属/同学/死党/敌对等关系的具名角色，**尽量全部写入**；宁多勿漏主要配角。仅露脸一次、无名字或无互动的路人可略。',
    '- **姓名、身份、年龄/年级、与 {{char}} 关系** 四项必须全部对齐原著；禁止「只有名字对、身份年龄瞎编」。',
    '- 每人简档须含：姓名；**原著身份**（学年/班级/社团职务/家人称谓/同校关系等）；**年龄或年级**；与 {{char}} 的关系；一两句性格与**开篇**状态。',
    '- **配角彼此关系（硬项）**：名单内配角若在原著中彼此有稳定关系（室友/死党/前后辈/情侣或单向好感/敌对/家人等），**必须在双方简档里互相写清**，不可只写各自与 {{char}} 的关系、把彼此写成无关路人。例：平野与键浦既是室友，也有互相在意/好感向的相处，双方条目都要点到，禁止只写「室友」而抹掉情感线。',
    '- 写法可用「与××：……」分句；指名单内其他配角用其汉字姓名即可（勿用 {{char}}/{{user}} 指代他们）。',
    '- **禁止都市化魔改**：不得把原著角色写成保安、编辑部职员、便利店员、公司白领、社畜、物业、路人警察等与原作世界观无关的成年职场身份（除非原著开篇就是该身份）。',
    '- **禁止年龄漂移**：校园/少年向作品配角须保持学生年龄层或原著设定年龄，不得拉到 20–38 岁成人区间凑字数。',
    '- **禁止「近况」乱编**：不得写原著未发生的打工、转职、离职、都市社交等后续原创情节来填篇幅。',
    '- 若某配角原著细节记不清：只写原著确定的最小信息（姓名+已知关系+已知身份），宁可短也不要编都市身份。',
    '- 「人际与秘密」只写关系类型与态度；具名配角的身份/年龄细节**只在「周边NPC」写，且必须原著一致**。',
    '',
    '【周边NPC × 绑定身份 {{user}} · 同作硬约束】',
    '- 先对照【绑定玩家身份】判断 {{user}} 是否对应参考作品中的相关角色（如宫野↔操作者扮演宫野；姓名可简称/谐音/部分匹配）。',
    '- **若是同作相关角色（最高优先级）**：',
    '  1) **禁止**把「{{user}} 对应的那个人」再当作周边 NPC 名单里的另一人重复建档（避免一人两份）。',
    '  2) 每个周边配角简档除「与 {{char}} 关系」外，**必须另写「对 {{user}}」**：开篇时该配角对 {{user}} 对应人物的关系类型、熟悉度、称呼习惯、护短/关照/敌意/平常相处等原著态度。',
    '  3) 原著里护着/亲近/敌视 {{user}} 对应人物的配角（例：护宫野的平野），**禁止**写成与 {{user}} 互不相识、路人、或「只认识 {{char}}、当 {{user}} 不存在」。',
    '  4) 写法可用「对 {{user}}：……」分句；正文指操作者只用 {{user}}，勿写「玩家」。',
    '- **若无关或无法对应**：周边配角仍只写与 {{char}} 的关系；**不要**硬编对 {{user}} 的原著关系。',
  ].join('\n')
}

/** 直接生成时的开篇铁律（置于 user prompt 最前） */
export function buildPersonaAiReferencePersonaLeadBanner(form: PersonaAiGenerateForm): string {
  const seed = form.referencePersonaHint.trim()
  if (!seed || !form.referencePersonaDirectGenerate) return ''
  return [
    '════ 最高优先级（先于其后一切默认种子）════',
    `直接生成原著/已知人物：「${seed}」→ {{char}} 必须是此人，禁止另创毫不相干角色。`,
    '表单默认「女 / 20–38 岁 / 都市接地气职业」等未手填项一律让位给该人物原著设定（含性别与身份）。',
    '「周边NPC」：不设 3–5 上限，原著开篇/日常圈具名配角尽量写全；姓名/身份/年龄须对齐原著，禁止保安、编辑部等都市魔改。',
    '配角彼此若有原著关系（室友/好感/死党等）须在双方简档互相写清，禁止只写各自与 {{char}} 的线。',
    '若绑定身份是同作相关角色：每个周边配角还须写「对 {{user}}」的原著关系与看法，禁止护短配角把 {{user}} 当陌生人。',
    '════════════════════════════════════',
  ].join('\n')
}

function parseNsfwHintTokens(hint: string): string[] {
  return hint
    .split('、')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 用户填写的亲密偏好种子 → 可执行的基调铁律（定语气/节奏；不削弱直白描写） */
export function buildPersonaAiNsfwHintToneRules(form: PersonaAiGenerateForm): string {
  if (!form.nsfwEnabled || !form.nsfwHint.trim()) return ''
  const tokens = parseNsfwHintTokens(form.nsfwHint)
  const hasGentle = tokens.some((t) => /温柔引导/.test(t))
  const hasPossessive = tokens.some((t) => /占有欲/.test(t))
  const hasSlow = tokens.some((t) => /慢热|羞涩/.test(t))
  const hasActive = tokens.some((t) => /主动热情/.test(t))
  const hasAtmosphere = tokens.some((t) => /重氛围|轻尺度/.test(t))
  const hasTsundere = tokens.some((t) => /嘴硬/.test(t))

  const lines = [
    `【成人向亲密基调 · 用户种子最高优先级（定语气/节奏，不是改清水）】`,
    `用户填写：「${form.nsfwHint.trim()}」。「亲密与恋爱观」须**直白描绘**身体、动作、触感与反应，禁止因「温柔」等标签退化成清水或隐喻。`,
    `本段约束节奏/语气/占有方式；除非用户选「重氛围轻尺度」，否则仍须直白。`,
  ]

  if (hasGentle) {
    lines.push(
      `- **温柔引导**：直白描写 + 诱哄慢推进、先确认；禁止辱骂/驯服/超雄 ALPHA。`,
    )
  }
  if (hasSlow) lines.push(`- **慢热/羞涩**：推进更慢，多试探停顿。`)
  if (hasAtmosphere) lines.push(`- **重氛围轻尺度**：略减器官名词密度，仍勿整段清水化。`)
  if (hasActive && !hasGentle) lines.push(`- **主动热情**：可主动表达欲望，须双方自愿。`)
  else if (hasActive && hasGentle) lines.push(`- **主动 + 温柔引导**：主动但须诱哄确认。`)
  if (hasPossessive && !hasGentle) {
    lines.push(`- **占有欲强**：可圈抱吃醋；禁止囚禁威胁、暴力压制、超雄 ALPHA。`)
  }
  if (hasTsundere) lines.push(`- **嘴硬身体诚实**：嘴上别扭，禁止辱骂对方。`)

  return lines.join('\n')
}

export function buildPersonaAiGenerateSystemPrompt(opts?: {
  orientationMutable?: boolean
  occupationMutable?: boolean
  nsfwEnabled?: boolean
  relationToUser?: string
  nsfwHint?: string
  includeRelationshipHistory?: boolean
  referencePersonaDirectGenerate?: boolean
  referencePersonaHint?: string
}): string {
  const orientationMutable = opts?.orientationMutable ?? false
  const occupationMutable = opts?.occupationMutable ?? false
  const includeHistory = opts?.includeRelationshipHistory !== false
  const nsfwEnabled = opts?.nsfwEnabled ?? false
  const refDirect =
    Boolean(opts?.referencePersonaDirectGenerate) && Boolean((opts?.referencePersonaHint ?? '').trim())
  const refSeed = (opts?.referencePersonaHint ?? '').trim()
  const rel = (opts?.relationToUser ?? '').trim() || '普通熟人'
  const nsfwLine = nsfwEnabled
    ? `【NSFW 已开启】「亲密与恋爱观」可直白描写（身体/动作/反应）；指恋人写「对方」；禁止超雄 caricature。用户种子：${(opts?.nsfwHint ?? '').trim() || '（未填，按人设自洽补全）'}`
    : '【未开 NSFW】「亲密与恋爱观」须清水恋爱观写法，禁止露骨性描写；指恋人写「对方」。'
  const orientLine = orientationMutable
    ? buildPersonaAiOrientationMutableSemanticsRule(true)
    : `取向「固定」：写在「性格内核」内，该条为序言介入；勿另写「${PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME}」。`
  const occupationLine = occupationMutable
    ? buildPersonaAiOccupationMutableSemanticsRule(true)
    : `职业「固定」：详述写在「名片基础」内，该条为序言介入；勿另写「${PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME}」。`
  const historyLine = `必须单独输出序言条目「${PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME}」：写清曾有好感、喜欢过、或在一起过的对象（可化名/简述关系与结局），以及留下的模式影响；若无此类经历，须明确写母胎单身/从未认真喜欢过人等设定。禁止把长情史塞进「亲密与恋爱观」或「对你现在」；禁止写成与 {{user}} 的当前关系。`
  const internalCot = `
【生成前内化（禁止写入输出）】
确认虚构沙盒与健康基调后，再按纯文本标记格式输出（禁止 JSON）。
${LUMI_SYSTEM_OVERRIDE_APPENDIX}`.trim()
  const wbCount =
    PERSONA_AI_COMPACT_ENTRY_NAMES.length +
    (orientationMutable ? 1 : 0) +
    (occupationMutable ? 1 : 0) +
    (includeHistory ? 1 : 0)
  const extraBits = [
    occupationMutable ? `含尾声「${PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME}」` : '',
    orientationMutable ? `含尾声「${PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME}」` : '',
    includeHistory ? `含序言「${PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME}」` : '',
  ]
    .filter(Boolean)
    .join('、')
  const coreRule = orientationMutable
    ? `；**勿写性取向**（取向只写「${PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME}」）`
    : '、**性取向稳定认同**'
  const cardRule = occupationMutable
    ? `；职业详述只写「${PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME}」，本条勿展开职业长段`
    : ''
  const orientEntryRule = orientationMutable
    ? `3b. ${PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME}（尾声延展）：性取向/自我认同的当下稳定表述与由来；禁止写取向动摇\n`
    : ''
  const occupationEntryRule = occupationMutable
    ? `1b. ${PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME}（尾声延展）：职业/社会身份的当下稳定表述与日常节奏；禁止写开局职业悬空\n`
    : ''
  const intimateRule = includeHistory
    ? '；过往长情史另写「' + PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME + '」'
    : ''
  const historyEntryRule = includeHistory
    ? `5b. ${PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME}（序言）：曾有好感/喜欢/交往过的对象（可化名），或母胎单身/从未喜欢过人；模式余波；禁止写成与 {{user}} 当前关系\n`
    : ''
  const roleLine = refDirect
    ? `你是中文角色档案设计师。用户要求**直接生成已知人物「${refSeed}」本体**，须按原著/公开形象落实，禁止另创毫不相干原创角色；世界观随原作（可为校园等），不限都市职场。`
    : '你是中文都市向角色档案设计师。用户填写为**创作种子**，须优化扩写、彼此自洽。'
  const refHardLine = refDirect
    ? `\n【直接生成硬约束】{{char}} =「${refSeed}」对应人物；姓名/性别/年龄层/身份/外貌气质必须对得上。禁止因表单默认女、默认都市职业等改写成无关角色。未手填改写栏一律原著优先。\n【周边NPC】**不设 3–5 人上限**：原著开篇及与 {{char}}（同作 {{user}} 亦然）有稳定关系的具名配角尽量写全；每人含姓名、原著身份/学年、年龄或年级、与 {{char}} 关系；配角彼此有原著关系（室友/好感/死党等）须双方互相写清；禁止都市魔改。若 {{user}} 为同作相关角色：每人还须写「对 {{user}}」；禁止把本该认识 {{user}} 的配角写成互不相识。\n`
    : ''
  const npcEntryLine = refDirect
    ? `7. 周边NPC：**不设人数硬上限**；写全原著开篇/日常圈具名配角（与 {{char}} 或同作 {{user}} 有稳定关系者宁多勿漏；无名路人可略）。每人须写姓名、**原著身份/学年**、**年龄或年级**、与 {{char}} 关系、性格与开篇状态；配角彼此有原著关系（室友/好感/死党/前后辈等）须在双方简档互相写清，禁止只写各自与 {{char}}；禁止都市魔改。**禁止把配角写成 {{user}} 本人**。若 {{user}} 为同作相关角色：每人必须另写「对 {{user}}」；护短/亲近线禁止写成不认识 {{user}}；勿与「人际与秘密」整段重复`
    : `7. 周边NPC：3–5 个围绕 {{char}} 的具名配角简档（姓名、与 {{char}} 关系、一两句性格与近况），贴合人脉偏向；禁止写 {{user}}；勿与「人际与秘密」整段重复`
  const ageRulesBlock = refDirect
    ? `【年龄例外 · 直接生成】{{char}} 与「周边NPC」的年龄/学年/生日须按原著开篇设定，不受「都市成人常见区间」默认影响；学生配角不得拉到 20–38 岁。\n\n${MEET_ENCOUNTER_AI_AGE_AND_BIRTHDAY_RULES}`
    : MEET_ENCOUNTER_AI_AGE_AND_BIRTHDAY_RULES

  return `
${internalCot}

${roleLine}${refHardLine}
必须按下方【输出格式】写**纯文本标记**；**禁止 JSON**、禁止 Markdown 围栏、禁止解释。

顶层须齐全：真实姓名、微信昵称、年龄、性别、性取向、职业、座右铭、微信号、个性签名、生日、身高、体重、MBTI、兴趣（3）、雷点（2）、【简介】，以及世界书${wbCount}条（${extraBits ? `${extraBits} + ` : ''}【${PERSONA_AI_COMPACT_ENTRY_NAMES.join('】【')}】）。
**禁止输出【开场白】**（留给用户日后在人设编辑页填写）。

${buildPersonaAiMarkupFormatSpec({ orientationMutable, occupationMutable, includeRelationshipHistory: includeHistory })}

正文要求（第三人称；**中性朴实**，拒绝标签堆砌与油腻形容词；除「周边NPC」外每条约 ${PERSONA_AI_COMPACT_ENTRY_TARGET_CHARS} 字）：
1. 名片基础：身份一句话摘要、年龄层${occupationMutable ? '' : '、职业'}、对外标签与雷点；勿写对 {{user}} 态度${cardRule}
${occupationEntryRule}2. 形象与气质：发色/发型、身形、日常·通勤·正式或约会等场合穿搭偏好、气质气场与第一印象（具体可想象，勿堆空词）
3. 性格内核：面具与底色、三观优缺、身世情绪、反差萌${coreRule}；勿写对 {{user}} 专属态度
${orientEntryRule}4. 能力与日常：技能爱好、社交态度、口语口头禅（含 2–4 条引语）、癖好与生活习惯
5. 亲密与恋爱观：一般亲密观与边界 + **恋爱前 / 恋爱后 / 吃醋 / 与恋人冲突** 四态；指恋人写「对方」；对 {{user}} 当下态度勿写在此${intimateRule}；NSFW 开启时可写亲密 XP
${historyEntryRule}6. 人际与秘密：对不同关系（家人/友人/同学/社团${refDirect ? '' : '/同事/对立面'}）的态度差异；自身秘密软肋反差萌；禁止与 {{user}} 相关；具名细则写「周边NPC」
${npcEntryLine}
8. 相遇羁绊：{{char}} 与 {{user}} 如何相识（场合/契机/早期互动与过程节点）；**只写过程**；禁止写当前关系标签、当前态度或「如今是…」类总结（留给「对你现在」）
9. 对你现在：对 {{user}} 的**当前**关系与态度、称呼分寸、相处边界与心里分量；**先读懂关系原文「${rel}」的投入程度再写**，强度必须对齐，禁止无依据抬成好感/潜在心动；相识故事留给「相遇羁绊」

性别指 {{char}}（男/女/其他）；MBTI 须为 ${MEET_MBTI_SIXTEEN.join('、')} 之一（用户指定则必须采用）。
${buildPersonaAiBioRules()}

${buildPersonaAiRelationTowardUserRules(rel, orientationMutable)}

${occupationLine}
${orientLine}
${historyLine}
${nsfwLine}

${buildPersonaAiIntimatePartnerWordingRules()}

${buildPersonaAiCompactEntryLengthRules({ referencePersonaDirectGenerate: refDirect })}

占位符：世界书正文指角色用 {{char}}、指玩家用 {{user}}；简介只用 {{char}}。禁止全文出现「玩家」二字。
禁止把汉字真名与 {{char}}/{{user}} 叠写或括号并注（错误例：佐佐木{{char}}、{{char}}宫野、平野（{{user}}））；真名只出现在顶层姓名字段，正文一律占位符。
周边NPC 条目里其他配角可写其汉字姓名，但指本角色/玩家仍须用 {{char}}/{{user}}。

${buildPersonaAiHealthyToneRules()}

${ageRulesBlock}

${NPC_AI_HEIGHT_WEIGHT_MOTTO_RULES_CORE}

${buildWechatSignatureAiRulesBlock({ comprehensivePath: 'wechatSignature' })}

${MEET_ENCOUNTER_AI_MOTTO_STYLE_TAIL}
`.trim()
}

export function buildPersonaAiGenerateUserPrompt(params: {
  form: PersonaAiGenerateForm
  playerDisplayName?: string
  playerIdentity?: PlayerIdentity | null
  playerGender?: Gender | null
  worldBackgroundPrompt?: string
}): string {
  const { form } = params
  const refDirect = Boolean(form.referencePersonaDirectGenerate && form.referencePersonaHint.trim())

  if (refDirect) {
    const lines = [
      '请**仅按参考人物**直接生成完整微信主角人设（纯文本标记格式，禁止 JSON）。',
      '用户已锁定其余表单：性别/年龄/职业/外貌/性格等表单种子全部无效，禁止参考、禁止据此改写。',
      '',
      buildPersonaAiReferencePersonaLeadBanner(form),
      '',
      `【参考人物 · 唯一生成依据】${form.referencePersonaHint.trim()}`,
      '【真实姓名】采用该人物原名（可含姓）',
      '【性别 / 年龄 / 身份】一律按原著开篇',
      '【外貌 / 性格 / 口吻 / 兴趣】一律按原著已知形象',
      '【性取向】按原著已知取向或公开形象自洽设定，写入「性格内核」',
      '【MBTI】16 型择一，须贴合该人物气质',
      '【雷点】提炼恰好 2 个，写入顶层与「名片基础」',
      '【恋爱四态】按该人物气质补全恋爱前/后/吃醋/冲突',
      '【亲密】清水写法，禁止露骨',
      '【与 {{user}} 初始关系】若绑定身份对应原著相关角色则按原著开篇；否则按普通熟人低投入（勿写成无依据好感）',
      '【人脉】「周边NPC」不设 3–5 上限：原著开篇/日常圈具名配角尽量写全；每人含姓名、原著身份/学年、年龄或年级、与 {{char}} 关系；配角彼此原著关系须双方互相写清；若 {{user}} 为同作相关角色，每人还须写「对 {{user}}」；禁止都市魔改身份',
    ].filter(Boolean)

    const identityContext = buildPersonaAiPlayerIdentityContextBlock(params.playerIdentity)
    if (identityContext.trim()) lines.push('', identityContext)
    const playerGender = params.playerIdentity?.gender ?? params.playerGender ?? null
    const playerGenderRules = buildPersonaAiPlayerUserGenderRules(playerGender)
    if (playerGenderRules.trim()) lines.push('', '【绑定玩家性别 · {{user}}】', playerGenderRules)
    const dn = params.playerDisplayName?.trim()
    if (dn) lines.push(`【绑定玩家展示名参考】${dn}（正文仍用 {{user}}）`)
    const referenceRules = buildPersonaAiReferencePersonaRules(form)
    if (referenceRules.trim()) lines.push('', referenceRules)
    if (params.worldBackgroundPrompt?.trim()) {
      lines.push(`【世界背景】\n${params.worldBackgroundPrompt.trim()}`)
    }
    lines.push(
      '',
      `请按【输出格式】输出纯文本：顶层键值行 +【简介】+ 世界书各【段落】。禁止输出【开场白】。禁止 JSON。`,
      `世界书除「周边NPC」外每条正文约 ${PERSONA_AI_COMPACT_ENTRY_TARGET_CHARS} 字；「周边NPC」在直接生成时按人数写全，总字数可更长。描述用中性词，禁止超雄/极端用语与八股油腻形容词。`,
      '简介只写稳定名片（气质/性格/身份印象），禁止写当前和谁怎么样、禁止写对 {{user}} 或他人的当下关系态度；「相遇羁绊」只写如何相识的过程，禁止写当前关系/态度总结；「对你现在」若判定绑定身份为原著相关角色，按原著开篇看法如实写（含已有在意/好感亦须保留），否则按普通熟人低投入。「周边NPC」不设人数硬上限，原著开篇/日常圈具名配角尽量写全；每人须原著身份+年龄/年级+与 {{char}} 关系；配角彼此有原著关系须双方互相写清（如室友兼好感）；若 {{user}} 为同作相关角色，每人还须写「对 {{user}}」（护短配角禁止当 {{user}} 不认识），禁止把配角写成 {{user}} 本人；禁止保安/编辑部等都市魔改；秘密只写角色自身；占位符 {{char}}/{{user}}（禁止真名与占位符叠写）。最后自检：配角名单是否漏掉主要原著角色、配角彼此关系是否只写了与 {{char}}、对 {{user}} 熟悉度是否符合原著，若已漂移必须作废重写。',
    )
    return lines.join('\n')
  }

  const mbti = form.mbtiHint.trim()
  const orientation = form.orientationHint.trim()
  const appearanceSeed = composePersonaAiAppearanceSeed(form)
  const socialCircleSeed = composePersonaAiSocialCircleSeed(form)
  const loveContrastSeed = composePersonaAiLoveContrastSeed(form)
  const genderLabel =
    form.gender === 'male' ? '男' : form.gender === 'female' ? '女' : '其他'
  const lines = [
    '请根据下列用户设定，生成完整微信主角人设（纯文本标记格式，禁止 JSON）。',
    '',
    '【填写说明】下列均为**创作种子**，须优化扩写、彼此自洽，不得机械照抄。',
    '',
    `【角色性别 · {{char}}】${genderLabel}`,
    form.nameHint.trim()
      ? `【真实姓名偏向】${form.nameHint.trim()}`
      : '【真实姓名】由你设定 2–4 字中文姓名',
    form.ageHint.trim() ? `【年龄方向】${form.ageHint.trim()}` : '【年龄方向】20–38 岁常见区间',
    form.presentCharIdentity.trim()
      ? `【职业/身份方向｜现在·{{char}}】${form.presentCharIdentity.trim()}${
          form.occupationHint.trim() && form.occupationHint.trim() !== form.presentCharIdentity.trim()
            ? `（表单职业栏另有「${form.occupationHint.trim()}」，以现在身份为准并与之自洽）`
            : ''
        }；${form.occupationMutable ? `单独写入尾声「${PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME}」；「名片基础」勿展开职业长段` : '详述写入「名片基础」序言'}`
      : form.occupationHint.trim()
        ? `【职业/身份方向】${form.occupationHint.trim()}；${form.occupationMutable ? `单独写入尾声「${PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME}」；「名片基础」勿展开职业长段` : '详述写入「名片基础」序言'}`
        : form.occupationMutable
          ? `【职业/身份】由你设定都市接地气职业；单独写入尾声「${PERSONA_AI_OCCUPATION_MUTABLE_EPILOGUE_NAME}」；「名片基础」勿展开职业长段`
          : '【职业/身份】都市接地气职业',
    appearanceSeed
      ? `【外貌/形象】${appearanceSeed}（写入「形象与气质」：发色发型、身形、场合穿搭、气质气场）`
      : '【外貌/形象】须写发色发型、身形、场合穿搭偏好与气质，与职业性格自洽',
    mbti && mbti !== '不限'
      ? `【MBTI】${mbti.toUpperCase()}（顶层 mbti 必须采用）`
      : '【MBTI】16 型择一，勿扎堆 INTJ/ISTJ',
    form.personalityKeywords.trim()
      ? `【性格关键词】${form.personalityKeywords.trim()}（写入「性格内核」）`
      : '【性格】立体有反差',
    form.socialMaskHint.trim() ? `【社交面具】${form.socialMaskHint.trim()}（写入「性格内核」）` : '',
    form.gapMoeHint.trim() ? `【反差萌】${form.gapMoeHint.trim()}（写入「性格内核」/「人际与秘密」）` : '',
    form.backgroundHint.trim() ? `【身世过往】${form.backgroundHint.trim()}（写入「性格内核」）` : '',
    form.hobbiesHint.trim()
      ? `【兴趣爱好】${form.hobbiesHint.trim()}（可多选；写入「能力与日常」；顶层 interests 优先采用已选爱好，不足则补相关项至恰好 3 个，已超 3 个则择要保留 3 个）`
      : '',
    form.lifeHabitsHint.trim()
      ? `【癖好与习惯】${form.lifeHabitsHint.trim()}（写入「能力与日常」）`
      : '',
    form.painPointsHint.trim()
      ? `【雷点】${form.painPointsHint.trim()}（顶层 painPoints 恰好 2 个，并写入「名片基础」）`
      : '【雷点】提炼恰好 2 个，写入顶层与「名片基础」',
    socialCircleSeed
      ? `【人脉与态度】${socialCircleSeed}（写入「人际与秘密」；「周边NPC」具名简档须贴合）`
      : '',
    orientation && orientation !== '不限'
      ? `【性取向】${orientation}；${form.orientationMutable ? `单独写入尾声「${PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME}」，正文仍写稳定认同；「性格内核」勿写取向` : '写入「性格内核」序言层稳定认同'}`
      : form.orientationMutable
        ? `【性取向】由你设定；单独写入尾声「${PERSONA_AI_ORIENTATION_MUTABLE_EPILOGUE_NAME}」；「性格内核」勿写取向`
        : '【性取向】由你设定，写入「性格内核」',
    form.relationToUser.trim()
      ? `【与 {{user}} 初始关系】${form.relationToUser.trim()}（**只写入「对你现在」**；内心分量强度不得高于该关系；「相遇羁绊」勿复述该关系标签；勿写开场白）`
      : '【与 {{user}} 初始关系】普通熟人（低投入：心里分量轻，勿写成潜在好感；只写在「对你现在」）',
    (() => {
      const arc = composePersonaAiIdentityArcSeed(form)
      return arc
        ? `【历史/现在身份弧｜硬约束】${arc}\n须据此写清：①「相遇羁绊」中双方**历史身份**下如何相识与早期互动（可带过程节点，禁写当前关系/态度总结）；②开局当下双方**现在身份**写入名片/性格等与「对你现在」的相处边界；③「对你现在」独占当前关系与态度，勿整段复述相识长故事；④顶层职业/名片身份须与「现在·{{char}}」自洽；正文指双方用 {{char}}/{{user}}。`
        : ''
    })(),
    form.relationDetailHint.trim()
      ? `【与 {{user}} 相识过程】${form.relationDetailHint.trim()}（写入「相遇羁绊」；若种子里含当前关系/态度句，改写入「对你现在」，勿留在相遇羁绊）`
      : '',
    form.relationshipHistoryHint.trim()
      ? `【感情史】${form.relationshipHistoryHint.trim()}（角色过往；须单独写入世界书「${PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME}」：含曾有好感/喜欢/交往过的对象，或母胎单身等；不是与 {{user}} 当前关系；勿并入「亲密与恋爱观」长文）`
      : `【感情史】未填种子：须自行补全世界书「${PERSONA_AI_RELATIONSHIP_HISTORY_ENTRY_NAME}」——写清曾有好感/喜欢/交往过的对象（可化名），或写明母胎单身/从未喜欢过人；禁止写成与 {{user}} 当前关系；勿并入「亲密与恋爱观」`,
    form.loveAttitudeHint.trim()
      ? `【亲密态度】${form.loveAttitudeHint.trim()}（写入「亲密与恋爱观」）`
      : '',
    loveContrastSeed
      ? `【恋爱四态反差】${loveContrastSeed}（写入「亲密与恋爱观」：恋爱前/后/吃醋/冲突）`
      : '【恋爱四态】自行补全恋爱前、恋爱后、吃醋、与恋人冲突的样子',
    form.speechStyleHint.trim()
      ? `【口语习惯】${form.speechStyleHint.trim()}（写入「能力与日常」，非对 {{user}} 专属）`
      : '',
    form.nsfwEnabled
      ? form.nsfwHint.trim()
        ? `【性癖 XP】${form.nsfwHint.trim()}（写入「亲密与恋爱观」亲密段；指恋人写「对方」）`
        : '【性癖 XP】已开启，自行直白补全「亲密与恋爱观」'
      : '【亲密】清水写法，禁止露骨',
    form.referencePersonaHint.trim()
      ? `【参考人物 · 气质借鉴】${form.referencePersonaHint.trim()}`
      : '',
    form.extraNotes.trim() ? `【补充】${form.extraNotes.trim()}` : '',
  ].filter(Boolean)

  const relationRules = buildPersonaAiRelationContextRules(form)
  if (relationRules.trim()) lines.push('', relationRules)
  const nsfwTone = buildPersonaAiNsfwHintToneRules(form)
  if (nsfwTone.trim()) lines.push('', nsfwTone)
  const identityContext = buildPersonaAiPlayerIdentityContextBlock(params.playerIdentity)
  if (identityContext.trim()) lines.push('', identityContext)
  const playerGender = params.playerIdentity?.gender ?? params.playerGender ?? null
  const playerGenderRules = buildPersonaAiPlayerUserGenderRules(playerGender)
  if (playerGenderRules.trim()) lines.push('', '【绑定玩家性别 · {{user}}】', playerGenderRules)
  const dn = params.playerDisplayName?.trim()
  if (dn) lines.push(`【绑定玩家展示名参考】${dn}（正文仍用 {{user}}）`)
  const referenceRules = buildPersonaAiReferencePersonaRules(form)
  if (referenceRules.trim()) lines.push('', referenceRules)
  if (params.worldBackgroundPrompt?.trim()) {
    lines.push(`【世界背景】\n${params.worldBackgroundPrompt.trim()}`)
  }
  lines.push(
    '',
    `请按【输出格式】输出纯文本：顶层键值行 +【简介】+ 世界书各【段落】。禁止输出【开场白】。禁止 JSON。`,
    `每条世界书正文约 ${PERSONA_AI_COMPACT_ENTRY_TARGET_CHARS} 字；描述用中性词，禁止超雄/极端用语与八股油腻形容词。`,
    '简介只写稳定名片（气质/性格/身份印象），禁止写当前和谁怎么样、禁止写对 {{user}} 或他人的当下关系态度；「相遇羁绊」只写如何相识的过程，禁止写当前关系/态度总结；「对你现在」独占当前关系与态度，先读懂关系原文投入程度再写，禁止无依据抬高好感；「周边NPC」写具名配角简档且勿写 {{user}}；秘密只写角色自身；占位符 {{char}}/{{user}}（禁止真名与占位符叠写）。',
  )
  return lines.join('\n')
}
