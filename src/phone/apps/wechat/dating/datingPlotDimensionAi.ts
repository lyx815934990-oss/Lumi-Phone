import { openAiCompatibleChat } from '../newFriendsPersona/ai'
import { isTransientNetworkError } from '../addFriend/friendRequestApiError'
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
import { getWorldbookLoreEntriesSnapshot } from '../../../worldbook/worldbookLoreStore'
import { splitDatingAssistantOutput } from './plotCoT'
import {
  buildDatingLanguageAppendix,
  finalizeDatingPlotDialogueTranslations,
  inferDatingRelationHintForTranslation,
} from './datingLanguagePrompt'
import {
  type CharacterInfo,
  type NarrativePerspective,
  type PlotDialogueTranslation,
  type PlotDimensionKind,
} from './types'

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
  if (plotCode === dialogueCode && plotCode === osCode) {
    return `【输出语言·硬项】本段「${PLOT_DIMENSION_LABELS[kind]}」旁白、对白与内心 OS 一律用 **${plotLabel}（${plotNative}）** 书写；专名、假名昵称、商标可保留原形。`
  }
  return `【输出语言·硬项】本段「${PLOT_DIMENSION_LABELS[kind]}」分板块语言：
- 旁白（叙述）：**${plotLabel}（${plotNative}）**
- 对白（引号 / VN【对白】）：**${dialogueLabel}（${dialogueNative}）**
- 内心 OS（\`**…**\` / VN【内心】）：**${osLabel}（${osNative}）**
专名、假名昵称、商标可保留原形。`
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
  },
): string {
  const charName = character.realName.trim() || '对方'
  const userName = String(opts.playerIdentityCardName ?? '').trim() || '用户'
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
      : opts.godPerspective
        ? `本轮存档已勾选上帝视角：**全篇**写屏外可见场景，玩家不得与约会对象同场同框。`
        : opts.mainCharacterOffstage
          ? `本轮存档已勾选侧幕叙写：**全篇**主角色缺席，约会主角色 ${charName} 不得出场、不得被写成在场互动对象。`
          : `本轮未锁定上帝/侧幕：以锚点人称与关系为主轴续写；允许按需短切少量屏外或 NPC 侧幕，不必整篇锁死单一视角。`

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
      : `【任务·IF线】从锚点剧情节点出发，写一段**假设分歧**后的虚构分支片段（「若当时……」）。
- 明确是 IF/假设线想象，**不影响**主线已定 canon；勿写成主线已发生事实。
- 须点出或暗示分歧点（一句即可），再展开该分支下的一小段剧情。`

  const perspectiveRule =
    kind === 'parallel'
      ? `人称：第三人称旁白写**锚点 cast 以外**的同步场景；禁止用「你」指玩家；禁止 ${charName} 及锚点正文已出现角色出场。`
      : opts.perspective === 'first'
        ? '人称：第一人称（我/我们）为主。'
        : opts.perspective === 'third'
          ? '人称：第三人称旁观为主。'
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
  const worldbookDuty = `【档案室效力】上列世界书/档案室规范对本段「${PLOT_DIMENSION_LABELS[kind]}」**同样生效**（含关系阶段、亲密分寸、禁止项等）；不得因是旁支切片或假设线而绕过。`

  const raw = `${cuDirective}${archiveBlock ? `${archiveBlock}\n\n` : ''}${worldbookDuty}

你是线下约会「${PLOT_DIMENSION_LABELS[kind]}」辅助写手。
${modeNote}
${perspectiveRule}
${languageRule}
${languageAppendix ? `\n${languageAppendix}\n` : ''}
${taskBlock}

【禁止 MBTI 出戏】旁白与对白中禁止写出 ENFP/INFJ 等四字母或「快乐修勾」「INFJ 清冷感」等类型学套话。

【输出铁律】
- **禁止**输出 \`<thinking>\`、思维链、JSON、Markdown 围栏或任何解释性前后缀。
- **只输出**一段可直接阅读的剧情正文。
- 对白用弯引号 “…” 或半角直引号 "..." 写在段落内；**禁止**日式直角引号「…」；禁止 PlotDirectionOptions / HTML / 选项串。`

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
  } = params
  const target = Math.max(1, Math.round(Number(lengthTargetChars) || 500))
  const minChars = Math.max(1, Math.round(target * 0.85))
  const maxChars = Math.round(target * 1.15)
  const guide = String(writingGuide ?? '').trim()
  const langCode = normalizeWeChatChatLanguageCode(outputLanguage, WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE)

  if (!apiConfig?.apiUrl || !apiConfig?.apiKey || !apiConfig?.modelId) {
    await new Promise((r) => window.setTimeout(r, 280))
    const label = PLOT_DIMENSION_LABELS[kind]
    const hint = guide ? `（引导：${guide.slice(0, 48)}）` : ''
    return `[占位·${label}]${hint}\n\n与此同时，另一栋楼的走廊里，几个与此无关的工作人员正压低声音交换着只属于他们那一角的讯息。`
  }

  const system = buildDimensionSystemPrompt(kind, character, {
    godPerspective,
    mainCharacterOffstage,
    perspective,
    playerIdentityCardName,
    outputLanguage: langCode,
    isVnMode: isVnMode === true,
    languageSettings,
  })

  const parallelUserBlock =
    kind === 'parallel'
      ? `【平行事件·执行清单】
1. 从下方锚点正文列出「已在场/已出场」角色名单（含玩家与 ${character.realName.trim() || '约会对象'}）。
2. 正文只写**名单之外**的其他人在**另一地点**、与锚点**同一时刻**的同步切片。
3. 禁止锚点 cast 出场、对白、被目击、实时通话同框；禁止写锚点之前/之后。
4. 锚点内角色不知晓本切片（屏外非全知信息，不是他们的视角）。

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
  const userRaw =
    `角色：${character.realName}\n标签：${character.identityTags.join('、') || '无'}\n人设摘要：${character.prompt.slice(0, 900)}\n\n` +
    `【近端剧情摘录（仅供承接语气，勿复述）】\n${tailContext.slice(0, 2400)}\n\n` +
    `【锚点剧情正文（本${PLOT_DIMENSION_LABELS[kind]}的参照节点）】\n${anchorPlotBody.slice(0, 4200)}\n\n` +
    parallelUserBlock +
    `【篇幅】正文约 ${minChars}～${maxChars} 汉字（若目标语非汉语，以等价信息量对齐该篇幅）。\n` +
    langHint +
    syncHint +
    (guide ? `【用户写作引导·须优先服从】\n${guide.slice(0, 480)}\n` : '【用户写作引导】（未填写，按锚点自然延伸即可）\n') +
    `请直接输出正文。`

  const user = expandCharUserPlaceholders(userRaw, {
    charName: character.realName.trim() || '对方',
    userName: String(playerIdentityCardName ?? '').trim() || '用户',
  })

  let lastErr: unknown = null
  let raw = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      raw = await openAiCompatibleChat(
        apiConfig as ApiConfig,
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        { temperature: kind === 'if' ? 0.78 : 0.68 },
      )
      lastErr = null
      break
    } catch (e) {
      lastErr = e
      if (!isTransientNetworkError(e) || attempt >= 2) throw e
      await new Promise((r) => window.setTimeout(r, 600 + attempt * 500))
    }
  }
  if (lastErr) throw lastErr

  const split = splitDatingAssistantOutput(raw)
  const body = (split.content || split.logicPass || raw).trim()
  if (!body) throw new Error(`${PLOT_DIMENSION_LABELS[kind]}生成失败：模型未返回正文`)
  return body
}
