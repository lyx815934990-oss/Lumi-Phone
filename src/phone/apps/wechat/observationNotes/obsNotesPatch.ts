/**
 * 同主回复内「私藏侧写」判断/更新
 * 稳定纯文本行格式（标签｜内容），避免复杂 markup 解析失败
 */

import {
  affectionStageFromValue,
  clampPct,
  emptyField,
  OBS_ABILITY_AXIS_LABELS,
  OBS_MBTI_AXIS_LABELS,
  type ObservationFieldDiff,
  type ObservationNotesDoc,
  type ObservationRadarAxis,
  type ObservationVoice,
} from './types'
import {
  createBlankObservationNotesDoc,
  loadObservationNotes,
  saveObservationNotes,
} from './store'
import { normalizeObservationNotesPatchPath, sanitizeObservationRemarkNickname } from './knownUserFacts'
import { personaDb } from '../newFriendsPersona/idb'
import type { ObservationNotesPlotRevert } from './plotRevert'

/** 主分隔行（短、稳） */
export const OBS_NOTES_PATCH_MARKER = '---OBS---'
/** 兼容旧分隔行 */
const OBS_NOTES_PATCH_MARKERS = ['---OBS---', '---OBS_NOTES_PATCH---'] as const

export const OBS_NOTES_UPDATED_EVENT = 'observation-notes-updated'

export type ObservationNotesUpdatedEventDetail = {
  conversationCharacterId: string
  playerIdentityId: string
  diffCount: number
  /** 变更字段中文标签，供全局提示弹层展示 */
  changedLabels?: string[]
  source?: 'model_inline' | 'manual'
}

export type ObservationNotesFieldPatch = {
  path: string
  label: string
  newText: string
  voice?: ObservationVoice
  /** timeline：append；默认 replace */
  action?: 'replace' | 'append'
}

const LABEL_TO_PATH: Array<{ labels: string[]; path: string; action?: 'append' | 'replace' }> = [
  { labels: ['姓名', '名字', 'name'], path: 'basic.name' },
  { labels: ['性别', 'gender'], path: 'basic.gender' },
  { labels: ['性取向', '取向', 'orientation'], path: 'basic.orientation' },
  { labels: ['食物', '喜欢的食物', 'favoriteFoods'], path: 'basic.favoriteFoods' },
  { labels: ['雷点', 'taboos'], path: 'basic.taboos' },
  { labels: ['爱好', '兴趣', '兴趣爱好', 'hobbies'], path: 'basic.hobbies' },
  { labels: ['线上备注', '备注', 'remarkNickname'], path: 'remarkNickname' },
  { labels: ['称呼', '喜欢的称呼', 'preferredAddress'], path: 'preferredAddress' },
  { labels: ['评价', '总体评价', 'overallEvaluation'], path: 'overallEvaluation' },
  { labels: ['好感', '好感度', 'affection'], path: 'affection' },
  { labels: ['关系', '目前关系', 'relationshipLabel'], path: 'relationshipLabel' },
  { labels: ['优点', 'strengths'], path: 'strengths' },
  { labels: ['缺点', 'weaknesses'], path: 'weaknesses' },
  { labels: ['亲密', '亲密偏好', 'intimate'], path: 'intimate.pref' },
  { labels: ['XP', '亲密XP', '亲密xp', 'xp'], path: 'intimate.xp' },
  { labels: ['敏感处', '身体敏感处', '敏感'], path: 'intimate.sensitive' },
  { labels: ['亲密方式', '喜欢的亲密方式', '方式'], path: 'intimate.ways' },
  { labels: ['人格', '人格倾向', 'MBTI', 'mbti'], path: 'personalityRadar' },
  { labels: ['人格注', '人格小结', '人格笔记'], path: 'personalityRadar.note' },
  { labels: ['能力', '内在能力', '能力判定'], path: 'abilityRadar' },
  { labels: ['能力注', '能力小结', '能力笔记'], path: 'abilityRadar.note' },
]

function resolveLabelToPatch(labelRaw: string, text: string): ObservationNotesFieldPatch | null {
  const label = labelRaw.trim().replace(/\s+/g, '')
  if (!label || !text.trim()) return null
  // 长标签优先，避免「能力注」被当成未知或短匹配失败
  const sorted = [...LABEL_TO_PATH].sort(
    (a, b) => Math.max(...b.labels.map((l) => l.length)) - Math.max(...a.labels.map((l) => l.length)),
  )
  for (const row of sorted) {
    if (row.labels.some((l) => l.toLowerCase() === label.toLowerCase())) {
      return {
        path: row.path,
        label: row.labels[0]!,
        newText: text.trim().slice(0, 800),
        voice: 'marginalia',
        ...(row.action ? { action: row.action } : {}),
      }
    }
  }
  const path = normalizeObservationNotesPatchPath(label)
  if (!path || path === label) return null
  if (path === 'heartMoments' || path === 'deepMemories') return null
  return {
    path,
    label,
    newText: text.trim().slice(0, 800),
    voice: 'marginalia',
  }
}

export function buildObservationNotesPatchOutputAppendix(opts?: {
  initialFill?: boolean
}): string {
  const initial = opts?.initialFill
    ? `
【首次答卷】禁止只写「无变化」。至少写出：姓名、性取向（可知则写）、亲密、XP、敏感处、亲密方式、人格、能力。
`
    : ''

  return `
---------------------
【同一回复内必须追加：私藏侧写答卷（每轮必交）】
写完全部可见聊天后，另起一行输出（必须完全一致）：
${OBS_NOTES_PATCH_MARKER}
之后只用纯文字，禁止 JSON / 代码围栏 / 解释 / 方括号块。

① 无实质更新：
无变化

② 有更新：每行一项「标签｜内容」
示例：
姓名｜她跟我说叫小晚，我就这么记了
性别｜女
性取向｜她提过不愿被随便归类，我先这么记
食物｜爱吃辣，火锅点多了也不嫌
雷点｜被当众拆台
爱好｜深夜乱逛
线上备注｜季修晗🐾
称呼｜阿晚
好感｜72
关系｜暧昧
评价｜……用你平时跟对方说话的语气写一两句……
优点｜聪明｜嘴硬心软
缺点｜爱把真心藏笑话里
亲密｜喜欢热烈的、慢慢的、引导的、半推半就的
XP｜喜欢锁骨、脚踝、小腹、亲密时放音乐
敏感处｜小腹、耳后、嘴唇
亲密方式｜温柔的接吻、被从背后抱然后被亲耳朵和脖子
人格｜外向42 直觉78 理性55 决断48 开放74 共情86
人格注｜这张图画出来时我觉得你比自己以为的更细腻
能力｜智商74 情商82 胆商58 逆商71 创商80 健商49
能力注｜你总能把乱情绪整理成能被接住的句子

可用标签：姓名、性别、性取向、食物、雷点、爱好、线上备注、称呼、好感、关系、评价、优点、缺点、亲密、XP、敏感处、亲密方式、人格、人格注、能力、能力注
${initial}
【口吻 · 活人感 · 第一人称 · 不 OOC】
- 用你**平时与对方相处/线上私聊的同款语气**填档案试卷；侧写=「我」对 {{user}} 的私藏认知，**禁止**中立简介、第三方旁白、百科词条。
- 「称呼 / 关系 / 评价 / 优点 / 缺点 / 线上备注 / 人格注 / 能力注」必须带态度与亲密感；**禁止**把「名正言顺的热恋男朋友…」压成「热恋」，或把多称呼瘦身成单名单称（无降温/纠正时）。
- 侧写=你对对方的**当前了解**，会随对方反应改写；不是你永远咬死的设定。
- **姓名 / 线上备注 / 称呼（硬性区分）**：
  - 「姓名」＝对方真实姓名/本名；
  - 「称呼」＝你口头怎么叫对方（可与备注不同，也可带颜文字）；须像你会说出口的话；
  - 「线上备注」＝你微信通讯录备注栏；**必须同时满足**：① 跟本档「好感」+「关系」阶段对齐；② **像你会亲手取的备注**（默认贴合人设口吻，深爱可反差更腻）：
    · 冷淡克制型：平常备注偏短、正式或干巴（全名/姓+名）；**若已非常非常爱对方**，可反差成「名/小名 + emoji」或只对对方的腻称（宝宝/宝贝等亦可）——像嘴硬心软藏在通讯录里；
    · 毒舌/玩笑型：可带轻微损称、梗、反讽；深爱时也可更黏；
    · 黏人温柔型：熟了可用小名/缩写 + emoji / 颜文字，或宝宝/宝贝类亲昵称（上例「季修晗🐾」仅示意，勿无脑照抄）；
    · 好感约 0–39 或关系偏陌生：全名/克制备注为主；**禁止**还没心动就备注得很腻；
    · 好感约 40–69：可小名/缩写 + 轻量符号；
    · 好感约 70+ 或关系暧昧恋爱、尤其「非常爱」：可更亲昵甚至人设反差的腻歪备注（**允许**宝宝/宝贝/小宝/老公/老婆等）；
    · **禁止**照抄对方微信公开昵称；**禁止动物系宠物名**：如「XX狗」「XX猫」「小狗狗」「小猫咪」等把人当宠物养的叫法（emoji 🐾 可以，但备注正文不要「狗/猫」后缀宠称）。
  - 本轮若「好感｜」「关系｜」有更新：检查「线上备注」是否仍匹配新阶段与你的感情浓度；不匹配则本轮一并改。
- **「关系」栏**：写你认定的关系阶段 + 你的态度（可一句）；禁止只丢「热恋/暧昧/好友」单标签。
- **「评价」栏**：一两句第一人称，贴人设口癖与私下看法。
- **「亲密 / XP / 敏感处 / 亲密方式」＝性向身体亲密认知（硬性）**：
  - 写**身体接触、吻触、爱抚、性爱节奏与部位癖好**，**禁止**写成感情节奏（如慢热恋爱、催告白、认真对待会软、推进度等情感向空话）。
  - 「亲密」＝亲密时的态度/节奏偏好，例：喜欢热烈的、慢慢的、引导的、半推半就的；
  - 「XP」＝性癖刺激点（部位、场景、道具氛围等），例：喜欢锁骨、脚踝、小腹、亲密时放音乐；
  - 「敏感处」＝身体敏感部位，例：小腹、耳后、嘴唇；
  - 「亲密方式」＝更具体的亲密行为偏好，例：温柔的接吻、被从背后抱然后被亲耳朵和脖子。
  - 有依据再写；对方本轮否认、改口、设限时必须覆盖旧值，接话服从对方当前意愿。
- **「暂时不知道」通则（含食物/雷点/爱好/性取向/亲密四栏等事实栏）**：
  - 本轮材料**完全没有**某条依据时：用你的视角写「尚不清楚」「暂时不知道」「还没摸清楚…」等，**禁止瞎编**。
  - **证据只认本轮实际注入的内容**：用户本轮话、身份卡、近期剧情/日记，以及 system 里出现的 **【向量召回】/【关键词命中】/长期记忆召回** 等板块。
  - **本轮召回里写过的事实优先**：侧写旧值写着「不知道」，但本轮召回记忆里已有该事实 → **必须以召回为准落笔覆盖**，接话也当作你记得；禁止口口声声「我不知道」却无视召回。
  - **没召回 = 仍当不知道**：库里可能很久以前写过、但**本轮 prompt 未注入**的记忆，**不得**凭空当已知；继续写不知道类即可。
  - **态度栏例外**：称呼/关系/评价/备注等已有当前侧写或本轮关系证据时，不得用「不知道」偷懒瘦身。
- 「人格 / 能力」**必须打分**：六轴各 0–100，格式固定如「外向42 直觉78 理性55 决断48 开放74 共情86」；能力轴为「智商74 情商82 胆商58 逆商71 创商80 健商49」。也可只写六个数字「42 78 55 48 74 86」。
- 「人格注 / 能力注」**必须各写一句**你的主观评语（手记口吻），不可省略。
- 「尚不清楚／暂时不知道」且本轮已有证据（含召回记忆）必须改。
- **具体心动瞬间 / 深刻往事不写进侧写**：那些交给向量/关键词记忆召回；侧写只记稳定认知与态度。
- **档案与用户本轮反应冲突时**：可见回复先承认旧印象再收下新说法（例：「这样吗？我以为你喜欢吃辣的，我记住了。」按人设改写）；答卷同步覆盖「食物 / 雷点 / 爱好 / 称呼 / 亲密 / XP / 敏感处 / 亲密方式」等对应标签；禁止用旧档抬杠。
---------------------
`.trim()
}

function isNoChangeBody(src: string): boolean {
  const t = src.trim()
  if (!t) return false
  if (/^(无变化|无更新|不变|没有变化|无需更新)\s*$/u.test(t)) return true
  if (/^status\s*[:：]\s*无变化\s*$/iu.test(t)) return true
  if (/\[OBS_NOTES\]/i.test(t) && /无变化/.test(t) && !/[｜|]/.test(t)) return true
  return false
}

/** 解析稳定行格式；兼容旧 [OBS_NOTES_PATCH] 块 */
function parseObsNotesPatchBody(section: string): { ok: boolean; patches: ObservationNotesFieldPatch[] } {
  const src = String(section ?? '')
    .replace(/^```(?:[\w-]*)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
  if (!src) return { ok: false, patches: [] }

  if (isNoChangeBody(src)) return { ok: true, patches: [] }

  const patches: ObservationNotesFieldPatch[] = []
  const lines = src.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (/^\[OBS_/i.test(line)) continue
    if (/^(path|label|new_text|voice|action|status)\s*[:：]/i.test(line)) continue
    const m = line.match(/^(.{1,12}?)\s*[｜|:：]\s*(.+)$/u)
    if (!m) continue
    // 优先匹配更长标签（能力注 > 能力），避免短标签抢先
    const patch = resolveLabelToPatch(m[1] ?? '', m[2] ?? '')
    if (patch) patches.push(patch)
  }
  if (patches.length) return { ok: true, patches }

  // 旧协议兼容
  if (/\[OBS_NOTES\]/i.test(src) && /无变化/.test(src)) return { ok: true, patches: [] }
  const parts = src.split(/\[OBS_NOTES_PATCH\]/i)
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i] ?? ''
    const pathM = block.match(/^\s*path\s*[:：]\s*(.+)$/im)
    const textM = block.match(/^\s*new_text\s*[:：]\s*([\s\S]*?)(?=\n\s*[a-z_]+\s*[:：]|\n\s*\[|$)/im)
    const path = normalizeObservationNotesPatchPath((pathM?.[1] ?? '').trim())
    const newText = (textM?.[1] ?? '').trim()
    if (path && newText) {
      patches.push({
        path,
        label: path,
        newText: newText.slice(0, 800),
        voice: 'marginalia',
      })
    }
  }
  if (patches.length) return { ok: true, patches }

  return { ok: false, patches: [] }
}

function cutTailAtMarkers(tail: string, markers: string[]): { section: string; leftover: string } {
  let cut = tail.length
  for (const m of markers) {
    const i = tail.indexOf(m)
    if (i >= 0 && i < cut) cut = i
  }
  return { section: tail.slice(0, cut), leftover: tail.slice(cut) }
}

function findObsMarker(src: string): { idx: number; marker: string } | null {
  let best: { idx: number; marker: string } | null = null
  for (const marker of OBS_NOTES_PATCH_MARKERS) {
    const idx = src.indexOf(marker)
    if (idx < 0) continue
    if (!best || idx < best.idx) best = { idx, marker }
  }
  return best
}

/**
 * 从模型输出中移除 OBS 答卷段。
 * judged=true：分隔行存在且正文可识别（含「无变化」或至少一行标签｜内容）。
 */
export function extractObservationNotesPatchBlock(raw: string): {
  rest: string
  patches: ObservationNotesFieldPatch[]
  judged: boolean
} {
  const src = String(raw ?? '')
  const hit = findObsMarker(src)
  if (!hit) return { rest: src, patches: [], judged: false }

  const head = src.slice(0, hit.idx)
  const tail = src.slice(hit.idx + hit.marker.length).trimStart()
  const { section, leftover } = cutTailAtMarkers(tail, [
    '---WB_AFTER_PATCH---',
    '---LIFE_LEDGER_PATCH---',
    '---MEMORY---',
    '===MEMORY===',
    '---OBS---',
    '---OBS_NOTES_PATCH---',
  ])
  const { ok, patches } = parseObsNotesPatchBody(section)
  const rest =
    head.trimEnd() + (leftover ? (head.endsWith('\n') ? '' : '\n') + leftover.trimStart() : '')
  return { rest, patches, judged: ok }
}

function formatRadarAxes(axes: ObservationRadarAxis[]): string {
  return axes.map((a) => `${a.label}${Math.round(a.value)}`).join(' ')
}

function blockJudgedSummary(block: ObservationNotesDoc['personalityRadar']): string {
  if (block.judged !== true && isRadarUnset(block)) return ''
  return formatRadarAxes(block.axes)
}

/** 解析「外向42 直觉78」或「42 78 55 48 74 86」；解析失败返回 null（避免写成全 50） */
function parseRadarAxesText(
  text: string,
  preferredLabels: readonly string[],
): ObservationRadarAxis[] | null {
  const byLabel = new Map<string, number>()
  const re = /([\u4e00-\u9fffA-Za-z]{1,8})\s*[=:：]?\s*(\d{1,3})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    let label = (m[1] ?? '').trim()
    const value = clampPct(Number(m[2]))
    if (!label) continue
    // 兼容「外向性 / 共情力」等后缀
    if (!preferredLabels.includes(label)) {
      const hit = preferredLabels.find((l) => label.startsWith(l) || label.includes(l))
      if (hit) label = hit
    }
    byLabel.set(label, value)
  }

  if (byLabel.size > 0) {
    return preferredLabels.map((label, i) => ({
      label,
      value: byLabel.has(label)
        ? (byLabel.get(label) as number)
        : byLabel.size === preferredLabels.length
          ? [...byLabel.values()][i] ?? 50
          : 50,
    }))
  }

  // 仅数字：按轴顺序填入
  const nums = text.match(/\d{1,3}/g)?.map((x) => clampPct(Number(x))) ?? []
  if (nums.length >= preferredLabels.length) {
    return preferredLabels.map((label, i) => ({ label, value: nums[i]! }))
  }
  return null
}

function isRadarUnset(block: ObservationNotesDoc['personalityRadar']): boolean {
  if (block.judged === true) return false
  if (block.note?.trim()) return false
  return block.axes.every((a) => a.value === 50)
}

function readPathText(doc: ObservationNotesDoc, path: string): string {
  const p = path.trim()
  if (p.startsWith('basic.')) {
    const key = p.slice('basic.'.length) as keyof ObservationNotesDoc['basic']
    const f = doc.basic[key]
    return f?.text?.trim() || ''
  }
  if (p === 'remarkNickname') return doc.remarkNickname
  if (p === 'preferredAddress') return doc.preferredAddress
  if (p === 'overallEvaluation') return doc.overallEvaluation
  if (p === 'affection') return String(doc.affection)
  if (p === 'relationshipLabel') return doc.relationshipLabel
  if (p === 'strengths') return doc.strengths.join('\n')
  if (p === 'weaknesses') return doc.weaknesses.join('\n')
  if (p === 'personalityRadar') {
    return blockJudgedSummary(doc.personalityRadar)
  }
  if (p === 'personalityRadar.note') return doc.personalityRadar.note?.trim() || ''
  if (p === 'abilityRadar') {
    return blockJudgedSummary(doc.abilityRadar)
  }
  if (p === 'abilityRadar.note') return doc.abilityRadar.note?.trim() || ''
  if (p.startsWith('intimate.')) {
    const key = p.slice('intimate.'.length)
    const row = doc.intimate.find((x) => x.key === key)
    return row ? row.field.text : ''
  }
  return ''
}

function intimateLabelForKey(key: string, fallback: string): string {
  if (key === 'pref') return '亲密偏好'
  if (key === 'xp') return '亲密 XP'
  if (key === 'sensitive') return '身体敏感处'
  if (key === 'ways') return '喜欢的亲密方式'
  return fallback || key
}

function applyOnePatch(
  doc: ObservationNotesDoc,
  patch: ObservationNotesFieldPatch,
  _opts?: { allowNearDuplicateTimeline?: boolean },
): ObservationNotesDoc {
  const path = patch.path.trim()
  if (path === 'heartMoments' || path === 'deepMemories') return doc
  const text = patch.newText.trim()
  const voice = patch.voice ?? 'marginalia'
  const next: ObservationNotesDoc = {
    ...doc,
    basic: { ...doc.basic },
    intimate: doc.intimate.map((r) => ({ ...r, field: { ...r.field } })),
    strengths: [...doc.strengths],
    weaknesses: [...doc.weaknesses],
    heartMoments: [],
    deepMemories: [],
    personalityRadar: {
      axes: doc.personalityRadar.axes.map((a) => ({ ...a })),
      note: doc.personalityRadar.note,
    },
    abilityRadar: {
      axes: doc.abilityRadar.axes.map((a) => ({ ...a })),
      note: doc.abilityRadar.note,
    },
  }

  if (path.startsWith('basic.')) {
    const key = path.slice('basic.'.length) as keyof ObservationNotesDoc['basic']
    if (key in next.basic) {
      next.basic[key] = { text: text || emptyField(voice).text, voice }
    }
    return next
  }
  if (path === 'remarkNickname') {
    next.remarkNickname = text
    return next
  }
  if (path === 'preferredAddress') {
    next.preferredAddress = text
    return next
  }
  if (path === 'overallEvaluation') {
    next.overallEvaluation = text
    return next
  }
  if (path === 'affection') {
    next.affection = clampPct(Number(text.replace(/[^\d.]/g, '')))
    next.affectionStageLabel = affectionStageFromValue(next.affection)
    return next
  }
  if (path === 'relationshipLabel') {
    next.relationshipLabel = text || '关系未明'
    return next
  }
  if (path === 'strengths') {
    next.strengths = text
      .split(/\r?\n|；|;|｜|\|/)
      .map((s) => s.replace(/^·\s*/, '').trim())
      .filter(Boolean)
    return next
  }
  if (path === 'weaknesses') {
    next.weaknesses = text
      .split(/\r?\n|；|;|｜|\|/)
      .map((s) => s.replace(/^·\s*/, '').trim())
      .filter(Boolean)
    return next
  }
  if (path === 'personalityRadar') {
    const axes = parseRadarAxesText(text, OBS_MBTI_AXIS_LABELS)
    if (!axes) return doc
    next.personalityRadar = {
      ...next.personalityRadar,
      axes,
      judged: true,
    }
    return next
  }
  if (path === 'personalityRadar.note') {
    next.personalityRadar = { ...next.personalityRadar, note: text, judged: true }
    return next
  }
  if (path === 'abilityRadar') {
    const axes = parseRadarAxesText(text, OBS_ABILITY_AXIS_LABELS)
    if (!axes) return doc
    next.abilityRadar = {
      ...next.abilityRadar,
      axes,
      judged: true,
    }
    return next
  }
  if (path === 'abilityRadar.note') {
    next.abilityRadar = { ...next.abilityRadar, note: text, judged: true }
    return next
  }
  if (path.startsWith('intimate.')) {
    const key = path.slice('intimate.'.length)
    const label = intimateLabelForKey(key, patch.label)
    const idx = next.intimate.findIndex((x) => x.key === key)
    if (idx >= 0) {
      next.intimate[idx] = {
        ...next.intimate[idx]!,
        label,
        field: { text, voice },
      }
    } else {
      next.intimate.push({ key, label, field: { text, voice } })
    }
    return next
  }
  return doc
}

/** 丢弃已废弃的心动/深刻补丁（改由向量记忆召回） */
function dropRetiredTimelinePatches(
  patches: ObservationNotesFieldPatch[],
): ObservationNotesFieldPatch[] {
  return patches.filter((p) => {
    const path = p.path.trim()
    return path !== 'heartMoments' && path !== 'deepMemories'
  })
}

export function applyObservationNotesFieldPatches(
  doc: ObservationNotesDoc,
  patches: ObservationNotesFieldPatch[],
  opts?: { allowNearDuplicateTimeline?: boolean },
): { doc: ObservationNotesDoc; diffs: ObservationFieldDiff[] } {
  void opts
  if (!patches.length) return { doc, diffs: [] }
  const list = dropRetiredTimelinePatches(patches)
  let cur = doc
  const diffs: ObservationFieldDiff[] = []
  for (const p of list) {
    const prev = readPathText(cur, p.path)
    const nextDoc = applyOnePatch(cur, p)
    const next = readPathText(nextDoc, p.path)
    if (prev === next) continue
    diffs.push({
      path: p.path.trim(),
      label: p.label.trim() || p.path.trim(),
      previousText: prev || '（尚未判定）',
      currentText: next,
    })
    cur = nextDoc
  }
  return { doc: cur, diffs }
}

const FULL_REWRITE_COMPARE_PATHS: Array<{ path: string; label: string }> = (() => {
  const seen = new Set<string>()
  const out: Array<{ path: string; label: string }> = []
  for (const row of LABEL_TO_PATH) {
    const path = row.path.trim()
    if (!path || seen.has(path)) continue
    seen.add(path)
    out.push({ path, label: row.labels[0]! })
  }
  return out
})()

/** 整份重填后：相对旧档逐项对比（未交卷字段回到空白也会记入 diff） */
function buildFullRewriteDiffsAgainstPrevious(
  before: ObservationNotesDoc,
  after: ObservationNotesDoc,
): ObservationFieldDiff[] {
  const diffs: ObservationFieldDiff[] = []
  for (const row of FULL_REWRITE_COMPARE_PATHS) {
    const previousText = readPathText(before, row.path)
    const currentText = readPathText(after, row.path)
    if (previousText === currentText) continue
    diffs.push({
      path: row.path,
      label: row.label,
      previousText: previousText || '（尚未判定）',
      currentText: currentText || '（尚未判定）',
    })
  }
  return diffs
}

/** 人格/能力雷达是否仍是空白默认态 */
export function isObservationRadarUnset(block: ObservationNotesDoc['personalityRadar']): boolean {
  return isRadarUnset(block)
}

/** 是否仍缺「对你的判定」打分或评语 */
export function needsObservationJudgementFill(doc: ObservationNotesDoc): boolean {
  return (
    isRadarUnset(doc.personalityRadar) ||
    isRadarUnset(doc.abilityRadar) ||
    !doc.personalityRadar.note?.trim() ||
    !doc.abilityRadar.note?.trim()
  )
}

export async function applyObservationNotesPatchesFromAi(params: {
  conversationCharacterId: string
  playerIdentityId: string
  charDisplayName: string
  patches: ObservationNotesFieldPatch[]
  /** 可选：用于拦截「线上备注=微信公开昵称」 */
  playerDisplayName?: string
  /** 从空白档全量覆盖（手动整份重填）；history/diff 仍对照旧档 */
  rewriteFromBlank?: boolean
  eventSource?: ObservationNotesUpdatedEventDetail['source']
}): Promise<{ applied: boolean; diffCount: number; revert?: ObservationNotesPlotRevert }> {
  const cid = params.conversationCharacterId.trim()
  const pid = params.playerIdentityId.trim()
  if (!cid || !pid || !params.patches.length) return { applied: false, diffCount: 0 }

  let identity: Awaited<ReturnType<typeof personaDb.getPlayerIdentity>> = null
  try {
    identity = await personaDb.getPlayerIdentity(pid)
  } catch {
    identity = null
  }
  const realName = identity?.name?.trim() || ''
  const wechatNickname = identity?.wechatNickname?.trim() || ''
  const displayName = params.playerDisplayName?.trim() || ''

  const sanitizedPatches = params.patches.map((p) => {
    if (p.path !== 'remarkNickname') return p
    const cleaned = sanitizeObservationRemarkNickname(p.newText, {
      realName,
      wechatNickname,
      displayName,
    })
    if (!cleaned.trim()) return null
    return { ...p, newText: cleaned }
  }).filter((p): p is ObservationNotesFieldPatch => p != null)

  if (!sanitizedPatches.length) return { applied: false, diffCount: 0 }

  const existing =
    (await loadObservationNotes({
      conversationCharacterId: cid,
      playerIdentityId: pid,
      charDisplayName: params.charDisplayName,
      seedIfEmpty: false,
    })) ?? null

  const blank = createBlankObservationNotesDoc({
    conversationCharacterId: cid,
    playerIdentityId: pid,
    charDisplayName: params.charDisplayName,
  })

  const docBefore = (existing
    ? (JSON.parse(JSON.stringify(existing)) as ObservationNotesDoc)
    : (JSON.parse(JSON.stringify(blank)) as ObservationNotesDoc))

  const baseDoc = params.rewriteFromBlank
    ? {
        ...blank,
        // 保留旧档元数据，避免整份重填后丢失标题等
        title: existing?.title ?? blank.title,
        lastSeenAt: existing?.lastSeenAt ?? null,
        changeHistory: existing?.changeHistory ?? [],
      }
    : (existing ?? blank)

  const batched = dropRetiredTimelinePatches(sanitizedPatches)
  const { doc: patchedDoc, diffs: appliedDiffs } = applyObservationNotesFieldPatches(baseDoc, batched)
  if (!appliedDiffs.length) return { applied: false, diffCount: 0 }

  /** 整份重填：内容从空白写入，但历史 diff 对照旧档（含未交卷字段被清空） */
  const diffs = params.rewriteFromBlank
    ? buildFullRewriteDiffsAgainstPrevious(docBefore, patchedDoc)
    : appliedDiffs
  if (!diffs.length) return { applied: false, diffCount: 0 }

  const appliedPaths = new Set(
    params.rewriteFromBlank
      ? batched.map((p) => p.path.trim())
      : diffs.map((d) => d.path),
  )
  const appliedPatches = batched.filter((p) => appliedPaths.has(p.path.trim()))

  const remarkClean = sanitizeObservationRemarkNickname(patchedDoc.remarkNickname, {
    realName,
    wechatNickname,
    displayName,
  })
  const nextDoc =
    remarkClean !== patchedDoc.remarkNickname
      ? { ...patchedDoc, remarkNickname: remarkClean }
      : patchedDoc

  const now = Date.now()
  const summaryParts: string[] = []
  if (params.rewriteFromBlank) summaryParts.push('整份重填侧写')
  if (diffs.length === 1) summaryParts.push(`更新了「${diffs[0]!.label}」`)
  else if (diffs.length > 1) summaryParts.push(`更新了 ${diffs.length} 处侧写`)
  const saved: ObservationNotesDoc = {
    ...nextDoc,
    heartMoments: [],
    deepMemories: [],
    updatedAt: now,
    pendingDiffs: diffs,
    changeHistory: [
      {
        id: `h_${now.toString(36)}`,
        at: now,
        summary: summaryParts.join('；') || '侧写有更新',
        diffs,
      },
      ...nextDoc.changeHistory,
    ].slice(0, 40),
  }
  await saveObservationNotes(saved)
  try {
    const changedLabels = diffs
      .map((d) => String(d.label ?? '').trim())
      .filter(Boolean)
      .slice(0, 12)
    window.dispatchEvent(
      new CustomEvent<ObservationNotesUpdatedEventDetail>(OBS_NOTES_UPDATED_EVENT, {
        detail: {
          conversationCharacterId: cid,
          playerIdentityId: pid,
          diffCount: diffs.length,
          changedLabels,
          source: params.eventSource ?? 'model_inline',
        },
      }),
    )
  } catch {
    /* ignore */
  }

  return {
    applied: true,
    diffCount: diffs.length,
    revert: appliedPatches.length
      ? { playerIdentityId: pid, docBefore, patches: appliedPatches }
      : undefined,
  }
}
