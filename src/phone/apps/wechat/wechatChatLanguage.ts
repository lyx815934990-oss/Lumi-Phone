import type { ApiConfig } from '../api/types'
import {
  translateTextsWithNativeProvider,
  type TranslationRuntime,
} from '../api/translationProviders'
import { openAiCompatibleChat } from './newFriendsPersona/ai'

/** 会话「回复输出语言 / 翻译目标语言」选项 */
export const WECHAT_CHAT_LANGUAGE_OPTIONS = [
  { code: 'zh-CN', label: '简体中文', native: '简体中文' },
  { code: 'zh-TW', label: '繁體中文', native: '繁體中文' },
  { code: 'en', label: '英语', native: 'English' },
  { code: 'ja', label: '日语', native: '日本語' },
  { code: 'ko', label: '韩语', native: '한국어' },
  { code: 'fr', label: '法语', native: 'Français' },
  { code: 'de', label: '德语', native: 'Deutsch' },
  { code: 'es', label: '西班牙语', native: 'Español' },
  { code: 'ru', label: '俄语', native: 'Русский' },
  { code: 'th', label: '泰语', native: 'ไทย' },
  { code: 'vi', label: '越南语', native: 'Tiếng Việt' },
] as const

export type WeChatChatLanguageCode = (typeof WECHAT_CHAT_LANGUAGE_OPTIONS)[number]['code']

export const WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE: WeChatChatLanguageCode = 'zh-CN'
export const WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE: WeChatChatLanguageCode = 'zh-CN'

export function isWeChatChatLanguageCode(raw: unknown): raw is WeChatChatLanguageCode {
  const s = typeof raw === 'string' ? raw.trim() : ''
  return WECHAT_CHAT_LANGUAGE_OPTIONS.some((o) => o.code === s)
}

export function normalizeWeChatChatLanguageCode(
  raw: unknown,
  fallback: WeChatChatLanguageCode = WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
): WeChatChatLanguageCode {
  return isWeChatChatLanguageCode(raw) ? raw : fallback
}

export function weChatChatLanguageLabel(code: string | null | undefined): string {
  const c = normalizeWeChatChatLanguageCode(code)
  return WECHAT_CHAT_LANGUAGE_OPTIONS.find((o) => o.code === c)?.label ?? c
}

export function weChatChatLanguageNativeName(code: string | null | undefined): string {
  const c = normalizeWeChatChatLanguageCode(code)
  return WECHAT_CHAT_LANGUAGE_OPTIONS.find((o) => o.code === c)?.native ?? c
}

/** 注入 system：文字气泡 / 语音脚本可分别指定语言 */
export function buildWechatReplyOutputLanguageAppendix(
  replyLanguage: string | null | undefined,
  replyVoiceLanguage?: string | null,
  opts?: {
    translationSyncEnabled?: boolean
    translationLanguage?: string | null
    /** true：副接口翻译，勿要求模型写 [译] */
    translationDedicatedApi?: boolean
  },
): string {
  const textCode = normalizeWeChatChatLanguageCode(replyLanguage)
  const voiceCode = normalizeWeChatChatLanguageCode(
    replyVoiceLanguage?.trim() ? replyVoiceLanguage : replyLanguage,
  )
  if (textCode === 'zh-CN' && voiceCode === 'zh-CN') return ''

  const textNative = weChatChatLanguageNativeName(textCode)
  const textLabel = weChatChatLanguageLabel(textCode)
  const voiceNative = weChatChatLanguageNativeName(voiceCode)
  const voiceLabel = weChatChatLanguageLabel(voiceCode)
  const same = textCode === voiceCode
  const syncOn = opts?.translationSyncEnabled === true
  const dedicated = opts?.translationDedicatedApi === true
  const transCode = normalizeWeChatChatLanguageCode(
    opts?.translationLanguage,
    WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  )
  const transNative = weChatChatLanguageNativeName(transCode)
  const transLabel = weChatChatLanguageLabel(transCode)
  const syncHard = syncOn
    ? dedicated
      ? `
- **禁止中日（或其它语言）混着发气泡（硬项）**：用户可见文字气泡只能是 **${textNative}**。同步翻译由客户端完成，**禁止**输出 \`[译]\`，也禁止把 ${transLabel}（${transNative}）译文当作普通气泡发出去。`
      : `
- **禁止中日（或其它语言）混着发气泡（硬项）**：用户可见文字气泡只能是 **${textNative}**。若开启同步翻译，**${transLabel}（${transNative}）译文只能写在单独的 \`[译]……\` 行**，禁止把译文当作下一条普通气泡发出去（错误例：先发日文「いい夢見てね。」再发中文气泡「做个好梦。」）。
- **禁止**在同一条可见气泡里中日夹杂正文（假名专名/少量对方语言词可保留）；中文整句只能进 \`[译]\`。`
    : `
- **禁止**把其它语言整句当作可见气泡混发（主体必须是 ${textNative}）；不要先发 ${textNative} 再跟一条简体中文复述。`

  if (same) {
    return `
【回复输出语言 · 最高优先级之一】
- 本会话用户已指定：角色对外可见的**文字气泡**与**【语音】脚本正文**一律使用 **${textLabel}（${textNative}）** 书写/口述。
- 禁止默认改回简体中文（协议说明、系统指令本身除外）；用户用中文提问时，仍用 ${textNative} 回复（可偶尔夹少量对方语言词，但主体必须是 ${textNative}）。
- \`语音 \` 行内 TTS 脚本的可朗读正文须为 ${textNative}；情绪/停顿控制标签语法不变。
- 表情包引用名、协议标记行（如 \`发图\` \`表情包\`）保持原协议格式；图片左侧通俗描述可用 ${textNative}。
${syncHard}
`.trim()
  }

  return `
【回复输出语言 · 最高优先级之一】
- 本会话用户已分别指定：
  - **文字气泡**：一律使用 **${textLabel}（${textNative}）**。
  - **【语音】脚本正文**：一律使用 **${voiceLabel}（${voiceNative}）** 口述（与音色无关）。
- 禁止默认改回简体中文（协议说明、系统指令本身除外）。
- \`语音 \` 行内 TTS 脚本的可朗读正文须为 ${voiceNative}；情绪/停顿控制标签语法不变。
- 表情包引用名、协议标记行（如 \`发图\` \`表情包\`）保持原协议格式；图片左侧通俗描述可用 ${textNative}。
${syncHard}
`.trim()
}

export function summarizeChatReplyLanguageSettings(params: {
  replyOutputLanguage?: string
  replyVoiceLanguage?: string
  translationSyncEnabled?: boolean
  translationLanguage?: string
}): string {
  const textLang = weChatChatLanguageLabel(params.replyOutputLanguage)
  const voiceLang = weChatChatLanguageLabel(
    params.replyVoiceLanguage?.trim() ? params.replyVoiceLanguage : params.replyOutputLanguage,
  )
  const bits =
    textLang === voiceLang
      ? [`文字/语音 ${textLang}`]
      : [`文字 ${textLang}`, `语音 ${voiceLang}`]
  if (params.translationSyncEnabled) {
    bits.push(`翻译→${weChatChatLanguageLabel(params.translationLanguage)}`)
  }
  return bits.join(' · ')
}

const SYNC_TRANSLATION_LINE_RE = /^(?:\[译\]|【译】|\[翻译\]|【翻译】)\s*(.*)$/u

/** 注入 system：同步翻译附录。dedicatedApi=true 时由客户端翻译服务商生成，否则由聊天模型写 [译]。 */
export function buildWechatSyncTranslationAppendix(
  translationLanguage?: string,
  opts?: {
    speakerName?: string
    listenerName?: string
    relationHint?: string
    speakerPersonaBrief?: string
    speakerGender?: 'male' | 'female' | 'other' | null
    listenerGender?: 'male' | 'female' | 'other' | null
    /** 可见气泡语言；用于强调「勿把译文当气泡」 */
    replyOutputLanguage?: string | null
    /** true：走副接口翻译 API；false/缺省：聊天模型同轮输出 [译] */
    dedicatedApi?: boolean
  },
): string {
  const target = weChatChatLanguageNativeName(translationLanguage)
  const label = weChatChatLanguageLabel(translationLanguage)
  const replyCode = normalizeWeChatChatLanguageCode(opts?.replyOutputLanguage)
  const replyNative = weChatChatLanguageNativeName(replyCode)
  const dedicated = opts?.dedicatedApi === true

  if (dedicated) {
    void opts?.speakerName
    void opts?.listenerName
    void opts?.relationHint
    void opts?.speakerPersonaBrief
    return `
【同步翻译 · 客户端翻译 API · 硬项】
本会话已开启同步翻译，且使用**翻译副接口**。译文由客户端调用翻译服务商生成（目标：${label} / ${target}），**不要**由你在回复里写译文。
- **禁止**输出 \`[译]\` / \`【译】\` / \`[翻译]\` 行。
- **禁止**把 ${target} 译文写成普通可见气泡（错误例：日文后再跟一条中文「做个好梦。」）。
- 可见文字气泡与 \`语音 \` 脚本正文只用 **${replyNative}**；专名/假名昵称可保留。
- 红包/转账/表情包/图片/指令行保持原协议，不要夹译文。
`.trim()
  }

  const glossary = buildRelationAwareTranslationGlossary(opts)
  const voice = buildCharacterVoiceTranslationRules({
    targetLanguage: translationLanguage,
    speakerName: opts?.speakerName,
    speakerPersonaBrief: opts?.speakerPersonaBrief,
  })
  return `
【同步输出翻译 · 硬项】
本会话已开启同步翻译（由聊天模型同轮输出）。每条**可见文字气泡**与每条 \`语音 \` 行之后，必须紧跟单独一行：
\`[译]……\`
其中「……」为用 **${label}（${target}）** 书写、**忠于上一行原文**的译文（像系统翻译：通顺但不加戏；禁止另写一句、禁止「（轻笑）」等原文没有的括号舞台指示；假名专名可保留）。
- \`[译]\` 行**不**算用户可见气泡条数；客户端只把上一行当气泡。
- **禁止**把译文写成普通可见气泡；可见气泡只用 **${replyNative}**。
- 红包/转账/表情包/图片/指令行等**不要**跟 \`[译]\`。
- 群聊：每个 SPEAKER 文字气泡后同样跟一行 \`[译]\`。

${voice}

${glossary}
`.trim()
}

export function parseWeChatSyncTranslationLine(line: string): string | null {
  const m = String(line ?? '').trim().match(SYNC_TRANSLATION_LINE_RE)
  if (!m) return null
  return String(m[1] ?? '').trim()
}

/** 从气泡行列表剥离 `[译]`，译文挂到上一行 */
export function peelWeChatSyncTranslationLines(lines: string[]): {
  lines: string[]
  translations: Array<string | undefined>
} {
  const outLines: string[] = []
  const translations: Array<string | undefined> = []
  for (const raw of lines) {
    const line = String(raw ?? '')
    const tr = parseWeChatSyncTranslationLine(line)
    if (tr != null) {
      if (outLines.length > 0) {
        const prev = translations[outLines.length - 1]
        translations[outLines.length - 1] = tr || prev
      }
      continue
    }
    outLines.push(line)
    translations.push(undefined)
  }
  return { lines: outLines, translations }
}

const KANA_RE = /[\u3040-\u309f\u30a0-\u30ff]/u
const HANGUL_RE = /[\uac00-\ud7af\u1100-\u11ff]/u
const HAN_RE = /[\u4e00-\u9fff]/gu
const LATIN_RE = /[A-Za-z]/g

function countMatches(re: RegExp, s: string): number {
  return s.match(re)?.length ?? 0
}

/** 日语气泡：有假名 */
export function looksLikeJapaneseBubbleText(s: string): boolean {
  return KANA_RE.test(s)
}

/** 韩语气泡：有谚文 */
export function looksLikeKoreanBubbleText(s: string): boolean {
  return HANGUL_RE.test(s)
}

/**
 * 像「译入中文」漏发的整句：有汉字、几乎无假名/谚文。
 * （日文也用汉字，故无假名时才判中文）
 */
export function looksLikeChineseTranslationLeakText(s: string): boolean {
  const t = s.trim()
  if (!t || t.length < 2) return false
  if (KANA_RE.test(t) || HANGUL_RE.test(t)) return false
  if (parseWeChatSyncTranslationLine(t) != null) return false
  const han = countMatches(HAN_RE, t)
  if (han < 2) return false
  const latin = countMatches(LATIN_RE, t)
  return han >= Math.max(2, latin)
}

function looksLikeReplyLanguageBubbleText(text: string, replyCode: WeChatChatLanguageCode): boolean {
  const t = text.trim()
  if (!t) return false
  switch (replyCode) {
    case 'ja':
      return looksLikeJapaneseBubbleText(t)
    case 'ko':
      return looksLikeKoreanBubbleText(t)
    case 'zh-CN':
    case 'zh-TW':
      return looksLikeChineseTranslationLeakText(t) || countMatches(HAN_RE, t) >= 1
    default:
      // 拉丁系：有字母且不像纯中文漏行
      return countMatches(LATIN_RE, t) >= 2 && !looksLikeChineseTranslationLeakText(t)
  }
}

function looksLikeTranslationLanguageText(
  text: string,
  translationCode: WeChatChatLanguageCode,
): boolean {
  const t = text.trim()
  if (!t) return false
  switch (translationCode) {
    case 'zh-CN':
    case 'zh-TW':
      return looksLikeChineseTranslationLeakText(t)
    case 'ja':
      return looksLikeJapaneseBubbleText(t)
    case 'ko':
      return looksLikeKoreanBubbleText(t)
    default:
      return countMatches(LATIN_RE, t) >= 2
  }
}

/**
 * 从「回复语言 + 译入语言」混写的单条气泡里拆出漏进正文的译文尾巴。
 * 例：日文段落后接纯中文行 → 正文只留日文，中文当作译文。
 */
export function splitLeakedTranslationTailFromBubble(
  bubble: string,
  opts: {
    replyLanguage?: string | null
    translationLanguage?: string | null
  },
): { body: string; leakedTranslation?: string } {
  const replyCode = normalizeWeChatChatLanguageCode(opts.replyLanguage)
  const transCode = normalizeWeChatChatLanguageCode(
    opts.translationLanguage,
    WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  )
  if (replyCode === transCode) return { body: bubble }
  if (replyCode === 'zh-CN' || replyCode === 'zh-TW') return { body: bubble }

  const raw = String(bubble ?? '')
  const parts = raw.split(/\n/)
  if (parts.length < 2) {
    // 同行混排：日文后突然出现较长中文句 —— 少见，暂不暴力切开
    return { body: raw }
  }

  let cut = parts.length
  for (let i = parts.length - 1; i >= 1; i -= 1) {
    const line = parts[i]!.trim()
    if (!line) {
      cut = i
      continue
    }
    if (looksLikeTranslationLanguageText(line, transCode) && !looksLikeReplyLanguageBubbleText(line, replyCode)) {
      cut = i
      continue
    }
    break
  }
  if (cut >= parts.length) return { body: raw }

  const body = parts.slice(0, cut).join('\n').trimEnd()
  const leaked = parts
    .slice(cut)
    .map((l) => l.trim())
    .filter(Boolean)
    .join('')
  if (!body || !leaked) return { body: raw }
  return { body, leakedTranslation: leaked }
}

/**
 * 模型漏写 `[译]` 时，把「回复语言气泡 + 紧随其后的译文语言气泡」收成 `[译]`；
 * 同步关闭时则丢弃错语言气泡，避免中日混发。
 */
export function normalizeLeakedWeChatTranslationBubbles(
  lines: string[],
  opts: {
    replyLanguage?: string | null
    translationLanguage?: string | null
    syncEnabled?: boolean
    /** 协议/特殊行判定：返回 true 则不参与吸收 */
    isSpecialLine?: (line: string) => boolean
  },
): string[] {
  const replyCode = normalizeWeChatChatLanguageCode(opts.replyLanguage)
  const transCode = normalizeWeChatChatLanguageCode(
    opts.translationLanguage,
    WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  )
  if (replyCode === transCode) return lines.map((l) => String(l ?? ''))
  // 回复已是中文时无需吸收「中文漏译」
  if (replyCode === 'zh-CN' || replyCode === 'zh-TW') return lines.map((l) => String(l ?? ''))

  const syncOn = opts.syncEnabled === true
  const isSpecial = opts.isSpecialLine ?? (() => false)
  const out: string[] = []

  const pushBodyWithOptionalTr = (body: string, tr?: string) => {
    const b = body.trim()
    if (!b) return
    out.push(b)
    const t = tr?.trim()
    if (t && syncOn) out.push(`[译]${t}`)
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = String(lines[i] ?? '')
    const trimmed = raw.trim()
    if (!trimmed) continue

    if (parseWeChatSyncTranslationLine(trimmed) != null) {
      out.push(trimmed)
      continue
    }

    if (isSpecial(trimmed)) {
      out.push(raw)
      continue
    }

    const split = splitLeakedTranslationTailFromBubble(raw, {
      replyLanguage: replyCode,
      translationLanguage: transCode,
    })
    let body = split.body
    let pendingTr = split.leakedTranslation

    const bodyForLang =
      body.replace(/^(?:\[语音\]|【语音】)\s*/u, '').replace(/^<<SPEAKER:[^>\n]+>>\s*/i, '').trim() ||
      body

    // 下一条整行是漏发的译文语言 → 收成 [译] / 丢弃
    const next = i + 1 < lines.length ? String(lines[i + 1] ?? '').trim() : ''
    const nextIsTr =
      !!next &&
      parseWeChatSyncTranslationLine(next) == null &&
      !isSpecial(next) &&
      looksLikeTranslationLanguageText(next, transCode) &&
      !looksLikeReplyLanguageBubbleText(next, replyCode) &&
      looksLikeReplyLanguageBubbleText(bodyForLang, replyCode)

    if (nextIsTr) {
      pendingTr = pendingTr ? `${pendingTr}${next}` : next
      i += 1
    }

    // 本行本身就是错语言整句（前面没有可挂的原文）→ sync 时丢弃，避免单独中文气泡
    if (
      looksLikeTranslationLanguageText(body, transCode) &&
      !looksLikeReplyLanguageBubbleText(body, replyCode)
    ) {
      // 尝试挂到上一条可见气泡
      if (syncOn && pendingTr) {
        // body 本身就是译文；若 out 末尾是气泡且还没有 [译]，挂上去
        const last = out[out.length - 1]
        if (last && parseWeChatSyncTranslationLine(last) == null && !isSpecial(last)) {
          const trBody = pendingTr || body
          out.push(`[译]${trBody}`)
          continue
        }
      }
      if (syncOn) {
        const last = out[out.length - 1]
        if (last && parseWeChatSyncTranslationLine(last) == null && !isSpecial(last)) {
          out.push(`[译]${body}`)
          continue
        }
      }
      // 无处可挂：丢弃，避免中日混气泡
      continue
    }

    pushBodyWithOptionalTr(body, pendingTr)
  }

  return out
}

/** 用于同步译文字典的键：语音取脚本正文，群聊去掉 SPEAKER 前缀 */
export function weChatSyncTranslationKeyFromBubbleLine(line: string): string {
  const t = String(line ?? '').trim()
  if (!t) return ''
  const voice = t.match(/^(?:\[语音\]|【语音】)\s*(.*)$/u)
  if (voice) return String(voice[1] ?? '').trim()
  return t.replace(/^<<SPEAKER:[^>\n]+>>\s*/i, '').trim() || t
}

export function createWeChatSyncTranslationLookup(): {
  offer: (key: string, translation: string) => void
  take: (key: string) => string | undefined
} {
  const q = new Map<string, string[]>()
  return {
    offer(key: string, translation: string) {
      const k = key.trim()
      const t = translation.trim()
      if (!k || !t) return
      const arr = q.get(k) ?? []
      arr.push(t)
      q.set(k, arr)
    },
    take(key: string) {
      const k = key.trim()
      if (!k) return undefined
      const arr = q.get(k)
      if (!arr?.length) return undefined
      const v = arr.shift()
      if (!arr.length) q.delete(k)
      return v
    },
  }
}

/**
 * 关系向选词：避免「先輩→前辈」「後輩→小孩」这类脱离语境的笼统译法。
 * 供微信同步译、线下约会 `[译]`、缺译补全共用。
 */
export function buildRelationAwareTranslationGlossary(params?: {
  speakerName?: string | null
  listenerName?: string | null
  relationHint?: string | null
  /** 发言者档案性别（约会对象 / 气泡角色） */
  speakerGender?: 'male' | 'female' | 'other' | null
  /** 听话方档案性别（玩家 / 用户） */
  listenerGender?: 'male' | 'female' | 'other' | null
}): string {
  const speaker = String(params?.speakerName ?? '').trim() || '发言者'
  const listener = String(params?.listenerName ?? '').trim() || '对方'
  const hint = String(params?.relationHint ?? '').trim()
  const hintLine = hint
    ? `- 已提供关系线索：${hint}。称呼与辈分译法必须服从该线索与人设/世界书，禁止另起一套。`
    : `- 若人设/世界书写明校园、社团、同校上下级：按学长学姐/学弟学妹译；若写明职场：才用前辈/后辈。`

  const pronounFor = (g: 'male' | 'female' | 'other' | null | undefined): '他' | '她' | '其' | null => {
    if (g === 'male') return '他'
    if (g === 'female') return '她'
    if (g === 'other') return '其'
    return null
  }
  const genderLabel = (g: 'male' | 'female' | 'other' | null | undefined): string => {
    if (g === 'male') return '男'
    if (g === 'female') return '女'
    if (g === 'other') return '其他'
    return ''
  }
  const listenerPronoun = pronounFor(params?.listenerGender)
  const speakerPronoun = pronounFor(params?.speakerGender)
  const genderLockBits: string[] = []
  if (listenerPronoun) {
    genderLockBits.push(
      `指对方「${listener}」（玩家/用户，档案性别：${genderLabel(params?.listenerGender)}）时，第三人称必须用「${listenerPronoun}」，禁止写成「${listenerPronoun === '他' ? '她' : '他'}」`,
    )
  }
  if (speakerPronoun) {
    genderLockBits.push(
      `指发言者「${speaker}」（档案性别：${genderLabel(params?.speakerGender)}）时，第三人称必须用「${speakerPronoun}」`,
    )
  }
  const genderLockBlock = genderLockBits.length
    ? `
- **第三人称他/她（最高优先级 · 硬项）**：
  - ${genderLockBits.join('；')}。
  - 原文日语**没有**性别人称时（如「一緒にいた」「あの人」「やつ」），**禁止**因「ちゃん / 君 / さん」、恋爱语境或机器翻译默认偏见猜成女性/男性；必须以本条档案性别为准。
  - 指第三者且档案未给出性别：宁用姓名/「对方」，也不要乱猜「她/他」。
`.trimEnd()
    : `
- **第三人称他/她**：原文无性别指示时，禁止因「ちゃん」等昵称默认猜成「她」；性别不明时用姓名或「对方」。
`.trimEnd()

  return `
【关系向选词 · 硬项 · 禁止笼统机翻】
译文必须按**人物关系与场景**选同义词，禁止词典默认义、禁止不顾上下级/校园/职场的笼统译法。
当前相关人物：发言侧「${speaker}」↔ 对方「${listener}」。
${hintLine}${genderLockBlock}
- 日语「先輩 / せんぱい」：校园/社团/同校辈分 → 「学长」「学姐」（按性别与既有称呼）；**仅当**明确是职场/公司辈分才用「前辈」。学长剧情里**禁止**把对玩家的先輩译成笼统「前辈」。
- 日语「後輩 / こうはい」：校园 → 「学弟」「学妹」；职场 → 「后辈」。**禁止**译成「小孩」「孩子」「小朋友」「小家伙」。
- 日语「この子 / あの子 / 子供」：若指同龄学弟学妹/恋人对象 → 「这家伙 / 他 / 你 / 这学弟」等；**禁止**在校园恋爱语境译成「这孩子」「小孩」（除非对方真是幼童）。
- **日语姓名敬称 · 禁止油腻直译（硬项）**：
  - 「〜君 / くん」：**禁止**译成「XX君」。按亲疏与口吻优先「小XX」（取名或昵称常用字，如「太郎くん」→「小太郎」；「ゆうくん」→「小优」）；若已很熟、带点调侃，可用「XX」直呼或「你这家伙」式语气，**不要**保留「君」字。
  - 「〜さん」：**禁止**译成「XX桑 / XXさん」。按关系选自然中文：一般礼貌 → 「XX」或「XX同学」；稍疏远/客气 → 「XX先生 / XX小姐」（仅当真需要敬称时）；熟人日常 **直接叫「XX」或「小XX」**，勿留「桑」。
  - 「〜ちゃん」：优先「小XX」或叠字昵称（若人设已有固定昵称则跟固定称呼），禁止「XX酱」除非角色本身就爱用网感昵称且语境匹配。
  - 「〜様 / さま」：仅在明确主仆/极端敬语时用「XX大人」；日常对话勿滥用。
  - 总原则：中文译文要像真人称呼对方，**好听、顺口、不油**；宁可用「小XX / 学长 / 直呼姓名」，也不要「XX君」「XX桑」。
- 「お前 / 君（二人称） / あなた / あんた」：按亲疏与辈分选「你 / 你这家伙 / 学弟」等，勿一律生硬「你」；注意与姓名后「〜君」区分。
- 「先生」：按场合选老师 / 先生（姓+）/ 医生，勿混用。
- 「俺 / 僕 / 私 / あたし」：按人设选自然「我」，可保留语气差，勿统一成书面「本人」。
- 姓名、昵称、假名专名：姓/名本体可保留（如「佐佐木」），但**敬称后缀必须按上条改成自然中文**，勿整段「佐佐木君」「佐佐木桑」原样扔进译文。
- 书名、作品名可保留原文或惯用译名，勿因书名号切断整句语气。
`.trim()
}

/**
 * 翻译口吻铁律：像系统翻译一样忠实；禁止舞台括号、协议标记、另写一句。
 * 供气泡翻译、批量补译、同步译文共用。
 */
export function buildCharacterVoiceTranslationRules(params?: {
  targetLanguage?: string | null
  speakerName?: string | null
  /** 人设/口吻摘录；可空 */
  speakerPersonaBrief?: string | null
  /** true：内心 OS 译文；语气更碎、更潜台词 */
  forInnerOs?: boolean
}): string {
  const targetCode = normalizeWeChatChatLanguageCode(
    params?.targetLanguage,
    WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  )
  const target = weChatChatLanguageNativeName(targetCode)
  const targetLabel = weChatChatLanguageLabel(targetCode)
  const name = String(params?.speakerName ?? '').trim() || '发言者'
  const persona = String(params?.speakerPersonaBrief ?? '').trim()
  const toZh = targetCode === 'zh-CN' || targetCode === 'zh-TW'
  const kind = params?.forInnerOs ? '内心 OS' : '对白/气泡'

  const personaBit = persona
    ? `- **称呼可跟关系（次要）**：已提供「${name}」摘录时，仅影响称呼/敬语选词；**禁止**为贴人设而加动作、心理旁白、括号语气标注。`
    : `- **选词自然即可**：禁止书面说明书腔；也禁止为了「像角色」而添油加醋。`

  const zhRules = toZh
    ? `
【译入中文 · 忠实如系统翻译 · 硬项】
优先级：**原文有什么译什么 > 自然通顺中文 > 称呼略自然**。
目标：接近手机系统翻译（iOS/Google）的忠实度——通顺，但**绝不加戏**。
${personaBit}
- **语义锚点**：原文提到的每个意思都要有对应；禁止换话题、换笑点、脑补潜台词。
- **禁止画蛇添足（最高）**：
  - **禁止**加原文没有的括号舞台指示：如「（轻笑）（笑）（叹气）（沉默）（小声）」——即便原文有「あはは/哈哈」也只译成口头笑声，**不要**另加括号标注。
  - **禁止**加协议/UI 标记：\`语音 \` \`发图\` \`[译]\` 「转文字」等。
  - **禁止**加原文没有的动作描写、心理旁白、解释性插入语。
- **原文已有的笑声/语气**：如「あはは」「（笑）」「……」可自然译成「啊哈哈」「（笑）」「……」；**没有就不要造**。
- **禁止机翻腔**：如「连××的那份」「进行了～」「感到了心动」「不禁」「令人」等；换成自然口语，但仍对应原意。
- **意译仅限语序**：可按中文习惯重组语序，不可增删情节信息。
- **称呼**：跟关系向选词；勿留「XX君/XX桑」。
- **节奏**：原文短别注水；原文碎别揉成总结。
- ${
        params?.forInnerOs
          ? '**内心 OS**：第一人称忠实译；禁止旁白腔「他心想……」，禁止另编心事。'
          : '**对白**：像普通聊天译文；勿堆「呢啦呀」，勿加舞台括号。'
      }
`.trim()
    : `
【译入口吻 · 硬项】
译成「${targetLabel}（${target}）」：忠于该 ${kind} 原文；禁止另写一句、禁止加舞台括号/协议标记。
${personaBit}
`.trim()

  return zhRules
}

/**
 * 译文像被模型偷懒/线路截断的半截（句末逗号、相对原文过短等）。
 * 供批量补译后单条重试、落库前清空半截 `[译]`。
 */
export function looksLikeTruncatedTranslation(source: string, translation: string): boolean {
  const src = String(source ?? '').trim()
  const tr = String(translation ?? '').trim()
  if (!tr) return false
  if (!src) return false
  // 停在逗号/顿号/冒号：几乎一定是半截
  if (/[，、：:]$/u.test(tr)) return true
  // 原文有多句收束，译文句读明显少且偏短
  const srcStops = (src.match(/[。！？!?…]+/g) || []).length
  const trStops = (tr.match(/[。！？!?…]+/g) || []).length
  if (srcStops >= 2 && trStops <= srcStops - 2 && tr.length < src.length * 0.85) return true
  // 较长原文但译文过短（中日大致等长）
  if (src.length >= 48 && tr.length < Math.max(24, Math.floor(src.length * 0.42))) return true
  return false
}

/**
 * 批量补译文：优先走 API 设置里的翻译服务商；OpenAI 兼容时可用人设润色。
 * 返回与 texts 等长的译文数组（失败项为空串）。
 */
export async function batchTranslateWeChatBubbleTexts(params: {
  apiConfig?: ApiConfig | null
  /** 若提供且非 openai，走 DeepL/Google/Azure/百度/有道/腾讯云 */
  translationRuntime?: TranslationRuntime | null
  texts: string[]
  targetLanguage: string
  speakerName?: string
  /** 听话/互动对象姓名（如玩家），用于关系向选词 */
  listenerName?: string
  speakerPersonaBrief?: string
  /** 关系线索摘要（学长学弟/职场等） */
  relationHint?: string
  speakerGender?: 'male' | 'female' | 'other' | null
  listenerGender?: 'male' | 'female' | 'other' | null
  signal?: AbortSignal
}): Promise<string[]> {
  const texts = params.texts.map((t) => t.trim()).filter(Boolean)
  if (!texts.length) return []

  const runtime = params.translationRuntime
  if (runtime && runtime.provider !== 'openai') {
    try {
      return await translateTextsWithNativeProvider({
        texts,
        targetLanguage: params.targetLanguage,
        runtime,
        signal: params.signal,
      })
    } catch (err) {
      console.warn('[translation] native provider failed:', err)
      return texts.map(() => '')
    }
  }

  const apiConfig = runtime?.provider === 'openai' ? runtime.openaiConfig : params.apiConfig
  if (!apiConfig?.apiUrl?.trim() || !apiConfig?.apiKey?.trim() || !apiConfig?.modelId?.trim()) {
    return texts.map(() => '')
  }

  if (texts.length === 1) {
    const one = await translateWeChatBubbleText({
      apiConfig,
      text: texts[0]!,
      targetLanguage: params.targetLanguage,
      speakerName: params.speakerName,
      listenerName: params.listenerName,
      speakerPersonaBrief: params.speakerPersonaBrief,
      relationHint: params.relationHint,
      speakerGender: params.speakerGender,
      listenerGender: params.listenerGender,
      signal: params.signal,
    })
    return [one]
  }

  const target = weChatChatLanguageNativeName(params.targetLanguage)
  const targetLabel = weChatChatLanguageLabel(params.targetLanguage)
  const name = params.speakerName?.trim() || ''
  const persona = params.speakerPersonaBrief?.trim() || ''
  const relationBlock = buildRelationAwareTranslationGlossary({
    speakerName: params.speakerName,
    listenerName: params.listenerName,
    relationHint: params.relationHint,
    speakerGender: params.speakerGender,
    listenerGender: params.listenerGender,
  })
  const voiceBlock = buildCharacterVoiceTranslationRules({
    targetLanguage: params.targetLanguage,
    speakerName: params.speakerName,
    speakerPersonaBrief: persona,
  })
  const personaBlock = persona
    ? `发言者：${name || '角色'}（仅供称呼选词，禁止按人设加戏）\n${persona.slice(0, 400)}`
    : `发言者：${name || '角色'}`

  const translateCommon = {
    apiConfig,
    targetLanguage: params.targetLanguage,
    speakerName: params.speakerName,
    listenerName: params.listenerName,
    speakerPersonaBrief: params.speakerPersonaBrief,
    relationHint: params.relationHint,
    speakerGender: params.speakerGender,
    listenerGender: params.listenerGender,
    signal: params.signal,
  }

  const merged: string[] = new Array(texts.length).fill('')
  const shortIdx: number[] = []
  for (let i = 0; i < texts.length; i += 1) {
    // 长段（常见内心 OS）单独译，避免挤在编号列表末尾被截断
    if (texts[i]!.length >= 72) {
      params.signal?.throwIfAborted?.()
      merged[i] = await translateWeChatBubbleText({ ...translateCommon, text: texts[i]! })
    } else {
      shortIdx.push(i)
    }
  }

  const CHUNK = 6
  for (let c = 0; c < shortIdx.length; c += CHUNK) {
    params.signal?.throwIfAborted?.()
    const idxs = shortIdx.slice(c, c + CHUNK)
    const chunk = idxs.map((i) => texts[i]!)
    const numbered = chunk.map((t, i) => `${i + 1}. ${t}`).join('\n')
    const out = await openAiCompatibleChat(
      apiConfig,
      [
        {
          role: 'system',
          content: `你是忠实的机器翻译引擎（风格接近手机系统翻译）。把下列编号句子译成「${targetLabel}（${target}）」。
**只翻译，不加戏。每条必须译完整，禁止中途截断。**

${personaBlock}

${voiceBlock}

${relationBlock}

输出硬规则：
1. 只输出编号列表：\`1. 译文\` \`2. 译文\` …
2. 条数必须与输入一致；不要解释、不要引号包裹整段。
3. 每条只对应**该编号原文**；禁止脑补回复、换话题。
4. **禁止**加原文没有的「（轻笑）（笑）（叹气）」等括号舞台指示；原文有口头笑声（あはは等）才译成「啊哈哈」等，不要另造括号。
5. **禁止**输出 \`语音 \` \`发图\` \`[译]\` 等协议/UI 标记。
6. 覆盖原文全部语义；允许语序调整，禁止增删信息；**禁止**在逗号/顿号处截断半句。`,
        },
        { role: 'user', content: numbered },
      ],
      {
        temperature: 0.12,
        signal: params.signal,
      },
    )

    const byIndex = new Map<number, string>()
    let currentIdx = -1
    for (const rawLine of out.split(/\r?\n/)) {
      const trimmed = rawLine.trim()
      if (!trimmed) continue
      const m = trimmed.match(/^(\d+)\s*[.、．:：)\]]\s*(.*)$/)
      if (m) {
        const idx = Number(m[1]) - 1
        if (!Number.isFinite(idx) || idx < 0 || idx >= chunk.length) {
          currentIdx = -1
          continue
        }
        currentIdx = idx
        const piece = sanitizeWeChatBubbleTranslationOutput(m[2] ?? '', chunk[idx]!)
        if (piece) byIndex.set(idx, piece)
        else byIndex.delete(idx)
        continue
      }
      if (currentIdx >= 0 && currentIdx < chunk.length) {
        const prev = byIndex.get(currentIdx) || ''
        const piece = sanitizeWeChatBubbleTranslationOutput(`${prev}${trimmed}`, chunk[currentIdx]!)
        if (piece) byIndex.set(currentIdx, piece)
      }
    }
    idxs.forEach((globalIdx, local) => {
      merged[globalIdx] = byIndex.get(local) || ''
    })
  }

  for (let i = 0; i < texts.length; i += 1) {
    const src = texts[i]!
    const tr = merged[i] || ''
    if (!looksLikeTruncatedTranslation(src, tr)) continue
    params.signal?.throwIfAborted?.()
    try {
      const retry = await translateWeChatBubbleText({
        ...translateCommon,
        text: src,
        forceTargetLanguage: true,
      })
      if (retry.trim() && !looksLikeTruncatedTranslation(src, retry)) merged[i] = retry
      else if (retry.trim().length > tr.trim().length) merged[i] = retry
    } catch (err) {
      console.warn('[translation] truncated retry failed:', err)
    }
  }

  return merged
}

/** 将气泡正文译为目标语言：贴合发言者人设口吻，拒绝生硬机翻 */
export async function translateWeChatBubbleText(params: {
  apiConfig: ApiConfig
  text: string
  targetLanguage: string
  signal?: AbortSignal
  /** 发言者姓名/昵称 */
  speakerName?: string
  listenerName?: string
  /** 发言者人设摘要（档案 + 口吻摘录） */
  speakerPersonaBrief?: string
  relationHint?: string
  speakerGender?: 'male' | 'female' | 'other' | null
  listenerGender?: 'male' | 'female' | 'other' | null
  /** 二次催促：禁止照抄原文 */
  forceTargetLanguage?: boolean
}): Promise<string> {
  const src = params.text.trim()
  if (!src) return ''
  const target = weChatChatLanguageNativeName(params.targetLanguage)
  const targetLabel = weChatChatLanguageLabel(params.targetLanguage)
  const name = params.speakerName?.trim() || ''
  const persona = params.speakerPersonaBrief?.trim() || ''
  const relationBlock = buildRelationAwareTranslationGlossary({
    speakerName: params.speakerName,
    listenerName: params.listenerName,
    relationHint: params.relationHint,
    speakerGender: params.speakerGender,
    listenerGender: params.listenerGender,
  })
  const voiceBlock = buildCharacterVoiceTranslationRules({
    targetLanguage: params.targetLanguage,
    speakerName: params.speakerName,
    speakerPersonaBrief: persona,
  })

  const personaBlock = persona
    ? `
【称呼参考 · 禁止加戏】
${name ? `姓名：${name}\n` : ''}${persona.slice(0, 400)}
（仅影响称呼/敬语；禁止按人设加动作、括号语气、心理旁白。）
`.trim()
    : `
【口吻】用自然口语译成 ${target}；禁止书面机翻腔；禁止另写无关句与舞台括号。
`.trim()

  const forceLine = params.forceTargetLanguage
    ? `\n5. 上一轮疑似照抄、未译完或截断：本轮必须输出**完整**自然 ${target}，禁止原样交回原文，禁止停在逗号半截；仍须忠于原意，禁止换话题、禁止加括号舞台指示。`
    : ''

  // 不传 max_tokens：由模型/线路自行决定输出长度（与剧情续写一致）
  const out = await openAiCompatibleChat(
    params.apiConfig,
    [
      {
        role: 'system',
        content: `你是忠实的机器翻译引擎（风格接近手机系统翻译）。目标语言：「${targetLabel}（${target}）」。
**只翻译，不加戏。必须译完整句/整段，禁止中途截断。**

${personaBlock}

${voiceBlock}

${relationBlock}

输出硬规则：
1. 只输出译文正文：不要引号、不要「译文：」、不要解释。
2. 必须是可读的 ${target}；禁止空输出；禁止原文原样交回（除非原文已是自然 ${target}）。
3. **禁止**加原文没有的「（轻笑）（笑）（叹气）（沉默）」等括号舞台指示；口头笑声只在原文有「あはは/哈哈」等时才译。
4. **禁止**输出 \`语音 \` \`发图\` \`[译]\` 等协议/UI 标记。
5. **完整且忠实**：覆盖全部语义；允许语序调整，禁止增删信息（错误例：在「啊哈哈」前塞「（轻笑）」）；**禁止**停在「……红红的，」这类半截逗号。${forceLine}`,
      },
      {
        role: 'user',
        content: `【待译句子】\n${src}`,
      },
    ],
    { temperature: params.forceTargetLanguage ? 0.2 : 0.1, signal: params.signal },
  )
  const cleaned = sanitizeWeChatBubbleTranslationOutput(out, src)
  if (
    !params.forceTargetLanguage &&
    looksLikeTruncatedTranslation(src, cleaned) &&
    !params.signal?.aborted
  ) {
    return translateWeChatBubbleText({ ...params, forceTargetLanguage: true })
  }
  return cleaned
}

/** 去掉模型爱加的引号/前缀/协议标记/臆造舞台括号；保留完整译文 */
function sanitizeWeChatBubbleTranslationOutput(raw: string, source: string): string {
  let t = raw.trim()
  if (!t) return ''
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith('「') && t.endsWith('」')) ||
    (t.startsWith('『') && t.endsWith('』'))
  ) {
    t = t.slice(1, -1).trim()
  }
  t = t
    .replace(/^(译文|翻译|Translation)\s*[:：]\s*/i, '')
    .replace(/^【[^】]{0,12}】\s*/, '')
    // 模型常把协议行名塞进译文
    .replace(/^(?:\[语音\]|【语音】|\[图片\]|【图片】|\[译\]|【译】|\[翻译\]|【翻译】)\s*/u, '')
    .trim()

  // 原文没有括号舞台指示时，剥掉译文里臆造的短括号标注（轻笑/笑/叹气…）
  const srcHasStageParen = /[（(][^）)]{0,10}[）)]/.test(source)
  if (!srcHasStageParen) {
    t = t.replace(
      /[（(](?:轻笑|笑|苦笑|干笑|偷笑|坏笑|傻笑|叹气|沉默|小声|低声|哭|顿|咳嗽|清嗓|捂脸|无奈|害羞|尴尬|停顿|喘息)[）)]/g,
      '',
    )
  }

  // 多行时去掉空行后整段保留（禁止按字数只留末行）
  if (t.includes('\n')) {
    t = t
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join('')
  }
  return t.replace(/\s{2,}/g, ' ').trim()
}
