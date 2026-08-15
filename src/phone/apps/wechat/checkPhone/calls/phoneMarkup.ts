/**
 * 查手机 · 通话记录 AI 输出
 * 主格式：纯文字一行一条（C/K/T），短、稳、易截断恢复。
 * 仍兼容旧版 <<PH_*>> 字段块。
 */

import { emptyPhoneDataset } from './types'
import type {
  CallDirection,
  CallGroup,
  CallRecord,
  CallTranscriptLine,
  PhoneContact,
  PhoneDataset,
} from './types'

export const MAX_TRANSCRIPT_LINES_PER_CALL = 20

/**
 * 虚构手机号：固定 13 位数字，避免与真实大陆 11 位号撞车。
 * 不足则左侧补 20…；恰 11 位则前缀 20；过长截断。
 */
export function normalizeFictionalMobileNumber(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return '2000000000000'
  if (digits.length === 13) return digits
  if (digits.length === 11) return `20${digits}`
  if (digits.length > 13) return digits.slice(0, 13)
  return `20${digits}`.padEnd(13, '0').slice(0, 13)
}

/** 紧凑行格式说明（联系人 + 通话） */
export const PHONE_MARKUP_RULE = `
【输出格式·硬性】纯文字，禁止 JSON / 代码围栏 / 解释。
每行一条，字段用英文竖线 | 分隔，不要加空格修饰。

联系人行（5~8 条）：
C|id|备注|来电名|号码|拼音|关系|紧急|收藏|用户|拉黑|字
- 紧急/收藏/用户/拉黑 只写 0 或 1
- 备注=角色视角短叫法（可 emoji，禁止括号注释）；来电名=真名
- 必须有一条 用户=1
- **号码必须恰好 13 位数字**（虚构号，禁止 11 位真实手机号形态；示例以 20 开头）

通话头（条数服从任务）：
K|id|联系人id|备注|号码|方向|媒介|秒|HH:mm|分组|日签|完整日|已存
- 方向：in=呼入 out=呼出 miss=未接
- 媒介：v=语音 vd=视频
- 分组：t=今天 y=昨天 e=更早
- 已存：0 或 1；完整日用 2026-8-12 这种短日期
- 号码同通讯录，**13 位数字**
- 接通（in/out）下面立刻跟 ≥2 行对白；写不完就改 miss
- 未接不要写 T 行

对白行（紧跟对应 K）：
T|R|台词|秒
T|O|台词|秒
- R=手机主人 O=对方；台词尽量短；秒=相对开场的秒数
- 单通 2~6 行即可，宁短勿漏；从新到旧输出多组 K(+T)
`.trim()

export const PHONE_MARKUP_FORMAT = `
${PHONE_MARKUP_RULE}

C|c1|死鬼|王磊|2013822109876|S|损友|0|1|0|0|死
C|c_user|笨蛋|示例玩家|2013900001111|B|就他|0|1|1|0|笨
C|c3|老妈|沈女士|2013688201122|L|家人|1|0|0|0|妈

K|call1|c1|死鬼|2013822109876|in|v|60|22:10|t|今天|2026-8-12|1
T|R|喂？|3
T|O|又喝酒？|8
T|R|没有|14
T|O|早点睡|50
K|call2|c_user|笨蛋|2013900001111|out|v|90|21:40|t|今天|2026-8-12|1
T|R|在干嘛|5
T|O|刚到家|12
T|R|想听你说话|20
T|O|早点休息|80
K|call3|c3|老妈|2013688201122|miss|v|0|09:20|t|今天|2026-8-12|0
`.trim()

/** 仅联系人示例（两段生成第一段用） */
export const PHONE_CONTACT_MARKUP_FORMAT = `
【只输出联系人】纯文字，禁止 JSON / 代码围栏 / 解释。输出 5~8 行：
C|id|备注|来电名|号码|拼音|关系|紧急|收藏|用户|拉黑|字
- 0/1 开关；必须有一条用户=1；备注短叫法禁止括号注释；来电名放真名
- **号码必须恰好 13 位数字**（虚构，禁止 11 位；推荐 20 开头）

C|c1|死鬼|王磊|2013822109876|S|损友|0|1|0|0|死
C|c_user|笨蛋|示例玩家|2013900001111|B|就他|0|1|1|0|笨
C|c3|老妈|沈女士|2013688201122|L|家人|1|0|0|0|妈
`.trim()

/** 仅通话示例（两段生成第二段用） */
export const PHONE_CALL_MARKUP_FORMAT = `
【只输出通话】纯文字。引用通讯录 id/备注。条数服从任务。
K|id|联系人id|备注|号码|方向|媒介|秒|HH:mm|分组|日签|完整日|已存
T|R|台词|秒
T|O|台词|秒
- 方向 in/out/miss；媒介 v/vd；分组 t/y/e；已存 0/1；完整日 2026-8-12
- 号码须与通讯录一致，**13 位数字**
- in/out 必须紧跟 ≥2 行 T；写不完改 miss；单通 2~6 行；2~3 条已存=1；从新到旧

K|call1|c1|死鬼|2013822109876|in|v|60|22:10|t|今天|2026-8-12|1
T|R|喂？|3
T|O|又喝酒？|8
T|R|没有|14
T|O|早点睡|50
K|call2|c3|老妈|2013688201122|miss|v|0|09:20|t|今天|2026-8-12|0
`.trim()

function stripFence(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/^```(?:[\w-]*)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

function splitPipeFields(line: string): string[] {
  return String(line || '')
    .trim()
    .replace(/[｜]/g, '|')
    .split('|')
    .map((x) => x.trim())
}

function asFlag01(raw: string): boolean {
  const s = String(raw || '').trim().toLowerCase()
  return s === '1' || s === 'y' || s === 'yes' || s === 'true' || s === '是'
}

function asCompactDirection(v: string): CallDirection {
  const s = v.trim().toLowerCase()
  if (/^(miss|m|未|未接)$/i.test(s) || s.includes('未接') || s.includes('miss')) return 'missed'
  if (/^(out|o|出|呼出|去电)$/i.test(s) || s.includes('呼出') || s.includes('out')) return 'outgoing'
  return 'incoming'
}

function asCompactMedia(v: string): 'voice' | 'video' {
  const s = v.trim().toLowerCase()
  if (/^(vd|video|视|视频)$/i.test(s) || s.includes('视频')) return 'video'
  return 'voice'
}

function asCompactGroup(v: string): CallGroup {
  const s = v.trim().toLowerCase()
  if (/^(y|yesterday|昨)$/i.test(s) || s.includes('昨')) return 'yesterday'
  if (/^(e|earlier|更早|早前)$/i.test(s) || s.includes('更早')) return 'earlier'
  return 'today'
}

function formatDateFullFromCompact(raw: string): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (/年/.test(s)) return s
  const m = s.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (m) return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`
  return s
}

function asCompactSpeaker(kind: string): 'self' | 'other' {
  const s = String(kind || '').trim()
  if (/^(r|me|self|我|角色|本人|主人)$/i.test(s)) return 'self'
  return 'other'
}

/** 解析紧凑 C/K/T 行 */
function parseCompactPhoneLines(raw: string): { contacts: PhoneContact[]; calls: CallRecord[] } {
  const contacts: PhoneContact[] = []
  const calls: CallRecord[] = []
  let cur: CallRecord | null = null

  const flush = () => {
    if (!cur) return
    if (cur.direction !== 'missed') {
      const lines = cur.transcript || []
      if (!cur.durationSec || cur.durationSec <= 0) {
        const lastAt = lines.reduce((m, t) => Math.max(m, t.atSec ?? 0), 0)
        cur.durationSec = Math.max(45, lastAt || Math.round(((lines.length || 4) / 8) * 60))
      }
    } else {
      cur.durationSec = 0
      cur.transcript = undefined
    }
    if (cur.transcript && cur.transcript.length > MAX_TRANSCRIPT_LINES_PER_CALL) {
      cur.transcript = cur.transcript.slice(0, MAX_TRANSCRIPT_LINES_PER_CALL)
    }
    if (!cur.transcript?.length) cur.transcript = undefined
    calls.push(cur)
    cur = null
  }

  for (const line of stripFence(raw).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue
    // 兼容无前缀误写：以 call/c 开头且字段够多
    let fields = splitPipeFields(trimmed)
    let tag = (fields[0] || '').toUpperCase()
    if (!/^[CKT]$/.test(tag) && fields.length >= 10) {
      // 可能漏写 K/C：用启发式
      const dirGuess = (fields[4] || fields[5] || '').trim().toLowerCase()
      const looksCallDir = /^(in|out|miss|m|入|出|未|呼入|呼出|未接)$/i.test(dirGuess)
      if (/^call/i.test(fields[0] || '') || looksCallDir) {
        fields = ['K', ...fields]
        tag = 'K'
      } else if (/^c[_-]?\w+/i.test(fields[0] || '')) {
        fields = ['C', ...fields]
        tag = 'C'
      }
    }
    if (tag === 'C' && fields.length >= 5) {
      flush()
      const id = fields[1] || `c_${contacts.length + 1}`
      const remarkName = sanitizeRemarkName(fields[2] || '')
      const displayName = (fields[3] || '').trim()
      const phoneRaw = (fields[4] || '').trim()
      if (!remarkName || !phoneRaw) continue
      const phoneNumber = normalizeFictionalMobileNumber(phoneRaw)
      const glyph = (fields[11] || remarkName).replace(/\s+/g, '').slice(0, 1) || '通'
      contacts.push({
        id,
        remarkName,
        displayName: displayName && displayName !== remarkName ? displayName : undefined,
        phoneNumber,
        relationTag: (fields[6] || '').trim() || undefined,
        isEmergency: asFlag01(fields[7] || ''),
        isFavorite: asFlag01(fields[8] || ''),
        isUser: asFlag01(fields[9] || ''),
        isBlocked: asFlag01(fields[10] || ''),
        avatarTone: toneFromSeed(id + remarkName),
        avatarGlyph: glyph,
        pinyinInitial: normalizeInitial(fields[5] || '', remarkName),
      })
      continue
    }
    if (tag === 'K' && fields.length >= 8) {
      flush()
      const id = fields[1] || `call_${calls.length + 1}`
      const contactId = (fields[2] || '').trim() || undefined
      const remarkName = sanitizeRemarkName(fields[3] || '') || (fields[4] || '').trim()
      const phoneRaw = (fields[4] || '').trim()
      const phoneNumber = phoneRaw ? normalizeFictionalMobileNumber(phoneRaw) : '未知号码'
      const direction = asCompactDirection(fields[5] || '')
      const media = asCompactMedia(fields[6] || '')
      const durationSec = Math.max(0, Math.floor(Number(fields[7]) || 0))
      const timeLabel = (fields[8] || '').trim() || '刚刚'
      const group = asCompactGroup(fields[9] || '')
      const dateLabel = (fields[10] || '').trim() || undefined
      const dateFull = formatDateFullFromCompact(fields[11] || '') || undefined
      const saved = asFlag01(fields[12] || '')
      if (!remarkName && !phoneNumber) continue
      cur = {
        id,
        contactId,
        remarkName: remarkName || phoneNumber,
        phoneNumber,
        direction,
        media,
        durationSec: direction === 'missed' ? 0 : durationSec,
        timeLabel,
        group,
        dateLabel,
        dateFull,
        transcript: [],
        saved,
      }
      continue
    }
    if (tag === 'T' && cur && fields.length >= 3) {
      const speaker = asCompactSpeaker(fields[1] || '')
      const atRaw = fields[fields.length - 1] || ''
      const atNum = Number(atRaw)
      const hasAt = fields.length >= 4 && Number.isFinite(atNum) && /^\d+$/.test(atRaw)
      const text = (hasAt ? fields.slice(2, -1) : fields.slice(2)).join('|').trim()
      if (!text) continue
      const peer = cur.remarkName || '对方'
      cur.transcript = cur.transcript || []
      cur.transcript.push({
        id: `t_${cur.transcript.length + 1}`,
        speaker,
        speakerLabel: speaker === 'self' ? '我' : peer,
        text,
        atSec: hasAt ? Math.max(0, Math.floor(atNum)) : undefined,
      })
    }
  }
  flush()
  return { contacts, calls }
}

function splitFieldLine(line: string): { key: string; value: string } | null {
  const raw = String(line ?? '').trim()
  if (!raw) return null
  const m = raw.match(/^([^:：]{1,32})\s*[:：]\s*(.*)$/)
  if (!m) return null
  return { key: m[1]!.trim().toLowerCase(), value: (m[2] ?? '').trim() }
}

function extractBlocks(raw: string, openTag: string, closeTag: string): string[] {
  const text = stripFence(raw)
  const open = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const close = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${open}\\s*([\\s\\S]*?)\\s*${close}`, 'gi')
  const out: string[] = []
  let m: RegExpExecArray | null
  let lastEnd = 0
  while ((m = re.exec(text))) {
    const body = (m[1] ?? '').trim()
    if (body) out.push(body)
    lastEnd = m.index + m[0].length
  }
  // 截断兜底：末尾有未闭合开标签时，仍尝试收下正文
  const openRe = new RegExp(open, 'gi')
  let openM: RegExpExecArray | null
  let lastOpenIdx = -1
  while ((openM = openRe.exec(text))) {
    if (openM.index >= lastEnd) lastOpenIdx = openM.index
  }
  if (lastOpenIdx >= lastEnd) {
    const tail = text.slice(lastOpenIdx + openTag.length).trim()
    const cut = tail.search(/<<END_|\n——\s*|<<PH_/i)
    const body = (cut >= 0 ? tail.slice(0, cut) : tail).trim()
    if (body && /备注|号码|方向|时长/.test(body)) out.push(body)
  }
  return out
}

/** 去掉备注里的括号注释：小祖宗(顾同学) → 小祖宗；保留 emoji */
export function sanitizeRemarkName(raw: string): string {
  let s = String(raw || '').trim()
  if (!s) return s
  // 反复剥括号注释（含嵌套一次）
  for (let i = 0; i < 4; i += 1) {
    const next = s
      .replace(/[（(][^）)]*[）)]/g, '')
      .replace(/【[^】]*】/g, '')
      .trim()
    if (next === s) break
    s = next
  }
  // 「笨蛋·盛小亦」「笨蛋/盛小亦」这类把真名缀在后面的写法，只留前半叫法
  s = s.replace(/[.·･/｜|]\s*[\u4e00-\u9fffA-Za-z0-9_]{1,16}\s*$/u, '').trim()
  s = s.replace(/\s{2,}/g, ' ').trim()
  return s || String(raw || '').trim()
}

function fieldMap(block: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of block.split(/\r?\n/)) {
    const f = splitFieldLine(line)
    if (!f) continue
    if (f.key === '稿') continue
    if (!map.has(f.key)) map.set(f.key, f.value)
  }
  return map
}

function getField(map: Map<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = map.get(k.toLowerCase())
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

function multiLines(block: string, keys: string[]): string[] {
  const set = new Set(keys.map((k) => k.toLowerCase()))
  const out: string[] = []
  let inTranscript = false
  for (const line of block.split(/\r?\n/)) {
    const trimmed = String(line ?? '').trim()
    if (!trimmed) continue
    const f = splitFieldLine(trimmed)
    if (f && set.has(f.key)) {
      inTranscript = true
      if (f.value.trim()) out.push(f.value.trim())
      continue
    }
    // 稿块续行：模型常写「稿：」后单独起行「角色|…|…|秒」，或漏写「稿：」前缀
    if (inTranscript || /[|｜/／]/.test(trimmed)) {
      if (f && !set.has(f.key) && !/[|｜/／]/.test(trimmed)) {
        // 已进入下一普通字段
        inTranscript = false
        continue
      }
      const looksPipe =
        /^(角色|对方|本人|self|other|me|peer)/i.test(trimmed) ||
        (trimmed.split(/[|｜/／]/).length >= 3 && !f)
      if (looksPipe || (inTranscript && /[|｜/／]/.test(trimmed) && !f)) {
        out.push(trimmed.replace(/^稿\s*[:：]\s*/i, '').trim())
        inTranscript = true
        continue
      }
      if (f) inTranscript = false
    }
  }
  return out
}

function normalizeTranscriptDelims(line: string): string {
  return String(line || '')
    .replace(/[｜]/g, '|')
    .replace(/[／]/g, '/')
}

type TranscriptParseCtx = {
  ownerName?: string
  ownerNames?: string[]
  peerName?: string
  peerNames?: string[]
}

function parseTranscript(block: string, ctx?: TranscriptParseCtx): CallTranscriptLine[] {
  const ownerLabel = (ctx?.ownerName || '').trim() || '我'
  const peerLabel = (ctx?.peerName || '').trim() || '对方'
  const speakerOpts = {
    ownerNames: [...(ctx?.ownerNames || []), ownerLabel].filter(Boolean),
    peerNames: [...(ctx?.peerNames || []), peerLabel].filter(Boolean),
  }
  const out: CallTranscriptLine[] = []
  for (const rawLine of multiLines(block, ['稿', '台词', 'transcript', '对白'])) {
    const line = normalizeTranscriptDelims(rawLine)
    // 标准：说话方|显示名|台词|秒数（也容忍 / 分隔）
    const delim = line.includes('|') ? '|' : line.includes('/') ? '/' : ''
    if (delim) {
      const parts = line.split(delim).map((x) => x.trim())
      if (parts.length < 3) continue
      const speaker = asSpeaker(parts[0] || '', speakerOpts)
      const atRaw = parts.length >= 4 ? parts[parts.length - 1] : ''
      const atNum = Number(atRaw)
      const hasAt = parts.length >= 4 && Number.isFinite(atNum) && /^\d+$/.test(atRaw)
      const text = hasAt ? parts.slice(2, -1).join(delim) : parts.slice(2).join(delim)
      if (!text.trim()) continue
      out.push({
        id: `t_${out.length + 1}`,
        speaker,
        speakerLabel: speaker === 'self' ? ownerLabel : peerLabel,
        text: text.trim(),
        atSec: hasAt ? Math.max(0, Math.floor(atNum)) : undefined,
      })
      continue
    }
    const m = line.match(/^([^:：]{1,24})\s*[:：]\s*(.+)$/)
    if (!m) continue
    const who = (m[1] || '').trim()
    const text = (m[2] || '').trim()
    if (!text) continue
    const speaker = asSpeaker(who, speakerOpts)
    out.push({
      id: `t_${out.length + 1}`,
      speaker,
      speakerLabel: speaker === 'self' ? ownerLabel : peerLabel,
      text,
    })
  }
  return out
}

function asYes(raw: string): boolean {
  return /^(是|yes|true|1|y)$/i.test(String(raw || '').trim())
}

function asGroup(v: string): CallGroup {
  const s = v.trim().toLowerCase()
  if (s === 'yesterday' || s.includes('昨')) return 'yesterday'
  if (s === 'earlier' || s.includes('更早') || s.includes('早前')) return 'earlier'
  return 'today'
}

function asDirection(v: string): CallDirection {
  const s = v.trim().toLowerCase()
  if (s.includes('未接') || s === 'missed' || s.includes('miss')) return 'missed'
  if (s.includes('呼出') || s === 'outgoing' || s.includes('去电') || s.includes('拨出')) return 'outgoing'
  return 'incoming'
}

function asMedia(v: string): 'voice' | 'video' {
  const s = v.trim().toLowerCase()
  if (s.includes('视频') || s === 'video' || s.includes('facetime')) return 'video'
  return 'voice'
}

function normSpeakerToken(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function asSpeaker(
  kind: string,
  opts?: { ownerNames?: string[]; peerNames?: string[] },
): 'self' | 'other' {
  const s = String(kind || '').trim()
  if (!s) return 'other'
  if (/^(角色|本人|self|me|owner|手机主人|char)$/i.test(s)) return 'self'
  if (/^(对方|other|peer|联系人|对面)$/i.test(s)) return 'other'
  const token = normSpeakerToken(s)
  const owners = (opts?.ownerNames || []).map(normSpeakerToken).filter(Boolean)
  if (owners.some((o) => token === o || token.includes(o) || o.includes(token))) return 'self'
  const peers = (opts?.peerNames || []).map(normSpeakerToken).filter(Boolean)
  if (peers.some((p) => token === p || token.includes(p) || p.includes(token))) return 'other'
  return 'other'
}

function toneFromSeed(seed: string): string {
  return seed ? '#d8d8dc' : '#d8d8dc'
}

function normalizeInitial(raw: string, fallbackName: string): string {
  const s = String(raw || '')
    .trim()
    .toUpperCase()
  if (/^[A-Z]$/.test(s)) return s
  const first = fallbackName.trim().charAt(0).toUpperCase()
  if (/^[A-Z]$/.test(first)) return first
  return '#'
}

/** 生成后按手机主人姓名 / 通话备注，统一纠正转写说话方展示名 */
export function normalizeCallTranscriptLabels(
  calls: CallRecord[],
  ownerName: string,
  contacts?: PhoneContact[],
): CallRecord[] {
  const owner = ownerName.trim() || '我'
  const byId = new Map((contacts || []).map((c) => [c.id, c]))
  return calls.map((call) => {
    const contact = call.contactId ? byId.get(call.contactId) : undefined
    const peer = (contact?.remarkName || call.remarkName || '对方').trim() || '对方'
    const lines = call.transcript
    if (!lines?.length) return call

    const allSameSpeaker = lines.every((l) => l.speaker === lines[0]!.speaker)
    let fixed = lines
    // 模型把说话方全标成同一人时，按呼入/呼出与首句启发式交替纠正
    if (allSameSpeaker && lines.length >= 2) {
      const firstText = lines[0]!.text || ''
      let startSelf = call.direction === 'outgoing'
      if (/^(喂[，,.！!]?)?(妈|爸|母上|爹)/u.test(firstText) || /我这儿|我这边|我刚|我正/.test(firstText)) {
        startSelf = true
      }
      if (/你总算|你怎么|你又|你在哪|接电话了|不回/.test(firstText)) {
        startSelf = false
      }
      fixed = lines.map((line, i) => {
        const speaker: 'self' | 'other' = i % 2 === 0 ? (startSelf ? 'self' : 'other') : startSelf ? 'other' : 'self'
        return { ...line, speaker }
      })
    }

    return {
      ...call,
      transcript: fixed.map((line, i) => ({
        ...line,
        id: line.id || `t_${i + 1}`,
        speakerLabel: line.speaker === 'self' ? owner : peer,
      })),
    }
  })
}

const GROUP_RANK: Record<CallGroup, number> = { today: 0, yesterday: 1, earlier: 2 }

function parseTimeMinutes(timeLabel: string): number {
  const m = String(timeLabel || '').match(/(\d{1,2})\s*[:：]\s*(\d{2})/)
  if (!m) return -1
  return Number(m[1]) * 60 + Number(m[2])
}

function parseDateKey(call: CallRecord): number {
  const full = String(call.dateFull || '')
  const fm = full.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (fm) return Number(fm[1]) * 10000 + Number(fm[2]) * 100 + Number(fm[3])
  const label = String(call.dateLabel || '')
  const lm = label.match(/(\d{1,2})\s*月\s*(\d{1,2})/)
  if (lm) {
    const base = call.group === 'today' ? 90000000 : call.group === 'yesterday' ? 80000000 : 70000000
    return base + Number(lm[1]) * 100 + Number(lm[2])
  }
  return call.group === 'today' ? 90000000 : call.group === 'yesterday' ? 80000000 : 70000000
}

/** 越新越靠上：今天 > 昨天 > 更早；同组按日期、时间倒序 */
export function sortCallsNewestFirst(calls: CallRecord[]): CallRecord[] {
  return [...calls].sort((a, b) => {
    const ga = GROUP_RANK[a.group] ?? 9
    const gb = GROUP_RANK[b.group] ?? 9
    if (ga !== gb) return ga - gb
    const da = parseDateKey(a)
    const db = parseDateKey(b)
    if (da !== db) return db - da
    return parseTimeMinutes(b.timeLabel) - parseTimeMinutes(a.timeLabel)
  })
}

/** 若模型漏写「已存」，从含稿接通通话中补 2~3 条，保证「已存录音」有内容 */
export function ensureSavedRecordings(ds: PhoneDataset, minSaved = 2, maxSaved = 3): PhoneDataset {
  const calls = ds.calls.map((c) => ({ ...c }))
  let savedCount = calls.filter((c) => c.saved && (c.transcript?.length || 0) >= 2).length
  if (savedCount >= minSaved) {
    return { ...ds, calls: sortCallsNewestFirst(calls) }
  }
  const candidates = sortCallsNewestFirst(
    calls.filter((c) => !c.saved && c.direction !== 'missed' && (c.transcript?.length || 0) >= 2),
  )
  for (const c of candidates) {
    if (savedCount >= maxSaved) break
    const row = calls.find((x) => x.id === c.id)
    if (!row) continue
    row.saved = true
    savedCount += 1
  }
  // 仍不足：任意含稿也标
  if (savedCount < minSaved) {
    for (const c of sortCallsNewestFirst(calls.filter((x) => !x.saved && (x.transcript?.length || 0) >= 2))) {
      if (savedCount >= minSaved) break
      const row = calls.find((x) => x.id === c.id)
      if (!row) continue
      row.saved = true
      savedCount += 1
    }
  }
  return { ...ds, calls: sortCallsNewestFirst(calls) }
}

/** 按时长估算合理摘录句数：短通略多、长通仍封顶 20 */
export function expectedTranscriptLineCount(durationSec?: number): number {
  const sec = Math.max(0, Math.floor(Number(durationSec) || 0))
  if (sec <= 0) return 0
  if (sec < 45) return 6
  if (sec < 90) return 8
  if (sec < 150) return 12
  return 16
}

/**
 * 验收下限：接通只要有对白摘录即可（≥2 句）。
 * 原先按时长要求 3~8 句，模型常只写 2~3 句摘录就被整包判「格式不稳定」。
 * 句数建议仍由 prompt 引导；这里只拦「有时长、无对白」。
 */
export function minAcceptableTranscriptLines(durationSec?: number): number {
  if (expectedTranscriptLineCount(durationSec) <= 0) return 0
  return 2
}

function callHasEnoughTranscript(c: CallRecord): boolean {
  if (c.direction === 'missed') return true
  const need = minAcceptableTranscriptLines(c.durationSec ?? 60)
  return (c.transcript?.length || 0) >= need
}

/** 接通却无稿：不可进列表（避免详情页「暂无转写」） */
export function allConnectedCallsHaveTranscript(calls: CallRecord[]): boolean {
  const connected = calls.filter((c) => c.direction !== 'missed')
  if (connected.length < 1) return false
  return connected.every((c) => callHasEnoughTranscript(c))
}

/**
 * 缺稿接通 → 降为未接，避免「写了呼入/呼出却没稿」整包作废。
 * 模型常因 token 截断只写出元数据；降级后仍可过验收。
 */
export function salvageThinConnectedCalls(calls: CallRecord[]): CallRecord[] {
  return calls.map((c) => {
    if (c.direction === 'missed') return c
    if (callHasEnoughTranscript(c)) return c
    return {
      ...c,
      direction: 'missed' as const,
      durationSec: 0,
      transcript: undefined,
      saved: false,
    }
  })
}

/** 供重试报错：说明为何未过验收（条数 / 接通稿） */
export function explainPhoneCallsReject(
  calls: CallRecord[],
  opts: { minAccept: number; maxAccept: number },
): string {
  const n = calls.length
  if (n < opts.minAccept) return `解析到 ${n} 条通话，少于目标下限 ${opts.minAccept}`
  if (n > opts.maxAccept + 2) return `解析到 ${n} 条通话，多于上限 ${opts.maxAccept + 2}`
  const connected = calls.filter((c) => c.direction !== 'missed')
  if (connected.length < 2) return `接通仅 ${connected.length} 条，至少需要 2 条（缺稿的已尽量降为未接）`
  const thin = connected.filter((c) => !callHasEnoughTranscript(c))
  if (thin.length) {
    const sample = thin
      .slice(0, 3)
      .map((c) => `${c.remarkName || c.id}(稿${c.transcript?.length || 0}句/需≥2)`)
      .join('、')
    return `${thin.length} 通接通稿过短或缺失：${sample}`
  }
  return '未通过验收'
}

function isValidDataset(ds: PhoneDataset): boolean {
  if (ds.calls.length < 4 || ds.calls.length > 14) return false
  if (ds.contacts.length < 4 || ds.contacts.length > 12) return false
  const connected = ds.calls.filter((c) => c.direction !== 'missed')
  if (connected.length < 2) return false
  // 每一通接通都必须有稿；原先允许缺 2 通，会出现「有时长无转写」
  if (!allConnectedCallsHaveTranscript(ds.calls)) return false
  const saved = ds.calls.filter((c) => c.saved && (c.transcript?.length || 0) >= 2).length
  if (saved < 1) return false
  // 紧急/收藏/拉黑不再强制；有用户联系人即可
  if (!ds.contacts.some((c) => c.isUser)) return false
  return true
}

export function parsePhoneMarkup(raw: string): PhoneDataset | null {
  const text = stripFence(raw)
  if (!text) return null

  const compact = parseCompactPhoneLines(text)

  const contacts: PhoneContact[] = [...compact.contacts]
  for (const block of extractBlocks(text, '<<PH_CONTACT>>', '<<END_PH_CONTACT>>')) {
    const map = fieldMap(block)
    const remarkRaw = getField(map, ['备注', '备注名', 'remark', 'remarkname', '名称', 'name'])
    const remarkName = sanitizeRemarkName(remarkRaw)
    const phoneRaw = getField(map, ['号码', '电话', 'phone', 'phonenumber', '手机']).trim()
    if (!remarkName || !phoneRaw) continue
    const phoneNumber = normalizeFictionalMobileNumber(phoneRaw)
    const id = getField(map, ['id']) || `c_${contacts.length + 1}`
    if (contacts.some((c) => c.id === id)) continue
    const displayName = getField(map, ['来电名', '显示名', 'displayname', '真名']) || undefined
    const glyph =
      getField(map, ['字', 'glyph', '头像字']) ||
      remarkName.replace(/\s+/g, '').slice(0, 1) ||
      '通'
    const tone = getField(map, ['色', 'tone', '渐变', 'avatartone']) || toneFromSeed(id + remarkName)
    const noteRaw = getField(map, ['备注语', 'note', '说明', '备注说明'])
    contacts.push({
      id,
      remarkName,
      displayName: displayName && displayName !== remarkName ? displayName : undefined,
      phoneNumber,
      note: noteRaw.trim() ? noteRaw.trim() : undefined,
      isEmergency: asYes(getField(map, ['紧急', 'emergency', 'isemergency'])),
      isFavorite: asYes(getField(map, ['收藏', 'favorite', 'isfavorite', '星标'])),
      isUser: asYes(getField(map, ['用户', 'user', 'isuser', '玩家'])),
      isBlocked: asYes(getField(map, ['拉黑', 'blocked', 'isblocked', '黑名单'])),
      blockedAt: getField(map, ['拉黑时间', 'blockedat', '拉黑于']) || undefined,
      relationTag: getField(map, ['关系', 'relation', 'relationtag', '标签']) || undefined,
      avatarTone: tone,
      avatarGlyph: glyph.slice(0, 1),
      pinyinInitial: normalizeInitial(getField(map, ['拼音', 'initial', 'pinyin', 'pinyininitial']), remarkName),
    })
  }

  const calls: CallRecord[] = [...compact.calls]
  for (const block of extractBlocks(text, '<<PH_CALL>>', '<<END_PH_CALL>>')) {
    const map = fieldMap(block)
    const remarkRaw = getField(map, ['备注', '备注名', 'remark', 'remarkname', '名称'])
    const remarkName = sanitizeRemarkName(remarkRaw)
    const phoneNumberRaw = getField(map, ['号码', '电话', 'phone', 'phonenumber'])
    const phoneNumber = phoneNumberRaw ? normalizeFictionalMobileNumber(phoneNumberRaw) : ''
    if (!remarkName && !phoneNumber) continue
    const id = getField(map, ['id']) || `call_${calls.length + 1}`
    if (calls.some((c) => c.id === id)) continue
    const direction = asDirection(getField(map, ['方向', 'direction', '类型']))
    const durationRaw = getField(map, ['时长', 'duration', 'durationsec', '秒'])
    let durationSec = durationRaw ? Math.max(0, Math.floor(Number(durationRaw) || 0)) : undefined
    let transcript = parseTranscript(block, {
      ownerName: '我',
      peerName: remarkName || phoneNumber || '对方',
      peerNames: [remarkName, phoneNumber].filter(Boolean) as string[],
    })
    if (transcript.length > MAX_TRANSCRIPT_LINES_PER_CALL) {
      transcript = transcript.slice(0, MAX_TRANSCRIPT_LINES_PER_CALL)
    }
    const media = asMedia(getField(map, ['媒介', 'media', '通话类型', '方式']))
    if (direction !== 'missed' && (durationSec == null || durationSec <= 0)) {
      const lastAt = transcript.reduce((m, t) => Math.max(m, t.atSec ?? 0), 0)
      durationSec = Math.max(45, lastAt || Math.round(((transcript.length || 4) / 8) * 60))
    }
    calls.push({
      id,
      contactId: getField(map, ['联系人', 'contact', 'contactid', '联系人id']) || undefined,
      remarkName: remarkName || phoneNumber,
      phoneNumber: phoneNumber || '未知号码',
      direction,
      media,
      durationSec: direction === 'missed' ? 0 : durationSec,
      timeLabel: getField(map, ['时间', 'timelabel', '时刻']) || '刚刚',
      group: asGroup(getField(map, ['分组', 'group'])),
      dateLabel: getField(map, ['日期', 'datelabel', '日']) || undefined,
      dateFull: getField(map, ['完整日期', 'datefull', '全日']) || undefined,
      transcript: transcript.length ? transcript : undefined,
      saved: asYes(getField(map, ['已存', 'saved', '存档', '已保存'])),
    })
  }

  if (!contacts.length && !calls.length) return null

  // 允许「仅联系人」或「仅通话」半包，供两段生成拼装
  const draft = ensureSavedRecordings({
    contacts,
    calls: sortCallsNewestFirst(calls),
  })
  if (contacts.length && calls.length && !isValidDataset(draft)) {
    if (draft.calls.length < 3 || draft.contacts.length < 3) {
      // 半包仍返回，由上层决定是否可用
    } else if (!allConnectedCallsHaveTranscript(draft.calls)) {
      // 接通缺稿：整包作废，迫使上层重试
      return null
    }
  }

  return draft
}

/** 解析「仅联系人」半包 */
export function parsePhoneContactsOnly(raw: string): PhoneContact[] {
  const ds = parsePhoneMarkup(raw)
  return ds?.contacts ?? []
}

/** 解析「仅通话」半包；可注入已有联系人做校验 */
export function parsePhoneCallsOnly(raw: string): CallRecord[] {
  const ds = parsePhoneMarkup(raw)
  return ds?.calls ?? []
}

/** 供 AI 重试判定：是否达到产品最低要求 */
export function isPhoneDatasetReady(ds: PhoneDataset | null): boolean {
  if (!ds) return false
  return isValidDataset(ensureSavedRecordings(ds))
}

export function ensurePhoneDataset(ds: PhoneDataset): PhoneDataset {
  return ensureSavedRecordings({
    contacts: Array.isArray(ds.contacts) ? ds.contacts : [],
    calls: Array.isArray(ds.calls) ? ds.calls : [],
  })
}

export { emptyPhoneDataset }
