/**
 * 查手机 · 镜像微信 AI 输出格式（标记块 / 字段行）
 * 禁止 JSON，避免长对话嵌套与转义导致解析失败。
 */

type AvatarBucket =
  | 'abstract'
  | 'maleE'
  | 'elderFemale'
  | 'elderMale'
  | 'maleI'
  | 'femaleCute'
  | 'femaleCool'

type SpyMsg = {
  from: 'player' | 'character'
  content: string
  timestamp: number
}

const AVATAR_BUCKETS = new Set<string>([
  'abstract',
  'maleE',
  'elderFemale',
  'elderMale',
  'maleI',
  'femaleCute',
  'femaleCool',
])

export const SPY_WECHAT_MARKUP_RULE = `
【输出格式 · 硬性】
- 禁止 JSON、禁止 markdown 代码围栏、禁止前后解释。
- 只输出下方规定的标记块；每行「字段名：值」（可用中文冒号或英文冒号）。
- 布尔写「是/否」；金额写数字；时间戳写毫秒整数。
`.trim()

export const SPY_PROFILE_CONTACTS_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

先输出 1 个资料块，再输出若干联系人块（不含聊天记录）：

<<MIRROR_PROFILE>>
昵称：角色微信昵称
签名：个性签名
<<END_MIRROR_PROFILE>>

<<MIRROR_CONTACT>>
id：联系人唯一 id（可用英文数字下划线）
昵称：对方微信昵称
备注：我（角色）视角的备注名
头像桶：abstract|maleE|elderFemale|elderMale|maleI|femaleCute|femaleCool（仅额外联系人必填；人脉 NPC 可留空）
星标：是/否
拉黑：是/否
characterId：人脉角色 id（额外联系人留空）
<<END_MIRROR_CONTACT>>
`.trim()

export const SPY_CHAT_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

只输出一个聊天块。消息每行一条，格式严格为：
角色侧：C|毫秒时间戳|气泡正文
联系人侧：P|毫秒时间戳|气泡正文
（C = character 手机主人；P = 当前联系人；正文内不要再写竖线 |）

<<MIRROR_CHAT>>
C|1710000000000|示例：你到了吗
P|1710000001000|示例：到门口了
<<END_MIRROR_CHAT>>
`.trim()

export const SPY_MOMENTS_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

每个朋友圈一条块：

<<MIRROR_MOMENT>>
id：唯一 id
内容：正文
可见性：公开/屏蔽用户/仅TA可见 等短文案
赞：甲、乙、丙（顿号或逗号分隔，可空）
评：甲：评论内容
评：乙：另一条评论
<<END_MIRROR_MOMENT>>
`.trim()

export const SPY_FINANCIAL_FORMAT = `
${SPY_WECHAT_MARKUP_RULE}

账单与亲情卡各用独立块：

<<MIRROR_BILL>>
id：唯一 id
日期：YYYY-MM-DD 或可读日期
对象：对方称呼
金额：-66（支出为负，收入为正）
备注：短备注
<<END_MIRROR_BILL>>

<<MIRROR_CARD>>
id：唯一 id
持卡人：开通对象
限额：3000
已用：800
<<END_MIRROR_CARD>>
`.trim()

function stripFence(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/^```(?:[\w-]*)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

function splitFieldLine(line: string): { key: string; value: string } | null {
  const raw = String(line ?? '').trim()
  if (!raw) return null
  const m = raw.match(/^([^:：]{1,32})\s*[:：]\s*(.*)$/)
  if (!m) return null
  return { key: m[1]!.trim().toLowerCase(), value: (m[2] ?? '').trim() }
}

function yesNo(v: string | undefined): boolean | undefined {
  const s = (v || '').trim()
  if (!s) return undefined
  if (/^(是|yes|true|1|y)$/i.test(s)) return true
  if (/^(否|no|false|0|n)$/i.test(s)) return false
  return undefined
}

function num(v: string | undefined, fallback = 0): number {
  const n = Number(String(v ?? '').replace(/[,，\s]/g, ''))
  return Number.isFinite(n) ? n : fallback
}

function normalizeBucket(v: string | undefined): AvatarBucket | undefined {
  const s = (v || '').trim()
  return AVATAR_BUCKETS.has(s) ? (s as AvatarBucket) : undefined
}

function fieldMap(block: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of block.split(/\r?\n/)) {
    const f = splitFieldLine(line)
    if (!f) continue
    // 评：可多行，单独处理
    if (f.key === '评' || f.key === '评论' || f.key === 'comment') continue
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

function extractBlocks(raw: string, openTag: string, closeTag: string): string[] {
  const text = stripFence(raw)
  const open = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const close = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${open}\\s*([\\s\\S]*?)\\s*${close}`, 'gi')
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const body = (m[1] ?? '').trim()
    if (body) out.push(body)
  }
  return out
}

function parseLikes(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split(/[,，、|/]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function parseComments(block: string): Array<{ from: string; content: string }> {
  const out: Array<{ from: string; content: string }> = []
  for (const line of block.split(/\r?\n/)) {
    const f = splitFieldLine(line)
    if (!f) continue
    if (!(f.key === '评' || f.key === '评论' || f.key === 'comment')) continue
    const v = f.value
    const idxCn = v.indexOf('：')
    const idxEn = v.indexOf(':')
    let sep = -1
    if (idxCn >= 0 && idxEn >= 0) sep = Math.min(idxCn, idxEn)
    else sep = Math.max(idxCn, idxEn)
    if (sep < 0) {
      if (v.trim()) out.push({ from: '路人', content: v.trim() })
      continue
    }
    const from = v.slice(0, sep).trim() || '路人'
    const content = v.slice(sep + 1).trim()
    if (content) out.push({ from, content })
  }
  return out
}

function parseMessageLines(block: string): SpyMsg[] {
  const out: SpyMsg[] = []
  for (const line of block.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    // C|ts|text 或 P|ts|text
    const m = t.match(/^([CPcp角色联])\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*(.+)$/)
    if (m) {
      const side = m[1]!.toLowerCase()
      const from: 'player' | 'character' =
        side === 'p' || side === '联' ? 'player' : 'character'
      const timestamp = Number(m[2])
      const content = (m[3] ?? '').trim()
      if (content && Number.isFinite(timestamp)) out.push({ from, content, timestamp })
      continue
    }
    // 兼容：character|ts|text / player|ts|text
    const m2 = t.match(/^(character|player|角色|联系人)\s*[|｜]\s*(\d{10,16})\s*[|｜]\s*(.+)$/i)
    if (m2) {
      const side = m2[1]!.toLowerCase()
      const from: 'player' | 'character' =
        side === 'player' || side === '联系人' ? 'player' : 'character'
      const timestamp = Number(m2[2])
      const content = (m2[3] ?? '').trim()
      if (content && Number.isFinite(timestamp)) out.push({ from, content, timestamp })
    }
  }
  return out
}

export function parseSpyProfileContactsMarkup(raw: string): {
  profile: { nickname: string; avatarUrl?: string; signature: string }
  contacts: Array<{
    id: string
    nickname?: string
    remarkName: string
    avatarBucket?: AvatarBucket
    isStarred?: boolean
    blocked?: boolean
    characterId?: string
  }>
} | null {
  const profiles = extractBlocks(raw, '<<MIRROR_PROFILE>>', '<<END_MIRROR_PROFILE>>')
  const contactBlocks = extractBlocks(raw, '<<MIRROR_CONTACT>>', '<<END_MIRROR_CONTACT>>')
  if (!profiles.length && !contactBlocks.length) return null

  const pMap = fieldMap(profiles[0] || '')
  const profile = {
    nickname: getField(pMap, ['昵称', 'nickname', 'name']),
    avatarUrl: getField(pMap, ['头像', 'avatar', 'avatarurl']) || undefined,
    signature: getField(pMap, ['签名', '个性签名', 'signature']),
  }

  const contacts = contactBlocks
    .map((body, i) => {
      const map = fieldMap(body)
      const id =
        getField(map, ['id', '联系人id', 'contactid']) || `contact_${i + 1}_${Date.now().toString(36)}`
      const remarkName =
        getField(map, ['备注', '备注名', 'remark', 'remarkname']) ||
        getField(map, ['昵称', 'nickname']) ||
        '联系人'
      const nickname = getField(map, ['昵称', 'nickname']) || undefined
      const characterId = getField(map, ['characterid', '角色id', 'npcid']) || undefined
      const avatarBucket = normalizeBucket(
        getField(map, ['头像桶', 'avatarbucket', 'bucket', '头像类型']),
      )
      return {
        id,
        nickname,
        remarkName,
        avatarBucket,
        isStarred: yesNo(getField(map, ['星标', '星标好友', 'starred', 'isstarred'])),
        blocked: yesNo(getField(map, ['拉黑', '屏蔽', 'blocked', 'isblocked'])),
        characterId: characterId || undefined,
      }
    })
    .filter((c) => c.id && c.remarkName)

  if (!contacts.length && !profile.nickname && !profile.signature) return null
  return { profile, contacts }
}

export function parseSpyChatMarkup(raw: string): {
  messages: SpyMsg[]
} | null {
  const blocks = extractBlocks(raw, '<<MIRROR_CHAT>>', '<<END_MIRROR_CHAT>>')
  // 兼容未写结束标签：整段当消息区
  const body = blocks[0] ?? stripFence(raw)
  const messages = parseMessageLines(body)
  if (!messages.length) return null
  return { messages }
}

export function parseSpyMomentsMarkup(raw: string): {
  moments: Array<{
    id: string
    content: string
    visibility: string
    likes: string[]
    comments: Array<{ from: string; content: string }>
  }>
} | null {
  const blocks = extractBlocks(raw, '<<MIRROR_MOMENT>>', '<<END_MIRROR_MOMENT>>')
  if (!blocks.length) return null
  const moments = blocks.map((body, i) => {
    const map = fieldMap(body)
    return {
      id: getField(map, ['id']) || `moment_${i + 1}`,
      content: getField(map, ['内容', '正文', 'content', 'text']),
      visibility: getField(map, ['可见性', 'visibility', '隐私']) || '公开',
      likes: parseLikes(getField(map, ['赞', '点赞', 'likes'])),
      comments: parseComments(body),
    }
  }).filter((m) => m.content)
  if (!moments.length) return null
  return { moments }
}

export function parseSpyFinancialMarkup(raw: string): {
  bills: Array<{ id: string; date: string; target: string; amount: number; remark: string }>
  affectionCards: Array<{ id: string; holder: string; limit: number; spent: number }>
} | null {
  const billBlocks = extractBlocks(raw, '<<MIRROR_BILL>>', '<<END_MIRROR_BILL>>')
  const cardBlocks = extractBlocks(raw, '<<MIRROR_CARD>>', '<<END_MIRROR_CARD>>')
  if (!billBlocks.length && !cardBlocks.length) return null

  const bills = billBlocks.map((body, i) => {
    const map = fieldMap(body)
    return {
      id: getField(map, ['id']) || `bill_${i + 1}`,
      date: getField(map, ['日期', 'date', 'time']),
      target: getField(map, ['对象', '对方', 'target', 'to']),
      amount: num(getField(map, ['金额', 'amount', 'money'])),
      remark: getField(map, ['备注', 'remark', 'note']),
    }
  })

  const affectionCards = cardBlocks.map((body, i) => {
    const map = fieldMap(body)
    return {
      id: getField(map, ['id']) || `card_${i + 1}`,
      holder: getField(map, ['持卡人', '对象', 'holder', 'to']),
      limit: num(getField(map, ['限额', 'limit', '额度']), 0),
      spent: num(getField(map, ['已用', 'spent', '已花费']), 0),
    }
  })

  return { bills, affectionCards }
}
