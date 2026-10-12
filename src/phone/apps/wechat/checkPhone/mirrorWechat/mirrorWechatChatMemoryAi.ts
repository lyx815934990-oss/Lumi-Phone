import type { ApiConfig } from '../../../api/types'
import { openAiCompatibleChat } from '../../newFriendsPersona/ai'
import type { MirrorWeChatContact } from './types'

function previewBubbleText(msg: MirrorWeChatContact['messages'][number]): string {
  if (msg.special?.kind === 'red_packet') {
    return `[红包] ${(msg.special.remark || '').trim()}`.trim()
  }
  if (msg.special?.kind === 'transfer') {
    const amt = Number(msg.special.amountYuan)
    const amtText = Number.isFinite(amt) && amt > 0 ? `¥${amt.toFixed(2)}` : ''
    return `[转账] ${amtText} ${(msg.special.note || '').trim()}`.trim()
  }
  if (msg.special?.kind === 'sticker') return '[表情包]'
  if (msg.special?.kind === 'image') return '[图片]'
  return String(msg.content || '').trim()
}

/**
 * 镜像私聊摘录标签：手机主人 = {{char}}；
 * 若会话对象是玩家本机行则对方 = {{user}}，否则用备注称呼（第三者，不是 user）。
 * 每行带时间戳，便于摘要保留时序，避免引用记忆时早晚颠倒。
 */
function transcriptSnippet(job: Pick<MirrorChatSummaryJob, 'isPlayerContact' | 'label'>, contact: MirrorWeChatContact, maxLines = 28): string {
  const otherTag = job.isPlayerContact ? '{{user}}' : `「${job.label}」`
  const msgs = [...(contact.messages || [])].sort((a, b) => a.timestamp - b.timestamp).slice(-maxLines)
  return msgs
    .map((m) => {
      const who = m.from === 'character' ? '{{char}}' : otherTag
      let t = previewBubbleText(m)
      if (t.length > 80) t = `${t.slice(0, 80)}…`
      const ts = Number(m.timestamp)
      const time = Number.isFinite(ts) && ts > 0 ? formatPlotStamp(ts) : ''
      return time ? `${time}｜${who}：${t}` : `${who}：${t}`
    })
    .filter((l) => !l.endsWith('：'))
    .join('\n')
}

/** 模型偶发第一人称「我」= 手机主人；入库前改为 {{char}}（与私聊自动总结把「我」当玩家不同）。 */
export function convertMirrorFirstPersonToCharPlaceholder(content: string): string {
  let s = String(content ?? '')
  if (!s.includes('我')) return s
  s = s.replace(/我的/g, '\u0000MEM_CHAR_DE\u0000')
  s = s.replace(/我们/g, '\u0000MEM_WMEN\u0000')
  s = s.replace(/我/g, '{{char}}')
  s = s.replace(/\u0000MEM_WMEN\u0000/g, '我们')
  s = s.replace(/\u0000MEM_CHAR_DE\u0000/g, '{{char}}')
  return s
}

function normalizeMirrorSummaryKeywords(raw: unknown): string[] {
  const source = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[、,，/\s]+/)
      : []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of source) {
    const kw = String(item ?? '')
      .replace(/\s+/g, '')
      .trim()
      .slice(0, 16)
    if (!kw || kw.length < 1) continue
    const key = kw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(kw)
    if (out.length >= 8) break
  }
  return out
}

export type MirrorChatSummaryJob = {
  contactId: string
  label: string
  nickname: string
  /** 会话对象是否为玩家本机通讯录行 */
  isPlayerContact: boolean
  /** 与群聊 timeLabel 同构：首末气泡时间段 */
  timeLabel: string
  previousSummary: string
  transcript: string
}

export type MirrorChatSummaryResult = {
  summary: string
  keywords: string[]
}

/** 规则兜底摘要（无 API / 解析失败时）——简体中文 + {{char}}/{{user}}，无规范说明字样 */
export function buildRuleBasedContactChatSummary(job: MirrorChatSummaryJob): MirrorChatSummaryResult {
  const other = job.isPlayerContact ? '{{user}}' : job.label
  const prev = job.previousSummary.trim()
  const summary = prev
    ? prev.slice(0, 400)
    : `{{char}} 与 ${other} 有私聊往来。`
  const seed = [job.label, job.nickname].filter((x) => x && x.length <= 16)
  return {
    summary: convertMirrorFirstPersonToCharPlaceholder(summary),
    keywords: normalizeMirrorSummaryKeywords(seed),
  }
}

/**
 * 同一次请求：为多个联系人生成「长期记忆风」摘要 + 模型提炼关键词。
 * 有旧摘要时整合进新摘要并整条覆盖（非追加原文）。
 */
export async function summarizeMirrorChatsWithAi(params: {
  apiConfig: ApiConfig | null | undefined
  jobs: MirrorChatSummaryJob[]
}): Promise<Map<string, MirrorChatSummaryResult>> {
  const out = new Map<string, MirrorChatSummaryResult>()
  const jobs = params.jobs.filter((j) => j.contactId.trim())
  if (!jobs.length) return out

  const cfg = params.apiConfig
  const ready = !!(cfg?.apiUrl?.trim() && cfg.apiKey?.trim() && cfg.modelId?.trim())
  if (!ready) {
    for (const j of jobs) out.set(j.contactId, buildRuleBasedContactChatSummary(j))
    return out
  }

  const blocks = jobs
    .map((j, i) => {
      const prev = j.previousSummary.trim() || '（无既往摘要）'
      const tr = j.transcript.trim() || '（无新气泡）'
      const peer = j.isPlayerContact ? '{{user}}（玩家）' : `第三者联系人「${j.label}」`
      return [
        `===CONTACT_${i + 1}===`,
        `id：${j.contactId}`,
        `备注：${j.label}`,
        `昵称：${j.nickname || '（无）'}`,
        `会话对象：${peer}`,
        `私聊时间：${j.timeLabel}`,
        `既往摘要：`,
        prev,
        `本轮/当前聊天摘录（每行含时间，旧→新）：`,
        tr,
        `===END_CONTACT_${i + 1}===`,
      ].join('\n')
    })
    .join('\n\n')

  const userTask = `
把镜像微信私聊压成长期记忆摘要（与私聊自动总结同标准）。
规则：
1) 每个联系人一块；有既往摘要则整合后整条覆盖。
2) **摘要正文必须用简体中文**（即使聊天原文是外语，也译成中文要点写入）。
3) 第三人称：手机主人 **{{char}}**；玩家 **{{user}}**；第三者用备注名。禁止「我」「用户」「玩家」。
4) 只写关系/约定/情绪/关键事实，80～200 字；须能看出大致时间先后（可点出私聊时间段或早晚）；禁止复述原文、禁止写规范说明/调用提示/本地存储之类元话语。
5) 关键词 3～6 个（顿号分隔，≤8 字），从内容提炼；可含备注名 1 个。
6) 只输出标记块：

<<SUM>>
id：联系人id
摘要：简体中文正文
关键词：词1、词2、词3
<<END_SUM>>

输入：
${blocks}
`.trim()

  try {
    const raw = await openAiCompatibleChat(
      cfg!,
      [
        {
          role: 'system',
          content:
            '长期记忆摘要：简体中文、第三人称 {{char}}/{{user}}、提炼关键词、整合覆盖旧摘要；只输出标记块，禁止第一人称与元说明。',
        },
        { role: 'user', content: userTask },
      ],
      { temperature: 0.35 },
    )
    const re = /<<SUM>>\s*([\s\S]*?)\s*<<END_SUM>>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(raw))) {
      const body = m[1] || ''
      let id = ''
      let summary = ''
      let keywordsLine = ''
      for (const line of body.split(/\r?\n/)) {
        const t = line.trim()
        if (!t) continue
        const idHit = t.match(/^id\s*[:：]\s*(.+)$/i)
        if (idHit) {
          id = idHit[1]!.trim()
          continue
        }
        const kwHit = t.match(/^关键词\s*[:：]\s*(.*)$/i)
        if (kwHit) {
          keywordsLine = (kwHit[1] || '').trim()
          continue
        }
        const sumHit = t.match(/^摘要\s*[:：]\s*(.*)$/i)
        if (sumHit) {
          summary = (sumHit[1] || '').trim()
          continue
        }
        if (summary) summary = `${summary}\n${t}`
      }
      if (id && summary) {
        out.set(id, {
          summary: convertMirrorFirstPersonToCharPlaceholder(summary.trim()),
          keywords: normalizeMirrorSummaryKeywords(keywordsLine),
        })
      }
    }
  } catch (e) {
    console.warn('通讯录私聊 AI 摘要失败，改用规则摘要:', e)
  }

  for (const j of jobs) {
    const hit = out.get(j.contactId)
    if (!hit?.summary.trim()) {
      out.set(j.contactId, buildRuleBasedContactChatSummary(j))
    } else if (!hit.keywords.length) {
      const fallback = buildRuleBasedContactChatSummary(j)
      out.set(j.contactId, { summary: hit.summary, keywords: fallback.keywords })
    }
  }
  return out
}

/** 通讯录备忘：一次请求由模型提炼检索关键词（与长期记忆关键词同思路） */
export async function summarizeMirrorAddressBookKeywordsWithAi(params: {
  apiConfig: ApiConfig | null | undefined
  rosterText: string
  seedKeywords: string[]
}): Promise<string[]> {
  const seed = normalizeMirrorSummaryKeywords(params.seedKeywords)
  const cfg = params.apiConfig
  const ready = !!(cfg?.apiUrl?.trim() && cfg.apiKey?.trim() && cfg.modelId?.trim())
  const roster = params.rosterText.trim()
  if (!ready || !roster) return seed

  const userTask = `
根据「{{char}} 手机微信通讯录」备忘材料，提炼便于日后召回的检索关键词。
要求：
1) 只输出一行：词1、词2、词3…（3～8 个，顿号分隔，每条 ≤8 字）
2) 须覆盖关系类型、关键人名/备注、互动主题；不要只堆「通讯录」「查手机」这类空壳词（这两类可各至多 1 个）。
3) 禁止 JSON、禁止解释、禁止第一人称「我」。

材料：
${roster.slice(0, 3500)}
`.trim()

  try {
    const raw = await openAiCompatibleChat(
      cfg!,
      [
        {
          role: 'system',
          content: '你从通讯录备忘中提炼长期记忆检索关键词，只输出顿号分隔的一行词表。',
        },
        { role: 'user', content: userTask },
      ],
      { temperature: 0.3 },
    )
    const line = String(raw || '')
      .replace(/```[\s\S]*?```/g, '')
      .split(/\r?\n/)
      .map((x) => x.trim())
      .find((x) => x && !x.startsWith('（') && !/^关键词/.test(x))
      || String(raw || '').trim()
    const cleaned = line.replace(/^关键词\s*[:：]\s*/i, '')
    const kws = normalizeMirrorSummaryKeywords(cleaned)
    if (kws.length >= 2) return kws.slice(0, 16)
  } catch (e) {
    console.warn('通讯录关键词 AI 提炼失败，改用本地种子:', e)
  }
  return seed
}

export function buildMirrorChatSummaryJobs(
  contacts: readonly MirrorWeChatContact[],
  previousByContactId: Map<string, string>,
  playerContactId: string,
): MirrorChatSummaryJob[] {
  const pid = playerContactId.trim()
  return contacts.map((c) => {
    const label = (c.remarkName || c.nickname || '联系人').trim() || '联系人'
    const nickname = (c.nickname || '').trim()
    const isPlayerContact = c.id === pid
    const timeLabel = resolveMirrorChatTimeSpan(c).label
    const jobBase = {
      contactId: c.id,
      label,
      nickname,
      isPlayerContact,
      timeLabel,
      previousSummary: previousByContactId.get(c.id) || '',
      transcript: '',
    }
    return {
      ...jobBase,
      transcript: transcriptSnippet(jobBase, c),
    }
  })
}

function formatPlotStamp(ms: number): string {
  const d = new Date(ms)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 私聊/群聊通用：首末气泡时间段（记忆入库与摘要用） */
export function resolveMirrorChatTimeSpan(contact: MirrorWeChatContact): {
  startMs: number
  endMs: number
  label: string
} {
  const times = (contact.messages || [])
    .map((m) => Number(m.timestamp))
    .filter((t) => Number.isFinite(t) && t > 0)
    .sort((a, b) => a - b)
  if (!times.length) {
    const now = Date.now()
    return { startMs: now, endMs: now, label: formatPlotStamp(now) }
  }
  const startMs = times[0]!
  const endMs = times[times.length - 1]!
  const label =
    startMs === endMs
      ? formatPlotStamp(startMs)
      : `${formatPlotStamp(startMs)} ～ ${formatPlotStamp(endMs)}`
  return { startMs, endMs, label }
}

/** 群成员展示：联系人用备注；非联系人只用关系描述 */
export function formatMirrorGroupMemberMemoryLabels(
  group: MirrorWeChatContact,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of group.members || []) {
    let label = ''
    if (m.isContact) {
      label = (m.remarkName || m.nickname || '').trim()
    } else {
      label = String(m.relationshipNote || '')
        .replace(/\s+/g, '')
        .trim()
        .slice(0, 20)
      if (!label) label = `群友·${(m.nickname || '网友').trim()}`
    }
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length >= 24) break
  }
  return out
}

/** @deprecated 使用 {@link resolveMirrorChatTimeSpan}；保留别名以免外部引用断裂 */
export function resolveMirrorGroupChatTimeSpan(group: MirrorWeChatContact): {
  startMs: number
  endMs: number
  label: string
} {
  return resolveMirrorChatTimeSpan(group)
}

function groupTranscriptSnippet(group: MirrorWeChatContact, maxLines = 36): string {
  const msgs = [...(group.messages || [])].sort((a, b) => a.timestamp - b.timestamp).slice(-maxLines)
  return msgs
    .map((m) => {
      const who =
        m.from === 'character'
          ? '{{char}}'
          : `「${(m.senderNickname || m.senderKey || '群友').trim()}」`
      let t = previewBubbleText(m)
      if (t.length > 80) t = `${t.slice(0, 80)}…`
      const ts = Number(m.timestamp)
      const time = Number.isFinite(ts) && ts > 0 ? formatPlotStamp(ts) : ''
      return time ? `${time}｜${who}：${t}` : `${who}：${t}`
    })
    .filter((l) => !l.endsWith('：'))
    .join('\n')
}

export type MirrorGroupChatSummaryJob = {
  groupId: string
  groupName: string
  memberLabels: string[]
  timeLabel: string
  previousSummary: string
  transcript: string
}

export function buildRuleBasedGroupChatSummary(job: MirrorGroupChatSummaryJob): MirrorChatSummaryResult {
  const prev = job.previousSummary.trim()
  const summary = prev
    ? prev.slice(0, 400)
    : `{{char}} 在群「${job.groupName}」中有群聊往来。`
  const seed = [job.groupName, ...job.memberLabels.slice(0, 4)].filter((x) => x && x.length <= 16)
  return {
    summary: convertMirrorFirstPersonToCharPlaceholder(summary),
    keywords: normalizeMirrorSummaryKeywords(seed),
  }
}

export function buildMirrorGroupChatSummaryJobs(
  groups: readonly MirrorWeChatContact[],
  previousByGroupId: Map<string, string>,
): MirrorGroupChatSummaryJob[] {
  return groups.map((g) => {
    const groupName = (g.groupName || g.remarkName || g.nickname || '群聊').trim() || '群聊'
    const time = resolveMirrorGroupChatTimeSpan(g)
    return {
      groupId: g.id,
      groupName,
      memberLabels: formatMirrorGroupMemberMemoryLabels(g),
      timeLabel: time.label,
      previousSummary: previousByGroupId.get(g.id) || '',
      transcript: groupTranscriptSnippet(g),
    }
  })
}

/** 一次请求为多个群聊生成摘要 + 关键词（按群，不按成员拆条） */
export async function summarizeMirrorGroupChatsWithAi(params: {
  apiConfig: ApiConfig | null | undefined
  jobs: MirrorGroupChatSummaryJob[]
}): Promise<Map<string, MirrorChatSummaryResult>> {
  const out = new Map<string, MirrorChatSummaryResult>()
  const jobs = params.jobs.filter((j) => j.groupId.trim())
  if (!jobs.length) return out

  const cfg = params.apiConfig
  const ready = !!(cfg?.apiUrl?.trim() && cfg.apiKey?.trim() && cfg.modelId?.trim())
  if (!ready) {
    for (const j of jobs) out.set(j.groupId, buildRuleBasedGroupChatSummary(j))
    return out
  }

  const blocks = jobs
    .map((j, i) => {
      const prev = j.previousSummary.trim() || '（无既往摘要）'
      const tr = j.transcript.trim() || '（无新气泡）'
      const members = j.memberLabels.length ? j.memberLabels.join('、') : '（成员未标注）'
      return [
        `===GROUP_${i + 1}===`,
        `id：${j.groupId}`,
        `群名：${j.groupName}`,
        `群聊时间：${j.timeLabel}`,
        `成员：${members}`,
        `既往摘要：`,
        prev,
        `本轮/当前群聊摘录：`,
        tr,
        `===END_GROUP_${i + 1}===`,
      ].join('\n')
    })
    .join('\n\n')

  const userTask = `
把镜像微信「群聊」压成长期记忆摘要（按群一条，禁止拆成成员私聊）。
规则：
1) 每个群一块；有既往摘要则整合后整条覆盖。
2) **摘要正文必须用简体中文**；第三人称：手机主人 **{{char}}**；其它人用备注/关系称呼。禁止「我」「用户」「玩家」。
3) 只写群内议题/约定/情绪/关键事实，80～200 字；须能看出大致时间先后（可点出群聊时间段）。
4) 关键词 3～6 个（顿号分隔，≤8 字）；须含群名相关词 1 个。
5) 只输出标记块：

<<GSUM>>
id：群id
摘要：简体中文正文
关键词：词1、词2、词3
<<END_GSUM>>

输入：
${blocks}
`.trim()

  try {
    const raw = await openAiCompatibleChat(
      cfg!,
      [
        {
          role: 'system',
          content:
            '群聊长期记忆摘要：按群一条、简体中文、第三人称 {{char}}、含时间线索；只输出标记块。',
        },
        { role: 'user', content: userTask },
      ],
      { temperature: 0.35 },
    )
    const re = /<<GSUM>>\s*([\s\S]*?)\s*<<END_GSUM>>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(raw))) {
      const body = m[1] || ''
      let id = ''
      let summary = ''
      let keywordsLine = ''
      for (const line of body.split(/\r?\n/)) {
        const t = line.trim()
        if (!t) continue
        const idHit = t.match(/^id\s*[:：]\s*(.+)$/i)
        if (idHit) {
          id = idHit[1]!.trim()
          continue
        }
        const kwHit = t.match(/^关键词\s*[:：]\s*(.*)$/i)
        if (kwHit) {
          keywordsLine = (kwHit[1] || '').trim()
          continue
        }
        const sumHit = t.match(/^摘要\s*[:：]\s*(.*)$/i)
        if (sumHit) {
          summary = (sumHit[1] || '').trim()
          continue
        }
        if (summary) summary = `${summary}\n${t}`
      }
      if (id && summary) {
        out.set(id, {
          summary: convertMirrorFirstPersonToCharPlaceholder(summary.trim()),
          keywords: normalizeMirrorSummaryKeywords(keywordsLine),
        })
      }
    }
  } catch (e) {
    console.warn('镜像群聊 AI 摘要失败，改用规则摘要:', e)
  }

  for (const j of jobs) {
    const hit = out.get(j.groupId)
    if (!hit?.summary.trim()) {
      out.set(j.groupId, buildRuleBasedGroupChatSummary(j))
    } else if (!hit.keywords.length) {
      const fallback = buildRuleBasedGroupChatSummary(j)
      out.set(j.groupId, { summary: hit.summary, keywords: fallback.keywords })
    }
  }
  return out
}
