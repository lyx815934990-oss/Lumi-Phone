import { estimateTextTokens } from '../thinkingChain/cotTokens'
import { getActivePresetForScene } from '../thinkingChain/cotStore'
import {
  resolveOfflineReplyStyleAppendix,
  resolveOfflineThinkingChainBooksPrompt,
  resolveOnlineReplyStyleAppendix,
  resolveOnlineThinkingChainAppendix,
} from '../thinkingChain/cotAssemble'
import {
  buildWechatReplyFormatAppendix,
  buildWechatReplyStyleAppendix,
  buildWechatThinkingChainAppendix,
  LUMI_SYSTEM_OVERRIDE_APPENDIX,
} from './wechatReplyOutputPrompt'
import {
  buildOfflineDatingThinkingChainBooksPrompt,
  DATING_LUMI_DIRECT_SHELL,
  DATING_LUMI_SYSTEM_SHELL,
  OFFLINE_DATING_CREATIVE_RULES,
  buildDatingWritingPresetsPrompt,
} from './dating/offlineDatingMustInjectPrompts'
import { PROSE_FORBIDDEN_TOP_PRIORITY_PIN } from './proseForbiddenLexiconPrompt'
import { MBTI_OUTPUT_BAN_RULE } from './mbtiOutputBan'
import { getLoreArchiveBuiltinPresetTogglesSnapshot } from '../../worldbook/worldbookLoreStore'
import { WECHAT_ROLEPLAY_SYSTEM_PROMPT } from './wechatChatPrompt'
import { WECHAT_CHARACTER_PROFILE_UPDATE_APPENDIX } from './wechatCharacterProfileUpdateApply'
import { WECHAT_CHARACTER_MOMENT_PUBLISH_APPENDIX } from './wechatCharacterMomentPublishApply'
import { WECHAT_CHARACTER_MOMENT_SONG_SHARE_APPENDIX } from './wechatCharacterMomentSongShareApply'
import { WECHAT_CHARACTER_MOMENT_PIN_APPENDIX } from './wechatCharacterMomentPinApply'
import { WECHAT_CHARACTER_PRESENCE_MURMUR_APPENDIX } from './wechatCharacterPresenceMurmurApply'
import { buildStickerCatalogPromptBlock } from './stickers/stickerStore'
import { buildWechatClassicEmojiCatalogPromptBlock } from './stickers/wechatClassicEmojiPrompt'
import { peekLastPromptMaterial } from './lastPromptMaterialStore'
import { splitSystemPromptIntoNamedSections } from './memoryTracePromptSplit'
import type { ChatApiTokenUsage } from './chatApiUsage'
import type { MemoryTraceData, MemoryTraceTokenSection, MemoryTraceTokenUsage } from './memoryTraceTypes'

/** 固定协议：线上=沙盒+格式；线下有文心时仅剩约会输出壳 */
const FIXED_PROTOCOL_LABEL = '固定协议 · 沙盒与格式'
const FIXED_PROTOCOL_DETAIL_ONLINE =
  '线上：沙盒扮演与输出格式硬钉仍保留；用户「回复提示词」只替换扮演主壳'
const FIXED_PROTOCOL_DETAIL_OFFLINE_DEFAULT =
  '线下默认：禁词硬钉 + 约会输出壳 + 沙盒；启用文心自定义提示词后沙盒与禁词会被覆盖，仅壳保留'
const FIXED_PROTOCOL_DETAIL_OFFLINE_OVERRIDDEN =
  '本轮已启用文心自定义提示词：沙盒与禁词硬钉已覆盖；本块仅剩约会输出壳（thinking/直出格式）'

/** 与 `buildSystemContent` 微信私聊效力层级文案对齐（非重新回复路径） */
const WECHAT_PRIORITY_LADDER_PRIVATE =
  `【效力层级·微信私聊｜七板块记忆参考】` +
  `**【贴人设活人感 × 反爹味 × 反油腻】并列置顶铁则**（须同时满足；照顾型年上亦零爹味油腻豁免）> ` +
  `输出格式硬约束 ≈ **档案室档1**（若有；仅次于输出规范、高于人设）> ` +
  `**角色档案 + 私藏侧写 + 可变人生账本 + 人设世界书 + 档案室档2**` +
  `（档2与人设同级；与人设矛盾时仍跟随全局档案；侧写＝char 对 user 的稳定认知与对待方式；账本＝本线当前年龄/身份/资产等剧情事实；世界书＝性格禁忌与关系站位）> ` +
  `**档案室档3**（若有；次于人设）> 玩家身份铁律 > 世界背景/NPC网/尾声延展·关系 > ` +
  `3.11/3.12 等细则（落实上述铁则）> ` +
  `①剧情时间轴·当前状态 > ⑤未总结·线上私聊原文（末尾最新）> 近端·固定线上私聊原文（必注全文；轮数可调）> ④近端·最近2轮线下剧情原文 > ` +
  `③近端·更早5轮线下摘要 > ②向量召回·历史剧情摘要（至多5）> ` +
  `⑥向量召回·线上长期记忆（至多5）≈ ⑦关键词命中·线上长期记忆。` +
  `本轮用户消息决定接话方向，**不得**改写已定事实。` +
  `**私藏侧写例外**：侧写只是 char 对 user 的**当前了解**（会变）。` +
  `若与用户本轮反应/自述冲突，**一切以用户当前反应为准**——接话可承认旧印象并更新认知（「我以为…我记住了」类），` +
  `并在侧写答卷覆盖对应字段（含食物、称呼、亲密偏好等）；禁止用过时侧写抬杠。`

/** 与线下 DatingContext 续写效力层级文案对齐（非重新生成、非日历进阶路径的代表文案） */
const DATING_PRIORITY_LADDER_OFFLINE =
  `【效力层级·续写】本轮在已定事实之上推进剧情：` +
  `**【界面生成设置】**（人称、上帝/侧幕、导演模式、目标字数、剧情时间推进）为当轮**最高优先级硬约束** > ` +
  `**写作禁词硬钉/完整禁词表（全场景，压过旧稿文风）** > ` +
  `输出格式硬约束 > 玩家身份铁律 > **\`<CharUserEqualityOverride>\` / 通道对齐·平等条约（对白·旁白·OS 同效，禁幼化贬低与病态占有）** > ` +
  `**约会对象·档案与私藏侧写与可变人生账本与人设世界书 = 全局档案室世界书**` +
  `（同级最高设定；侧写规范 char 如何看待/称呼/对待 user，账本规范本线当前年龄/身份/资产等剧情事实）> 世界背景/NPC网/尾声延展·关系阶段 > ` +
  `文风禁词与内置恋爱参考（高质量爱情观/告白引擎/纯爱克制等，与上列同级硬底线；气质用人设口吻） > ` +
  `剧情时间轴·当前状态 > 尚未总结·私聊/群聊（末尾最新）=最近剧情（末尾最新） > 时间轴语义召回 > 向量长期记忆。` +
  `人设与全局档案冲突时取更具体、更不可违背的约束，**禁止**整段忽略任一端硬规则；玩家输入决定当轮方向，**不得**改写已定事实；角色在边界内可自主行动。` +
  `**私藏侧写例外**：侧写是 char 对玩家的**当前了解**（会变）；与玩家本轮反应冲突时以玩家当前反应为准，可承认旧印象并更新（含亲密偏好），答卷覆盖对应字段，禁止用过时侧写抬杠。` +
  `若时间推进已锁定：不得因旧稿节奏或笼统「禁跳时」而缩小/取消跨度；须「间隔带过→主事件落点」。`

/** 线上 earlyOutput 里几乎每轮都会带的「角色自助」协议（朋友圈/资料/在场等） */
function buildOnlineSelfServiceProtocolText(): string {
  return [
    WECHAT_CHARACTER_PROFILE_UPDATE_APPENDIX,
    WECHAT_CHARACTER_MOMENT_PUBLISH_APPENDIX,
    WECHAT_CHARACTER_MOMENT_SONG_SHARE_APPENDIX,
    WECHAT_CHARACTER_MOMENT_PIN_APPENDIX,
    WECHAT_CHARACTER_PRESENCE_MURMUR_APPENDIX,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export type BuildMemoryTraceTokenUsageParams = {
  data: MemoryTraceData
  /** 主回复 API 用量快照（优先） */
  apiUsage?: ChatApiTokenUsage | null
  /** 本轮是否开启思维链 */
  thinkingChainEnabled?: boolean
  /** 会话历史粗估（messages 拼接；可选） */
  transcriptText?: string
  /** 当轮真实 system 全文（优先按块拆分；缺省读 lastPromptMaterialStore） */
  materializedSystemPrompt?: string
  /** 当轮对话侧文本（不含 system） */
  requestMessagesText?: string
}

type RawSection = { id: string; label: string; detail?: string; rawTokens: number }

function pushSection(
  out: RawSection[],
  id: string,
  label: string,
  text: string,
  detail?: string,
): void {
  const t = String(text ?? '').trim()
  if (!t) return
  const raw = estimateTextTokens(t)
  if (raw <= 0) return
  out.push({ id, label, detail, rawTokens: raw })
}

function sceneFromChannel(
  ch: MemoryTraceData['sourceChannel'],
): 'online' | 'offline' {
  return ch === 'offline_plot' || ch === 'vn' ? 'offline' : 'online'
}

function buildFixedProtocolText(
  scene: 'online' | 'offline',
  thinkingOn: boolean,
  /** 线下已启用文心自定义提示词时：沙盒与禁词已覆盖，只剩壳 */
  offlineStyleOverridden = false,
): string {
  if (scene === 'online') {
    return [LUMI_SYSTEM_OVERRIDE_APPENDIX, buildWechatReplyFormatAppendix()].filter(Boolean).join('\n\n')
  }
  const shell = thinkingOn ? DATING_LUMI_SYSTEM_SHELL : DATING_LUMI_DIRECT_SHELL
  if (offlineStyleOverridden) {
    return shell
  }
  return [PROSE_FORBIDDEN_TOP_PRIORITY_PIN, shell, LUMI_SYSTEM_OVERRIDE_APPENDIX]
    .filter(Boolean)
    .join('\n\n')
}

/** 线上/线下：扮演主壳、效力层级、表情目录、朋友圈自助协议等（原先多半落在「其它」里） */
function buildShellAndRuntimeSections(
  scene: 'online' | 'offline',
  /** 线上已启用用户回复提示词时不再单列系统 WECHAT_CORE（主壳已被替换） */
  onlineUserRoleplayActive = false,
): RawSection[] {
  const out: RawSection[] = []
  if (scene === 'online') {
    if (!onlineUserRoleplayActive) {
      pushSection(
        out,
        'roleplay_core',
        '微信扮演主壳',
        WECHAT_ROLEPLAY_SYSTEM_PROMPT,
        'WECHAT_CORE：系统默认扮演骨架；启用用户「回复提示词」后整段被替换',
      )
    }
    pushSection(
      out,
      'priority_ladder',
      '效力层级说明',
      WECHAT_PRIORITY_LADDER_PRIVATE,
      '七板块记忆参考的优先级梯子；决定冲突时听谁的',
    )
    pushSection(
      out,
      'self_service',
      '角色自助协议 · 资料与朋友圈',
      buildOnlineSelfServiceProtocolText(),
      '改资料/发朋友圈/置顶/在场碎语等输出协议（当轮常开；不是心语开关）',
    )
    try {
      pushSection(
        out,
        'sticker_catalog',
        '表情包资源目录',
        buildStickerCatalogPromptBlock(),
        '【表情包资源】引用名目录；过长会截断',
      )
    } catch {
      /* store 未就绪时跳过 */
    }
    try {
      pushSection(
        out,
        'classic_emoji',
        '微信经典表情目录',
        buildWechatClassicEmojiCatalogPromptBlock(4200),
        '文字行内 [微笑] 等黄脸名称表',
      )
    } catch {
      /* ignore */
    }
  } else {
    pushSection(
      out,
      'priority_ladder',
      '效力层级说明 · 线下',
      DATING_PRIORITY_LADDER_OFFLINE,
      '约会续写优先级梯子；与用户「回复提示词」预设无关',
    )
    pushSection(
      out,
      'mbti_ban',
      'MBTI 出戏禁令',
      MBTI_OUTPUT_BAN_RULE,
      '线下 system 常注；禁止在可见正文写 MBTI 标签',
    )
  }
  return out
}

function buildStyleAndCotSections(
  scene: 'online' | 'offline',
  thinkingOn: boolean,
): RawSection[] {
  const out: RawSection[] = []
  const stylePreset = getActivePresetForScene(scene, 'replyStyle')
  const offlineUserStyle =
    scene === 'offline' ? resolveOfflineReplyStyleAppendix()?.trim() || '' : ''
  const offlineStyleOverridden = Boolean(offlineUserStyle && stylePreset)

  pushSection(
    out,
    'fixed_protocol',
    offlineStyleOverridden ? '固定协议 · 约会输出壳' : FIXED_PROTOCOL_LABEL,
    buildFixedProtocolText(scene, thinkingOn, offlineStyleOverridden),
    scene === 'online'
      ? FIXED_PROTOCOL_DETAIL_ONLINE
      : offlineStyleOverridden
        ? FIXED_PROTOCOL_DETAIL_OFFLINE_OVERRIDDEN
        : FIXED_PROTOCOL_DETAIL_OFFLINE_DEFAULT,
  )

  if (scene === 'online') {
    const userStyle = resolveOnlineReplyStyleAppendix()
    if (userStyle && stylePreset) {
      pushSection(
        out,
        'reply_style',
        `扮演主壳 · 用户预设「${stylePreset.name.trim() || '未命名'}」`,
        userStyle,
        '已替换 WECHAT_CORE；沙盒扮演与输出格式仍保留',
      )
    } else {
      pushSection(
        out,
        'reply_style',
        '回复提示词 · 系统内置文风',
        buildWechatReplyStyleAppendix(getLoreArchiveBuiltinPresetTogglesSnapshot()),
        '未启用用户回复提示词时，叠在系统主壳之后',
      )
    }
    if (thinkingOn) {
      const cotPreset = getActivePresetForScene(scene, 'thinkingChain')
      const userCot = resolveOnlineThinkingChainAppendix()
      if (userCot && cotPreset) {
        pushSection(
          out,
          'thinking_chain',
          `思维链 · 用户预设「${cotPreset.name.trim() || '未命名'}」`,
          userCot,
          '自定义思维链（替换系统内置）',
        )
      } else {
        pushSection(
          out,
          'thinking_chain',
          '思维链 · 系统内置',
          buildWechatThinkingChainAppendix(getLoreArchiveBuiltinPresetTogglesSnapshot()),
          '本轮已开启思维链',
        )
      }
    }
  } else {
    if (offlineStyleOverridden && stylePreset) {
      pushSection(
        out,
        'reply_style',
        `回复提示词 · 用户预设「${stylePreset.name.trim() || '未命名'}」`,
        offlineUserStyle,
        '已替换扮演总规则+写作板块，并覆盖沙盒与禁词硬钉；约会输出壳仍保留',
      )
    } else {
      const sysStyle = [OFFLINE_DATING_CREATIVE_RULES, buildDatingWritingPresetsPrompt(null)]
        .filter(Boolean)
        .join('\n\n')
      pushSection(
        out,
        'reply_style',
        '回复提示词 · 系统内置文风',
        sysStyle,
        '线下扮演总规则与内置写作板块（含通道对齐的微信核心层）',
      )
    }
    if (thinkingOn) {
      const cotPreset = getActivePresetForScene(scene, 'thinkingChain')
      const userCot = resolveOfflineThinkingChainBooksPrompt()
      if (userCot && cotPreset) {
        pushSection(
          out,
          'thinking_chain',
          `思维链 · 用户预设「${cotPreset.name.trim() || '未命名'}」`,
          userCot,
          '自定义思维链（替换内置场记包）',
        )
      } else {
        pushSection(
          out,
          'thinking_chain',
          '思维链 · 系统内置',
          buildOfflineDatingThinkingChainBooksPrompt(getLoreArchiveBuiltinPresetTogglesSnapshot()),
          '本轮已开启思维链',
        )
      }
    }
  }
  return out
}

function collectContextSections(data: MemoryTraceData): RawSection[] {
  const out: RawSection[] = []
  const bd = data.contextMatrix.baseDirectives
  const rc = data.contextMatrix.recentContext
  const dm = data.contextMatrix.deepMemory

  pushSection(out, 'persona', '角色档案', bd.personaDetail)
  pushSection(
    out,
    'life_ledger',
    '人生账本',
    [bd.lifeMutableCharacter, bd.lifeMutablePlayer].filter(Boolean).join('\n\n'),
  )
  pushSection(out, 'world_bg', '世界背景', bd.worldBackground)
  if (bd.characterWorldBook && !/^\(未绑定|^（未绑定|^无$|未启用人设世界书/.test(bd.characterWorldBook)) {
    pushSection(out, 'persona_wb', '人设世界书', bd.characterWorldBook)
  }
  if (
    bd.globalWorldbook &&
    !/^\(当前场景无|^（当前场景无|^（当前群场景无|^（当前板块无|^无$|无匹配的档案室/.test(bd.globalWorldbook)
  ) {
    pushSection(out, 'global_wb', '档案室世界书', bd.globalWorldbook)
  }

  const st = data.contextMatrix.storyTimeline
  if (st?.injected) {
    const body =
      (st.rows?.map((r) => r.content).filter(Boolean).join('\n\n') || st.promptExcerpt || '').trim()
    pushSection(out, 'story_timeline', '剧情时间轴', body)
  }

  const offlineSnips = (rc.unsummarizedOfflinePlots ?? []).map((r) => r.snippet).join('\n\n')
  const plotBlock = String(rc.plotContextBlock ?? '').trim()
  pushSection(out, 'ctx_offline', '近端上下文 · 线下', plotBlock || offlineSnips)

  const onlineSnips = (rc.unsummarizedChats ?? []).map((r) => r.snippet).join('\n\n')
  pushSection(out, 'ctx_online', '近端上下文 · 线上', onlineSnips)

  const recentRefs = (rc.recentRoundRefs ?? []).map((r) => r.snippet).filter(Boolean).join('\n\n')
  pushSection(out, 'recent_rounds', '最近轮次参考', recentRefs)

  const kw = (dm.keywordHits ?? []).map((r) => r.content).join('\n\n')
  pushSection(out, 'ltm_keyword', '长期记忆 · 关键词', kw)
  const vec = (dm.vectorRetrievals ?? []).map((r) => r.content).join('\n\n')
  pushSection(out, 'ltm_vector', '长期记忆 · 向量', vec)

  const net = data.networkRelationships
  if (net?.injected && net.promptExcerpt?.trim()) {
    pushSection(out, 'network', '人脉关系', net.promptExcerpt)
  }

  const wbAfter = data.worldBookAfterChat
  if (wbAfter?.protocolInPrompt) {
    const snap = (wbAfter.injectedSnapshotEntries ?? [])
      .map((e) => e.content)
      .filter(Boolean)
      .join('\n\n')
    pushSection(out, 'wb_after', '尾声延展快照', snap || wbAfter.injectedDynamicSection)
  }

  return out
}

/**
 * 顶部输入/输出优先用接口 usage；各板块用本地粗估。
 * 优先按当轮真实 system 全文拆块列全；不再使用「其余未单列」。
 * 接口总量 − 板块粗估之和仅记为「分词差额」。
 */
export function buildMemoryTraceTokenUsage(
  params: BuildMemoryTraceTokenUsageParams,
): MemoryTraceTokenUsage {
  const scene = sceneFromChannel(params.data.sourceChannel)
  const thinkingOn = params.thinkingChainEnabled === true
  const peeked = peekLastPromptMaterial()
  const systemText =
    String(params.materializedSystemPrompt ?? '').trim() || peeked?.systemText?.trim() || ''
  const messagesText =
    String(params.requestMessagesText ?? '').trim() ||
    peeked?.messagesText?.trim() ||
    String(params.transcriptText ?? '').trim()

  let rawSections: RawSection[] = []
  let usedLiveSplit = false

  if (systemText) {
    usedLiveSplit = true
    const liveRoleplay =
      (scene === 'online'
        ? resolveOnlineReplyStyleAppendix()
        : resolveOfflineReplyStyleAppendix()
      )?.trim() || ''
    // 优先用当轮快照里的文心正文（与已展开 system 同轮），避免打开溯源时预设已关导致「消失」
    const userRoleplay = peeked?.userRoleplayText?.trim() || liveRoleplay
    const stylePreset = getActivePresetForScene(scene, 'replyStyle')
    const presetName =
      peeked?.userRoleplayPresetName?.trim() || stylePreset?.name?.trim() || null
    rawSections = splitSystemPromptIntoNamedSections(systemText, {
      userRoleplayText: userRoleplay || null,
      userRoleplayPresetName: presetName,
      scene,
    }).map((s) => ({
      id: s.id,
      label: s.label,
      detail: s.detail,
      rawTokens: s.rawTokens,
    }))
    if (messagesText) {
      const offlineBundle =
        peeked?.source === 'offline' ||
        scene === 'offline' ||
        /【界面生成设置·当轮最高优先级|最近剧情（|未总结·私聊/.test(messagesText)
      if (offlineBundle) {
        // 线下把历史/未总结/档案等整包放进 role=user，不是「你打了四万字」
        const body = messagesText.replace(/^user:\s*/i, '').trim()
        // user 包是剧情/记忆上下文，不含文心主壳；勿再传 userRoleplay，
        // 否则「未命中则兜底」会再冒出一条重复的「扮演主壳 · 文心」。
        const splitUser = splitSystemPromptIntoNamedSections(body, {
          userRoleplayText: null,
          userRoleplayPresetName: null,
          scene: 'offline',
        })
        for (const s of splitUser) {
          rawSections.push({
            id: s.id.startsWith('sec_') ? `u_${s.id.slice(4)}` : `u_${s.id}`,
            label: s.label,
            detail: s.detail,
            rawTokens: s.rawTokens,
          })
        }
      } else {
        pushSection(
          rawSections,
          'transcript',
          '会话/用户消息',
          messagesText,
          '当轮请求中 system 以外的对话侧文本（私聊气泡等）',
        )
      }
    }
  } else {
    // 无真实 system 快照时回退粗归因（旧记录）；仍不生成「其余未单列」
    const onlineUserRoleplayActive =
      scene === 'online' && !!resolveOnlineReplyStyleAppendix()?.trim()
    rawSections = [
      ...buildShellAndRuntimeSections(scene, onlineUserRoleplayActive),
      ...collectContextSections(params.data),
      ...buildStyleAndCotSections(scene, thinkingOn),
    ]
    if (messagesText) {
      pushSection(
        rawSections,
        'transcript',
        '会话消息（最近切片）',
        messagesText,
        '送入模型的近期对话轮次粗估',
      )
    }
  }

  const estimatedSum = rawSections.reduce((a, s) => a + s.rawTokens, 0)
  const api = params.apiUsage
  const promptFromApi =
    api && api.fromApi && api.promptTokens > 0 ? api.promptTokens : null
  const completionFromApi =
    api && api.fromApi && api.completionTokens > 0 ? api.completionTokens : null

  const promptTokens = promptFromApi ?? estimatedSum
  const completionTokens =
    completionFromApi ?? estimateTextTokens(String(params.data.lastReply ?? ''))

  const shareBase = promptTokens > 0 ? promptTokens : 1
  const sections: MemoryTraceTokenSection[] = rawSections.map((s) => ({
    id: s.id,
    label: s.label,
    detail: s.detail,
    tokens: s.rawTokens,
    sharePercent: Math.round((s.rawTokens / shareBase) * 1000) / 10,
  }))

  if (promptFromApi != null) {
    const rest = promptFromApi - estimatedSum
    if (rest > 8) {
      sections.push({
        id: 'tokenizer_gap',
        label: '分词差额 · 接口 vs 本地粗估',
        detail: usedLiveSplit
          ? '接口 prompt_tokens − 上方各块本地粗估之和。上方已按当轮真实 system 全文拆块，差额不是未列出的注入正文'
          : '接口按模型分词计费；板块为本地粗估（偏保守）。本轮无 system 快照时差额也可能含未重建到的细块',
        tokens: rest,
        sharePercent: Math.round((rest / promptFromApi) * 1000) / 10,
      })
    }
  }

  const gapIds = new Set(['tokenizer_gap'])
  sections.sort((a, b) => {
    const ag = gapIds.has(a.id) ? 1 : 0
    const bg = gapIds.has(b.id) ? 1 : 0
    if (ag !== bg) return ag - bg
    return b.tokens - a.tokens
  })

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    fromApi: !!(promptFromApi != null || completionFromApi != null),
    estimatedInputSum: estimatedSum,
    thinkingChainEnabled: thinkingOn,
    sections,
  }
}
