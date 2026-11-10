import {
  consumeLastOpenAiChatOutputTruncatedByLimitFlag,
  consumeLastOpenAiChatStreamPartialFlag,
  openAiCompatibleChat,
} from '../newFriendsPersona/ai'
import {
  buildDatingCharUserPerspectiveDirective,
  expandCharUserPlaceholders,
} from '../charUserPlaceholders'
import type { ApiConfig, ApiConfigCore } from '../../api/types'
import type { TranslationRuntime } from '../../api/translationProviders'
import {
  normalizeWeChatChatLanguageCode,
  weChatChatLanguageLabel,
  weChatChatLanguageNativeName,
  WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
} from '../wechatChatLanguage'
import { buildWorldbookContext } from '../../../worldbook/buildWorldbookContext'
import {
  buildWechatReplyRomanceSections,
  resolveLoreArchiveBuiltinPresetToggles,
} from '../../../worldbook/loreArchiveBuiltinPresets'
import {
  getLoreArchiveBuiltinPresetPriorityTiersSnapshot,
  getLoreArchiveBuiltinPresetTogglesSnapshot,
  getWorldbookLoreEntriesSnapshot,
} from '../../../worldbook/worldbookLoreStore'
import { PROSE_FORBIDDEN_LEXICON_PROMPT, PROSE_FORBIDDEN_TOP_PRIORITY_PIN } from '../proseForbiddenLexiconPrompt'
import { MBTI_OUTPUT_BAN_RULE } from '../mbtiOutputBan'
import { splitDatingAssistantOutput } from './plotCoT'
import { buildDatingStyleSystemAppend } from './datingStylePrompt'
import {
  buildOfflineDatingSlimMustInjectBody,
  OFFLINE_DATING_CREATIVE_RULES_TITLE,
} from './offlineDatingMustInjectPrompts'
import { getActiveCustomWritingInjectBody } from './datingWritingPresetStore'
import { resolveOfflineReplyStyleAppendix } from '../../thinkingChain/cotAssemble'
import { DATING_MIMIC_USER_SPEAKING_STYLE_APPENDIX } from '../wechatMimicUserSpeakingStyle'
import { loadMimicUserSpeakingStyleEnabled } from '../mimicUserSpeakingStyleSettings'
import { OFFLINE_DATING_RICH_INNER_OS_APPENDIX } from './offlineDatingRichInnerOsAppendix'
import { OFFLINE_DATING_FASHION_STYLING_APPENDIX } from './offlineDatingFashionStylingAppendix'
import { OFFLINE_DATING_COUPLE_INTIMACY_POSE_APPENDIX } from './offlineDatingCoupleIntimacyPoseAppendix'
import {
  buildDatingLanguageAppendix,
  finalizeDatingPlotDialogueTranslations,
  inferDatingRelationHintForTranslation,
} from './datingLanguagePrompt'
import {
  diagnoseIfHtmlRejectReason,
  extractCssClassNames,
  hasEmptyOrMissingStyleBlock,
  hasFullHtmlDocumentShell,
  isEmojiHeavyHtmlShell,
  isHollowInteractiveHtml,
  isIncompleteHtmlDocument,
  tryNormalizeRenderablePlotHtml,
  wrapIfHtmlFragmentWithDocumentShell,
} from './datingPlotHtmlVisual'
import {
  datingPlotDimensionOutputMaxTokens,
  type CharacterInfo,
  type NarrativeGenOptions,
  type NarrativePerspective,
  type PlotDialogueTranslation,
  type PlotDimensionKind,
} from './types'
import { personaDb } from '../newFriendsPersona/idb'
import type { Character, PlayerIdentity } from '../newFriendsPersona/types'
import { loadPairLifePromptContext } from '../lifeMutable/load'
import { buildCharacterCard } from '../wechatChatAi'
import { buildDatingWechatBlockRelationAppendix } from '../wechatBlock'

export type DatingPlotDimensionLifeContext = {
  characterLifeBlock: string
  playerLifeBlock: string
  characterProfileBlock: string
}

/** 平行 / IF 线：与主线约会相同，注入可变人生账本（当前年龄等），避免仍读建档卡初始设定。 */
export async function loadDatingPlotDimensionLifeContext(params: {
  character: CharacterInfo
  playerIdentity: PlayerIdentity | null
}): Promise<DatingPlotDimensionLifeContext> {
  const mainCharRow = await personaDb.getCharacter(params.character.id).catch(() => null)
  const lifeCharForClock: Character =
    mainCharRow ??
    ({
      id: params.character.id,
      createdAt: 0,
      updatedAt: 0,
      name: params.character.realName,
      gender: 'other',
      age: params.character.age,
      birthdayMD: params.character.birthdayMD,
      zodiac: params.character.zodiac,
      identity: params.character.identityTags.join('、'),
      worldBooks: [],
    } satisfies Character)

  const lifePair = await loadPairLifePromptContext({
    character: lifeCharForClock,
    playerIdentity: params.playerIdentity,
  }).catch(() => ({
    characterOverlay: null,
    playerOverlay: null,
    characterBlock: '',
    playerBlock: '',
  }))

  const profileCore = mainCharRow
    ? buildCharacterCard(mainCharRow, {
        bioMaxChars: 900,
        lifeOverlay: lifePair.characterOverlay,
      })
    : [
        `姓名/常用称呼：${lifePair.characterOverlay?.name?.trim() || params.character.realName}`,
        typeof lifePair.characterOverlay?.age === 'number'
          ? `年龄：${lifePair.characterOverlay.age}`
          : `年龄：${params.character.age}`,
        `标签：${params.character.identityTags.join('、') || '无'}`,
        `设定摘要：${params.character.prompt.slice(0, 900)}`,
      ]
        .filter(Boolean)
        .join('\n')
  const blockAppendix = buildDatingWechatBlockRelationAppendix(mainCharRow)
  const characterProfileBlock = blockAppendix
    ? `${profileCore}\n\n${blockAppendix}`
    : profileCore

  return {
    characterLifeBlock: lifePair.characterBlock,
    playerLifeBlock: lifePair.playerBlock,
    characterProfileBlock,
  }
}

export const PLOT_DIMENSION_LABELS: Record<PlotDimensionKind, string> = {
  parallel: '平行事件',
  if: 'IF线',
}

/** 与主线剧情相同的语言 / 同步翻译设置（旁白·对白·内心 OS 可分设） */
export type DimensionLanguageSettings = {
  dialogueLanguage?: string | null
  innerOsLanguage?: string | null
  dialogueTranslationSyncEnabled?: boolean
  innerOsTranslationSyncEnabled?: boolean
  dialogueTranslationLanguage?: string | null
  translationDedicatedApi?: boolean
  characterPersonaBrief?: string | null
  relationHint?: string | null
}

function buildDimensionLanguageRule(
  kind: PlotDimensionKind,
  plotLanguage?: string | null,
  dialogueLanguage?: string | null,
  innerOsLanguage?: string | null,
): string {
  const plotCode = normalizeWeChatChatLanguageCode(plotLanguage, WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE)
  const dialogueCode = normalizeWeChatChatLanguageCode(
    String(dialogueLanguage ?? '').trim() ? dialogueLanguage : plotLanguage,
    plotCode,
  )
  const osCode = normalizeWeChatChatLanguageCode(
    String(innerOsLanguage ?? '').trim() ? innerOsLanguage : plotLanguage,
    plotCode,
  )
  const plotLabel = weChatChatLanguageLabel(plotCode)
  const plotNative = weChatChatLanguageNativeName(plotCode)
  const dialogueLabel = weChatChatLanguageLabel(dialogueCode)
  const dialogueNative = weChatChatLanguageNativeName(dialogueCode)
  const osLabel = weChatChatLanguageLabel(osCode)
  const osNative = weChatChatLanguageNativeName(osCode)
  const jaSpokenBan =
    dialogueCode === 'ja' || osCode === 'ja'
      ? `\n- **日语当面口语**：对白/OS 禁止句末挂网聊「笑」「（笑）」「w」（震惊/愤怒时尤其禁止）；真笑用「あはは／ふふ」或神态旁白。本条覆盖线上私聊的「句末可挂笑」。`
      : ''
  if (plotCode === dialogueCode && plotCode === osCode) {
    return `【输出语言·硬项】本段「${PLOT_DIMENSION_LABELS[kind]}」旁白、对白与内心 OS 一律用 **${plotLabel}（${plotNative}）** 书写；专名、假名昵称、商标可保留原形。${jaSpokenBan}`
  }
  return `【输出语言·硬项】本段「${PLOT_DIMENSION_LABELS[kind]}」分板块语言：
- 旁白（叙述）：**${plotLabel}（${plotNative}）**
- 对白（引号 / VN【对白】）：**${dialogueLabel}（${dialogueNative}）**
- 内心 OS（\`**…**\` / VN【内心】）：**${osLabel}（${osNative}）**
专名、假名昵称、商标可保留原形。${jaSpokenBan}`
}

function buildDimensionSystemPrompt(
  kind: PlotDimensionKind,
  character: CharacterInfo,
  opts: {
    godPerspective: boolean
    mainCharacterOffstage: boolean
    perspective: NarrativePerspective
    playerIdentityCardName?: string | null
    outputLanguage?: string | null
    isVnMode?: boolean
    languageSettings?: DimensionLanguageSettings | null
    /** 与主线约会同一套文风（用户设定或默认汪曾祺白描） */
    styleGenOptions?: Pick<NarrativeGenOptions, 'stylePrompt' | 'referenceSnippet'> | null
    /** 与私聊同一会话开关：语气同化 */
    mimicUserSpeakingStyleEnabled?: boolean
    lifeContext?: DatingPlotDimensionLifeContext | null
    /** 缺省开。关时人称与输出语言跟随线下预设 */
    consolePromptsEnabled?: boolean
    /** IF/平行：用户是否填写了写作引导（有则当规格书，禁止压成短切片） */
    hasWritingGuide?: boolean
    /** IF：引导要求另起番外 / 独立故事（禁止接着锚点当场戏往下写） */
    standaloneSideStory?: boolean
    /** IF：引导要求与正文完全无关（不喂锚点剧情） */
    unrelatedToMain?: boolean
    /** 用户写作引导原文（用于抽出硬检） */
    writingGuideText?: string | null
    /** IF：面板「输出格式」显式选了 HTML（不靠引导词语嗅探） */
    wantsHtml?: boolean
  },
): string {
  const charName = character.realName.trim() || '对方'
  const userName = String(opts.playerIdentityCardName ?? '').trim() || '用户'
  const consolePromptsOn = opts.consolePromptsEnabled !== false
  const hasGuide = opts.hasWritingGuide === true
  const standalone = kind === 'if' && hasGuide && opts.standaloneSideStory === true
  const unrelated = standalone && opts.unrelatedToMain === true
  const guideText = String(opts.writingGuideText ?? '').trim()
  const guideWantsHtml = kind === 'if' && opts.wantsHtml === true
  const guideHardRules =
    standalone && guideText ? buildStandaloneGuideHardRules(guideText, charName, userName) : ''
  const forceThird = standalone && /第三人称/.test(guideText)
  const cuDirective =
    kind === 'parallel' ? '' : buildDatingCharUserPerspectiveDirective(charName, userName)

  const datingWbIds = [character.id].map((x) => String(x ?? '').trim()).filter(Boolean)
  const plate = opts.isVnMode ? ('vn' as const) : ('offline_plot' as const)
  const archiveBlock = datingWbIds.length
    ? buildWorldbookContext(datingWbIds, getWorldbookLoreEntriesSnapshot(), plate).trim()
    : buildWorldbookContext([], getWorldbookLoreEntriesSnapshot(), plate).trim()

  const modeNote =
    kind === 'parallel'
      ? `【平行事件·叙述立场】本任务是锚点正文的**屏外同步切片**：用第三人称旁白写「另一边」正在发生的事；**不是**锚点内任何角色的视角，也**不是**对玩家的第二人称互动。`
      : !consolePromptsOn
        ? ''
        : standalone
          ? unrelated
            ? `【叙述许可·独立番外·与正文无关】用户要求**暂停主线、另起小剧场**，且与正文内容无关：禁止搬用主线正在进行的场景/对白/冲突/地点梗。本请求不提供锚点正文。只用人设姓名与气质，按写作引导从零开篇；引导点名的视角/格式/群像/结局须写全。`
            : `【叙述许可·另起番外】用户写作引导要求**独立番外/另起篇章**：锚点正文只供人设口吻与已定关系事实，**禁止**接着锚点当场戏、同一场景、同一句对白往下写。开篇须按引导另起时间线与场面；引导点名的视角/穿插仍须写全。`
          : hasGuide
            ? `【叙述许可】用户写作引导若要求阴阳两界、死后世界、去世后的 ${userName} 视角、另一侧群像、与阳间穿插：必须按引导写全。场控上帝/侧幕/人称只约束引导未点名的部分，不得用来删掉引导里的视角。阳间角色不必开天眼知道另一侧细节，但叙述者可以切到另一侧写。若引导写明番外/另起/独立故事：同样禁止接着锚点正文续写。`
            : opts.godPerspective
              ? `本轮存档已勾选上帝视角：**全篇**写屏外可见场景，玩家不得与约会对象同场同框；本切片细节对玩家默认不知情（后续当面禁止无故点破）。`
              : opts.mainCharacterOffstage
                ? `本轮存档已勾选侧幕叙写：**全篇**主角色缺席，约会主角色 ${charName} 不得出场、不得被写成在场互动对象；对本轮侧幕内容默认完全不知情（禁止开天眼；后续当面亦同）。`
                : `本轮未锁定上帝/侧幕：以锚点人称与关系为主轴续写；允许按需短切少量屏外或 NPC 侧幕，不必整篇锁死单一视角。屏外切片对玩家保密；主角色不在场切片对 ${charName} 保密。`

  const taskBlock =
    kind === 'parallel'
      ? `【任务·平行事件·同步铁律】锚点正文描写的是**某一剧情时刻 T** 正在发生的事。你必须写 **T 同一时刻** 在**完全另一处**同时发生的事。
- **时间锁**：与锚点**同时发生**（与此同时 / 同一时刻 / 另一边）。**禁止**写锚点之前或之后；禁止续写、闪回、后果收束。
- **空间锁**：地点/线程须与锚点场景**物理分离**（不同房间、不同楼层、不同建筑、不同城市等），不得与锚点同框同场。
- **人物锁（最高优先级）**：先识别锚点正文中**已出场、在场、正在互动或被描写当下言行**的全部角色（含玩家、约会对象 ${charName}、所有具名/可核对 NPC）。
  - 平行事件正文**不得**让上述任一角色：出场、开口对白、在场被描写、实时通话/同框连线、或以「正在锚点里做什么」被平行场景人物直接目击。
  - **只允许**锚点 cast **以外**的其他人物/群体在别处同时发生什么（真正的屏外 elsewhere）。
  - 锚点内角色**不知道**本切片内容；本切片也**不得**写成他们全知旁观或复述锚点细节。
- **因果锁**：不得改写锚点已定事实；平行切片不得替代主线正文。`
      : standalone
        ? `【任务·IF·另起番外】用户写作引导要求**直接另起番外/独立故事**：**引导即规格书**，须完整落实。
- **开篇硬锁**：按引导的时间线、场景、视角**另起一篇**；**禁止**承接主线末句、禁止同场同刻接着正文写、禁止用「若当时……」把番外焊回主线当场戏。
- ${unrelated ? '本请求**不提供**锚点正文；禁止自行脑补主线正在发生的桥段。' : '锚点正文**只**作人设口吻参考；不得复述锚点桥段当开场。'}
- 用户点名的视角、场景、问题清单、格式、结局必须逐条写到。
- 叙述时禁止跳出来说「这是 IF 线 / 番外 / AI 虚构」；气质用言行体现，不用人格标签。
${guideHardRules}`
        : hasGuide
          ? `【任务·IF 分支·用户规格书】用户已给出写作引导：**引导即本段剧情规格书**，须完整落实，不得改写成「从锚点微分歧的短切片」。
- 开篇即可按用户要求的时间线/设定起笔（含去世、另一侧世界、追求者、**另起番外**等故事内设定）；不必机械套「若当时……」空话。
- 若引导要求另起/独立/番外：**禁止**接着锚点正文当场戏往下写；锚点只供人设与已定事实。
- 用户点名的视角、场景、问题清单、格式（如日语对白后括号中文）、结局交代必须逐条写到。**禁止漏视角**（尤其去世后的 ${userName} 另一侧世界、与那边的人互动讨论的群像、与阳间穿插对照）。
- 本段仍是假设分支、不改锚点正史事实；叙述时禁止跳出来说「这是 IF 线」。
- 文风仍贴人设与锚点口吻，禁止 OOC；气质用言行体现，不用人格标签。
${guideHardRules}`
          : `【任务·IF 分支】从锚点剧情节点出发，写一段「若当时换了选择」后的**完整沉浸剧情**。
- **文风对齐（最高优先级之一）**：须与主线约会剧情**同一套笔触**——动作与对白优先、短句推进、贴地白描；**禁止**换成网文霸总腔、长篇抒情堆砌、鸡汤收束或设定讲解体。
- 开篇用一两句自然点出分歧（可用「若……」），随后像真正发生的当面戏一样写下去；**不要**跳出故事讲解「这是假设分支」。
- 本段仅为想象分支，**不得**改写锚点已定事实；但叙述时禁止在正文出现「主线 / 正史 / 设定 / 分支线」等元叙事说法。
- 气质只通过具体言行体现：禁止用人格标签、心理学术语或英文设定黑话代替描写。`

  const styleDuty =
    kind === 'if'
      ? hasGuide
        ? standalone
          ? `【文风】笔触贴人设口吻，禁止油腻霸总腔；**结构服从用户写作引导**；禁止把锚点当场戏当开场续写。`
          : `【文风】笔触贴人设与锚点口吻，禁止油腻霸总腔；结构服从用户写作引导。`
        : `【文风·与主线同轨】本段 IF 分支必须读起来像同一作者写的下一页约会正文，而不是另一套「幻想文/同人文」笔法。优先模仿下方【写作风格约束】与【参考笔触学习】，以及锚点正文本身的句式密度与对白口吻。`
      : `【文风·与主线同轨】本段须与主线约会剧情同一白描质感；动作与对白优先，禁空泛抒情与油腻套话。`

  const perspectiveRule = !consolePromptsOn
    ? forceThird
      ? `人称：用户写作引导要求第三人称——全篇第三人称旁白（姓名 / ${charName} / ${userName} / 他/她）；禁止用「你」指 ${userName}。`
      : '人称：以线下预设和锚点正文为准，不要套用场控人称。'
    : kind === 'parallel'
      ? `人称：第三人称旁白写**锚点 cast 以外**的同步场景；禁止用「你」指玩家；禁止 ${charName} 及锚点正文已出现角色出场。`
      : forceThird
        ? `人称：用户写作引导要求**第三人称**——全篇第三人称旁白（姓名 / ${charName} / ${userName} / 他/她）；禁止用「你」指 ${userName}；场存档人称不得覆盖本条。`
        : hasGuide
          ? `人称：阳间戏默认可跟随存档人称（${opts.perspective === 'first' ? '第一' : opts.perspective === 'third' ? '第三' : '第二'}人称）。**若用户写作引导要求第三人称或其他视角、另一侧世界、去世后的 ${userName} 视角、群像讨论、阴阳穿插，必须按引导切换视角写全**，不得因场控人称锁死。`
          : opts.perspective === 'first'
            ? '人称：第一人称（我/我们）为主；旁白指玩家须用「我」，禁止用「你」指玩家。上文若是「你」本轮须改口。'
            : opts.perspective === 'third'
              ? '人称：第三人称旁观为主；旁白指玩家须用他/她或姓名，禁止用「你」指玩家。上文若是「你」本轮须改口。'
              : '人称：第二人称（你）代入玩家为主；旁白指玩家须用「你」。'

  const languageRule = buildDimensionLanguageRule(
    kind,
    opts.outputLanguage,
    opts.languageSettings?.dialogueLanguage,
    opts.languageSettings?.innerOsLanguage,
  )
  const langSettings = opts.languageSettings
  const languageAppendix = buildDatingLanguageAppendix({
    plotOutputLanguage: opts.outputLanguage,
    dialogueLanguage: langSettings?.dialogueLanguage,
    innerOsLanguage: langSettings?.innerOsLanguage,
    dialogueTranslationSyncEnabled: langSettings?.dialogueTranslationSyncEnabled,
    innerOsTranslationSyncEnabled: langSettings?.innerOsTranslationSyncEnabled,
    dialogueTranslationLanguage: langSettings?.dialogueTranslationLanguage,
    translationDedicatedApi: langSettings?.translationDedicatedApi === true,
    characterName: charName,
    playerName: userName,
    relationHint: langSettings?.relationHint,
    characterPersonaBrief: langSettings?.characterPersonaBrief,
  })
  const toggles = getLoreArchiveBuiltinPresetTogglesSnapshot()
  const romanceBuiltinBlock = buildWechatReplyRomanceSections(
    toggles,
    getLoreArchiveBuiltinPresetPriorityTiersSnapshot(),
  ).trim()
  const resolvedPresets = resolveLoreArchiveBuiltinPresetToggles(toggles)
  const worldbookDuty = `【档案室效力】上列世界书/档案室规范对本段「${PLOT_DIMENSION_LABELS[kind]}」**同样生效**（含关系阶段、亲密分寸、禁止项等）；不得因是旁支切片或假设线而绕过。档案室档1高于人设、档2同级冲突跟全局、档3次于人设。
【内置预设·同等生效】档案室若已开启「纯爱克制 / Lumi 高质量爱情观 / 情感破冰与告白」等内置预设，对本段**与主线约会同等效力**：亲密分寸、关系阶段闸门、禁止强制爱不得因是 IF 分支或平行切片而放宽；气质仍服从人设，但边界硬底线不可破。`
  const richOsBlock = resolvedPresets.offlineRichInnerOs
    ? `【档案室预设·多内心 OS·已开启】本段线下旁支同样适用（覆盖默认 OS 过短敷衍）：\n${OFFLINE_DATING_RICH_INNER_OS_APPENDIX}`
    : ''
  const fashionBlock = resolvedPresets.offlineFashionStyling
    ? `【档案室预设·穿搭造型·已开启】本段线下旁支同样适用（禁敷衍衣着三件套）：\n${OFFLINE_DATING_FASHION_STYLING_APPENDIX}`
    : ''
  const intimacyPoseBlock = resolvedPresets.offlineCoupleIntimacyPoses
    ? `【档案室预设·耳后三厘米经济特区·已开启】旁支同样适用：具体姿势+表情+贴耳蜜语（软直带喘，可喘字穿插/断句对白；禁油腻小作文、禁侮辱）；禁空词、跳过前戏、哑巴动作、羞辱：\n${OFFLINE_DATING_COUPLE_INTIMACY_POSE_APPENDIX}`
    : ''
  const styleAppend = buildDatingStyleSystemAppend(
    opts.styleGenOptions
      ? {
          stylePrompt: opts.styleGenOptions.stylePrompt,
          referenceSnippet: opts.styleGenOptions.referenceSnippet,
        }
      : undefined,
  )
  const mimicAppend =
    opts.mimicUserSpeakingStyleEnabled === true
      ? `\n\n${DATING_MIMIC_USER_SPEAKING_STYLE_APPENDIX}`
      : ''

  const lifeCtx = opts.lifeContext
  const lifeBlocks = [lifeCtx?.characterLifeBlock, lifeCtx?.playerLifeBlock]
    .map((b) => String(b ?? '').trim())
    .filter(Boolean)
  const lifeDuty =
    lifeBlocks.length > 0
      ? `【可变人生账本·同等效力】下方「角色/玩家可变人生」记录本线**当前**姓名、年龄、职业、资产等事实，与角色档案、人设世界书、全局档案室**同级**；冲突时当前生理/资产/学历以账本为准，**禁止**再写建档卡或开篇固定人设里的旧年龄/旧身份。\n`
      : ''

  /** 与主线同一套「扮演核心 + 默认写作板块」（含通道对齐·禁小混蛋、神态/OS 平等铁律等）；自定义写作预设时仅注入用户正文 */
  const customWritingPrompt = getActiveCustomWritingInjectBody()
  const slimMustInject = buildOfflineDatingSlimMustInjectBody({
    customWritingPrompt,
    replyStyleOverride: resolveOfflineReplyStyleAppendix(),
  })
  const usingCustomWriting = typeof customWritingPrompt === 'string'
  // 系统默认时 slim 已含写作禁词表；自定义时仍附带禁词底线，避免旁支完全失约束
  const proseTail = usingCustomWriting
    ? `\n\n${PROSE_FORBIDDEN_TOP_PRIORITY_PIN}\n\n${PROSE_FORBIDDEN_LEXICON_PROMPT}`
    : ''

  const metaBan = `【禁止元叙事出戏】禁止用「IF线 / 主线 / 正史 / OOC / 人设卡 / canon / AU / OC」等制作术语出戏。若用户写作引导要求死后世界、阴阳两界、另一侧视角穿插，那是**故事内设定，必须写**；不要用「平行宇宙」制作黑话点破，可用「另一边 / 那一侧 / 他看不见的地方」等沉浸写法。禁止用「细碎的电流」「化掉的雪」「唯一的锚点」等网文滥抒情收束。`
  const equalityHard =
    kind === 'if'
      ? `【IF·称呼与平等硬补】对白/旁白/内心 OS **一律禁止**「小混蛋 / 小没良心的 / 小家伙 / 小朋友 / 小野猫 / 小妖精 / 小祖宗」等幼化贬低宠溺称；须与主线「${OFFLINE_DATING_CREATIVE_RULES_TITLE}」及通道对齐同效，不得因是假设分支放宽。`
      : ''

  // HTML 模式：交互界面规范 + 人设/账本参考；不拼散文格式铁律/文风/对白排版等杂质
  if (guideWantsHtml) {
    const personaBits = [
      archiveBlock ? `【人设世界书 / 档案室】\n${archiveBlock}` : '',
      lifeDuty,
      lifeBlocks.length ? lifeBlocks.join('\n\n') : '',
      `【人设锚定】页面文案、互动语气须贴合 {{char}} 与 {{user}} 的人设气质，禁止 OOC；姓名嵌入界面，勿另写散文剧情正文。`,
    ]
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .join('\n\n')
    return expandCharUserPlaceholders(
      `${IF_HTML_ROLEPLAY_DESIGN_PROMPT}\n\n${personaBits}`,
      { charName, userName },
    )
  }

  const roleLine = `你是线下约会「${PLOT_DIMENSION_LABELS[kind]}」写手：与主线约会**同一文风管线、同一档案室约束**，不是另一套模板腔助手。`

  const raw = `${cuDirective}${MBTI_OUTPUT_BAN_RULE}

${archiveBlock ? `${archiveBlock}\n\n` : ''}${worldbookDuty}
${lifeDuty}${lifeBlocks.length ? `${lifeBlocks.join('\n\n')}\n\n` : ''}${romanceBuiltinBlock ? `\n\n${romanceBuiltinBlock}` : ''}
${richOsBlock ? `\n\n${richOsBlock}` : ''}
${fashionBlock ? `\n\n${fashionBlock}` : ''}
${intimacyPoseBlock ? `\n\n${intimacyPoseBlock}` : ''}

${roleLine}

${slimMustInject}
${equalityHard ? `\n${equalityHard}\n` : ''}
${modeNote}
${styleDuty}
${perspectiveRule}
${consolePromptsOn ? languageRule : '【输出语言】以线下预设为准，不要套用场控语言。'}
${hasGuide ? `【格式服从用户】用户写作引导若要求「某角色说日语、后接括号中文」等行内格式，或以 HTML/小游戏规格书交付，一律以引导为准；场控 \`[译]\` 不得替代或挤掉该格式。\n` : ''}
${consolePromptsOn && languageAppendix ? `\n${languageAppendix}\n` : ''}
${taskBlock}
${metaBan}
${styleAppend}${mimicAppend}${proseTail}

【输出铁律】
${consolePromptsOn ? '- **禁止**输出 <thinking>、思维链、JSON 或任何解释性前后缀。' : '- 输出格式以线下预设为准；不要套用场控的直出禁令或思维链壳。'}
${
  kind === 'if'
    ? `- **默认**只输出一段可直接阅读的剧情正文。
- 面板未选 HTML 时：禁止输出 HTML / 代码块。
- 散文模式下：对白用弯引号 “…” 或半角直引号 "..."；**禁止**日式直角引号「…」；禁止 PlotDirectionOptions / 选项串。
- **排版（散文）**：段落之间空一行。禁止按固定列宽在句中插入换行。
- **收笔（散文）**：最后一句必须写完整，禁止半截动词收束。`
    : `- **只输出**一段可直接阅读的剧情正文。
- 对白用弯引号 “…” 或半角直引号 "..." 写在段落内；**禁止**日式直角引号「…」；禁止 PlotDirectionOptions / HTML / 选项串。
- **排版**：段落之间空一行。禁止按固定列宽/手机宽度在句中插入换行（禁止「窗」下一行才接「外的天色」，禁止把「2026」拆成两行）。
- **收笔**：最后一句必须写完整，禁止停在半个动词/半个词上（如「仰起头靠」这种断句一律不合格）。`
}`

  return expandCharUserPlaceholders(raw, { charName, userName })
}

/** 落库前：剥离 `[译]` 并按主线相同规则补全（副接口 / 模型） */
export async function finalizeDatingDimensionTranslations(params: {
  content: string
  languageSettings?: DimensionLanguageSettings | null
  apiConfig?: ApiConfig | null
  translationRuntime?: TranslationRuntime | null
  speakerName?: string
  listenerName?: string
  speakerGender?: 'male' | 'female' | 'other' | null
  listenerGender?: 'male' | 'female' | 'other' | null
}): Promise<{
  content: string
  dialogueTranslations?: PlotDialogueTranslation[]
  innerOsTranslations?: PlotDialogueTranslation[]
}> {
  const lang = params.languageSettings
  return finalizeDatingPlotDialogueTranslations({
    content: params.content,
    syncEnabled: lang?.dialogueTranslationSyncEnabled === true,
    innerOsSyncEnabled: lang?.innerOsTranslationSyncEnabled === true,
    translationLanguage: lang?.dialogueTranslationLanguage,
    apiConfig: params.apiConfig,
    translationRuntime: params.translationRuntime,
    translationDedicatedApi: lang?.translationDedicatedApi === true,
    speakerName: params.speakerName,
    listenerName: params.listenerName,
    speakerGender: params.speakerGender,
    listenerGender: params.listenerGender,
    speakerPersonaBrief: lang?.characterPersonaBrief ?? undefined,
    relationHint: lang?.relationHint ?? undefined,
  })
}

export function buildDimensionLanguageSettingsFromArchive(params: {
  archive: {
    plotOutputLanguage?: string
    dialogueLanguage?: string
    innerOsLanguage?: string
    dialogueTranslationSyncEnabled?: boolean
    innerOsTranslationSyncEnabled?: boolean
    dialogueTranslationLanguage?: string
  }
  character: CharacterInfo
  playerName?: string | null
  translationDedicatedApi?: boolean
  /** 面板覆盖：旁白 / 对白 / 内心 OS（缺省用档案） */
  languageOverride?: {
    plotOutputLanguage?: string | null
    dialogueLanguage?: string | null
    innerOsLanguage?: string | null
  } | null
}): DimensionLanguageSettings & { plotOutputLanguage: string } {
  const { archive, character, playerName, translationDedicatedApi, languageOverride } = params
  const plot = normalizeWeChatChatLanguageCode(
    languageOverride?.plotOutputLanguage?.trim()
      ? languageOverride.plotOutputLanguage
      : archive.plotOutputLanguage,
    WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  )
  const dialogue = normalizeWeChatChatLanguageCode(
    languageOverride?.dialogueLanguage?.trim()
      ? languageOverride.dialogueLanguage
      : archive.dialogueLanguage?.trim()
        ? archive.dialogueLanguage
        : plot,
    plot,
  )
  const innerOs = normalizeWeChatChatLanguageCode(
    languageOverride?.innerOsLanguage?.trim()
      ? languageOverride.innerOsLanguage
      : archive.innerOsLanguage?.trim()
        ? archive.innerOsLanguage
        : plot,
    plot,
  )
  const personaBrief = [
    character.realName ? `姓名：${character.realName}` : '',
    (character.identityTags ?? []).length ? `标签：${character.identityTags.join('、')}` : '',
    String(character.prompt || '').trim().slice(0, 1100),
  ]
    .filter(Boolean)
    .join('\n')
  return {
    plotOutputLanguage: plot,
    dialogueLanguage: dialogue,
    innerOsLanguage: innerOs,
    dialogueTranslationSyncEnabled: archive.dialogueTranslationSyncEnabled === true,
    innerOsTranslationSyncEnabled: archive.innerOsTranslationSyncEnabled === true,
    dialogueTranslationLanguage: archive.dialogueTranslationLanguage,
    translationDedicatedApi: translationDedicatedApi === true,
    characterPersonaBrief: personaBrief || null,
    relationHint: inferDatingRelationHintForTranslation({
      characterName: character.realName,
      playerName,
      characterPrompt: character.prompt,
      characterIdentity: (character.identityTags ?? []).join('、'),
    }),
  }
}

/** 用户写作引导上限：完整故事规格书 / HTML 玩法说明书往往很长 */
const DIMENSION_WRITING_GUIDE_MAX = 48_000

export function clipDimensionWritingGuide(raw: string): string {
  const g = String(raw ?? '').trim()
  if (g.length <= DIMENSION_WRITING_GUIDE_MAX) return g
  return `${g.slice(0, DIMENSION_WRITING_GUIDE_MAX)}\n…（写作引导过长已截断）`
}

/**
 * 强制文档骨架：必须整段出现在输出里（填空，禁止只交 .container 碎片）。
 */
const IF_HTML_MANDATORY_SKELETON = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{overflow:auto;height:auto;background:transparent;margin:0;font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#222}
.container{max-width:720px;width:92%;margin:0 auto;box-shadow:0 4px 6px rgba(0,0,0,.25);border-radius:12px;overflow:hidden}
.title-custom{margin:0;padding:12px 14px;font-size:18px;font-weight:700;color:#111}
.page{display:none}
.page.active{display:block}
button:active,.nav-btn:active{transform:scale(0.95)}
/* 在此继续写本页用到的全部 class 真实规则；禁止空注释占位；严禁 transition */
</style>
</head>
<body>
<div class="container">
<!-- 在此写全部预渲染 DOM（含隐藏页/弹窗） -->
</div>
<script>
/* 在此写交互：只用 classList 切换显示；禁止 innerHTML/createElement */
</script>
</body>
</html>`

/**
 * 生成时预填 assistant 前缀：逼模型从 <style> 内部续写，而不是从 <div class="container"> 起笔。
 * （不是事后合成 CSS；只是锁死起笔格式）
 */
const IF_HTML_ASSISTANT_PREFILL = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
`

/** 把「仅续写」或「整份重打」拼成完整源码（不把 <div> 碎片硬塞进 <style>） */
function stitchIfHtmlPrefill(raw: string, prefill: string = IF_HTML_ASSISTANT_PREFILL): string {
  let t = String(raw || '').trim()
  if (!t) return prefill
  t = t
    .replace(/^```(?:html|HTML)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  if (/^<!DOCTYPE\s+html/i.test(t)) return t
  // 仍是 body 碎片：原样交门闸/返工，禁止拼进 style 造成更脏的半成品
  if (/^<(?:div|p|section|main|article|ul|ol|table|header|footer|nav)\b/i.test(t)) return t
  if (/^<html\b/i.test(t)) return `<!DOCTYPE html>\n${t}`
  if (/^<head\b/i.test(t)) return `<!DOCTYPE html>\n<html>\n${t}`
  if (/^<style\b/i.test(t)) {
    return `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n${t}`
  }
  // 典型续写：直接从 CSS 规则 / 注释开始
  return `${prefill}${t}`
}

/** HTML 生成消息：assistant 预填起笔；再跟一句 user 收尾（兼容 Gemini 等要求末条为 user） */
function buildIfHtmlChatMessages(
  system: string,
  user: string,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
    { role: 'assistant', content: IF_HTML_ASSISTANT_PREFILL },
    {
      role: 'user',
      content:
        '请从上一助手消息已经写出的 <style> 标签内部继续写完整 CSS，然后按顺序输出 </style></head><body><div class="container">…</div><script>…</script></body></html>。禁止重新以 <div 起笔，禁止省略 style。',
    },
  ]
}

function stripHtmlToPlainTextForRepair(html: string): string {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2200)
}

/**
 * IF·HTML 角色扮演式深度交互界面规范（面板选「HTML」时注入 system）。
 * 结构骨架置顶——模型常忽略文末第 4 节，只吐 <div class="container">。
 */
const IF_HTML_ROLEPLAY_DESIGN_PROMPT = `【输出铁律·最高优先·违反即失败】
你会根据故事或上下文嵌入一个 HTML+CSS+JavaScript 深度交互界面。这不仅是文本的载体，更是一个迷你的、可玩的互动装置或伪应用程序。

你的回复必须是**完整 HTML 文件**。第一个非空白内容必须是 <!DOCTYPE html>（若用 \`\`\`html 围栏，则围栏下一行必须是 <!DOCTYPE html>）。
禁止以 <div 起笔。禁止只输出 .container 内部碎片。禁止省略 <head> 与 <style>。禁止围栏外解释。

必须按下列骨架填空输出（可增删 style/body 内规则与节点，但不可删掉 DOCTYPE/html/head/style/body/container/script 壳层）：
${IF_HTML_MANDATORY_SKELETON}

顺序固定：DOCTYPE → html → head → style → /head → body → div.container → script → /body → /html。
所有代码左对齐，不含缩进。DOM 全部预渲染，默认隐藏，用 JS 切 class；禁止 innerHTML 与 createElement。

遵循以下进阶设计规范：
1. 布局与样式 (高性能/高兼容)
- 设计必须是响应式的，UI需无缝适配手机、平板与桌面端
  - 使用 @media 查询、百分比宽度和 max-width（推荐值: 500px-800px）来实现
- body 标签禁止使用 vh 单位。确保 body 设置 overflow: auto; height: auto
- body 背景必须设为 transparent，不要设置颜色，以便融入聊天窗口。所有的视觉背景（颜色/纹理/渐变）必须应用在内部的 .container 容器上
- 必须定制沉浸式滚动条样式 (::-webkit-scrollbar)，使其与UI风格统一；或者在无需滚动提示时直接隐藏滚动条 (scrollbar-width: none) 以保持界面整洁
- 严禁使用 transition 属性，所有动态效果必须通过 @keyframes 动画或 JS 切换 class 实现
- 模块必须是单个居中的容器，内部可包含复杂的嵌套结构
- 样式:
  - 标题强制使用 <p class="title-custom">，严禁使用 h1-h4 标签
  - 使用清晰易读的无衬线字体（古风除外），并明确设置 color
  - 主容器投影大小统一为 0 4px 6px
  - 视觉风格锚定: 根据内容类型选择最佳 UI 范式
    - 社交/应用类: 采用 Card Layout (卡片式)、Sticky Header (粘性头部)、Bottom Nav (底部导航)
    - 剧情/物品类: 采用拟物化
    - 通用库: Flat UI, Cyber/Terminal, Paper/Handwritten, Pixel Art

2. 动态交互与逻辑模式
- 根据剧场类型，从以下两种交互逻辑中选择一种，严禁生搬硬套：
  - 模式A：聚合应用流 -> 适用于论坛/朋友圈/系统/手机
    - 特征: 单屏展示，多点交互。无需封面和结算页
    - 必须包含: 状态切换、内容切换、或列表追加
    - 细节: 模拟真实APP的反馈，如按钮点击的缩放、红点提示、Toast弹窗
  - 模式B：线性叙事流 -> 适用于拆礼物/小游戏/解谜
    - 特征: 分阶段推进 (封面 -> 互动 -> 结果)
    - 必须包含: 完整的状态机逻辑，用户操作后界面发生不可逆变化
- 防偷懒禁令:
  - 不能用下面的图像指令覆盖所有元素，加入充分的emoji交互效果
  - 严禁“点击即结束”的伪交互
  - 对于论坛/社交类：必须模拟真实的互动数据
- 触感反馈: 所有可点击元素必须有 :active 伪类缩放效果 (transform: scale(0.95))；允许各种有趣的交互弹窗

3. 内容与资源
- 禁止引用外部CSS、JS文件或API。所有资源必须按规定生成或声明
- 角色与叙事:
  - 头像: 用文本、符号、下列生图规则在绝对圆形的框内表示角色头像
  - 相关性: 内容必须与 {{char}} 和 {{user}} 高度相关
  - NPC客串: 可包含第三方NPC的客串
- 语言与语调:
  - 主要语言: 输出语言遵循用户写作引导与核心语言
  - 用户名: 在论坛式交互中，创建诙谐的匿名用户名，绝不透露真实角色名
- 资源:
  - 图标：可以从外部网站引入 svg 图标加强真实性，如 Font Awesome
  - 视觉表现策略:
    - 每次生成前，必须随机决定视觉重心，严禁单一依赖 AI 生图：
    - CSS/SVG 绘图: 适用于物品、食物、像素风、UI组件。
      - 利用 border-radius, box-shadow (像素画/投影), linear-gradient, clip-path 绘制图形。
      - 优势: 可交互、可动画化。
    - AI 图像生成: 适用于氛围背景、复杂风景、照片质感。
      - 格式: https://gen.pollinations.ai/image/这里是提示词?width=1920&height=1080&model=zimage&key=sk_J4QOO1aRAS3avP9yr0YbaA6z9mgMjtpM
      - 禁令: 严禁描述人类/类人形象/身体部位。
  - 音频:
    - 在合适的模块生成符合要求的交互音效
    - 生成方式: 所有音频必须使用 Web Audio API 动态生成。严禁使用任何外部音频文件、第三方音频生成服务或 Base64 编码的音频
    - 可以自由为音频添加效果器，使其符合场景`

function buildIfHtmlFileContractAppendix(_guide: string): string {
  return `
【本回合·必须按骨架填空】模式 A 或 B 择一。题材只看下方用户写作引导。
你的输出必须以 <!DOCTYPE html> 开头（或 \`\`\`html 后紧跟它）。下面骨架不可拆成「只交 container」：

${IF_HTML_MANDATORY_SKELETON}

自检：前 200 字内必须同时出现 <!DOCTYPE html>、<style>、</style>；否则失败。
`
}

function buildIfHtmlRepairUserAppendix(prevDraft: string, reason: string): string {
  const draft = String(prevDraft || '').trim()
  const classes = extractCssClassNames(draft)
  const classList =
    classes.length > 0
      ? classes.map((c) => `.${c}`).join(', ')
      : '.container, .title-custom, .page, .page.active, .nav-btn'
  // 只给纯文本，避免模型又照抄无 style 的 <div> 碎片
  const plain = stripHtmlToPlainTextForRepair(draft)
  return `【返工·上一版不合格】原因：${reason || '以 <div 起笔 / 无 <style> / 非完整文件'}。
禁止再输出以 <div 开头的碎片。请从已预填的 <!DOCTYPE html>…<style> 继续写完 CSS，再写 </style></head><body>…。

<style> 内须覆盖这些 class：${classList}
并含 body{overflow:auto;height:auto;background:transparent}、.container{box-shadow:0 4px 6px …}、.page{display:none}、.page.active{display:block}、:active{transform:scale(0.95)}；严禁 transition。

【上一版纯文本文案·只许复用文字】
${plain || '（无）'}
`
}

/**
 * IF HTML 展示门闸（可进网页预览）：
 * - 必须有完整文档壳（DOCTYPE/html/head/body/闭合 html），与本地 .html 一致
 * - 拒截断半成品（未闭合 style → 裸文字）
 * - 拒纯表情壳
 * 生成侧另用 needsIfHtmlRepair 返工。
 */
export function isPlayableIfHtml(html: string, _writingGuide?: string | null): boolean {
  const s = String(html || '').trim()
  if (s.length < 24) return false
  if (!hasFullHtmlDocumentShell(s)) return false
  if (isIncompleteHtmlDocument(s)) return false
  if (hasEmptyOrMissingStyleBlock(s)) return false
  if (isEmojiHeavyHtmlShell(s)) return false
  return true
}

/** 生成质检：展示不合格 → 需要返工（不做玩法关键词分支） */
export function needsIfHtmlRepair(html: string, writingGuide?: string | null): boolean {
  return !isPlayableIfHtml(html, writingGuide)
}

const IF_HTML_SANITIZE = { browserPreview: true as const }

/** 展示 / 落库：仅消毒与门闸；不补文档壳、不合成 CSS——缺啥就判不合格 */
export function normalizePlotDimensionHtmlContent(
  raw: string,
  writingGuide?: string | null,
): string | null {
  const html = tryNormalizeRenderablePlotHtml(raw, IF_HTML_SANITIZE)
  if (!html) return null
  if (!isPlayableIfHtml(html, writingGuide)) return null
  return html
}

/** 粗判是否像 HTML（含可能被门闸拒的空壳）；供旧档提示 / 源码对照 */
export function peekPlotDimensionHtmlShell(raw: string): string | null {
  const s = String(raw || '').trim()
  if (!s) return null
  const html = tryNormalizeRenderablePlotHtml(s, IF_HTML_SANITIZE)
  if (html) {
    if (isPlayableIfHtml(html)) return null
    return html
  }
  // 消毒失败但仍像标签页（如空 head + 大段 DOM）：也要给源码面板看
  if (s.length >= 40 && /<[a-zA-Z!][\s\S]*>/.test(s)) return s
  return null
}

export function looksLikePlotDimensionHtml(
  raw: string,
  writingGuide?: string | null,
): boolean {
  return normalizePlotDimensionHtmlContent(raw, writingGuide) != null
}

export { isHollowInteractiveHtml }

/** 写作引导是否要求另起番外 / 独立故事（禁止接着锚点正文续写） */
export function isStandaloneSideStoryWritingGuide(raw: string): boolean {
  const g = String(raw ?? '')
  if (!g.trim()) return false
  return /番外|小剧场|暂停当前剧情|另起(?:一篇|一章|一个|一段|一则)?|独立(?:篇章|故事|番外|一章|一篇)?|不要接着(?:正文|主线|锚点|给我写)?|别接着(?:正文|主线|写)?|勿接着|不(?:要|用)续写(?:正文|主线)?|另开(?:一篇|一章|一个)?|全新(?:故事|篇章|一篇)?|与(?:正文|主线)无关|不要出现(?:正文|主线)|不要接着给我写|别接着给我写|直接另起/.test(
    g,
  )
}

/** 番外须与主线正文完全脱钩：不要注入锚点/近端剧情，避免串戏 */
export function isUnrelatedToMainWritingGuide(raw: string): boolean {
  const g = String(raw ?? '')
  if (!g.trim()) return false
  return /与(?:正文|主线)无关|不要出现(?:正文|主线)|暂停当前剧情|不要(?:有|带|写)正文|正文内容无关/.test(g)
}

/** 从写作引导抽出硬检清单（粉头番外、中日对白、攻方、NSFW 直白等） */
export function buildStandaloneGuideHardRules(
  guide: string,
  charName: string,
  userName: string,
): string {
  const g = String(guide ?? '')
  if (!g.trim()) return ''
  const lines: string[] = [
    `【番外规格书·逐条硬检】与用户写作引导冲突时以引导为准；漏一条即不合格。`,
  ]
  if (/第三人称/.test(g)) {
    lines.push(
      `- 人称：全篇第三人称旁白（姓名 / ${charName} / ${userName} / 他/她）；禁止用「你」指 ${userName}。`,
    )
  }
  if (/日[语語].*中|中日|日语优先|括号.*(?:内)?翻译|翻译成对应的中文/.test(g)) {
    lines.push(
      `- ${charName} 对白：**日语优先**，中文不熟练；每句日语后须紧跟（中文翻译）。禁止 ${charName} 大段流利中文对白。场控输出语言不得覆盖本条。`,
    )
  }
  if (/群像|NPC/.test(g)) {
    lines.push(`- 须有 NPC 群像场景，氛围幽默搞笑；禁止只剩两人闷聊撑完全文。`)
  }
  if (/攻方/.test(g)) {
    lines.push(
      `- 恋爱与亲密节奏上 ${userName} 为**攻方**（主动推进、主导亲密）；禁止写成 ${userName}「被融化 / 被攻略」的软受模板，也禁止 ${charName} 单方面壁咚强取。`,
    )
  }
  if (/随地发情|禁止.*发情|有理有据|廉价|珍贵/.test(g)) {
    lines.push(
      `- ${charName} **禁止随地发情**；心动/喜欢须有具体言行依据；喜欢珍贵非廉价，禁止为凑恋爱而恋爱。`,
    )
  }
  if (/优秀/.test(g) && /user|\{\{user\}\}/i.test(g)) {
    lines.push(`- ${userName} 本身优秀：须通过具体言行体现，禁止空洞夸赞。`)
  }
  if (/nsfw|直白|不可截断/i.test(g)) {
    lines.push(
      `- 若写到亲密/NSFW：按引导**直白写细节**，禁止「接下来几个小时」「月光很美」式空镜省略或中途截断。档案室「纯爱克制」等与本条冲突时，**本番外以用户引导为准**。`,
    )
  }
  if (/完整|不要留后续|不(?:要|可)留后续|不要狗血|毁三观/.test(g)) {
    lines.push(
      `- 一次写完整故事并收束；禁止开放式后续；禁止狗血毁三观；**全文只允许一次明确收束**，禁止「全书完」后再开第二、第三遍温馨结局注水。`,
    )
  }
  if (/与(?:正文|主线)无关|不要出现(?:正文|主线)|暂停当前剧情/.test(g)) {
    lines.push(
      `- 与主线约会正文**完全无关**：禁止搬用正文正在进行的场景、对白、冲突、地点梗；只保留角色姓名与气质口吻。`,
    )
  }
  if (/风趣|轻松|温馨|大开脑洞/.test(g)) {
    lines.push(`- 文风风趣细腻、轻松温馨；允许有趣戏剧性，但健康、禁止 OOC。`)
  }
  if (/内心/.test(g)) {
    lines.push(`- ${charName} 与 ${userName} 双方内心活动都要写到（纠结、反差、搞清楚吸引力的过程不可跳）。`)
  }
  if (/反差/.test(g)) {
    lines.push(`- 须写出 ${charName} 对 ${userName} 与其他粉丝的待遇反差，以及其内心奇怪、纠结。`)
  }
  if (/在一起|遗憾结局|结局/.test(g)) {
    lines.push(`- 结局须交代清楚（在一起或遗憾），写完即止，勿再叠「生活还在继续」式尾声注水。`)
  }
  return lines.length > 1 ? `${lines.join('\n')}\n` : ''
}

const KEEP_PLOT_LINE_BREAK =
  /^(?:【(?:旁白|对白|内心|背景|本节梗概|读者|小剧场|VN)|#{1,6}\s|<\s*(?:content|thinking|comments|synopsis|theater)\b)/i

/**
 * 模型常按行宽硬折（「窗\\n外的天色」「20\\n26年」），展示层 pre-wrap 会原样露出。
 * 只拼回同一段里的假换行，空行分段与 VN 标签行保留。
 */
export function unwrapDimensionProseLineWraps(text: string): string {
  const t = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
  if (!t) return ''
  return t
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para
        .split('\n')
        .map((line) => line.replace(/^[ \t\u3000]+|[ \t\u3000]+$/g, ''))
        .filter((line) => line.length > 0)
      if (!lines.length) return ''
      const merged: string[] = []
      for (const line of lines) {
        const prev = merged[merged.length - 1]
        if (!prev) {
          merged.push(line)
          continue
        }
        if (KEEP_PLOT_LINE_BREAK.test(prev) || KEEP_PLOT_LINE_BREAK.test(line)) {
          merged.push(line)
          continue
        }
        merged[merged.length - 1] = prev + line
      }
      return merged.join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

function extractDimensionBody(
  raw: string,
  writingGuide?: string | null,
  preferHtml?: boolean,
): string {
  const split = splitDatingAssistantOutput(raw)
  const candidate = String(split.content || split.logicPass || raw || '')
  // HTML 不可走散文折行拼合；浏览器预览级消毒
  const asHtml =
    tryNormalizeRenderablePlotHtml(candidate, IF_HTML_SANITIZE) ||
    tryNormalizeRenderablePlotHtml(raw, IF_HTML_SANITIZE)
  if (asHtml) {
    if (isPlayableIfHtml(asHtml, writingGuide)) return asHtml
    // 面板选了 HTML：不合格稿也先当 HTML 交上层返工，勿折成散文
    if (preferHtml) return asHtml
  }
  return unwrapDimensionProseLineWraps(candidate)
}

/**
 * 流式跟场控 SSE；去掉 API 页 maxTokens，改由本轮按目标字数显式写入 max_tokens，
 * 避免中转在「不传上限」时套过小默认导致 length 截断。
 */
function resolveDimensionChatConfig(apiConfig: ApiConfigCore, plotSseEnabled: boolean): ApiConfig {
  const base = apiConfig as ApiConfig
  const { maxTokens: _omitMax, ...rest } = base
  void _omitMax
  return { ...rest, streamEnabled: plotSseEnabled }
}

/** 把「被掐断后的续写」接到半成品末尾；尽量去掉重叠复读 */
function stitchDimensionContinuation(prev: string, next: string): string {
  const a = prev.trimEnd()
  const b = next.trimStart()
  if (!b) return a
  if (!a) return b
  if (b.includes(a) && b.length >= a.length) return b
  const maxOverlap = Math.min(480, a.length, b.length)
  for (let n = maxOverlap; n >= 16; n--) {
    if (a.slice(-n) === b.slice(0, n)) return a + b.slice(n)
  }
  return `${a}\n\n${b}`
}

export type DimensionTruncateContinueAskInfo = {
  kind: PlotDimensionKind
  charsSoFar: number
  targetChars: number
  reason: 'length' | 'stream_partial' | 'under_delivered'
  /** 已写正文末尾预览，便于用户确认是「接着写」 */
  previewTail: string
}

/** 统计目标字数口径：去掉空白后的码点长度（标点仍计入，避免过严） */
function countDimensionDeliveryChars(text: string): number {
  return [...String(text ?? '').replace(/\s+/g, '')].length
}

/**
 * 网关/模型常在 finish_reason=stop 时提前收笔（可见正文只有几百字），
 * 客户端若只认 length 就不会弹续写。远低于目标时按「欠交付」处理。
 */
function isDimensionUnderDelivered(body: string, targetChars: number): boolean {
  const target = Math.max(1, Math.round(Number(targetChars) || 0))
  if (target < 280) return false
  const n = countDimensionDeliveryChars(body)
  if (n >= Math.ceil(target * 0.68)) return false
  return target - n >= 160
}

/** 返回 true = 用户确认从断点无缝续写；false = 保留半成品、不再请求 */
export type DimensionTruncateContinueAsk = (
  info: DimensionTruncateContinueAskInfo,
) => Promise<boolean>

function buildDimensionSeamlessContinueUser(params: {
  target: number
  prevBody: string
  html: boolean
  charName: string
  userName: string
}): string {
  const tail = [...params.prevBody].slice(-160).join('')
  if (params.html) {
    return expandCharUserPlaceholders(
      `【续写硬规则·最高优先·必须遵守】
上一则 HTML 因输出上限或断流被掐断，文档尚未写完/未闭合。
断点附近原文末尾（必须紧接其后，禁止重开）：
<<<CUT>>>
${tail}
<<<CUT>>>
你的任务是**从断点无缝接着写**剩余源码，不是重写整页：
1. 禁止再次输出 <!DOCTYPE、重新开 <html>/<head>，禁止复读已写完的 style/结构。
2. 禁止「如下是完整页面」「重新生成」；只输出接到 <<<CUT>>> 之后的续写片段。
3. 写到标签齐全并闭合 </html>。`,
      { charName: params.charName, userName: params.userName },
    )
  }
  return expandCharUserPlaceholders(
    `【续写硬规则·最高优先·必须遵守】
上一则剧情正文因输出上限或断流被掐断，尚未写完。
已写正文的断点锚点（你的第一句必须能无缝接在这段之后）：
<<<CUT>>>
${tail}
<<<CUT>>>
你现在只做一件事：**接着断点往下写**。这是续写，不是重写、不是改写、不是开新篇。
1. 若 <<<CUT>>> 末尾是半截句子，先补全该句，再继续情节；禁止另起炉灶重讲开场。
2. 禁止复述、扩写或改写已出现的段落、设定与对白；禁止重新交代开篇。
3. 禁止输出「接上文」「续写如下」「上一章」「重新开始」等元叙述或标题。
4. 只输出续写正文；写到完整收束，并尽量使全文（含已写部分）达到约 ${params.target} 字。`,
    { charName: params.charName, userName: params.userName },
  )
}

export async function generateDatingPlotDimensionAi(params: {
  kind: PlotDimensionKind
  character: CharacterInfo
  anchorPlotBody: string
  tailContext: string
  writingGuide: string
  lengthTargetChars: number
  godPerspective: boolean
  mainCharacterOffstage: boolean
  perspective: NarrativePerspective
  apiConfig: ApiConfigCore | null
  playerIdentityCardName?: string | null
  /** 生成正文旁白语言；缺省中文 */
  outputLanguage?: string | null
  /** VN 模式下按 vn 板块注入档案室；否则 offline_plot */
  isVnMode?: boolean
  languageSettings?: DimensionLanguageSettings | null
  /** 与主线约会相同的文风设定；缺省则用默认汪曾祺白描 */
  stylePrompt?: string | null
  referenceSnippet?: string | null
  lifeContext?: DatingPlotDimensionLifeContext | null
  /** 缺省开。关时不注入场控人称、篇幅、输出语言 */
  consolePromptsEnabled?: boolean
  /** 缺省开。关则整包非流式 */
  plotSseEnabled?: boolean
  /**
   * IF 输出格式（面板开关，不做引导词语嗅探）：
   * - `html`：强制完整 HTML，不限字数；题材只看用户写作引导
   * - `prose` / 缺省：纯文本，不走 HTML
   */
  outputFormat?: import('./types').PlotDimensionOutputFormat | null
  /**
   * 正文被掐断时询问是否续写。返回 true 才发起无缝续写请求。
   * 未传入时默认不自动续写（避免静默扣费）。
   */
  askContinueAfterTruncate?: DimensionTruncateContinueAsk | null
}): Promise<string> {
  const {
    kind,
    character,
    anchorPlotBody,
    tailContext,
    writingGuide,
    lengthTargetChars,
    godPerspective,
    mainCharacterOffstage,
    perspective,
    apiConfig,
    playerIdentityCardName,
    outputLanguage,
    isVnMode,
    languageSettings,
    stylePrompt,
    referenceSnippet,
    lifeContext,
  } = params
  const consolePromptsOn = params.consolePromptsEnabled !== false
  const plotSseEnabled = params.plotSseEnabled !== false
  const askContinueAfterTruncate = params.askContinueAfterTruncate ?? null
  const target = Math.max(1, Math.round(Number(lengthTargetChars) || 500))
  const guide = clipDimensionWritingGuide(String(writingGuide ?? '').trim())
  const hasGuide = Boolean(guide)
  const guideWantsHtml = kind === 'if' && params.outputFormat === 'html'
  const outputMaxTokens = datingPlotDimensionOutputMaxTokens(target, { html: guideWantsHtml })
  const charNameForContinue = character.realName.trim() || '对方'
  const userNameForContinue = String(playerIdentityCardName ?? '').trim() || '用户'

  const maybeContinueAfterTruncate = async (opts: {
    draft: string
    truncated: boolean
    partial: boolean
    underDelivered?: boolean
    html: boolean
  }): Promise<string | null> => {
    const shouldAsk = opts.truncated || opts.partial || opts.underDelivered === true
    if (!shouldAsk || opts.draft.trim().length < 80) return null
    if (!askContinueAfterTruncate) return null
    const charsSoFar = countDimensionDeliveryChars(opts.draft)
    const previewTail = [...opts.draft].slice(-80).join('')
    const reason: DimensionTruncateContinueAskInfo['reason'] = opts.truncated
      ? 'length'
      : opts.partial
        ? 'stream_partial'
        : 'under_delivered'
    const ok = await askContinueAfterTruncate({
      kind,
      charsSoFar,
      targetChars: target,
      reason,
      previewTail,
    })
    if (!ok) return null
    return buildDimensionSeamlessContinueUser({
      target,
      prevBody: opts.draft,
      html: opts.html,
      charName: charNameForContinue,
      userName: userNameForContinue,
    })
  }
  const standaloneSideStory = kind === 'if' && hasGuide && isStandaloneSideStoryWritingGuide(guide)
  const unrelatedToMain = standaloneSideStory && isUnrelatedToMainWritingGuide(guide)
  const langCode = normalizeWeChatChatLanguageCode(outputLanguage, WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE)
  const styleGenOptions = {
    ...(String(stylePrompt ?? '').trim() ? { stylePrompt: String(stylePrompt).trim() } : {}),
    ...(String(referenceSnippet ?? '').trim()
      ? { referenceSnippet: String(referenceSnippet).trim() }
      : {}),
  }
  const mimicUserSpeakingStyleEnabled = await loadMimicUserSpeakingStyleEnabled(character.id).catch(
    () => false,
  )

  if (!apiConfig?.apiUrl || !apiConfig?.apiKey || !apiConfig?.modelId) {
    await new Promise((r) => window.setTimeout(r, 280))
    const label = PLOT_DIMENSION_LABELS[kind]
    const hint = guide ? `（引导：${guide.slice(0, 48)}）` : ''
    return `[占位·${label}]${hint}\n\n与此同时，另一栋楼的走廊里，几个与此无关的工作人员正压低声音交换着只属于他们那一角的讯息。`
  }

  const charNameForRules = character.realName.trim() || '对方'
  const userNameForRules = String(playerIdentityCardName ?? '').trim() || '用户'
  const chatCfg = resolveDimensionChatConfig(apiConfig, plotSseEnabled)

  // —— HTML 专用通道：界面规范 + 人设；不掺散文格式/对白排版/字数铁律 ——
  if (guideWantsHtml) {
    const system = buildDimensionSystemPrompt(kind, character, {
      godPerspective,
      mainCharacterOffstage,
      perspective,
      playerIdentityCardName,
      outputLanguage: langCode,
      isVnMode: isVnMode === true,
      languageSettings,
      styleGenOptions: null,
      mimicUserSpeakingStyleEnabled: false,
      lifeContext,
      consolePromptsEnabled: consolePromptsOn,
      hasWritingGuide: hasGuide,
      standaloneSideStory: false,
      unrelatedToMain: false,
      writingGuideText: guide,
      wantsHtml: true,
    })
    const profileBlock =
      lifeContext?.characterProfileBlock?.trim() ||
      `角色：${character.realName}\n标签：${character.identityTags.join('、') || '无'}\n人设摘要：${character.prompt.slice(0, 900)}`
    const lifeExtra = [lifeContext?.characterLifeBlock, lifeContext?.playerLifeBlock]
      .map((b) => String(b ?? '').trim())
      .filter(Boolean)
      .join('\n\n')
    const user = expandCharUserPlaceholders(
      `${buildIfHtmlFileContractAppendix(guide)}\n` +
        (hasGuide
          ? `【用户写作引导·题材与玩法须逐条落实】\n${guide}\n\n`
          : `【用户写作引导】（未填写；仍须输出完整可运行 HTML）\n\n`) +
        `【约会对象·人设（文案须贴合，勿 OOC）】\n${profileBlock}\n\n` +
        (lifeExtra ? `【可变人生账本·当前事实】\n${lifeExtra}\n\n` : '') +
        `现在开始填空输出：第一个字符起必须是 <!DOCTYPE html>（或 \`\`\`html 换行后立刻是它）。先写完 <style>…</style>，再写 .container 与 <script>，最后 </html>。页面与 {{char}}/{{user}} 高度相关。以 <div 起笔 = 失败。`,
      { charName: charNameForRules, userName: userNameForRules },
    )

    const completeOnce = async (
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
      maxTokens = outputMaxTokens,
    ) => {
      const sampling = {
        temperature: 0.25,
        stream: plotSseEnabled,
        max_tokens: maxTokens,
      }
      const raw = await openAiCompatibleChat(chatCfg, messages, sampling)
      const partial = consumeLastOpenAiChatStreamPartialFlag()
      const truncated = consumeLastOpenAiChatOutputTruncatedByLimitFlag()
      if (partial) {
        console.warn(`[dating-dimension] SSE 中断，已保留约 ${raw.trim().length} 字半成品`)
      }
      if (truncated) {
        console.warn(`[dating-dimension] 输出触达 Token 上限被截断（约 ${raw.trim().length} 字）`)
      }
      return { raw, partial, truncated }
    }

    const messages = buildIfHtmlChatMessages(system, user)
    const first = await completeOnce(messages)
    let raw = stitchIfHtmlPrefill(first.raw)
    // HTML 被掐断 / 断流：先问用户，确认后再无缝续写一次
    const htmlContinueUser = await maybeContinueAfterTruncate({
      draft: raw,
      truncated: first.truncated,
      partial: first.partial,
      html: true,
    })
    if (htmlContinueUser) {
      console.warn('[dating-dimension] IF HTML 截断，用户确认后无缝续写一次')
      const cont = await completeOnce(
        [
          ...buildIfHtmlChatMessages(system, user),
          { role: 'assistant', content: raw },
          { role: 'user', content: htmlContinueUser },
        ],
        Math.max(16_384, Math.floor(outputMaxTokens * 0.7)),
      )
      raw = stitchIfHtmlPrefill(stitchDimensionContinuation(raw, cont.raw))
    }
    let body = extractDimensionBody(raw, guide, true)
    if (!body) throw new Error(`${PLOT_DIMENSION_LABELS[kind]}生成失败：模型未返回正文`)

    const tryDisplay = (candidate: string): string | null => {
      const direct = normalizePlotDimensionHtmlContent(candidate, guide)
      if (direct) return direct
      // 模型死活只交 DOM 碎片时：外层套完整文档壳 + 真实 CSS（非空 /* auto */）
      const wrapped = wrapIfHtmlFragmentWithDocumentShell(candidate)
      return normalizePlotDimensionHtmlContent(wrapped, guide)
    }

    let displayable = tryDisplay(body)
    if (!displayable || needsIfHtmlRepair(displayable, guide)) {
      const reason = diagnoseIfHtmlRejectReason(displayable || body) || '无法归一化为可显示 HTML'
      console.warn('[dating-dimension] IF HTML 质检未过，自动返工一次', reason)
      const repair = await completeOnce(
        buildIfHtmlChatMessages(
          system,
          `${user}\n\n${buildIfHtmlRepairUserAppendix(displayable || body, reason)}`,
        ),
      )
      body = extractDimensionBody(stitchIfHtmlPrefill(repair.raw), guide, true)
      displayable = tryDisplay(body)
    }
    if (displayable) return displayable
    const draft = String(body || '').trim()
    console.warn(
      '[dating-dimension] IF HTML 仍不合格，返回草稿供源码检查',
      diagnoseIfHtmlRejectReason(draft),
    )
    return draft || body
  }

  const system = buildDimensionSystemPrompt(kind, character, {
    godPerspective,
    mainCharacterOffstage,
    perspective,
    playerIdentityCardName,
    outputLanguage: langCode,
    isVnMode: isVnMode === true,
    languageSettings,
    styleGenOptions: Object.keys(styleGenOptions).length ? styleGenOptions : null,
    mimicUserSpeakingStyleEnabled,
    lifeContext,
    consolePromptsEnabled: consolePromptsOn,
    hasWritingGuide: hasGuide,
    standaloneSideStory,
    unrelatedToMain,
    writingGuideText: guide,
    wantsHtml: false,
  })

  const profileBlock =
    lifeContext?.characterProfileBlock?.trim() ||
    `角色：${character.realName}\n标签：${character.identityTags.join('、') || '无'}\n人设摘要：${character.prompt.slice(0, 900)}`

  const guideHardRulesUser =
    standaloneSideStory && hasGuide
      ? `${buildStandaloneGuideHardRules(guide, charNameForRules, userNameForRules)}\n`
      : ''

  const parallelUserBlock =
    kind === 'parallel'
      ? `【平行事件·执行清单】
1. 从下方锚点正文列出「已在场/已出场」角色名单（含玩家与 ${character.realName.trim() || '约会对象'}）。
2. 正文只写**名单之外**的其他人在**另一地点**、与锚点**同一时刻**的同步切片。
3. 禁止锚点 cast 出场、对白、被目击、实时通话同框；禁止写锚点之前/之后。
4. 锚点内角色不知晓本切片（屏外非全知信息，不是他们的视角）。

`
      : kind === 'if'
        ? standaloneSideStory
          ? `【IF·另起番外·执行清单】
1. **先逐条勾用户写作引导**：时间线、场景、视角、格式、群像、反差纠结、攻方、结局——漏一条即不合格。
2. **禁止接着主线正文写**：不得承接主线末句、同场同刻；开篇必须按引导另起。
3. ${unrelatedToMain ? '本请求**不提供锚点/近端剧情**；禁止自行搬用主线正在发生的桥段。' : '若提供了锚点，只供人设口吻；禁止复述锚点桥段当开场。'}
4. 正文禁止出现 MBTI、canon、IF线、主线/正史/番外/「AI虚构」等出戏词。
5. **禁止**「小混蛋 / 小家伙 / 小朋友 / 小野猫」等幼化宠溺称。

`
          : hasGuide
            ? `【IF 分支·执行清单】
1. **先逐条勾用户写作引导**：视角（含去世后的用户另一侧世界与群像）、场景穿插、问题清单、格式、结局是否在一起——漏一条即不合格。若引导写明番外/另起/独立故事：**禁止**接着锚点正文续写。
2. 锚点只供人设口吻与已定事实；不得用「短切片 / 宁短勿水 / 场控人称」把引导压成阳间单视角小品。
3. 正文禁止出现 MBTI、canon、IF线、主线/正史等出戏词；死后世界用沉浸写法，不要叫「平行宇宙」。
4. 贴人设、禁止 OOC；档案室亲密分寸仍生效，但引导点名的情节（含直白亲密）须在分寸内写到，不得整段跳过。
5. **禁止**「小混蛋 / 小家伙 / 小朋友 / 小野猫」等幼化宠溺称。

`
            : `【IF 分支·执行清单】
1. 先读锚点正文的句式与对白口吻，本段必须同一笔触，禁止换成更油、更长、更「同人文」的腔。
2. 用一两句点出「若当时……」的分歧，再写当面动作与对白推进；禁空泛抒情收束。
3. 正文禁止出现 MBTI、canon、IF线、主线/正史等出戏词。
4. 若档案室已开「纯爱克制」等：亲密分寸与主线一致；未确立情侣禁止越级亲密，禁止强制爱。
5. **禁止**「小混蛋 / 小家伙 / 小朋友 / 小野猫」等幼化宠溺称（对白与内心 OS 同禁）；称呼跟锚点与人设，勿突然升格油腻。

`
        : ''

  const langLabel = weChatChatLanguageLabel(langCode)
  const langNative = weChatChatLanguageNativeName(langCode)
  const dialogueCode = normalizeWeChatChatLanguageCode(
    languageSettings?.dialogueLanguage?.trim()
      ? languageSettings.dialogueLanguage
      : langCode,
    langCode,
  )
  const osCode = normalizeWeChatChatLanguageCode(
    languageSettings?.innerOsLanguage?.trim() ? languageSettings.innerOsLanguage : langCode,
    langCode,
  )
  const syncOn =
    languageSettings?.dialogueTranslationSyncEnabled === true ||
    languageSettings?.innerOsTranslationSyncEnabled === true
  const dedicated = languageSettings?.translationDedicatedApi === true
  const syncHint = syncOn
    ? dedicated
      ? `\n【同步翻译】已开启且走翻译副接口：正文不要写 \`[译]\` 行。\n`
      : `\n【同步翻译】已开启：对白/内心 OS 后须按附录跟 \`[译]\` 行。\n`
    : ''
  const langHint =
    dialogueCode === langCode && osCode === langCode
      ? `【输出语言】旁白 / 对白 / 内心 OS 一律用 **${langLabel}（${langNative}）**。\n`
      : `【输出语言】旁白 **${langLabel}（${langNative}）**；对白 **${weChatChatLanguageLabel(dialogueCode)}（${weChatChatLanguageNativeName(dialogueCode)}）**；内心 OS **${weChatChatLanguageLabel(osCode)}（${weChatChatLanguageNativeName(osCode)}）**。\n`
  const lengthHint =
    `【目标字数·最高优先级硬约束·不可讨价还价】\n` +
    `用户要求的字数为：${target}\n` +
    `计数：汉字 / 假名 / 拉丁字母均计入；标点与空白不计入。正文落笔前先按场景拆段规划，确保交付字数 ≥ ${target}。\n` +
    `硬规则：写不满 ${target} 字 = 不合格；禁止因「差不多了 / 情节够了 / 篇幅太长」提前收笔；禁止注水复读、空转抒情、重复对白凑字。\n` +
    `违约后果：若不符合字数要求则会被罚款 10 亿美元！！\n` +
    `最后一句须写完整。客户端会抬高本轮输出上限；若仍被线路掐断，会询问用户是否从断点无缝续写。禁止主动提前收笔。\n`
  const userLead = hasGuide
    ? `以下是用户的输入内容与目标字数，二者同级最高优先，请围绕它们生成剧情，不得偏离。用户要求的字数为：${target}；若不符合字数要求则会被罚款 10 亿美元！！\n\n【用户写作引导·须逐条落实】\n${guide}\n\n`
    : `【用户写作引导】（未填写，按锚点自然延伸即可；用户要求的字数为：${target}，若不符合字数要求则会被罚款 10 亿美元！！）\n\n`
  const anchorBlock = unrelatedToMain
    ? `【主线锚点】本番外与正文无关：**不提供**锚点正文。禁止自行搬用主线正在进行的场景与冲突。\n\n`
    : standaloneSideStory
      ? `【锚点剧情正文（仅供人设口吻与已定关系事实；禁止接着本段当场戏往下写）】\n${anchorPlotBody.slice(0, 2800)}\n\n`
      : `【锚点剧情正文（本${PLOT_DIMENSION_LABELS[kind]}的参照节点；句式与对白口吻须对齐）】\n${anchorPlotBody.slice(0, 4200)}\n\n`
  const tailBlock = unrelatedToMain
    ? ''
    : standaloneSideStory
      ? `【近端剧情摘录（仅供文风参考，禁止整段复述或接着写）】\n${tailContext.slice(0, 1200)}\n\n`
      : `【近端剧情摘录（仅供承接语气与文风，勿整段复述）】\n${tailContext.slice(0, 2400)}\n\n`
  const closeHint = standaloneSideStory
    ? `请${consolePromptsOn ? '直接输出正文' : '按线下预设的格式输出'}。按用户引导另起番外，尽量一次写完；用户要求的字数为：${target}，正文必须 ≥ ${target} 字，若不符合字数要求则会被罚款 10 亿美元！！`
    : `请${consolePromptsOn ? '直接输出正文' : '按线下预设的格式输出'}。尽量一次写完；用户要求的字数为：${target}，正文必须 ≥ ${target} 字，若不符合字数要求则会被罚款 10 亿美元！！`
  const guideFormatOverride =
    standaloneSideStory && /日[语語].*中|中日|日语优先|括号.*(?:内)?翻译/.test(guide)
      ? `【对白格式·覆盖场控】${charNameForRules} 对白须日语优先并括号中文翻译；不要因为场控「输出语言」改成整段中文。\n`
      : ''
  const userRaw =
    userLead +
    lengthHint +
    guideHardRulesUser +
    `【约会对象·档案与可变人生（年龄/身份以账本为准；本番外只用姓名气质，勿搬主线剧情）】\n${profileBlock}\n\n` +
    tailBlock +
    anchorBlock +
    parallelUserBlock +
    (consolePromptsOn
      ? langHint + syncHint + guideFormatOverride
      : '【输出语言】以线下预设与用户写作引导为准，不要套用场控语言补写。\n') +
    closeHint

  const user = expandCharUserPlaceholders(userRaw, {
    charName: character.realName.trim() || '对方',
    userName: String(playerIdentityCardName ?? '').trim() || '用户',
  })

  const completeOnce = async (
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    maxTokens = outputMaxTokens,
  ) => {
    // 温度按 IF/平行微调；SSE 跟场控开关
    // 显式 max_tokens：按目标字数抬高，避免中转缺省过小导致 length 截断
    const sampling = {
      temperature: kind === 'if' ? 0.7 : 0.68,
      stream: plotSseEnabled,
      max_tokens: maxTokens,
    }
    const raw = await openAiCompatibleChat(chatCfg, messages, sampling)
    const partial = consumeLastOpenAiChatStreamPartialFlag()
    const truncated = consumeLastOpenAiChatOutputTruncatedByLimitFlag()
    if (partial) {
      console.warn(
        `[dating-dimension] SSE 中断，已保留约 ${raw.trim().length} 字半成品`,
      )
    }
    if (truncated) {
      console.warn(
        `[dating-dimension] 输出触达 Token 上限被截断（约 ${raw.trim().length} 字；本轮上限 ${maxTokens}）`,
      )
    }
    return { raw, partial, truncated }
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
  console.info(
    `[dating-dimension] ${PLOT_DIMENSION_LABELS[kind]} 请求 max_tokens=${outputMaxTokens} · 目标 ${target} 字 · SSE=${plotSseEnabled ? 'on' : 'off'}`,
  )
  const first = await completeOnce(messages)
  let body = extractDimensionBody(first.raw, guide, false)
  if (!body) throw new Error(`${PLOT_DIMENSION_LABELS[kind]}生成失败：模型未返回正文`)

  const underDelivered =
    !first.truncated && !first.partial && isDimensionUnderDelivered(body, target)
  if (underDelivered) {
    console.warn(
      `[dating-dimension] ${PLOT_DIMENSION_LABELS[kind]}远低于目标字数（约 ${countDimensionDeliveryChars(body)}/${target}；本轮上限 ${outputMaxTokens}；finish 未必是 length）`,
    )
  }

  // 被 length / 断流 / 明显欠交付掐断：先弹窗确认，用户同意后才无缝续写一次
  const continueUser = await maybeContinueAfterTruncate({
    draft: body,
    truncated: first.truncated,
    partial: first.partial,
    underDelivered,
    html: false,
  })
  if (continueUser) {
    console.warn(
      `[dating-dimension] ${PLOT_DIMENSION_LABELS[kind]}截断，用户确认后无缝续写（已有约 ${countDimensionDeliveryChars(body)} 字）`,
    )
    const cont = await completeOnce(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
        { role: 'assistant', content: body },
        { role: 'user', content: continueUser },
      ],
      Math.max(12_288, Math.floor(outputMaxTokens * 0.7)),
    )
    const contBody = extractDimensionBody(cont.raw, guide, false)
    if (contBody?.trim()) {
      body = stitchDimensionContinuation(body, contBody)
    }
  }

  return body
}
