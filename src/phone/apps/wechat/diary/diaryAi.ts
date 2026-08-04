import type { AnonymousQaWechatContext } from '../../../../components/anonymousQa/buildAnonymousQaPersonaContext'
import { buildAnonymousQaPersonaPromptPack } from '../../../../components/anonymousQa/buildAnonymousQaPersonaContext'
import { openAiCompatibleChat, type OpenAiCompatibleMessage } from '../newFriendsPersona/ai'
import { personaDb } from '../newFriendsPersona/idb'
import type { Character } from '../newFriendsPersona/types'
import { buildSystemContent } from '../wechatChatAi'
import { buildMemoryRelevanceHaystack } from '../wechatMemoryPromptBlocks'
import {
  ensureDiaryInUniverseTimeHasYear,
  loadDiaryStoryYearHint,
} from './diaryInUniverseTime'
import { parseDiaryAiModelText } from './parseDiaryAiResponse'
import {
  buildDiaryOutputLanguageAppendix,
  isDiaryWritingChinese,
  normalizeDiaryOutputLanguage,
} from './diaryLanguage'
import {
  formatDiaryRecentContextUserBlock,
  loadDiaryMemoryContext,
} from './loadDiaryMemoryContext'
import {
  type DiaryAiResult,
  DIARY_CONTENT_MAX_CHARS,
  DIARY_CONTENT_MIN_CHARS,
} from './diaryTypes'

function buildDiarySystemAppendix(params: {
  charName: string
  needsFontBinding: boolean
  recentDiarySnippet: string
  diaryOutputLanguage?: string | null
}): string {
  const writingChinese = isDiaryWritingChinese(params.diaryOutputLanguage)
  const langAppendix = buildDiaryOutputLanguageAppendix(params.diaryOutputLanguage)
  const fontLine = params.needsFontBinding
    ? `- 当前尚未绑定笔迹（或笔迹已重置）。请在 JSON 中返回最符合你文化水平与人设的 font_style 代号：
  · 文化水平正常或偏高：只能选 sharp / neat / wild
    - neat（楷体）：系统会从楷体库随机绑定一款（鸿雷拙书简体、平方江南体、手书体等）
    - sharp / wild（行书）：系统会从行书库随机绑定一款
  · 文盲、学历很低、不常写字：只能选 lazy / elegant（潦草字体库），勿选 neat / sharp / wild`
    : '- 字体已永久绑定，不要返回 font_style 字段。'

  const writingQuality = writingChinese
    ? `- 【书写质感】正文必须以中文汉字为主书写，像正常人写日记一样。
  · 文盲、学历很低、不常写字的人设：只会写的字用汉字，**仅对少数不会写的难字/生僻词**用拼音顶替（全文拼音词建议 3～6 处，不要超过 8 处）；常用字（我、你、她、的、了、很、不、是等）必须用汉字。
  · 正确示例：今天雨好大。她把雨sǎn借给我，自己淋着走了。我心里有点过意不去，又有点开心……回到宿舍袜子还是湿的。
  · 错误示例：jīn tiān yǔ hǎo dà、tā bǎ yǔ sǎn jiè gěi wǒ —— 禁止整句或整段拼音罗马音。
  · 不会写的字：只写拼音，或只写你能写出来的字/错别字，二选一，禁止叠用；禁止「nán过（难过）」这类拼音后再括号补汉字。
  · 偶尔写错别字时，用括号补正即可（如：很闲（咸）），不要和拼音混用。
  · 涂改格式「[涂]错字|正字」全文最多 0～1 处。
  · 文化水平正常或偏高的人设：通顺书面语，全汉字，不要拼音，不要故意写错，不要使用 [涂]。
  · 标题与署名行由系统处理，content 里不要重复写你的名字。`
    : `- 【书写质感】title 与 content 按上方【日记书写语言】书写，像正常人写日记一样。
  · 勿夹杂未要求的其它语言整句；不要输出拼音罗马音顶替。
  · 文化水平正常或偏高：通顺书面语，不要故意写错，不要使用 [涂]。
  · 标题与署名行由系统处理，content 里不要重复写你的名字。`

  return `
---
【系统任务：私人日记生成】
你正在书写你（${params.charName}）的私人日记（仅玩家在档案里可读，剧情角色看不到）。
请参考系统上下文中已提供的：基础设定、世界书法则、【剧情时间轴·当前状态】、深层长期记忆，以及 user 消息中按时间锚点拆好的线下摘要与线上片段。
${langAppendix ? `\n${langAppendix}\n` : ''}
要求：
- 这是私人日记，可写真实情绪、心动、别扭、吃醋、懊悔与日常碎念，语气偏自然中性到温柔即可。
- 须符合人设分寸：卸下对外伪装 ≠ 放大阴暗面。傲娇可写别扭的懊悔，高冷可写克制的想念；允许浪漫与亲密回忆，但禁止病态偏执、监视控制、标记/囚禁式占有、恐吓威胁，以及「没有对方就无法活 / 只许想我」式极端独白。
- 除非人设与近期剧情明确导向，否则不要主动写成病娇、猎奇或过度色情的占有戏；亲密描写点到为止，更侧重心情与相处细节。
- 不要重复你最近写过的心声；若情绪相近，写出新的细节或转折。
- 【时间顺序】以【剧情时间轴·当前状态】与【日记书写锚点】为故事「现在」。先写更早的事、后写更近的事；user 里「往事·未总结私聊」只能回溯，**禁止**在正文后半又写回「即将分别 / 还没回来」等已被线下推进否定的状态。勿因某段情绪更强就打乱时序或倒回旧线上时刻。
- 正文须写完整、自然收束，最后一句语义完整，不要写到一半戛然而止。
- 【自然段】content 须像手写日记一样自然分段，**禁止**整篇挤成一大段。段与段之间用 \\n\\n（空一行）；分段数量与节奏由你按内容自行判断（如按事件、情绪转折、时空切换等落笔），勿机械凑段。
- inUniverseTime 必须包含公历年份（格式如 2026年7月2日 傍晚），须与【剧情时间轴·当前状态】/线下摘要中的故事日期一致，勿写真实落库日期；通常应贴近「现在」锚点。
${writingQuality}
${fontLine}
- 严格返回 JSON，不要 Markdown，不要解释。
- JSON 合法性（重要）：content 在 JSON 里仍是一个字符串；段间换行写成 \\n\\n，句内不要无故硬换行；双引号写成 \\"；[涂]错字|正字 格式可原样保留。
- 同一次输出须包含 memory_summary（供长期记忆入库的摘要表，**禁止抄写日记 content 原文**）：
  · memory_summary.row_title：4～10 字检索标题（概括本篇私密情绪或事件）
  · memory_summary.row_keywords：3～5 个检索词，每条 ≤5 个汉字
  · memory_summary.content：60～200 字**第三人称**备忘正文；{{char}} 指写日记的角色本人，{{user}} 指玩家；禁止第一人称「我」；禁止粘贴或大段复述日记原文
{
  "title": "符合你性格的日记标题（极简）",
  "inUniverseTime": "须含年份的剧情时间（如：2026年7月2日 傍晚，赶往公爵府的路上；或 2026年7月3日 凌晨三点，雨）",
  "content": "第一段……\\n\\n第二段……（共 ${DIARY_CONTENT_MIN_CHARS}-${DIARY_CONTENT_MAX_CHARS} 字；按文意用 \\n\\n 自然分段）",
  "memory_summary": {
    "row_title": "摘要短标题",
    "row_keywords": ["词1", "词2", "词3"],
    "content": "第三人称摘要备忘（60-200字）"
  }${params.needsFontBinding ? ',\n  "font_style": "neat"' : ''}
}

【你最近写过的日记标题（避免重复）】
${params.recentDiarySnippet || '（尚无）'}
`.trim()
}

export async function generateSubconsciousDiaryEntry(params: {
  characterId: string
  wechatCtx: AnonymousQaWechatContext
  existingFontFamily: string | null
  recentEntries: Array<{ title: string; inUniverseTime: string }>
  diaryOutputLanguage?: string | null
}): Promise<DiaryAiResult> {
  const cfg = params.wechatCtx.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) {
    throw new Error('未配置 AI API')
  }

  const cid = params.characterId.trim()
  const character = (await personaDb.getCharacter(cid)) as Character | null
  if (!character) throw new Error('角色不存在')

  const charName = character.name?.trim() || '角色'
  const needsFontBinding = !params.existingFontFamily
  const diaryOutputLanguage = normalizeDiaryOutputLanguage(params.diaryOutputLanguage)
  const writingChinese = isDiaryWritingChinese(diaryOutputLanguage)

  const hay = buildMemoryRelevanceHaystack([charName, '日记', '内心独白'])
  const [pack, storyYearHint] = await Promise.all([
    buildAnonymousQaPersonaPromptPack({
      characterId: cid,
      wechatCtx: params.wechatCtx,
      relevanceHaystack: hay,
    }),
    loadDiaryStoryYearHint(cid),
  ])

  const diaryMem = await loadDiaryMemoryContext({
    characterId: cid,
    conversationKey: pack.conversationKey,
    relevanceHaystack: buildMemoryRelevanceHaystack([
      hay,
      pack.longTermMemoryNotes?.slice(0, 800),
      pack.unsummarizedPrivateNotes?.slice(0, 800),
    ]),
    apiConfig: cfg,
    unsummarizedGroupNotes: pack.unsummarizedGroupNotes,
    unsMeet: pack.unsMeet,
  })

  const recentContext = formatDiaryRecentContextUserBlock(diaryMem)

  const baseSystem = buildSystemContent({
    character: pack.character,
    playerIdentity: pack.playerIdentity,
    playerDisplayName: params.wechatCtx.playerDisplayName.trim() || '你',
    promptMode: 'persona',
    longTermMemoryNotes: pack.longTermMemoryNotes || undefined,
    worldBackgroundPrompt: pack.worldBackgroundPrompt,
    storyTimelineNotes: diaryMem.storyTimeline || undefined,
    // 未总结私聊改由 user 块按剧情「现在」拆分注入，避免与时间轴抢序、双重放大旧线上
    unsummarizedPrivateNotes: undefined,
    unsummarizedGroupNotes: undefined,
    chatMemberIds: [cid],
  })

  const recentDiarySnippet =
    params.recentEntries
      .slice(0, 6)
      .map((e) => `- ${e.title}${e.inUniverseTime ? `（${e.inUniverseTime}）` : ''}`)
      .join('\n') || '（尚无）'

  const appendix = buildDiarySystemAppendix({
    charName,
    needsFontBinding,
    recentDiarySnippet,
    diaryOutputLanguage,
  })

  const userTask = `请根据下列近期上下文，书写一篇全新的私人日记（语气自然、贴合人设，勿写成病态占有独白）。
以【日记书写锚点】/【剧情时间轴·当前状态】为「现在」；线下摘要与近端线上可承接当下，往事·线上仅可回溯，禁止正文后半倒回更早的分别/离开时刻。
${recentContext ? `\n${recentContext}` : ''}`

  const messages: OpenAiCompatibleMessage[] = [
    { role: 'system', content: `${baseSystem}\n\n${appendix}` },
    { role: 'user', content: userTask },
  ]

  const chatOpts = { temperature: 0.78, max_tokens: 6500 }
  let raw = await openAiCompatibleChat(cfg, messages, chatOpts)
  let parsed = parseDiaryAiModelText(raw, { allowFontStyle: needsFontBinding })

  const looksTruncated = (content: string) => {
    const t = content.trim()
    if (t.length < 40) return true
    if (/[，,；;：:、]$/.test(t)) return true
    return t.length > 400 && !/[。！？…~～」』"']$/.test(t)
  }

  const isMostlyPinyinRomanization = (content: string) => {
    const latin = (content.match(/[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g) ?? []).length
    const han = (content.match(/[\u4e00-\u9fff]/g) ?? []).length
    return latin > 60 && han < latin * 0.35
  }

  const retryForContent = async (reason: string) => {
    const retryMessages: OpenAiCompatibleMessage[] = [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: reason },
    ]
    raw = await openAiCompatibleChat(cfg, retryMessages, chatOpts)
    parsed = parseDiaryAiModelText(raw, { allowFontStyle: needsFontBinding })
  }

  if (looksTruncated(parsed.content)) {
    await retryForContent(
      `上一版 content 写到一半被截断了。请重新输出完整 JSON：正文写满 ${DIARY_CONTENT_MIN_CHARS}-${DIARY_CONTENT_MAX_CHARS} 字并自然收尾，保持时间顺序不变，不要重复已写句子。`,
    )
  }

  if (writingChinese && isMostlyPinyinRomanization(parsed.content)) {
    await retryForContent(
      '上一版几乎全是拼音罗马音，不符合文盲手写习惯。请重新输出 JSON：正文以中文汉字为主，仅对少数不会写的难字用拼音（全文 3～6 处），禁止整句拼音。',
    )
  }

  if (!parsed.memorySummary?.content?.trim()) {
    await retryForContent(
      '上一版缺少 memory_summary 或摘要正文为空。请重新输出完整 JSON：必须含 memory_summary（row_title、row_keywords、content），摘要为第三人称备忘，禁止抄写日记 content 原文。',
    )
  }

  const result: DiaryAiResult = {
    title: parsed.title,
    content: parsed.content,
    inUniverseTime: ensureDiaryInUniverseTimeHasYear(parsed.inUniverseTime, storyYearHint),
    memorySummary: parsed.memorySummary,
  }
  if (needsFontBinding && parsed.font_style) result.font_style = parsed.font_style
  return result
}
