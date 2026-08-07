/**
 * 线下剧情「续写」：按导演模式生成若干条有效推进剧情的续写指导草稿（非整轮剧情正文）。
 * 输出保留 {{char}} / {{user}} 占位符，供预览编辑后填入输入框。
 * 默认必须紧接上一段剧情结尾，禁止无故跳时跳场；可选时间推进时须带过间隔内发生的事。
 */

import { openAiCompatibleChat } from '../newFriendsPersona/ai'
import { buildDatingCharUserPerspectiveDirective } from '../charUserPlaceholders'
import type { ApiConfig } from '../../api/types'
import type { CharacterInfo, PlotItem } from './types'
import { splitDatingAssistantOutput } from './plotCoT'
import { extractVnVoiceParamsBlock } from './vnVoiceParamsStrip'
import { buildWorldbookContext } from '../../../worldbook/buildWorldbookContext'
import {
  buildWechatReplyRomanceSections,
} from '../../../worldbook/loreArchiveBuiltinPresets'
import {
  getLoreArchiveBuiltinPresetTogglesSnapshot,
  getWorldbookLoreEntriesSnapshot,
} from '../../../worldbook/worldbookLoreStore'
import type { DatingPlotPaceUnit } from './datingPlotPace'

/** 续写面板 · 时间推进 */
export type ContinueDraftTimeAdvance =
  | 'none'
  | 'hours'
  | 'day'
  | 'fewDays'
  | 'week'
  | 'month'
  | 'custom'

export const CONTINUE_DRAFT_TIME_ADVANCE_OPTIONS: Array<{
  id: ContinueDraftTimeAdvance
  label: string
  hint: string
}> = [
  { id: 'none', label: '不推进', hint: '同场下一拍' },
  { id: 'hours', label: '数小时', hint: '当日内短跨' },
  { id: 'day', label: '约一天', hint: '到次日前后' },
  { id: 'fewDays', label: '数天', hint: '数日内' },
  { id: 'week', label: '约一周', hint: '周级跨度' },
  { id: 'month', label: '约一月', hint: '月级跨度' },
  { id: 'custom', label: '自定义', hint: '自定跨度' },
]

export type ContinueDraftTimeAdvanceCustom = {
  amount: number
  unit: DatingPlotPaceUnit
}

function clip(text: string, max: number): string {
  const t = String(text ?? '').trim()
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function plotBody(p: PlotItem): string {
  const raw = String(p.content || '').trim()
  if (!raw) return ''
  if (p.type === 'ai') {
    return extractVnVoiceParamsBlock(splitDatingAssistantOutput(raw).content).cleanedText.trim()
  }
  return raw
}

/** 取最近若干轮作上下文；并单独抽出「接笔锚点」= 最新一条有正文的剧情末尾。 */
function buildContinueContext(plots: PlotItem[]): { tail: string; anchor: string; anchorWho: string } {
  const usable = plots
    .map((p) => ({ p, body: plotBody(p) }))
    .filter((x) => x.body)
  if (!usable.length) {
    return {
      tail: '（暂无剧情，请从合理开场写一条可推进的下一拍）',
      anchor: '',
      anchorWho: '',
    }
  }
  const latest = usable[usable.length - 1]!
  const anchorFull = latest.body
  // 末尾约 420 字，强制模型盯住「刚写到哪」
  const anchor =
    anchorFull.length <= 480 ? anchorFull : `…${anchorFull.slice(-(480 - 1))}`
  const prior = usable.slice(-8, -1)
  const lines: string[] = []
  for (const { p, body } of prior) {
    const who = p.type === 'player' ? '玩家/导演输入' : '剧情'
    lines.push(`【${who}】\n${clip(body, 700)}`)
  }
  lines.push(
    `【${latest.p.type === 'player' ? '玩家/导演输入（最新）' : '剧情（最新）'}】\n${clip(anchorFull, 1200)}`,
  )
  return {
    tail: clip(lines.join('\n\n'), 4200),
    anchor,
    anchorWho: latest.p.type === 'player' ? '玩家/导演输入' : '剧情',
  }
}

function stripJsonFence(s: string): string {
  let t = String(s || '').trim().replace(/^\uFEFF/, '')
  while (t.includes('```')) {
    const start = t.indexOf('```')
    const afterLang = t.indexOf('\n', start)
    const close = t.indexOf('```', afterLang >= 0 ? afterLang + 1 : start + 3)
    if (afterLang < 0 || close < 0) {
      t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      break
    }
    t = t.slice(afterLang + 1, close).trim()
  }
  return t.trim()
}

function parseGuideArray(raw: string, expected: number): string[] {
  const t = stripJsonFence(raw)
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s)
    } catch {
      return null
    }
  }
  let parsed: unknown = tryParse(t)
  if (parsed == null) {
    const i = t.indexOf('[')
    const j = t.lastIndexOf(']')
    if (i >= 0 && j > i) parsed = tryParse(t.slice(i, j + 1).replace(/,\s*([\]}])/g, '$1'))
  }
  const out: string[] = []
  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      if (typeof row === 'string') {
        const g = row.trim()
        if (g) out.push(g)
      } else if (row && typeof row === 'object') {
        const o = row as Record<string, unknown>
        const g = String(o.guide ?? o.director ?? o.text ?? o.content ?? '').trim()
        if (g) out.push(g)
      }
    }
  } else {
    const blocks = t
      .split(/\n\s*\n+/)
      .map((b) =>
        b
          .replace(/^\s*(?:[-*•]|\d+[.)、]|续写\s*\d+\s*[:：])\s*/u, '')
          .trim(),
      )
      .filter(Boolean)
    out.push(...blocks)
  }
  if (!out.length) return []
  if (out.length >= expected) return out.slice(0, expected)
  return out
}

function clampAdvanceAmount(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(x) || x <= 0) return 1
  return Math.min(9999, Math.round(x * 100) / 100)
}

function unitLabel(unit: DatingPlotPaceUnit): string {
  if (unit === 'hour') return '小时'
  if (unit === 'month') return '个月'
  if (unit === 'year') return '年'
  return '天'
}

function resolveTimeAdvanceSpan(
  advance: ContinueDraftTimeAdvance | undefined,
  custom?: ContinueDraftTimeAdvanceCustom | null,
): { enabled: boolean; phrase: string; detail: string } {
  const a = advance ?? 'none'
  if (a === 'none') {
    return { enabled: false, phrase: '不推进', detail: '' }
  }
  if (a === 'hours') {
    return {
      enabled: true,
      phrase: '数小时内',
      detail: '跨度约数小时（如午后→傍晚、晚饭后→深夜），仍在同一日或紧邻时段。',
    }
  }
  if (a === 'day') {
    return {
      enabled: true,
      phrase: '约一天',
      detail: '跨度约一天（可到次日白天/傍晚），须交代间隔内发生了什么。',
    }
  }
  if (a === 'fewDays') {
    return {
      enabled: true,
      phrase: '数天',
      detail: '跨度约数天（约 2～5 天），须简要带过这几天里发生的事。',
    }
  }
  if (a === 'week') {
    return {
      enabled: true,
      phrase: '约一周',
      detail: '跨度约一周，须带过这一周里关键节点或相处变化。',
    }
  }
  if (a === 'month') {
    return {
      enabled: true,
      phrase: '约一个月',
      detail: '跨度约一个月，须带过这期间生活/关系里可感知的变化痕迹。',
    }
  }
  const amount = clampAdvanceAmount(custom?.amount ?? 3)
  const unit = custom?.unit === 'hour' || custom?.unit === 'month' || custom?.unit === 'year' ? custom.unit : 'day'
  const phrase = `约 ${amount}${unitLabel(unit)}`
  return {
    enabled: true,
    phrase,
    detail: `跨度约为 ${phrase}（可略弹性，数量级须贴近），须带过这段间隔里发生的事。`,
  }
}

/**
 * 生成 N 条导演式续写指导（尚未发生、须当场可演的下一拍；可选时间推进）。
 */
export async function requestDatingDirectorContinueDrafts(params: {
  apiConfig: ApiConfig | null
  character: CharacterInfo
  plots: PlotItem[]
  count: number
  /** 玩家展示名，用于占位符说明；正文仍写 {{user}} */
  playerDisplayName?: string
  bias?: string
  /**
   * 行动侧重：both=双方都有可演行动；char=主要写 {{char}}；user=主要写 {{user}}。
   * 默认 both。
   */
  actionFocus?: 'both' | 'char' | 'user'
  /** 时间推进：none=同场下一拍；其它=按跨度推进且须带过间隔内事件 */
  timeAdvance?: ContinueDraftTimeAdvance
  timeAdvanceCustom?: ContinueDraftTimeAdvanceCustom | null
  godPerspective?: boolean
  mainCharacterOffstage?: boolean
  /** VN 模式按 vn 板块注入档案室；否则 offline_plot */
  isVnMode?: boolean
}): Promise<string[]> {
  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg?.apiKey?.trim() || !cfg?.modelId?.trim()) {
    throw new Error('请先配置聊天 API')
  }

  const n = Math.max(1, Math.min(6, Math.floor(params.count) || 2))
  const charName = params.character.realName.trim() || '对方'
  const userName = String(params.playerDisplayName ?? '').trim() || '用户'
  const cuDirective = buildDatingCharUserPerspectiveDirective(charName, userName)
  const { tail, anchor, anchorWho } = buildContinueContext(params.plots)
  const bias = String(params.bias ?? '').trim()
  const actionFocus = params.actionFocus === 'char' || params.actionFocus === 'user' ? params.actionFocus : 'both'
  const timeSpan = resolveTimeAdvanceSpan(params.timeAdvance, params.timeAdvanceCustom)
  const allowTimeJump =
    timeSpan.enabled ||
    /次日|第二天|隔天|天亮|傍晚|入夜|几天后|一周后|跳到|时间跳|换场|换场景|离开这里|去别处|去公司|去外面/.test(
      bias,
    )

  const datingWbIds = [params.character.id].map((x) => String(x ?? '').trim()).filter(Boolean)
  const plate = params.isVnMode ? ('vn' as const) : ('offline_plot' as const)
  const archiveBlock = buildWorldbookContext(
    datingWbIds,
    getWorldbookLoreEntriesSnapshot(),
    plate,
  ).trim()
  const toggles = getLoreArchiveBuiltinPresetTogglesSnapshot()
  const romanceBuiltinBlock = buildWechatReplyRomanceSections(toggles).trim()
  const worldbookDuty = `【档案室效力｜续写同等生效】上列全局世界书/档案室条目（含用户自定义）对本批「导演续写」**同样生效**：关系阶段、亲密分寸、纯爱克制、高质量爱情观、禁止项与气质边界等，不得因是「续写草稿」而绕过或放宽。
【内置预设】若已开启「纯爱克制 / Lumi 高质量爱情观 / 情感破冰与告白」等：续写指导的偏向与情节幅度必须服从；未确立情侣禁止越级亲密；禁止强制爱、油腻霸总跳戏；气质可跟人设，硬底线不可破。
【与偏向的关系】「续写偏向」只能在档案室允许的范围内调戏核与节奏；若偏向与生效世界书冲突，以世界书为准。`

  const actionFocusBlock =
    actionFocus === 'char'
      ? `【行动侧重｜硬】本批续写**主要写 {{char}} 的行动与对白**（推门后怎么做、怎么开口、肢体与态度）。{{user}} 最多一句极短反应或状态，禁止写成以 {{user}} 为主角的一整段行动线。`
      : actionFocus === 'user'
        ? `【行动侧重｜硬】本批续写**主要写 {{user}} 的行动与对白**（怎么回应、怎么动作、怎么开口）。{{char}} 最多一句极短反应或状态，禁止写成以 {{char}} 为主角的一整段行动线。`
        : `【行动侧重｜硬】本批续写须让 **{{char}} 与 {{user}} 双方都有可演的具体行动或对白**（可有主次，但禁止整条只写一方、另一方完全失踪）。`

  const perspectiveNote = params.mainCharacterOffstage
    ? actionFocus === 'char'
      ? '侧幕已开：但仍选了「仅角色行动」——若与侧幕冲突，优先侧幕：禁止主角色 {{char}} 当场出场，改写 NPC/人脉侧的行动。'
      : '侧幕：续写须围绕 {{user}} 与 NPC/人脉，禁止安排主角色 {{char}} 当场出场。'
    : params.godPerspective
      ? '上帝视角可写屏外信息差，但仍须是可演出的具体下一拍，禁止空泛氛围句。'
      : '默认当面同场：按行动侧重写可立刻发生的动作、对白与互动。'

  const bridgeRule = `【间隔带过｜硬｜禁止硬切｜禁止整段流水账】
- **禁止**只写「到了次日 / 过了几天 / 一周后」空壳，然后直接从新场景开拍。
- 结构必须是两层：① **短带过**：一两句到三句点几个时间节点（如「4月时…」「过后几天…」「5月时…」），写关系/生活可感知变化，中间不能断成空白；② **主事件落点（戏核）**：落到「这天 / 这一刻」一件重要可演事件上（约见、对峙等），篇幅重心在此。
- 示例：「时间过去了三个月，这三个月来，{{char}}和{{user}}的关系也发生了一点点小改变。4月时……，过后的几天里……，5月时……。（主事件→）这天，{{char}}约了{{user}}出来单独见面……」然后把见面当场写开。
- 带过要像导演场记，不要整章流水账；但读者必须感到「中间不是空白」。`

  const continuityBlock = timeSpan.enabled
    ? `【接笔铁律｜界面已选时间推进：${timeSpan.phrase}】
- ${timeSpan.detail}
- 从接笔锚点出发，故事时间须推进到该跨度落点；人物关系与情绪因果须自洽，且不突破档案室亲密/关系闸门。
${bridgeRule}
- 落点后的第一拍仍要具体可演；${n} 条之间可换不同「间隔里发生的事」或落点后的不同反应，但跨度数量级须一致。`
    : allowTimeJump
      ? `【接笔铁律｜偏向已允许跳时/换场】
- 玩家偏向已明确要求时间或场景变化，可按偏向跳；但仍须与上文人物关系、情绪因果自洽，且不突破档案室亲密/关系闸门。
${bridgeRule}
- 跳转后第一拍仍要具体可演，禁止只写「到了傍晚/第二天」空壳。`
      : `【接笔铁律｜最高优先级｜默认禁止跳时跳场】
- 必须从「接笔锚点」**正结束的那一拍**往下接：同一地点、同一时刻、同一正在进行的动作/对峙。
- 若锚点是「{{char}} 推门进来找 {{user}}」，续写只能写推门之后立刻发生的事（看见对方、开口、对方反应等），**禁止**写成已经傍晚、次日、换房间、去公司、另开一条线。
- **禁止**无故时间词：傍晚、入夜、次日、第二天、天亮、几天后、一周后、过了很久等（除非「续写偏向」或界面「时间推进」明文要求）。
- **禁止**无故换场：突然到公司/街上/家里另一处，除非偏向要求。
- ${n} 条之间只允许「同一接笔点上的不同反应/不同小冲突」，禁止一条贴着结尾、另一条直接跳到傍晚。
- 不合格示例：上文还在推门 → 续写「到了傍晚…」→ 必须作废重写。`

  const system = `${cuDirective}你是线下约会剧情的「导演续写」助手。{{char}}≈「${charName}」，{{user}}≈「${userName}」。任务：根据接笔锚点，写出 ${n} 条**尚未发生**的导演式续写指导${timeSpan.enabled ? `（须推进约「${timeSpan.phrase}」，并带过间隔内事件）` : '（且**紧接锚点结尾**）'}。

${archiveBlock ? `${archiveBlock}\n\n` : ''}${worldbookDuty}
${romanceBuiltinBlock ? `\n\n${romanceBuiltinBlock}` : ''}

【输出格式（硬）】
- 只输出合法 JSON 数组，长度必须为 ${n}。
- 每项为字符串，或 {"guide":"……"}；禁止 Markdown 围栏、禁止数组外解释。
- 指导正文里指角色本人必须写字面量 {{char}}，指玩家必须写字面量 {{user}}；禁止用「${charName}」「${userName}」等真名替代。
- 对白若出现在指导里，用中文直角引号「…」，JSON 字符串内禁止未转义的英文双引号。

${continuityBlock}

${actionFocusBlock}

【续写指导写法（硬｜对标导演模式）】
- ${timeSpan.enabled ? '每条结构：①一两句带过间隔内发生的事 → ②落到推进后可立刻开演的具体一拍（谁看见什么、做什么、说什么）。' : '每条是「锚点结束后立刻发生」的下一拍：谁看见什么、做什么、说什么、对方如何反应。'}
- **必须有效推动剧情**：新动作、新对白、关系张力；禁止「气氛变得微妙」「心里一紧」「继续对视」等空转。
- 禁止把锚点里已发生的事再复述一遍当开场；直接写接下来要演的过程。
- 禁止工业糖精空壳告白；推进幅度可以大，但${timeSpan.enabled ? '跨度与带过须符合界面所选时间推进' : '**时空必须贴着锚点**（除非偏向允许跳转）'}，且亲密/关系分寸服从档案室。

【文风示例（学结构）】
- 紧接型："{{char}}见没动静轻轻推开一点门缝见{{user}}正面对着窗户抽烟，看着很心烦，然后进来问{{user}}怎么回事，{{user}}很自责地说自己不应该这样粗暴对待自己喜欢的人"
- 推进带过型（界面选了时间推进或偏向要求时）："推门争执后的两三天里两人没怎么说话，只在走廊擦肩时点头；到了第四天傍晚，{{char}}还是敲开{{user}}宿舍门，把一杯热牛奶搁桌上，低声说「还生我气吗」"

${perspectiveNote}`

  const anchorBlock = anchor
    ? `【接笔锚点·必须从此往下接｜来自最新${anchorWho}的结尾】
${anchor}

【自检】生成前先用一句话心里确认：锚点最后一拍是什么动作/状态？${
        timeSpan.enabled
          ? `你的每条是否都推进了约「${timeSpan.phrase}」，且用一两句带过了间隔里发生的事（禁止只写「过了几天」空壳）？`
          : '你的每条续写是否都发生在它的下一秒？若已跳到傍晚/次日/别的地方且偏向未要求 → 重写。'
      }若违背档案室纯爱/爱情观/自定义世界书 → 重写。`
    : ''

  const timeAdvanceUserLine = timeSpan.enabled
    ? `【时间推进｜界面已选】${timeSpan.phrase}\n${timeSpan.detail}\n须带过间隔内事件后再落到可演的下一拍。\n`
    : '【时间推进｜界面已选】不推进（同场下一拍）；禁止跳时跳场（除非续写偏向明文要求）。\n'

  const user = `角色：${charName}
人设摘要：${clip(params.character.prompt, 900)}

【近期剧情（含最新全文）】
${tail}

${anchorBlock}

${timeAdvanceUserLine}
${bias ? `【续写偏向】${bias}\n（若与档案室冲突，以档案室为准）\n` : '【续写偏向】无\n'}
【行动侧重】${actionFocus === 'char' ? '仅 {{char}} 行动为主' : actionFocus === 'user' ? '仅 {{user}} 行动为主' : '双方都要有行动'}
请输出 ${n} 条互不雷同、符合时间推进与行动侧重、且符合生效档案室世界书的导演续写指导 JSON 数组。`

  let lastRaw = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const payload =
      attempt === 0
        ? user
        : `${user}\n\n【纠错】上次不合格。请严格输出长度为 ${n} 的 JSON 字符串数组；${
            timeSpan.enabled
              ? `每条须推进约「${timeSpan.phrase}」并用一两句带过间隔内发生的事，禁止只写「过了几天」空壳；`
              : '每条必须紧接接笔锚点结尾，禁止跳到傍晚/次日/换场（除非偏向或界面时间推进要求）；'
          }禁止空话。`
    lastRaw = await openAiCompatibleChat(
      cfg,
      [
        { role: 'system', content: system },
        { role: 'user', content: payload },
      ],
      { temperature: attempt === 0 ? 0.55 : 0.35 },
    )
    const guides = parseGuideArray(lastRaw, n)
    if (guides.length >= 1) {
      while (guides.length < n) {
        guides.push(
          timeSpan.enabled
            ? `${guides[guides.length - 1]}（同一跨度另一版：换一种间隔内事件或落点后反应，仍须带过中间发生的事）`
            : `${guides[guides.length - 1]}（同场另一拍：在同一接笔点上换一种具体反应或小冲突，勿跳时）`,
        )
      }
      return guides.slice(0, n)
    }
  }
  throw new Error('续写指导生成失败：模型未返回可用内容')
}
