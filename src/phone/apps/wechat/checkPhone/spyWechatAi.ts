import type { ApiConfig } from '../../api/types'
import { openAiCompatibleChat } from '../newFriendsPersona/ai'
import { personaDb } from '../newFriendsPersona/idb'
import type { Character, PlayerIdentity, WeChatChatMessage } from '../newFriendsPersona/types'
import { loadOfflineDatingPlotsPromptBlock } from '../dating/loadOfflineDatingPlotsForWechatPrompt'
import { formatWorldBackgroundForPrompt } from '../newFriendsPersona/worldBackgroundFormat'
import { loadObservationNotes } from '../observationNotes/store'
import { resolveStickerOutputRef } from '../stickers/stickerStore'
import { loadAccountsBundle } from '../wechatAccountPersistence'
import { resolvePrivateChatMessageStorageKey } from '../wechatAccountPrivateChatStorage'
import { resolvePrivateChatSessionPlayerIdentityId } from '../wechatCharacterPlayerIdentity'
import { wechatConversationKey } from '../wechatConversationKey'
import { buildSystemContent } from '../wechatChatAi'
import {
  normalizeWeChatChatLanguageCode,
  WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  weChatChatLanguageLabel,
  weChatChatLanguageNativeName,
  type WeChatChatLanguageCode,
} from '../wechatChatLanguage'
import { getMirrorPlayerContactId } from './mirrorWechat/mirrorWechatContactMemory'
import { findMirrorDmContactByName } from './mirrorWechat/types'
import { resolveCharacterStoryNowMs } from '../time/messagesTabStoryTime'
import { getLumiTransferFresh } from '../transfer/lumiTransferStorage'
import {
  inferSpySpecialFromContent,
  parseSpyChatsBatchMarkup,
  parseSpyFinancialMarkup,
  parseSpyGroupsBatchMarkup,
  parseSpyMomentsMarkup,
  parseSpyProfileContactsMarkup,
  SPY_CHAT_ALIVE_STYLE,
  SPY_CHATS_BATCH_FORMAT,
  SPY_FINANCIAL_FORMAT,
  SPY_GROUPS_BATCH_FORMAT,
  SPY_MOMENTS_FORMAT,
  SPY_PROFILE_CONTACTS_FORMAT,
} from './spyWechatMarkup'

export type SpyChatTimeSpanUnit = 'day' | 'week' | 'month' | 'year'

function chatTimeSpanToMs(unit: SpyChatTimeSpanUnit, value: number): number {
  const n = Math.max(1, Math.round(Number(value) || 1))
  const day = 24 * 60 * 60 * 1000
  if (unit === 'week') return n * 7 * day
  if (unit === 'month') return n * 30 * day
  if (unit === 'year') return n * 365 * day
  return n * day
}

const PLOT_WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'] as const

function formatPlotStamp(ms: number): string {
  const d = new Date(ms)
  const pad = (x: number) => String(x).padStart(2, '0')
  const wd = PLOT_WEEKDAY_CN[d.getDay()] ?? ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}（周${wd}） ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export type SpyExistingChatTranscript = {
  lastTimestamp: number
  /** 全量条数（仅提示用，不把全文塞进上下文） */
  totalMessageCount: number
  /**
   * 更早段落：按自然日压缩成少量行（带日期），避免长会话上下文爆炸。
   */
  earlierDigestLines: string[]
  /**
   * 近端气泡：逐条短句，**每行必带时间**（含星期），供续写接龙与防重复。
   */
  recentLines: string[]
}

function mirrorMsgBodyOneLine(
  m: { from?: string; content?: string; special?: { kind?: string } | null },
  maxChars: number,
): string {
  const side = m.from === 'character' ? 'C' : 'P'
  const sp = m.special?.kind
  const raw = sp
    ? `[${sp}] ${String(m.content || '').replace(/\s+/g, ' ').trim()}`
    : String(m.content || '')
        .replace(/\s+/g, ' ')
        .trim()
  const body = (raw || '…').slice(0, maxChars)
  return `${side}：${body}`
}

function dayKeyFromMs(ms: number): string {
  const d = new Date(ms)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 从已有气泡抽续写摘要（**不喂全文**）。
 * - 近端：最近若干条，每行带完整时间戳
 * - 更早：按日压成 digest，只保留时序骨架
 */
export function summarizeMirrorChatForAppend(
  messages: Array<{
    from?: string
    content?: string
    timestamp?: number
    special?: { kind?: string } | null
  }>,
  opts?: { recentMax?: number; earlierDayMax?: number },
): SpyExistingChatTranscript | null {
  const recentMax = Math.min(24, Math.max(8, Math.round(Number(opts?.recentMax) || 16)))
  const earlierDayMax = Math.min(8, Math.max(3, Math.round(Number(opts?.earlierDayMax) || 6)))
  const sorted = [...(messages || [])]
    .filter((m) => Number.isFinite(Number(m.timestamp)) && Number(m.timestamp) > 0)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  if (!sorted.length) return null
  const lastTimestamp = Number(sorted[sorted.length - 1]!.timestamp)
  const totalMessageCount = sorted.length

  const recentSlice = sorted.slice(-recentMax)
  const earlierSlice = sorted.slice(0, Math.max(0, sorted.length - recentSlice.length))

  const recentLines = recentSlice.map((m) => {
    const t = formatPlotStamp(Number(m.timestamp))
    return `时间 ${t}｜${mirrorMsgBodyOneLine(m, 56)}`
  })

  // 更早：按日聚合，每天最多拼 2 个短片段
  const byDay = new Map<string, typeof earlierSlice>()
  for (const m of earlierSlice) {
    const key = dayKeyFromMs(Number(m.timestamp))
    const arr = byDay.get(key) || []
    arr.push(m)
    byDay.set(key, arr)
  }
  const dayKeys = Array.from(byDay.keys()).sort()
  const pickedDays = dayKeys.length > earlierDayMax ? dayKeys.slice(-earlierDayMax) : dayKeys
  const earlierDigestLines = pickedDays.map((key) => {
    const arr = byDay.get(key) || []
    const first = arr[0]!
    const last = arr[arr.length - 1]!
    const wd = PLOT_WEEKDAY_CN[new Date(Number(first.timestamp)).getDay()] ?? ''
    const head = mirrorMsgBodyOneLine(first, 36)
    const tail =
      arr.length > 1 && last !== first ? ` → ${mirrorMsgBodyOneLine(last, 36)}` : ''
    const more = arr.length > 2 ? `（当日共 ${arr.length} 条）` : ''
    return `日期 ${key}（周${wd}）${more}：${head}${tail}`
  })
  if (dayKeys.length > earlierDayMax) {
    earlierDigestLines.unshift(
      `（更早还有 ${dayKeys.length - earlierDayMax} 天已省略，只保留近 ${earlierDayMax} 日骨架）`,
    )
  }

  return { lastTimestamp, totalMessageCount, earlierDigestLines, recentLines }
}

/** 镜像生成：备注 / 气泡 / 朋友圈的语言与可选同步翻译 */
function buildMirrorGenerateLanguageAppendix(
  o: SpyWechatGenerateOptions,
  surface: 'contacts' | 'chats' | 'moments',
): string {
  const lang = normalizeWeChatChatLanguageCode(o.generateLanguage, WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE)
  const native = weChatChatLanguageNativeName(lang)
  const label = weChatChatLanguageLabel(lang)
  const syncWanted = o.syncTranslation === true
  const trLang = normalizeWeChatChatLanguageCode(
    o.translationLanguage,
    WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  )
  const trNative = weChatChatLanguageNativeName(trLang)
  const trLabel = weChatChatLanguageLabel(trLang)
  const syncOn = syncWanted && trLang !== lang

  const lines: string[] = [
    `【生成语言 · 硬项】本轮可见输出语言为 **${label}（${native}）**。`,
  ]

  if (surface === 'contacts') {
    lines.push(
      `- 通讯录「备注」必须用 ${native} 书写（可按该语言习惯写缩写/昵称；禁止写成其它语言）。`,
      `- 「关系」字段必须用**简体中文**、不超过 20 字，写清对方与 {{char}} 的社会/情感关系（同事/家人/恋人/经纪人等）；禁止写成「星标好友」「通讯录好友」。`,
      `- 「昵称」：额外联系人用 ${native}；人脉 NPC / 用户本行的公开昵称按给定原样保留，不要强行翻译专名。`,
      `- 字段名（备注：/ 昵称：/ 关系：等）仍用中文标记；备注与昵称的**字段值**用 ${native}，关系字段值用简体中文。`,
    )
  } else if (surface === 'chats') {
    lines.push(
      `- 所有普通文字气泡正文必须用 ${native}；禁止中外文混条当正文，也禁止把译文写成另一条普通气泡。`,
      `- 红包祝福语 / 转账备注也尽量用 ${native}（金额数字除外）。`,
    )
    if (lang === 'ja') {
      lines.push(
        `- **日语句末「笑」**：轻松场合句末「笑」「（笑）」「w」是网聊习惯（≈哈哈），可自然使用（如「了解した笑」「うん（笑）」）；严肃时可直接收句。`,
      )
    }
    if (syncOn) {
      lines.push(
        `【同步翻译 · 硬项】已开启自带翻译（目标：${trLabel} / ${trNative}）。`,
        `- 每条普通文字气泡后必须紧跟单独一行：\`[译]……\`，内容为上一行气泡的 ${trNative} 译文（通顺、忠于原文，不加戏）。`,
        `- 每条通话内容行 \`CL|C/P|……\` 后也必须紧跟单独一行 \`[译]……\`（译出对白与声音旁白，便于阅读；\`[译]\` 不计入气泡条数）。`,
        `- \`[译]\` 行禁止写成 P/C 普通气泡。`,
        `- 红包行（CRP/PRP）与转账行（CTF/PTF）、通话状态行（CVC/PVC）**不要**跟 \`[译]\`。`,
      )
    } else {
      lines.push('- 禁止输出 `[译]` / `【译】` / `[翻译]` 行。')
    }
  } else {
    lines.push(
      `- 朋友圈「内容」与「评：」评论正文必须用 ${native}。`,
      `- 点赞人名可保留通讯录备注原样；可见性字段可用中文短标签。`,
    )
  }

  return lines.join('\n')
}

/** 硬夹紧：任意时间戳不得晚于剧情「现在」、不得早于跨度起点 */
function clampPlotTimestamp(ts: number, spanStartMs: number, storyNowMs: number): number {
  const lo = Math.min(spanStartMs, storyNowMs)
  const hi = Math.max(spanStartMs, storyNowMs)
  const n = Number(ts)
  if (!Number.isFinite(n) || n <= 0) return hi
  return Math.round(Math.min(hi, Math.max(lo, n)))
}

/**
 * 把模型吐出的时间戳收入「剧情现在 − 跨度」区间。
 * 时段/钟点由模型自行判断；此处只做边界夹紧，并尽量平移保留模型原有相对间隔（不按正文关键词改钟点）。
 */
function remapMessagesIntoPlotSpan<T extends { timestamp: number }>(
  messages: T[],
  spanStartMs: number,
  storyNowMs: number,
): T[] {
  if (!messages.length) return messages
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const lo = Math.min(spanStartMs, storyNowMs)
  const hi = Math.max(spanStartMs, storyNowMs)
  const span = Math.max(60_000, hi - lo)
  const allIn = sorted.every(
    (m) => Number.isFinite(m.timestamp) && m.timestamp >= lo && m.timestamp <= hi,
  )
  let remapped: T[]
  if (allIn) {
    remapped = sorted
  } else {
    const n = sorted.length
    if (n === 1) {
      remapped = [{ ...sorted[0]!, timestamp: Math.round(hi - Math.min(span * 0.1, 30 * 60_000)) }]
    } else {
      const t0 = sorted[0]!.timestamp
      const t1 = sorted[n - 1]!.timestamp
      if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) {
        remapped = sorted.map((m, i) => ({
          ...m,
          timestamp: Math.round(lo + (span * i) / (n - 1)),
        }))
      } else {
        const srcSpan = t1 - t0
        // 间隔能装进窗口：整体平移，末条贴剧情现在，保留模型选的钟点差
        if (srcSpan <= span) {
          let shift = hi - t1
          let first = t0 + shift
          if (first < lo) shift += lo - first
          remapped = sorted.map((m) => ({ ...m, timestamp: Math.round(m.timestamp + shift) }))
        } else {
          // 跨度过大才等比压缩
          remapped = sorted.map((m) => {
            const r = (m.timestamp - t0) / srcSpan
            return { ...m, timestamp: Math.round(lo + Math.min(1, Math.max(0, r)) * span) }
          })
        }
      }
    }
  }
  return remapped.map((m) => ({
    ...m,
    timestamp: clampPlotTimestamp(m.timestamp, spanStartMs, storyNowMs),
  }))
}

/**
 * 续写追加：映射到「上一句之后～剧情现在」，并优先落在近端窗口，
 * 避免把「今天刚表白」的续聊摊到跨度开头的周三。
 */
function remapAppendMessagesIntoPlotSpan<T extends { timestamp: number }>(
  messages: T[],
  spanStartMs: number,
  storyNowMs: number,
  afterTimestamp: number,
): T[] {
  const after = Math.max(0, Math.floor(Number(afterTimestamp) || 0))
  // 至少比旧会话末条晚 45 秒；续写窗口默认贴在剧情现在往前 36 小时内
  const floor = Math.min(
    storyNowMs - 60_000,
    Math.max(spanStartMs, after + 45_000, storyNowMs - 36 * 60 * 60 * 1000),
  )
  const lo = Math.min(floor, storyNowMs)
  let remapped = remapMessagesIntoPlotSpan(messages, lo, storyNowMs)
  // 若仍有条目标在 after 之前（模型/夹紧边角），整体平移到 after 之后
  const minTs = remapped.reduce((m, x) => Math.min(m, x.timestamp), Number.POSITIVE_INFINITY)
  if (Number.isFinite(minTs) && minTs <= after) {
    const shift = after + 45_000 - minTs
    remapped = remapped.map((m) => ({
      ...m,
      timestamp: clampPlotTimestamp(m.timestamp + shift, lo, storyNowMs),
    }))
  }
  // 保证单调不减
  let prev = after
  return remapped.map((m) => {
    let ts = m.timestamp
    if (ts <= prev) ts = Math.min(storyNowMs, prev + 8_000)
    prev = ts
    return { ...m, timestamp: ts }
  })
}

function isAbortError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const name = String((e as { name?: string }).name || '')
  const msg = String((e as { message?: string }).message || '')
  return name === 'AbortError' || /aborted|The user aborted|signal is aborted/i.test(msg)
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const err = new Error('已停止生成')
    err.name = 'AbortError'
    throw err
  }
}

/** 与 mirrorWechatContactMemory.getMirrorPlayerContactId 一致 */
export function getSpyPlayerContactId(playerIdentityId: string) {
  return getMirrorPlayerContactId(playerIdentityId)
}

type GlobMod = { default: string }

const extraAvatarModules = {
  abstract: import.meta.glob<GlobMod>('../../../../../image/抽象搞笑男女通用/*.{png,jpg,jpeg,webp,gif}', { eager: true }),
  maleE: import.meta.glob<GlobMod>('../../../../../image/微信头像男E型阳光/*.{png,jpg,jpeg,webp,gif}', { eager: true }),
  elderFemale: import.meta.glob<GlobMod>('../../../../../image/40岁以上长辈头像女/*.{png,jpg,jpeg,webp,gif}', { eager: true }),
  elderMale: import.meta.glob<GlobMod>('../../../../../image/40岁以上长辈头像男/*.{png,jpg,jpeg,webp,gif}', { eager: true }),
  maleI: import.meta.glob<GlobMod>('../../../../../image/微信头像男I型清冷/*.{png,jpg,jpeg,webp,gif}', { eager: true }),
  femaleCute: import.meta.glob<GlobMod>('../../../../../image/微信头像女可爱活泼/*.{png,jpg,jpeg,webp,gif}', { eager: true }),
  femaleCool: import.meta.glob<GlobMod>('../../../../../image/微信头像女清冷和御姐/*.{png,jpg,jpeg,webp,gif}', { eager: true }),
} as const

export type ExtraAvatarBucket = keyof typeof extraAvatarModules

const EXTRA_AVATAR_URLS_BY_BUCKET: Record<ExtraAvatarBucket, string[]> = Object.fromEntries(
  Object.entries(extraAvatarModules).map(([k, mods]) => [
    k,
    Object.values(mods)
      .map((m) => m?.default)
      .filter((x): x is string => typeof x === 'string' && !!x.trim()),
  ]),
) as Record<ExtraAvatarBucket, string[]>

const EXTRA_AVATAR_URLS = Object.values(extraAvatarModules)
  .flatMap((mods) => Object.values(mods).map((m) => m?.default))
  .filter((x): x is string => typeof x === 'string' && !!x.trim())

// 开发期校验：确保头像池确实从本地目录打包进来
if (import.meta.env?.DEV) {
  console.log('[spyWeChatAi] EXTRA_AVATAR_URLS count =', EXTRA_AVATAR_URLS.length)
  if (!EXTRA_AVATAR_URLS.length) console.warn('[spyWeChatAi] 本地头像池为空：请检查 image/ 目录与 import.meta.glob 路径是否匹配')
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickFromPool(pool: string[], seed: string): string | undefined {
  if (!pool.length) return undefined
  const idx = hashString(seed) % pool.length
  return pool[idx]
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function normalizeBucket(v: unknown): ExtraAvatarBucket | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim() as ExtraAvatarBucket
  return s in EXTRA_AVATAR_URLS_BY_BUCKET ? s : undefined
}

/**
 * 与通讯录额外联系人同一套本地头像逻辑：
 * 人设词推断桶优先 → 模型给出的头像桶 → 全池兜底；seed 稳定复现。
 * 禁止远程 URL（由调用方再清一次亦可）。
 */
function resolveLocalExtraAvatarUrl(params: {
  seed: string
  personaText?: string
  preferredBucket?: ExtraAvatarBucket | string | null
}): string {
  const inferred = inferAvatarBucketFromPersona(params.personaText || '')
  const preferred = normalizeBucket(params.preferredBucket)
  const bucket = inferred || preferred
  const pool = bucket ? EXTRA_AVATAR_URLS_BY_BUCKET[bucket] : EXTRA_AVATAR_URLS
  let url = pickFromPool(pool, `${bucket || 'any'}:${params.seed}`) || ''
  if (url && isRemoteUrl(url)) url = ''
  if (!url) url = pickFromPool(EXTRA_AVATAR_URLS, params.seed) || ''
  if (url && isRemoteUrl(url)) url = ''
  return url || '/image/个人名片默认头像1.png'
}

function includesAny(s: string, keys: string[]): boolean {
  return keys.some((k) => s.includes(k))
}

/**
 * 依据“备注/昵称里的关系与气质词”推断头像桶。
 * 目标：与你的头像文件夹命名一致，避免性别/年龄/气质 OOC。
 */
function inferAvatarBucketFromPersona(text: string): ExtraAvatarBucket | undefined {
  const s = (text || '').replace(/\\s+/g, '').toLowerCase()
  if (!s) return undefined

  // 1) 抽象搞笑（优先级最高：这类一般就是“表情包头像/搞笑号”）
  if (includesAny(s, ['抽象', '搞笑', '沙雕', '整活', '表情包', '段子', '哈哈', '梗'])) return 'abstract'

  // 2) 长辈（父母/长辈称谓优先）
  if (includesAny(s, ['妈妈', '妈', '母亲', '姨', '阿姨', '姑', '姑妈', '婶', '婶婶', '奶奶', '姥姥', '外婆'])) return 'elderFemale'
  if (includesAny(s, ['爸爸', '爸', '父亲', '叔', '叔叔', '伯', '伯伯', '舅', '舅舅', '爷爷', '外公', '姥爷'])) return 'elderMale'
  if (includesAny(s, ['老师', '主任', '校长', '班主任', '教授', '导师', '教练', '阿姨', '叔叔'])) {
    // 老师/教练不一定是长辈，但通常偏成熟；用性别词决定男女长辈池
    if (includesAny(s, ['女', '姐', '姨', '阿姨', '师姐', '女老师'])) return 'elderFemale'
    if (includesAny(s, ['男', '哥', '叔', '伯', '师兄', '男老师'])) return 'elderMale'
  }

  // 3) 性别 & 气质
  const isFemale = includesAny(s, ['女', '姐', '妹', '闺蜜', '老婆', '女友', '小姨', '阿姨', '妈'])
  const isMale = includesAny(s, ['男', '哥', '弟', '兄弟', '老公', '男友', '叔', '伯', '爸'])

  // 3.1 女：可爱/活泼 vs 清冷/御姐
  if (isFemale) {
    if (includesAny(s, ['可爱', '萌', '甜', '软', '元气', '活泼', '小可爱', '小甜', '奶', '乖'])) return 'femaleCute'
    if (includesAny(s, ['清冷', '冷', '高冷', '御姐', '姐姐', '女王', '成熟', '理性', '克制'])) return 'femaleCool'
    // 默认女：更安全选清冷御姐（轻奢风更稳）
    return 'femaleCool'
  }

  // 3.2 男：E型阳光 vs I型清冷
  if (isMale) {
    if (includesAny(s, ['阳光', '外向', '热情', '直球', '社牛', '运动', '开朗', '热血'])) return 'maleE'
    if (includesAny(s, ['清冷', '冷', '高冷', '克制', '安静', '内向', '社恐', '疏离'])) return 'maleI'
    // 默认男：更安全选清冷（减少“油腻感”）
    return 'maleI'
  }

  // 4) 兜底：根据少量关键词推断，不确定就不强推
  if (includesAny(s, ['小姐姐', '闺蜜', '宝贝', '小仙女'])) return 'femaleCute'
  if (includesAny(s, ['大哥', '兄弟', '老弟'])) return 'maleE'
  return undefined
}

export type SpyWechatGenerateOptions = {
  contactCount: number
  /** 通讯录关系偏向 / 自定义要求（生成与更新都会写入提示） */
  contactBias: string
  currentContactsSnapshot?: Array<{
    id: string
    nickname: string
    remarkName: string
    characterId?: string
    isStarred?: boolean
    isPinned?: boolean
    blocked?: boolean
    kind?: 'dm' | 'group'
    avatarUrl?: string
    relationshipNote?: string
  }>
  includeBlocked: boolean
  includeMomentsHideFromUser: boolean
  includeMomentsOnlyTaVisibleWithoutUser: boolean
  minMessagesPerContact: number
  chatContactsCount: number
  /**
   * 信息页：显式指定要生成/更新聊天的联系人 id（不含用户本行）。
   * 有值时优先于 chatContactsCount 自动抽样。
   */
  chatTargetContactIds?: string[]
  /** 信息页：聊天内容偏向 / 自定义要求 */
  chatBias?: string
  /** 是否额外生成与勾选私聊相关的群聊会话 */
  generateRelatedGroups?: boolean
  /** 相关群聊数量（1～8，默认 2） */
  relatedGroupsCount?: number
  /** 相关群聊自定义要求（可空） */
  groupChatCustomBias?: string
  /** 信息页聊天时间跨度单位（相对剧情「现在」往回） */
  chatTimeSpanUnit?: SpyChatTimeSpanUnit
  /** 跨度数值，如 7 天 / 2 周 / 3 月 / 1 年 */
  chatTimeSpanValue?: number
  /**
   * 生成语言（备注 / 聊天气泡 / 朋友圈正文）。
   * 默认简体中文；外籍人设可选 en/ja 等。
   */
  generateLanguage?: WeChatChatLanguageCode | string
  /** 是否在每条普通文字气泡后自带 `[译]` 译文 */
  syncTranslation?: boolean
  /** 译文目标语言（默认简体中文） */
  translationLanguage?: WeChatChatLanguageCode | string
  /**
   * 信息页：是否主动穿插特殊消息卡片
   *（语音通话 / 位置 / 红包 / 转账；默认关，模型很少主动写）
   */
  includeSpecialMessages?: boolean
  /** 信息页「更新」：在已有会话后续写追加（须配合 existingChatTranscripts） */
  chatsAppend?: boolean
  /** 各联系人已有聊天摘要（续写防重复 / 时间接龙） */
  existingChatTranscriptsByContactId?: Record<string, SpyExistingChatTranscript>
}

export type SpyWechatGeneratedData = {
  profile: {
    nickname: string
    avatarUrl?: string
    signature: string
  }
  contacts: Array<{
    id: string
    /** 微信昵称（来自人脉角色或生成联系人自身） */
    nickname: string
    /** 备注名（角色视角下的智能备注） */
    remarkName: string
    /** 额外生成联系人头像桶（与本地头像文件夹一一对应） */
    avatarBucket?: ExtraAvatarBucket
    avatarUrl?: string
    isStarred?: boolean
    isPinned?: boolean
    blocked?: boolean
    characterId?: string
    relationshipNote?: string
    /** 缺省私聊；group = 相关群聊会话 */
    kind?: 'dm' | 'group'
    groupName?: string
    members?: Array<{
      key: string
      contactId?: string
      nickname: string
      remarkName?: string
      avatarUrl?: string
      isContact: boolean
      relationshipNote?: string
    }>
    messages: Array<{
      from: 'player' | 'character'
      content: string
      timestamp: number
      translation?: string
      senderKey?: string
      senderNickname?: string
      senderAvatarUrl?: string
      isContactSender?: boolean
      special?:
        | { kind: 'red_packet'; amountYuan?: number; remark?: string; opened?: boolean }
        | { kind: 'transfer'; transferId?: string; amountYuan?: number; note?: string; status?: 'pending' | 'accepted' | 'returned' }
        | { kind: 'sticker'; label?: string; imageUrl?: string }
        | { kind: 'image'; imageUrl?: string; mime?: string }
        | {
            kind: 'voice_call'
            status: 'rejected' | 'no_answer' | 'duration'
            durationSec?: number
            lines?: Array<{ role: 'character' | 'player'; text: string; translation?: string }>
          }
        | { kind: 'location'; name: string; address?: string; distance?: string }
    }>
  }>
  moments: Array<{
    id: string
    content: string
    visibility: string
    likes: string[]
    comments: Array<{ from: string; content: string }>
  }>
  bills: Array<{ id: string; date: string; target: string; amount: number; remark: string }>
  affectionCards: Array<{ id: string; holder: string; limit: number; spent: number }>
}

type SpyContactMessage = SpyWechatGeneratedData['contacts'][number]['messages'][number]

function imageDataUrlFromWeChat(m: WeChatChatMessage): string | undefined {
  const img = m.images?.[0]
  if (!img?.base64?.trim()) return undefined
  const mime = (img.type || 'image/jpeg').trim() || 'image/jpeg'
  const b64 = img.base64.trim()
  if (b64.startsWith('data:')) return b64
  return `data:${mime};base64,${b64}`
}

/**
 * 主微信私聊 → 镜像微信气泡。
 * 字段 from 保持 player/character：镜像 UI 以 character 为右侧机主，等价于相对用户手机左右翻转。
 */
function mapRealWeChatMessageToMirror(m: WeChatChatMessage): SpyContactMessage | null {
  if (m.isRecalled) return null
  if (m.ext?.centerSystemStrip || m.ext?.muteSuppressStrip) return null
  if (m.ext?.mutedMessageVisibleToModeratorsOnly) return null
  if (m.imageGenPending || m.imageGenAwaitingConfirm || m.imageGenFailed) return null

  const from: 'player' | 'character' = m.type === 'player' ? 'player' : 'character'
  const timestamp =
    typeof m.timestamp === 'number' && Number.isFinite(m.timestamp) && m.timestamp > 0
      ? m.timestamp
      : Date.now()

  if (m.redPacket) {
    return {
      from,
      content: (m.content || m.redPacket.remark || '[红包]').trim() || '[红包]',
      timestamp,
      special: {
        kind: 'red_packet',
        amountYuan: m.redPacket.amountYuan,
        remark: m.redPacket.remark,
        opened: m.redPacket.opened,
      },
    }
  }

  if (m.transfer?.transferId?.trim()) {
    const transferId = m.transfer.transferId.trim()
    let amountYuan: number | undefined
    let status: 'pending' | 'accepted' | 'returned' = 'pending'
    let note = (m.content || '').trim() || undefined
    const rec = getLumiTransferFresh(transferId, () => Date.now())
    if (rec) {
      if (Number.isFinite(rec.amount) && rec.amount > 0) amountYuan = rec.amount
      status = rec.status
      if (!note && rec.remark?.trim()) note = rec.remark.trim()
    }
    return {
      from,
      content: note || '[转账]',
      timestamp,
      special: {
        kind: 'transfer',
        transferId,
        amountYuan: amountYuan ?? 88,
        note,
        status,
      },
    }
  }

  if (m.stickerRef?.trim()) {
    const url = resolveStickerOutputRef(m.stickerRef) || undefined
    return {
      from,
      content: (m.content || `[表情包]${m.stickerRef}`).trim(),
      timestamp,
      special: { kind: 'sticker', label: m.stickerRef.trim(), imageUrl: url },
    }
  }

  const imageUrl = imageDataUrlFromWeChat(m)
  if (imageUrl) {
    return {
      from,
      content: (m.content || m.imageDescription || '[图片]').trim() || '[图片]',
      timestamp,
      special: { kind: 'image', imageUrl, mime: m.images?.[0]?.type },
    }
  }

  const content = String(m.content ?? '').trim()
  if (!content) return null
  return { from, content, timestamp }
}

async function loadRealPrivateChatMessagesForMirror(params: {
  characterId: string
  playerIdentityId: string
  character: Character | null
}): Promise<SpyContactMessage[]> {
  const cid = params.characterId.trim()
  const appPid = params.playerIdentityId.trim() || '__none__'
  if (!cid || !appPid || appPid === '__none__') return []

  const sessionPid = resolvePrivateChatSessionPlayerIdentityId(params.character, appPid).trim() || appPid
  const keys: string[] = []
  try {
    const bundle = await loadAccountsBundle()
    const acc = bundle?.currentAccountId?.trim() || ''
    if (acc) {
      keys.push(
        await resolvePrivateChatMessageStorageKey({
          wechatAccountId: acc,
          characterId: cid,
          appSessionPlayerIdentityId: sessionPid,
        }),
      )
    }
  } catch {
    /* 无马甲时走旧键 */
  }
  keys.push(wechatConversationKey(cid, sessionPid))
  if (sessionPid !== appPid) keys.push(wechatConversationKey(cid, appPid))

  const seen = new Set<string>()
  let best: WeChatChatMessage[] = []
  for (const k of keys) {
    const key = k.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    try {
      const rows = await personaDb.listWeChatChatMessagesByConversationKey(key)
      if (rows.length > best.length) best = rows
    } catch {
      /* ignore */
    }
  }

  const out: SpyContactMessage[] = []
  for (const m of best) {
    const mapped = mapRealWeChatMessageToMirror(m)
    if (!mapped) continue
    if (!mapped.special) {
      const inferred = inferSpySpecialFromContent(mapped.content)
      if (inferred) mapped.special = inferred
    }
    out.push(mapped)
  }
  return out
}

/** 模型/解析偶发把提示语残片或占位写成备注（如「；联系人」）；保留 AAA/颜文字/emoji 等合法花样 */
function isGarbageMirrorRemark(raw: string): boolean {
  const t = String(raw ?? '').trim()
  if (!t) return true
  // 仅拦截「整段都是」或「以中文分号说明残片开头」；勿误杀 (´∀｀)、❤️、AAA 等
  if (/^[;；:：,，.。、\s]+$/.test(t)) return true
  if (/^[;；]/.test(t)) return true
  if (/^(联系人|用户|朋友|对方|未命名|（待定）|\(待定\)|remark|nickname)$/i.test(t)) return true
  if (/私藏侧写|禁止照搬|XX狗|XX猫|请按我与|角色视角|线上备注已有|备注分层/.test(t)) return true
  return false
}

async function resolveCharRemarkForUser(params: {
  characterId: string
  playerIdentityId: string
  character: Character | null
  playerDisplayName: string
  aiSuggestedRemark?: string
}): Promise<string> {
  const cid = params.characterId.trim()
  const piid = params.playerIdentityId.trim()
  const display = params.playerDisplayName.trim() || '朋友'

  try {
    const doc = await loadObservationNotes({
      conversationCharacterId: cid,
      playerIdentityId: piid,
      charDisplayName: params.character?.name || '角色',
      seedIfEmpty: false,
    })
    const fromSide = (doc?.remarkNickname || '').trim()
    if (fromSide && !isGarbageMirrorRemark(fromSide)) return fromSide
    const preferred = (doc?.preferredAddress || '').trim()
    if (preferred && !isGarbageMirrorRemark(preferred)) return preferred
  } catch {
    /* ignore */
  }

  try {
    const rels = await personaDb.listRelationshipsForIdentity(piid)
    const hit = rels.find(
      (r) =>
        (r.fromCharacterId === cid && r.toCharacterId === piid) ||
        (r.fromCharacterId === piid && r.toCharacterId === cid),
    )
    if (hit) {
      // 只用「怎么叫对方」；relation 是关系类型词（女友/同事），不宜当微信备注
      if (hit.fromCharacterId === cid) {
        const call = (hit.fromCallsTo || '').trim()
        if (call && !isGarbageMirrorRemark(call)) return call
      } else {
        const callBack = (hit.fromCallsTo || '').trim()
        if (callBack && !isGarbageMirrorRemark(callBack)) return callBack
      }
    }
  } catch {
    /* ignore */
  }

  const ai = (params.aiSuggestedRemark || '').trim()
  // 接受模型花样备注（AAA/颜文字/emoji/姓名括号等），仅拦截垃圾占位
  if (ai && !isGarbageMirrorRemark(ai)) return ai
  if (display && !isGarbageMirrorRemark(display)) return display
  return '宝宝'
}

async function askModelMarkupWithRetry<T>(
  cfg: ApiConfig,
  baseSystem: string,
  userTask: string,
  parse: (raw: string) => T | null,
  maxRetry = 2,
  signal?: AbortSignal,
): Promise<T> {
  let lastRaw = ''
  for (let i = 0; i < maxRetry; i += 1) {
    throwIfAborted(signal)
    const raw = await openAiCompatibleChat(
      cfg,
      [
        { role: 'system', content: baseSystem },
        { role: 'user', content: userTask },
      ],
      { temperature: 0.72, signal },
    )
    lastRaw = raw
    const parsed = parse(raw)
    if (parsed) return parsed
  }
  throw new Error(`模型输出格式不稳定（多次重试失败）：${lastRaw.slice(0, 220)}`)
}

export async function generateSpyWechatData(params: {
  apiConfig: ApiConfig | null
  characterId: string
  playerIdentityId: string
  playerDisplayName: string
  /** 主微信当前会话里用户设置的头像（优先于身份卡头像） */
  playerWechatAvatarUrl?: string | null
  /** 主微信当前用户昵称（会话/马甲昵称，优先于身份卡姓名） */
  playerWechatNickname?: string | null
  useLumiProjectAssistantPrompt: boolean
  scope?: 'contacts' | 'chats' | 'moments' | 'me'
  options: SpyWechatGenerateOptions
  /** 进度文案（如「正在生成聊天 1/3」），供 UI 展示 */
  onProgress?: (message: string) => void
  /** 用户中途停止 */
  signal?: AbortSignal
}): Promise<SpyWechatGeneratedData> {
  const signal = params.signal
  const cfg = params.apiConfig
  if (!cfg?.apiUrl?.trim() || !cfg.apiKey?.trim() || !cfg.modelId?.trim()) throw new Error('未配置 AI API')

  const scope = params.scope || 'contacts'
  const needContacts = scope === 'contacts'
  const needChats = scope === 'chats'
  const needMoments = scope === 'moments'
  const needMe = scope === 'me'

  const cid = params.characterId.trim()
  const piid = params.playerIdentityId.trim()
  const character = cid ? ((await personaDb.getCharacter(cid)) as Character | null) : null
  const playerIdentity =
    piid && piid !== '__none__' ? ((await personaDb.getPlayerIdentity(piid)) as PlayerIdentity | null) : null
  const memoryNotes = (await personaDb.formatCharacterMemoriesForPrompt(cid)).trim() || undefined
  const recentMsgs = await personaDb.listWeChatChatMessagesRecentByCharacter({ characterId: cid, limit: 40 })
  const recentMsgText = recentMsgs
    .map((m) => `${m.type === 'player' ? '用户' : '角色'}: ${m.content}`)
    .join('\n')
    .slice(0, 5000)

  let worldBackgroundPrompt: string | undefined
  if (character?.worldBackgroundId?.trim()) {
    const bg = await personaDb.getWorldBackground(character.worldBackgroundId.trim())
    const block = formatWorldBackgroundForPrompt(bg)
    if (block.trim()) worldBackgroundPrompt = block
  }

  const o = params.options
  const playerContactId = getSpyPlayerContactId(piid)
  // 通讯录「昵称」= 对方微信公开昵称，禁止用身份卡真名盖掉
  const playerNick =
    (params.playerWechatNickname || '').trim() ||
    (params.playerDisplayName || '').trim() ||
    (playerIdentity?.wechatNickname || '').trim() ||
    (playerIdentity?.name || '').trim() ||
    '朋友'
  const playerAvatar =
    (params.playerWechatAvatarUrl || '').trim() || (playerIdentity?.avatarUrl || '').trim()

  const promptMode = params.useLumiProjectAssistantPrompt ? 'lumi-assistant' : 'persona'
  const offlineDatingPlotsContext =
    promptMode === 'persona' && cid ? await loadOfflineDatingPlotsPromptBlock(cid, character?.name ?? null) : ''

  const wbSpyIds = [cid].map((x) => String(x ?? '').trim()).filter((x) => x && x !== '__none__')
  const baseSystem = buildSystemContent({
    character,
    playerIdentity,
    playerDisplayName: playerNick,
    promptMode,
    longTermMemoryNotes: memoryNotes,
    worldBackgroundPrompt,
    offlineDatingPlotsContext: offlineDatingPlotsContext || undefined,
    chatMemberIds: wbSpyIds,
  })

  let sideWriteRemarkHint = ''
  try {
    const obs = await loadObservationNotes({
      conversationCharacterId: cid,
      playerIdentityId: piid,
      charDisplayName: character?.name || '角色',
      seedIfEmpty: false,
    })
    const rn = (obs?.remarkNickname || '').trim()
    const pa = (obs?.preferredAddress || '').trim()
    if (rn && !isGarbageMirrorRemark(rn)) {
      sideWriteRemarkHint = `私藏侧写「线上备注」已有「${rn}」。对用户本行备注必须原样使用此值，禁止改写。`
    } else if (pa && !isGarbageMirrorRemark(pa)) {
      sideWriteRemarkHint = `私藏侧写暂无线上备注，但有「喜欢的称呼」：${pa}。可作用户本行备注内核，允许加 AAA/颜文字/emoji 等花样包装（贴合关系亲密度）。`
    } else {
      sideWriteRemarkHint =
        '私藏侧写暂无线上备注。请按我与用户的关系亲密度写用户本行备注：关系越好越可花样（颜文字/emoji/AAA 置顶检索前缀等）；一般认识则姓名或「姓名（来源）」即可。禁止 XX狗/XX猫、禁止「联系人」占位、禁止照抄本段说明。'
    }
  } catch {
    sideWriteRemarkHint =
      '请按我与用户的关系亲密度写备注（亲近可花样，一般则姓名/来源备注）。禁止「联系人」或说明残片。'
  }

  const remarkStyleRule = `
【通讯录备注风格 · 按关系亲疏多样化】
备注是「我（角色）手机通讯录里给对方起的显示名」，不是对方微信昵称。
- 关系很好 / 恋人 / 死党 / 家人（很亲）：允许花样备注（颜文字、emoji、字符心♡♥、叠字宠称、外号均可）。可用 AAA / AA / A 等字母开头便于检索（≠星标）。爱心形态不限：❤️💕 或 ♡♥ 或颜文字都行。
- 关系一般 / 同事 / 同学 / 点头之交 / 业务往来：通常用对方姓名；或「姓名（来源/关系）」实用备注。
- 刚认识 / 一次性联系：姓名或「姓名（场合）」，不要过度亲昵。
- 拉黑对象：冷淡全名或「姓名（已无关）」一类，忌继续用腻称。
- 【严禁照搬】禁止把提示里的示范宠称/示范姓名/示范整句原样抄进备注（如提示曾写过的「宝宝」「小醋包」等固定串）；必须按该联系人真实称呼与人设**自拟**；全员同模板、XX狗/XX猫、「联系人/用户」占位、把说明文字抄进字段一律禁止。
- 星标与置顶仍是独立开关，与备注是否以 A 开头无关；每人另写「关系」字段（与角色的真实关系，不是星标状态）。
`.trim()

  const boundNpcs = (await personaDb.listNpcsFor(cid)).filter((x) => x?.id && x.generatedForCharacterId === cid)
  const boundNpcSeedList = boundNpcs.slice(0, 50).map((n) => ({
    characterId: n.id,
    nickname: (n.wechatNickname || n.name || '').trim(),
    avatarUrl: (n.avatarUrl || '').trim(),
  }))

  const strictGuard = `
输出硬性规则：
- 所有内容必须贴合角色人设、最近对话、长期记忆，不得 OOC。
- “谁给谁红包/转账/礼物”方向绝对不能写反。
- 禁止 JSON；禁止 markdown 代码围栏；禁止前后解释；只输出规定标记块。
【重要】下文「最近对话摘录」是**角色与现实用户**在主微信单聊里的片段，仅供把握语气与剧情线索；后续若要求生成「某联系人的聊天记录」，对话双方是**角色 ↔ 该联系人本人**，**不是**角色在对现实用户说话，也**禁止**把联系人当成第三人背后议论（例如聊天对象叫「林悦」时，禁止写成「林悦她怎样」像在跟外人聊林悦；应写成对「你/林悦」直接说话）。
【用户本机会话】与现实用户的私聊记录由系统从主微信**原样复制**到镜像，禁止模型编造用户聊天气泡。
最近对话摘录：
${recentMsgText || '（暂无）'}
`.trim()

  const boundNpcSeedText = boundNpcSeedList.length
    ? boundNpcSeedList
        .map(
          (n, i) =>
            `${i + 1}. characterId=${n.characterId}｜昵称=${n.nickname || '（无）'}｜头像参考=${n.avatarUrl ? '有' : '无'}`,
        )
        .join('\n')
    : '（暂无绑定人脉 NPC）'

  const emptyResult = (): SpyWechatGeneratedData => ({
    profile: {
      nickname: (character?.wechatNickname || character?.name || '角色').toString().trim() || '角色',
      avatarUrl: (character?.avatarUrl || '').trim() || undefined,
      signature: (character?.wechatSignature || '').toString().trim(),
    },
    contacts: [],
    moments: [],
    bills: [],
    affectionCards: [],
  })

  // —— 朋友圈 / 我页：只打对应一轮 API ——
  if (needMoments) {
    const momentsPayload = await askModelMarkupWithRetry(
      cfg,
      `${baseSystem}\n\n${strictGuard}`,
      `
只生成朋友圈。
要求：
1) 包含点赞与评论互动。
2) 含“屏蔽用户可见”内容：${o.includeMomentsHideFromUser ? '是' : '否'}。
3) 含“非用户仅TA可见”内容：${o.includeMomentsOnlyTaVisibleWithoutUser ? '是' : '否'}。

${buildMirrorGenerateLanguageAppendix(o, 'moments')}

${SPY_MOMENTS_FORMAT}
`.trim(),
      parseSpyMomentsMarkup,
      2,
      signal,
    )
    return { ...emptyResult(), moments: momentsPayload.moments || [] }
  }

  if (needMe) {
    const financialPayload = await askModelMarkupWithRetry(
      cfg,
      `${baseSystem}\n\n${strictGuard}`,
      `
只生成财务数据：
1) 微信账单流水（日期/对象/金额/备注）
2) 亲情卡（给谁开通、限额与已用）

${SPY_FINANCIAL_FORMAT}
`.trim(),
      parseSpyFinancialMarkup,
      2,
      signal,
    )
    const base = emptyResult()
    return {
      ...base,
      profile: {
        ...base.profile,
        avatarUrl:
          (character?.avatarUrl || pickFromPool(EXTRA_AVATAR_URLS, `profile:${cid}`) || '').trim() || undefined,
      },
      bills: financialPayload.bills || [],
      affectionCards: financialPayload.affectionCards || [],
    }
  }

  // —— 通讯录：只生成资料+联系人，绝不生成聊天记录 ——
  type ContactDraft = {
    id: string
    nickname: string
    remarkName: string
    avatarBucket?: ExtraAvatarBucket
    avatarUrl?: string
    isStarred?: boolean
    isPinned?: boolean
    blocked?: boolean
    characterId?: string
    relationshipNote?: string
    kind?: 'dm' | 'group'
    groupName?: string
    members?: SpyWechatGeneratedData['contacts'][number]['members']
  }

  let contactDrafts: ContactDraft[] = []
  let normalizedProfile: SpyWechatGeneratedData['profile'] = emptyResult().profile

  if (needContacts) {
    const profileAndContacts = await askModelMarkupWithRetry(
      cfg,
      `${baseSystem}\n\n${strictGuard}`,
      `
先只生成「资料 + 联系人基础信息（不含聊天记录）」。
【硬性】本任务禁止输出任何聊天气泡/消息行；只输出资料块与联系人块。
${remarkStyleRule}
要求：
1) **必须**包含「现实用户」这一行联系人：id 固定为 ${playerContactId}；昵称必须原样写「${playerNick}」（对方微信公开昵称，禁止改成真名）；characterId 留空；头像桶可留空。
   用户本行备注（角色视角）：${sideWriteRemarkHint}
2) 必须包含我绑定的人脉 NPC（见下方固定列表），这些 NPC 的 characterId 不得修改；每人备注按与我的真实亲疏来写（亲近可花样，一般则姓名/括号来源）。
3) 联系人总量约 ${o.contactCount}（含用户本行 + 固定 NPC + 少量额外联系人）。备注风格要有区分：通讯录里多数应是姓名/实用备注，仅少数亲近的才花样/AAA 前缀。
4) 联系人偏向：${o.contactBias || '与近期剧情最相关的人群'}。
5) 是否包含拉黑联系人：${o.includeBlocked ? '是' : '否'}。
6) 若为“额外联系人”（characterId 为空且 id 不是 ${playerContactId}），必须给出头像桶，只能取：
   abstract | maleE | elderFemale | elderMale | maleI | femaleCute | femaleCool
   桶含义：
   - elderFemale：妈妈/阿姨/姑/婶/奶奶/外婆/女长辈/女老师风格
   - elderMale：爸爸/叔叔/伯伯/舅舅/爷爷/外公/男长辈/男老师风格
   - femaleCute：可爱活泼/元气甜妹/闺蜜风
   - femaleCool：清冷御姐/成熟克制/高冷风
   - maleE：阳光外向/热情直球/运动少年感
   - maleI：清冷内向/克制疏离/冷淡感
   - abstract：抽象搞笑/表情包头像/整活号
7) 「星标」与「置顶」完全由模型按**本角色人设与真实亲疏**判定，禁止混为一谈，也禁止按头衔机械勾选：
   - 星标 = 通讯录「星标朋友」；仅角色心理上愿意收藏的人。血缘近 ≠ 必须星标（与家里人关系差、刻意疏远则可以不星标）。
   - 置顶 = 信息页会话置顶栏；仅角色日常会优先打开的会话（工作对接、恋人/暧昧、真正亲近的人、近期剧情高频联系等）。父母/上司等若关系冷淡或不愿往来，可以不置顶。
   - 点头之交、路人、一次性、已拉黑不要置顶/星标；也不要全员置顶。置顶数量按该角色习惯自拟（可少可多），禁止只因「是家人/是工作」就一律勾是。
   - 备注以 A/AAA 开头 ≠ 必须星标或置顶。每人必须填「关系」字段（简体中文，≤20 字，写真实关系，不是星标状态）。
固定 NPC 列表（必须全部包含；昵称/头像仅作参考，最终以前端数据库为准）：
${boundNpcSeedText}

${buildMirrorGenerateLanguageAppendix(o, 'contacts')}

${SPY_PROFILE_CONTACTS_FORMAT}
`.trim(),
      parseSpyProfileContactsMarkup,
      2,
      signal,
    )

    normalizedProfile = {
      nickname:
        (character?.wechatNickname || character?.name || profileAndContacts.profile?.nickname || '角色')
          .toString()
          .trim() || '角色',
      avatarUrl:
        (character?.avatarUrl || profileAndContacts.profile?.avatarUrl || pickFromPool(EXTRA_AVATAR_URLS, `profile:${cid}`)) ||
        undefined,
      signature: (character?.wechatSignature || profileAndContacts.profile?.signature || '').toString().trim(),
    }

    contactDrafts = (profileAndContacts.contacts || []).map((c) => ({
      id: c.id,
      nickname: c.nickname || c.remarkName || '联系人',
      remarkName: c.remarkName,
      avatarBucket: normalizeBucket(c.avatarBucket),
      avatarUrl: undefined,
      isStarred: c.isStarred,
      isPinned: c.isPinned,
      blocked: c.blocked,
      characterId: c.characterId,
      relationshipNote: (c.relationshipNote || '').trim() || undefined,
    }))
  } else if (needChats) {
    // 聊天碎片：复用已有通讯录，不再重跑通讯录 AI（排除群会话）
    const snap = (o.currentContactsSnapshot || []).filter(
      (c) => c.kind !== 'group' && !String(c.id || '').startsWith('group:'),
    )
    if (!snap.length) throw new Error('请先同步通讯录关系网，方可提取聊天碎片。')
    contactDrafts = snap.map((c) => ({
      id: c.id,
      nickname: c.nickname || c.remarkName || '联系人',
      remarkName: c.remarkName,
      characterId: c.characterId,
      isStarred: c.isStarred,
      isPinned: c.isPinned,
      blocked: c.blocked,
      avatarUrl: (c.avatarUrl || '').trim() || undefined,
      relationshipNote: (c.relationshipNote || '').trim() || undefined,
    }))
    normalizedProfile = emptyResult().profile
  }

  // 归一化：确保用户本行 id 固定；模型若写错 id，用无 characterId 的行兜底合并
  {
    const byId = new Map(contactDrafts.map((c) => [c.id, c] as const))
    let playerRow = byId.get(playerContactId)
    if (!playerRow) {
      const orphan = contactDrafts.find((c) => !c.characterId?.trim() && c.id !== playerContactId)
      if (orphan) {
        byId.delete(orphan.id)
        playerRow = { ...orphan, id: playerContactId, characterId: undefined }
        byId.set(playerContactId, playerRow)
      } else {
        playerRow = {
          id: playerContactId,
          nickname: playerNick,
          remarkName: playerNick,
          characterId: undefined,
        }
        byId.set(playerContactId, playerRow)
      }
    } else {
      playerRow = { ...playerRow, id: playerContactId, characterId: undefined }
      byId.set(playerContactId, playerRow)
    }
    contactDrafts = Array.from(byId.values())
  }

  const messagesByContact = new Map<string, SpyWechatGeneratedData['contacts'][number]['messages']>()

  // 用户本行：无论通讯录还是信息页，一律从主微信原样复制（无 AI、几乎零耗时）
  {
    const realUserMessages = await loadRealPrivateChatMessagesForMirror({
      characterId: cid,
      playerIdentityId: piid,
      character,
    })
    messagesByContact.set(playerContactId, realUserMessages)
  }

  if (needChats) {
    // 候选：排除用户本行；未勾选则排除拉黑
    const eligible = contactDrafts.filter((c) => {
      if (!c.id || c.id === playerContactId) return false
      if (c.blocked && !o.includeBlocked) return false
      return true
    })
    const eligibleIdSet = new Set(eligible.map((c) => c.id))
    const explicitIds = (o.chatTargetContactIds || [])
      .map((x) => String(x || '').trim())
      .filter((id) => id && eligibleIdSet.has(id))
    let chatTargets: string[]
    if (explicitIds.length) {
      // UI 勾选优先；置顶若未勾选也不强行塞入
      chatTargets = Array.from(new Set(explicitIds)).slice(0, 20)
    } else {
      const pinnedIds = eligible.filter((c) => !!c.isPinned).map((c) => c.id)
      const otherIds = eligible.filter((c) => !c.isPinned).map((c) => c.id)
      const want = Math.max(0, Math.min(20, Math.round(Number(o.chatContactsCount) || 0)))
      // 置顶全部保留（可超过数量）；其余填到 want
      chatTargets = [...pinnedIds]
      for (const id of otherIds) {
        if (chatTargets.length >= Math.max(want, pinnedIds.length)) break
        chatTargets.push(id)
      }
    }

    const storyNowMs = (await resolveCharacterStoryNowMs(cid)) || Date.now()
    const spanUnit: SpyChatTimeSpanUnit =
      o.chatTimeSpanUnit === 'week' || o.chatTimeSpanUnit === 'month' || o.chatTimeSpanUnit === 'year'
        ? o.chatTimeSpanUnit
        : 'day'
    const spanValue = Math.max(1, Math.round(Number(o.chatTimeSpanValue) || (spanUnit === 'day' ? 7 : 1)))
    const spanMs = chatTimeSpanToMs(spanUnit, spanValue)
    const spanStartMs = Math.max(0, storyNowMs - spanMs)
    const unitLabel =
      spanUnit === 'week' ? '周' : spanUnit === 'month' ? '月' : spanUnit === 'year' ? '年' : '天'
    const plotNowLabel = formatPlotStamp(storyNowMs)
    const plotStartLabel = formatPlotStamp(spanStartMs)
    const sampleMid = Math.round(spanStartMs + (storyNowMs - spanStartMs) * 0.55)
    const sampleLate = Math.round(spanStartMs + (storyNowMs - spanStartMs) * 0.88)

    type ChatTargetMeta = {
      id: string
      peerCallName: string
      label: string
      relationshipNote: string
      avatarBucket?: string
    }
    const targetMetas: ChatTargetMeta[] = chatTargets.map((cidOne) => {
      const row = contactDrafts.find((c) => c.id === cidOne)
      const label = (row?.remarkName || row?.nickname || '联系人').trim() || '联系人'
      const rowCharacterId = row?.characterId?.trim()
      const npcMeta = rowCharacterId ? boundNpcs.find((n) => n.id === rowCharacterId) : undefined
      const peerCallName =
        (npcMeta?.name || npcMeta?.wechatNickname || row?.remarkName || row?.nickname || '该联系人').trim() ||
        '该联系人'
      return {
        id: cidOne,
        peerCallName,
        label,
        relationshipNote: (row?.relationshipNote || '').trim() || '未标注',
        avatarBucket: (row?.avatarBucket || '').trim() || undefined,
      }
    })

    const existingById = o.existingChatTranscriptsByContactId || {}
    const isAppend = o.chatsAppend === true

    const buildPriorChatAppendix = (metas: ChatTargetMeta[]) => {
      if (!isAppend) return ''
      const blocks = metas.map((t) => {
        const prior = existingById[t.id]
        if (!prior?.recentLines?.length && !prior?.earlierDigestLines?.length) {
          return `── id=${t.id}（${t.peerCallName}）──\n（暂无旧消息，可当新会话开聊，但仍须贴关系与偏向。）`
        }
        const earlier =
          prior.earlierDigestLines?.length > 0
            ? `更早按日骨架（已压缩，非全文）：\n${prior.earlierDigestLines.join('\n')}\n`
            : ''
        const recent = prior.recentLines?.length
          ? `近端原句（每行含时间，旧→新；禁止复述/重问）：\n${prior.recentLines.join('\n')}`
          : ''
        return `── id=${t.id}（${t.peerCallName}）｜库内共 ${prior.totalMessageCount || 0} 条，以下为摘要非全文 ──\n最后一条时间：${formatPlotStamp(prior.lastTimestamp)}（毫秒 ${prior.lastTimestamp}）\n${earlier}${recent}`
      })
      return `
【续写追加 · 硬项 · 最高优先之一】
本轮是在**已有会话之后追加新气泡**，不是重开一局聊天。
- **上下文策略**：不喂全文。每人只有「更早按日骨架 + 近端带时间短句」；旧消息再多也只看摘要，避免上下文爆炸。
- 下方摘要里**每条近端行都带时间**（含星期）。写新戳时必须晚于「最后一条时间」，并与摘要时序连贯。
- **禁止**重复摘要里已出现过的开场、同一问句、同一盘问路径（例如已问过「有没有喜欢的人 / 喜欢谁」等，禁止再问一遍；应承接对方已答内容往下追问或换新角度）。
- 只输出**本轮新增**的气泡；不要复读旧气泡原文。
- 新消息时间戳必须**严格晚于**该会话「最后一条时间」；优先贴近剧情「现在」（${plotNowLabel}），尤其聊到表白/告白/今天刚发生的事时，时间戳须落在剧情现在**同一自然日**附近，禁止把「今天已发生」写成跨度里更早的周三/几天前。
- 跨联系人事实要一致：若角色已对用户表白/在一起，对朋友转述时勿自相矛盾，时间上也要接得上。

【各联系人已有聊天摘要（非全文）】
${blocks.join('\n\n')}
`.trim()
    }

    // 用户本行近期锚点（表白等），供续写/跨人一致
    const userRecent = (messagesByContact.get(playerContactId) || []).slice(-12)
    const userAnchorLines = userRecent
      .map((m) => {
        const side = m.from === 'character' ? '角色' : '用户'
        const text = String(m.content || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 56)
        if (!text) return null
        return `时间 ${formatPlotStamp(m.timestamp)}｜${side}｜${text}`
      })
      .filter((x): x is string => !!x)
    const userAnchorBlock = userAnchorLines.length
      ? `
【角色↔现实用户 · 主微信近期锚点（只读摘要·带时间，禁止写进镜像私聊块）】
${userAnchorLines.join('\n')}
- 若锚点已含表白/在一起等进展，其它联系人闲聊转述时须与之时间一致（靠近 ${plotNowLabel}），禁止写成更早日期。
`.trim()
      : ''

    const buildBatchUserTask = (metas: ChatTargetMeta[]) => {
      const ids = metas.map((m) => m.id).join('、')
      const nameHints = metas.map((m) => `「${m.peerCallName}」`).join('、')
      const priorAppendix = buildPriorChatAppendix(metas)
      return `
请**一次**为下列全部联系人${isAppend ? '**续写追加**' : '生成'}各自与角色本人之间的私聊（共 ${metas.length} 人，每人一个 <<MIRROR_CHAT>> 块）。
目标名单（id 必须原样写入每块首行；作息须贴合「关系」）：
${metas
          .map((t, i) => {
            const bucket = t.avatarBucket ? `｜头像桶 ${t.avatarBucket}` : ''
            return `${i + 1}. id=${t.id}｜称呼「${t.peerCallName}」｜备注「${t.label}」｜关系「${t.relationshipNote}」${bucket}`
          })
          .join('\n')}

【对话身份（必须遵守，禁止串台）】
- 每一块 = **角色 ↔ 该块联系人**两人私聊，**不是**角色与现实 App 用户的主微信。
- **C** = 角色本人；**P** = 该块联系人一侧（≠ 现实用户；不得按「哄用户」来写）。
- 块与块之间禁止串台：A 的块里不得出现专属 B 的语气/事件；禁止把多人写进同一块。
- 对对方说话用「你」或对方昵称；禁止第三人称指称本会话对象。
- 称呼符合该二人关系；非恋人禁止「宝宝/宝贝」等，除非世界书明确二人已是情侣。
- 【禁止】编造「角色 ↔ 现实用户」对话；用户本行由系统复制。

【剧情时间铁律 · 最高优先级】
- 剧情「现在」= **${plotNowLabel}**（毫秒戳 ${storyNowMs}）。**禁止**用现实手机日期当剧情日；**禁止**任何消息时间戳 > ${storyNowMs}（不得出现剧情未来）。
- ${
        isAppend
          ? `续写时每条新戳须晚于该会话旧末条，且优先落在剧情现在附近（勿再摊到跨度开头）。`
          : `全部时间戳必须落在 **${plotStartLabel}**（${spanStartMs}）～ **${plotNowLabel}**（${storyNowMs}），即剧情现在往前 **${spanValue}${unitLabel}内**。`
      }
- 每块内时间戳单调不减；末几条接近剧情「现在」但不得超过。参考戳：${sampleMid}、${sampleLate}、${storyNowMs}。
- **时段与作息由你智能判断（硬项）**：结合对话语境、活动氛围，以及该联系人的关系/年龄段/身份，自行决定每段聊天落在合理钟点。系统不做关键词改戳——钟点违和就是你写错。
- **日常作息须像真人（硬项）**：
  - 父母/爷爷奶奶/外公外婆/叔伯姑姨/老师等**长辈**，以及头像桶 elderMale/elderFemale：活跃大致在白天到晚饭后（常见约 7:00–22:00）；**禁止**长辈在凌晨三四点、四五点主动刷屏或闲聊；极少数「醒得早」也最多落在清晨六七点，且内容像早起问候/问吃了没，而不是半夜煲电话粥式连发。
  - 同事/上司/业务往来：优先工作日白天与下班前后；少写工作日凌晨互撩。
  - 同学/同龄朋友：可稍晚，但仍忌无故全员凌晨四五点水聊。
  - 恋人/死党/夜猫子青年：允许偶尔深夜，也须有动机（失眠、加班、刚散场），禁止把所有人设都写成通宵党。
  - 正文已是晚上/夜里的场景时，禁止再打下午戳；场景与身份都模糊时，贴近剧情「现在」的钟点，并落在该人合理作息内。

${userAnchorBlock}

${priorAppendix}

要求：
1) 名单里每人恰好一块，id 必须是：${ids}（共 ${metas.length} 块，禁止漏人）。
2) 每块气泡不少于 ${o.minMessagesPerContact} 条（连发碎气泡会自然抬高条数）；可用 C/P、CRP/PRP、CTF/PTF、CVC/PVC+CL、CLOC/PLOC。
${
  o.includeSpecialMessages
    ? `3) 【特殊消息 · 硬项 · 已勾选】每人块内至少出现 **2 种** 特殊行（从下列四类里选，须用规范行，禁止只写「[红包]」等占位文字）：
   - 语音通话：CVC/PVC|毫秒戳|时长秒|duration（或 rejected / no_answer）；接通时 CL 条数须按时长（约每 10～14 秒一句：1 分钟≈4～8、3 分钟≈13～22、5 分钟≈21～37），禁止长通只写 2～4 句；**禁止一人一句轮流**，须有同侧连说 2～4 行；每行 CL|C/P|对白(声音旁白)；同步翻译时每条 CL 后跟 [译]……；拒接/未接不要 CL
   - 位置：CLOC/PLOC|毫秒戳|地点名|详细地址|距离文案（如「步行约300米」；地址写中文地名，勿写经纬度）
   - 红包：CRP/PRP|毫秒戳|金额|祝福语|pending或opened（一笔只写一侧；联系人→角色领取：仅 PRP|opened +【系统】你领取了对方的红包，禁止再写 CRP 发出气泡；角色→联系人：仅 CRP；已领系统条对应「对方领取了你的红包」）
   - 转账：CTF/PTF|毫秒戳|金额|备注|pending或accepted或returned（accepted 可下一行【系统】你已收款 / 对方已收款）
   关系越近（恋人/家人/死党）越适合红包/转账/通话；同事/点头之交优先位置或短通话。禁止全员同模板复制。窥探用户不可代领，已领态须用 opened/accepted + 系统条表达。`
    : `3) 可偶尔穿插语音通话（CVC/PVC+CL）/ 位置（CLOC/PLOC）/ 红包（CRP/PRP）/ 转账（CTF/PTF）；未强制时宁可少写也不要乱写。接通通话的 CL 须按时长密度（约每 10～14 秒一句），禁止一人一句轮流、禁止长通只写开场几句；半角括号内写声音旁白。`
}
4) **内容先贴人设与关系**，再用碎气泡呈现；不同联系人语气/话题要明显不同；禁止为「看起来像真人」而 OOC。
5) 聊天偏向 / 自定义（按点名分发到对应称呼 ${nameHints}；未点名的通则人人适用；偏向也不能压过人设）：
${(o.chatBias || '').trim() || '按各人与角色的关系自然铺开日常与情绪，勿空泛水聊。'}
【点名解析】
- 「林悦：暧昧；老王：工作」这类条款只进被点名的那一块；点名别人的条款禁止串进未点名块。

${buildMirrorGenerateLanguageAppendix(o, 'chats')}

${SPY_CHAT_ALIVE_STYLE}

${SPY_CHATS_BATCH_FORMAT}
`.trim()
    }

    const applyBatchPayload = (
      byContactId: Record<
        string,
        Array<{
          from: 'player' | 'character'
          content: string
          timestamp: number
          translation?: string
          special?: SpyWechatGeneratedData['contacts'][number]['messages'][number]['special']
        }>
      >,
    ) => {
      for (const meta of targetMetas) {
        const msgs = byContactId[meta.id]
        if (!msgs?.length) continue
        const prior = existingById[meta.id]
        if (isAppend && prior && prior.lastTimestamp > 0) {
          messagesByContact.set(
            meta.id,
            remapAppendMessagesIntoPlotSpan(msgs, spanStartMs, storyNowMs, prior.lastTimestamp),
          )
        } else {
          messagesByContact.set(meta.id, remapMessagesIntoPlotSpan(msgs, spanStartMs, storyNowMs))
        }
      }
    }

    params.onProgress?.(
      `正在一次生成 ${targetMetas.length} 人的聊天记录…\n整批只打一轮模型请求，请稍候`,
    )

    let chatGenAborted = false
    try {
      throwIfAborted(signal)
      const batch = await askModelMarkupWithRetry(
        cfg,
        `${baseSystem}\n\n${strictGuard}`,
        buildBatchUserTask(targetMetas),
        (raw) => {
          const parsed = parseSpyChatsBatchMarkup(raw)
          if (!parsed) return null
          // 至少解析出名单里一人即算成功（漏人下面整批补一轮）
          const hit = targetMetas.some((t) => (parsed.byContactId[t.id] || []).length > 0)
          return hit ? parsed : null
        },
        2,
        signal,
      )
      applyBatchPayload(batch.byContactId)
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) {
        chatGenAborted = true
        console.warn('[镜像微信] 批量聊天生成已停止')
      } else {
        console.warn('[镜像微信] 批量聊天生成失败，将尝试整批补全一轮:', e)
      }
    }

    // 遗漏补全：剩余多少人都只再打 **一整轮**，禁止按人拆轮
    const missing = !chatGenAborted
      ? targetMetas.filter((t) => !(messagesByContact.get(t.id) || []).length)
      : []
    if (missing.length) {
      params.onProgress?.(
        missing.length === targetMetas.length
          ? `批量未解析到聊天，正在整批重试（${missing.length} 人·仅 1 轮）…`
          : `已生成部分会话；正在一次补全剩余 ${missing.length} 人（仅 1 轮）…`,
      )
      try {
        throwIfAborted(signal)
        const fill = await askModelMarkupWithRetry(
          cfg,
          `${baseSystem}\n\n${strictGuard}`,
          buildBatchUserTask(missing),
          (raw) => {
            const parsed = parseSpyChatsBatchMarkup(raw)
            if (!parsed) return null
            const hit = missing.some((t) => (parsed.byContactId[t.id] || []).length > 0)
            return hit ? parsed : null
          },
          2,
          signal,
        )
        applyBatchPayload(fill.byContactId)
      } catch (e) {
        if (isAbortError(e) || signal?.aborted) {
          chatGenAborted = true
          console.warn('[镜像微信] 补全已停止')
        } else {
          console.warn('[镜像微信] 整批补全失败（不再按人拆轮）:', e)
        }
      }
    }

    const stillMissing = targetMetas.filter((t) => !(messagesByContact.get(t.id) || []).length)
    if (stillMissing.length) {
      console.warn(
        `[镜像微信] 仍有 ${stillMissing.length} 人无会话（已放弃单人兜底）：`,
        stillMissing.map((m) => m.label).join('、'),
      )
    }

    // 相关群聊（可选）：与本次私聊名单相关
    if (!chatGenAborted && o.generateRelatedGroups) {
      const groupWant = Math.min(8, Math.max(1, Math.round(Number(o.relatedGroupsCount) || 2)))
      const dmToneLines = targetMetas
        .map((t, i) => {
          const row = contactDrafts.find((c) => c.id === t.id)
          const rel = (row?.relationshipNote || '未标注').trim() || '未标注'
          const msgs = messagesByContact.get(t.id) || []
          const sample = msgs
            .slice(-6)
            .map((m) => {
              const side = m.from === 'character' ? 'C' : 'P'
              const text = String(m.content || '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 36)
              return text ? `${side}:${text}` : null
            })
            .filter((x): x is string => !!x)
            .join(' / ')
          const toneHint = sample
            ? `私聊近端气质参考：${sample}`
            : '（本轮暂无私聊样例，严格按关系字段把握亲疏与态度）'
          return `${i + 1}. id=${t.id}｜称呼「${t.peerCallName}」｜备注「${t.label}」｜关系「${rel}」｜${toneHint}`
        })
        .join('\n')
      const groupBias = (o.groupChatCustomBias || '').trim() || '按通讯录关系自然铺开群话题，勿灌水。'
      params.onProgress?.(`正在生成相关群聊（${groupWant} 个）…\n请稍候`)
      try {
        const groupPayload = await askModelMarkupWithRetry(
          cfg,
          `${baseSystem}\n\n${strictGuard}`,
          `
请为角色生成与下列私聊联系人相关的群聊（恰好 ${groupWant} 个 <<MIRROR_GROUP_CHAT>> 块，可 ±1）。
相关联系人名单（群成员里应尽量包含其中若干人；也可混入陌生人网友）：
${dmToneLines}

【群聊规则 · 硬性】
- **禁止 JSON / 代码围栏 / 前后解释**；只输出 <<MIRROR_GROUP_CHAT>> 标记块（与私聊同格式体系）。
- 群名要像真微信；群话题贴合人设与名单关系。
- 成员：通讯录写 id；非通讯录写 s:微信昵称|头像桶|关系。
  - **通讯录已有的人必须写名单里的 id**（如 contact_a），禁止再用 s:同名重开；否则头像会对不上。
  - 仅「确实不在上方名单」的人才用 s:…；头像桶仅允许：abstract|maleE|elderFemale|elderMale|maleI|femaleCute|femaleCool。
  - **禁止**输出头像 URL、data:、http 链接；只写桶名。
  - 陌生人关系≤20 字必填：写清「为何同群却不是好友」（如前同事·已删好友、高中同学未加好友、同城网友）；禁止写成星标好友。
- 消息：C=角色；G|ts|成员键|正文（成员键必须与上方成员一致）。禁止把现实 App 用户写进群。
- 时间戳落在 ${spanStartMs}～${storyNowMs}（剧情现在 ${plotNowLabel}）；**禁止**任何戳 > ${storyNowMs}。
- **时段与作息由你智能判断**：按群聊语境与成员身份对齐钟点（晚间场景勿打下午戳）；长辈/elder 桶成员禁止凌晨三四点、四五点在群里刷屏；系统不做关键词改戳。
- 每群气泡不少于 ${Math.max(6, Math.round(Number(o.minMessagesPerContact) || 8))} 条。
- 自定义要求：${groupBias}

【私聊↔群聊态度统一 · 最高优先之一】
- 上表每人的「关系」+「私聊近端气质」是该人在群里的人设锚点。
- 例：前任 / 冷战 / 不愉快私聊 → 群里对该人须保持距离感（冷淡、少接、客套、装不熟或刺一下），**禁止**突然变热络损友或甜蜜互撩。
- 角色（C）在群里对某人的接话也要贴双方关系，禁止对刚吵完/前任对象突然换人设哄。
- 群热闹不等于人人都嗨；关系差的人可以沉默、短回、阴阳，再多人设也不得 OOC。
- 群活跃时段也须像真人：家人群/长辈群偏白天到晚饭后；年轻人游戏群才更常深夜。

${buildMirrorGenerateLanguageAppendix(o, 'chats')}

${SPY_CHAT_ALIVE_STYLE}

${SPY_GROUPS_BATCH_FORMAT}
`.trim(),
          (raw) => {
            const parsed = parseSpyGroupsBatchMarkup(raw)
            if (!parsed?.groups?.length) return null
            return parsed
          },
          2,
          signal,
        )

        const contactById = new Map(contactDrafts.map((c) => [c.id, c] as const))
        for (const g of groupPayload.groups) {
          const members = (g.members || []).map((m) => {
            if (m.isContact && m.contactId) {
              const row = contactById.get(m.contactId)
              if (row) {
                return {
                  key: m.contactId,
                  contactId: m.contactId,
                  nickname: (row.nickname || row.remarkName || m.nickname || m.contactId).trim(),
                  remarkName: (row.remarkName || row.nickname || '').trim() || undefined,
                  avatarUrl: row.avatarUrl,
                  isContact: true as const,
                  relationshipNote:
                    (row.relationshipNote || m.relationshipNote || '').trim().slice(0, 20) || undefined,
                }
              }
            }
            const nick = (m.nickname || m.key.replace(/^s:/i, '') || m.contactId || '').trim() || '网友'
            // 模型常把通讯录好友写成 s:林思佳 → 按昵称/备注挂回通讯录，共用头像
            const matched = findMirrorDmContactByName(contactDrafts, nick)
            if (matched) {
              return {
                key: matched.id,
                contactId: matched.id,
                nickname: (matched.nickname || matched.remarkName || nick).trim(),
                remarkName: (matched.remarkName || matched.nickname || '').trim() || undefined,
                avatarUrl: matched.avatarUrl,
                isContact: true as const,
                relationshipNote: (matched.relationshipNote || '').trim().slice(0, 20) || undefined,
              }
            }
            const relationshipNote =
              (m.relationshipNote || '').trim().slice(0, 20) || '群友·非好友'
            const avatarUrl = resolveLocalExtraAvatarUrl({
              seed: `s:${nick}`,
              personaText: `${nick} ${relationshipNote}`,
              preferredBucket: m.avatarBucket,
            })
            return {
              key: `s:${nick}`,
              nickname: nick,
              avatarUrl,
              isContact: false as const,
              relationshipNote,
            }
          })
          const memberByKey = new Map(members.map((m) => [m.key, m] as const))
          // 也允许用裸昵称命中 s:昵称
          for (const m of members) {
            if (!m.isContact) memberByKey.set(m.nickname, m)
          }

          const remapped = remapMessagesIntoPlotSpan(g.messages || [], spanStartMs, storyNowMs).map((msg) => {
            if (msg.from === 'character' || !msg.senderKey) {
              return {
                from: msg.from,
                content: msg.content,
                timestamp: msg.timestamp,
                translation: msg.translation,
                special: msg.special,
              }
            }
            const key = msg.senderKey.trim()
            const mem =
              memberByKey.get(key) ||
              memberByKey.get(key.startsWith('s:') ? key : `s:${key}`) ||
              memberByKey.get(key.replace(/^s:/i, ''))
            const displayNick =
              mem?.isContact
                ? (mem.remarkName || mem.nickname || msg.senderNickname || key).trim()
                : (mem?.nickname || msg.senderNickname || key.replace(/^s:/i, '')).trim()
            return {
              from: 'player' as const,
              content: msg.content,
              timestamp: msg.timestamp,
              translation: msg.translation,
              special: msg.special,
              senderKey: mem?.key || key,
              senderNickname: displayNick,
              senderAvatarUrl: mem?.avatarUrl,
              isContactSender: mem?.isContact ?? false,
            }
          })

          const groupId = g.id.startsWith('group:') ? g.id : `group:${g.id.replace(/^group_/, '')}`
          const groupName = (g.groupName || '群聊').trim() || '群聊'
          // 群头像：优先用首个通讯录成员头像，否则陌生人
          const cover =
            members.find((m) => m.isContact && m.avatarUrl)?.avatarUrl ||
            members.find((m) => m.avatarUrl)?.avatarUrl ||
            pickFromPool(EXTRA_AVATAR_URLS, groupId) ||
            '/image/个人名片默认头像1.png'

          messagesByContact.set(groupId, remapped)
          contactDrafts.push({
            id: groupId,
            nickname: groupName,
            remarkName: groupName,
            isPinned: !!g.isPinned,
            avatarUrl: cover,
            kind: 'group',
            groupName,
            members,
          })
        }
      } catch (e) {
        console.warn('[镜像微信] 相关群聊生成失败:', e)
      }
    }
  }

  const playerRemark = await resolveCharRemarkForUser({
    characterId: cid,
    playerIdentityId: piid,
    character,
    playerDisplayName: playerNick,
    aiSuggestedRemark: contactDrafts.find((c) => c.id === playerContactId)?.remarkName,
  })

  const mergedContactsRaw: SpyWechatGeneratedData['contacts'] = contactDrafts.map((c) => ({
    id: c.id,
    nickname: c.nickname || c.remarkName || '联系人',
    remarkName: c.id === playerContactId ? playerRemark : c.remarkName,
    avatarBucket: normalizeBucket(c.avatarBucket),
    avatarUrl: c.kind === 'group' ? c.avatarUrl : undefined,
    isStarred: c.isStarred,
    isPinned: c.isPinned,
    blocked: c.blocked,
    characterId: c.characterId,
    relationshipNote: c.relationshipNote,
    kind: c.kind,
    groupName: c.groupName,
    members: c.members,
    // 用户本行：真实私聊；其它联系人：仅 chats scope 才有 AI 消息，通讯录 scope 为空（Store 保留旧会话）
    messages:
      c.id === playerContactId
        ? messagesByContact.get(c.id) || []
        : needChats
          ? messagesByContact.get(c.id) || []
          : [],
  }))

  const mergedContacts: SpyWechatGeneratedData['contacts'] = []
  for (const c of mergedContactsRaw) {
    const isPlayerRow = c.id === playerContactId
    const isGroup = c.kind === 'group' || String(c.id || '').startsWith('group:')
    let nickname = (c.nickname || '').trim()
    let avatarUrl = (c.avatarUrl || '').trim()
    if (isGroup) {
      nickname = (c.groupName || nickname || c.remarkName || '群聊').trim() || '群聊'
      if (!avatarUrl) avatarUrl = pickFromPool(EXTRA_AVATAR_URLS, c.id) || '/image/个人名片默认头像1.png'
      if (avatarUrl && isRemoteUrl(avatarUrl)) avatarUrl = '/image/个人名片默认头像1.png'
      // 补齐成员头像：通讯录回填 / 陌生人稳定兜底（九宫格按人占位，勿留空）
      const members = (c.members || []).map((m, mi) => {
        let memberAvatar = (m.avatarUrl || '').trim()
        if (!memberAvatar && m.isContact && m.contactId) {
          const row = contactDrafts.find((x) => x.id === m.contactId)
          memberAvatar = (row?.avatarUrl || '').trim()
        }
        if (!memberAvatar && m.isContact && m.contactId) {
          const fromMerged = mergedContacts.find((x) => x.id === m.contactId)
          memberAvatar = (fromMerged?.avatarUrl || '').trim()
        }
        if (!memberAvatar) {
          memberAvatar =
            pickFromPool(EXTRA_AVATAR_URLS, `group-member:${c.id}:${m.key || m.contactId || mi}`) ||
            '/image/个人名片默认头像1.png'
        }
        if (memberAvatar && isRemoteUrl(memberAvatar)) {
          memberAvatar = '/image/个人名片默认头像1.png'
        }
        return { ...m, avatarUrl: memberAvatar }
      })
      mergedContacts.push({
        ...c,
        kind: 'group',
        groupName: nickname,
        nickname,
        remarkName: nickname,
        avatarUrl,
        members,
      })
      continue
    }
    if (isPlayerRow) {
      nickname = playerNick
      avatarUrl = playerAvatar
    } else if (c.characterId?.trim()) {
      const npc = (await personaDb.getCharacter(c.characterId.trim())) as Character | null
      if (npc) {
        nickname = (npc.wechatNickname || npc.name || nickname || c.remarkName).trim()
        avatarUrl = (npc.avatarUrl || avatarUrl).trim()
      }
    }
    if (!nickname) nickname = (c.remarkName || '联系人').trim()
    // 非用户、非人脉 NPC：与群内陌生人同一套本地头像桶选取
    if (!isPlayerRow && !c.characterId?.trim()) {
      avatarUrl = resolveLocalExtraAvatarUrl({
        seed: c.id,
        personaText: `${c.remarkName || ''} ${c.nickname || ''}`.trim(),
        preferredBucket: c.avatarBucket,
      })
    }
    if (!isPlayerRow) {
      // 兜底：人脉 NPC 若仍无头像，用本地头像池补齐
      if (!avatarUrl) avatarUrl = pickFromPool(EXTRA_AVATAR_URLS, c.id) || ''
      // 额外/NPC：不允许远程 URL；用户本行保留其真实微信头像（可为 http/data）
      if (avatarUrl && isRemoteUrl(avatarUrl)) avatarUrl = ''
      if (!avatarUrl) avatarUrl = '/image/个人名片默认头像1.png'
    } else if (!avatarUrl) {
      avatarUrl = '/image/个人名片默认头像1.png'
    }
    mergedContacts.push({
      ...c,
      nickname,
      remarkName: isPlayerRow ? playerRemark : c.remarkName,
      avatarUrl: avatarUrl || undefined,
    })
  }

  // 群成员头像 / 通讯录挂靠：用最终私聊联系人表再扫一遍（同名 s: 挂回；补通讯录头像）
  {
    const dmRows = mergedContacts.filter(
      (c) => c.kind !== 'group' && !String(c.id || '').startsWith('group:'),
    )
    const dmById = new Map(dmRows.map((c) => [c.id, c] as const))
    for (let i = 0; i < mergedContacts.length; i++) {
      const g = mergedContacts[i]!
      const isGroup = g.kind === 'group' || String(g.id || '').startsWith('group:')
      if (!isGroup) continue
      const members = (g.members || []).map((m) => {
        const byId = m.contactId ? dmById.get(m.contactId) : undefined
        const byName =
          byId ||
          findMirrorDmContactByName(dmRows, m.nickname || m.remarkName || m.key.replace(/^s:/i, ''))
        if (!byName) return m
        return {
          ...m,
          key: byName.id,
          contactId: byName.id,
          nickname: (byName.nickname || byName.remarkName || m.nickname).trim(),
          remarkName: (byName.remarkName || byName.nickname || '').trim() || undefined,
          avatarUrl: byName.avatarUrl || m.avatarUrl,
          isContact: true as const,
          relationshipNote:
            (byName.relationshipNote || m.relationshipNote || '').trim().slice(0, 20) || undefined,
        }
      })
      const memberByKey = new Map(members.map((m) => [m.key, m] as const))
      for (const m of members) {
        memberByKey.set(m.nickname, m)
        if (m.remarkName) memberByKey.set(m.remarkName, m)
        if (!m.isContact) memberByKey.set(`s:${m.nickname}`, m)
      }
      const messages = (g.messages || []).map((msg) => {
        if (msg.from === 'character' || !msg.senderKey) return msg
        const key = msg.senderKey.trim()
        const nickHint = (msg.senderNickname || key.replace(/^s:/i, '')).trim()
        const mem =
          memberByKey.get(key) ||
          memberByKey.get(key.startsWith('s:') ? key : `s:${key}`) ||
          memberByKey.get(key.replace(/^s:/i, ''))
        if (mem) {
          return {
            ...msg,
            senderKey: mem.key,
            senderNickname: (mem.remarkName || mem.nickname || nickHint).trim(),
            senderAvatarUrl: mem.avatarUrl || msg.senderAvatarUrl,
            isContactSender: !!mem.isContact,
          }
        }
        const dm = findMirrorDmContactByName(dmRows, nickHint)
        if (!dm) return msg
        return {
          ...msg,
          senderKey: dm.id,
          senderNickname: (dm.remarkName || dm.nickname || nickHint).trim(),
          senderAvatarUrl: dm.avatarUrl || msg.senderAvatarUrl,
          isContactSender: true,
        }
      })
      mergedContacts[i] = { ...g, members, messages }
    }
  }

  // 强制补齐：若模型漏掉绑定 NPC，则把它们补进通讯录（仅通讯录生成时）
  if (needContacts) {
    const existingNpcIds = new Set(mergedContacts.map((c) => c.characterId).filter(Boolean) as string[])
    for (const npc of boundNpcs) {
      if (!npc?.id) continue
      if (existingNpcIds.has(npc.id)) continue
      let npcAvatar = (npc.avatarUrl || '').trim()
      if (npcAvatar && isRemoteUrl(npcAvatar)) npcAvatar = ''
      if (!npcAvatar) npcAvatar = pickFromPool(EXTRA_AVATAR_URLS, npc.id) || '/image/个人名片默认头像1.png'
      mergedContacts.push({
        id: npc.id,
        characterId: npc.id,
        nickname: (npc.wechatNickname || npc.name || '联系人').trim(),
        remarkName: (npc.remark || npc.wechatNickname || npc.name || '联系人').trim(),
        avatarUrl: npcAvatar,
        isStarred: npc.isStarred ?? undefined,
        blocked: npc.isBlocked ?? undefined,
        messages: [],
      })
    }
  }

  // chats：只回传本轮有消息的会话（含群），避免把未勾选私聊写成空数组清掉旧记录
  const contactsOut = needChats
    ? mergedContacts.filter((c) => {
        if (String(c.id || '').startsWith('player:')) return true
        return (c.messages || []).length > 0
      })
    : mergedContacts

  return {
    profile: normalizedProfile,
    contacts: contactsOut,
    moments: [],
    bills: [],
    affectionCards: [],
  }
}

