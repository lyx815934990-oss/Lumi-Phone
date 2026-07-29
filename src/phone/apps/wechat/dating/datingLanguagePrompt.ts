import type { ApiConfig } from '../../api/types'
import type { TranslationRuntime } from '../../api/translationProviders'
import {
  batchTranslateWeChatBubbleTexts,
  buildCharacterVoiceTranslationRules,
  buildRelationAwareTranslationGlossary,
  looksLikeTruncatedTranslation,
  normalizeWeChatChatLanguageCode,
  weChatChatLanguageLabel,
  weChatChatLanguageNativeName,
  WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
} from '../wechatChatLanguage'
import type { PlotDialogueTranslation } from './types'

const QL = '\u201C'
const QR = '\u201D'
const Q_OPEN_ALT = '\u201F'
const TRANS_PREFIX_RE = /^(?:\[译\]|【译】|\[翻译\]|【翻译】)\s*/u

function indexOfClosingCurve(t: string, from: number): number {
  const jR = t.indexOf(QR, from)
  if (jR !== -1) return jR
  return t.indexOf('\uFF02', from)
}

type DialogueSpan = { start: number; end: number; source: string }

function indexOfClosingCorner(t: string, from: number): number {
  let depth = 0
  for (let i = from; i < t.length; i += 1) {
    const ch = t[i]
    if (ch === '「') depth += 1
    else if (ch === '」') {
      if (depth === 0) return i
      depth -= 1
    }
  }
  return -1
}

/** 按杂志/VN 规则扫描正文中的对白句（不含引号本身） */
export function extractDatingDialogueSpans(content: string): DialogueSpan[] {
  const t = String(content ?? '')
  const out: DialogueSpan[] = []
  let i = 0
  while (i < t.length) {
    // VN：【对白】或【对白｜名】后到行末
    if (t[i] === '【') {
      const close = t.indexOf('】', i + 1)
      if (close !== -1) {
        const tag = t.slice(i + 1, close)
        if (/^对白/.test(tag)) {
          const lineStart = close + 1
          let lineEnd = t.indexOf('\n', lineStart)
          if (lineEnd === -1) lineEnd = t.length
          const source = t.slice(lineStart, lineEnd).trim()
          if (source) out.push({ start: lineStart, end: lineEnd, source })
          i = lineEnd
          continue
        }
      }
    }
    if (t.slice(i, i + 2) === '**') {
      const end = t.indexOf('**', i + 2)
      i = end === -1 ? i + 2 : end + 2
      continue
    }
    if (t[i] === '「') {
      const end = indexOfClosingCorner(t, i + 1)
      if (end !== -1) {
        const source = t.slice(i + 1, end)
        if (source.trim()) out.push({ start: i + 1, end, source })
        i = end + 1
        continue
      }
    }
    if (t[i] === QL || t[i] === Q_OPEN_ALT) {
      const end = indexOfClosingCurve(t, i + 1)
      if (end !== -1) {
        const source = t.slice(i + 1, end)
        if (source.trim()) out.push({ start: i + 1, end, source })
        i = end + 1
        continue
      }
    }
    if (t[i] === '"') {
      const end = t.indexOf('"', i + 1)
      if (end !== -1 && end > i + 1) {
        const source = t.slice(i + 1, end)
        if (source.trim()) out.push({ start: i + 1, end, source })
        i = end + 1
        continue
      }
    }
    i += 1
  }
  return out
}

/** 同行译文末尾若已有句读，后面又跟一整句开引号对白，则切开（避免吃掉下一句） */
function cutTrailingDialogueAfterTranslation(line: string): string {
  const re = /([。！？!?…])\s*(?=[「"“‟])/g
  let cutAt = -1
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    const afterPunct = m.index + m[1]!.length
    let k = afterPunct
    while (k < line.length && /\s/.test(line[k]!)) k += 1
    const rem = line.slice(k).trim()
    if (!rem) continue
    // 剩余部分本身是一条完整引号对白 → 视为下一句，不纳入译文
    if (
      (/^「/.test(rem) && rem.includes('」')) ||
      (/^"/.test(rem) && rem.indexOf('"', 1) > 0) ||
      (/^[“‟]/.test(rem) && /[”＂]/.test(rem))
    ) {
      cutAt = k
    }
  }
  if (cutAt < 0) return line.trim()
  return line.slice(0, cutAt).trim()
}

/** 译文续行若已是旁白起笔，勿并入 [译] */
function looksLikeNarrationAfterTranslation(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (/^你(?:发出|看着|轻轻|微微|侧过|靠在|睡得|蹭了|抬|低)/.test(t)) return true
  if (/^(?:他|她)(?:微微|轻轻|低头|抬眼|原本|肩膀|右手)/.test(t)) return true
  if (/^【/.test(t)) return true
  return false
}

/**
 * 续行以「/" 开头时：书名号/标题常独占一行，不可直接停；
 * 仅当已像「下一句日文对白」时才停，否则后半截会掉进正文并被套成对白底纹（掉格式）。
 */
function shouldStopTranslationAtQuotedLine(prevLine: string, trimmed: string): boolean {
  if (!/^[「"“‟『]/.test(trimmed)) return false
  const inner = trimmed
    .replace(/^[「"“‟『]/, '')
    .replace(/[」"”』].*$/u, '')
    .trim()
  const mostlyJa = hasJapaneseKana(trimmed) && !isPrimarilyChineseProse(inner || trimmed)
  if (mostlyJa) return true
  const prevEnded = /[。！？!?…]$/.test(prevLine.trim())
  if (!prevEnded) return false
  // 上一句已收束，且本行整行只是一句引号对白 → 下一句
  if (/^[「"“‟『][^」"”』]+[」"”』]\s*$/u.test(trimmed) && hasJapaneseKana(trimmed)) return true
  if (mostlyJa) return true
  return false
}

/** 译文像被砍掉头的后半截（常见于书名号换行后只留下半句） */
export function looksLikeMidSentenceTranslationFragment(translation: string): boolean {
  const tr = String(translation ?? '').trim()
  if (!tr) return false
  if (/^[，,、；;]/.test(tr)) return true
  // 「的话题」「是最棒的」等依附性起笔
  if (
    /^(?:的|地|得|了|着|过|呢|吧|吗|啊|呀|哦|喔|嘛|么|们|种|个|次|段|话|题|是最|但是我|但我……|但我…)/.test(
      tr,
    )
  ) {
    return true
  }
  return false
}

function readTranslationAt(text: string, from: number): { translation: string; end: number } | null {
  let j = from
  while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j += 1
  if (j < text.length && text[j] === '\n') {
    j += 1
    while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j += 1
  }
  const rest = text.slice(j)
  if (!TRANS_PREFIX_RE.test(rest)) return null
  const afterPrefix = rest.replace(TRANS_PREFIX_RE, '')
  const prefixLen = rest.length - afterPrefix.length

  /**
   * 译文常含书名号/引号（如「雨中场景」/『推荐漫画』），不可在首个「或换行后的「处截断，
   * 否则后半截会留在正文并被再解析成对白（掉格式 + 半截译文）。
   */
  const lines: string[] = []
  let consumed = 0
  let scan = 0
  while (scan <= afterPrefix.length) {
    let nl = afterPrefix.indexOf('\n', scan)
    if (nl === -1) nl = afterPrefix.length
    const rawLine = afterPrefix.slice(scan, nl)
    const trimmed = rawLine.trim()
    if (lines.length === 0) {
      if (!trimmed) return null
      lines.push(cutTrailingDialogueAfterTranslation(trimmed))
      // 若被切开，只消费到译文部分在本行中的末尾
      if (lines[0] !== trimmed && lines[0]) {
        const idx = rawLine.indexOf(lines[0])
        consumed = scan + (idx >= 0 ? idx + lines[0].length : rawLine.length)
        break
      }
      consumed = nl === afterPrefix.length ? nl : nl + 1
      scan = consumed
      if (nl === afterPrefix.length) break
      continue
    }
    if (!trimmed) break
    if (TRANS_PREFIX_RE.test(trimmed)) break
    if (/^【/.test(trimmed)) break
    if (trimmed.startsWith('**')) break
    if (shouldStopTranslationAtQuotedLine(lines[lines.length - 1] || '', trimmed)) break
    if (looksLikeNarrationAfterTranslation(trimmed)) break
    const merged = cutTrailingDialogueAfterTranslation(`${lines.join('')}${trimmed}`)
    const before = lines.join('')
    if (!merged.startsWith(before)) {
      break
    }
    const added = merged.slice(before.length)
    if (!added) break
    // 本行只有一部分属于译文（后接下一句对白）
    if (added !== trimmed) {
      const idx = rawLine.indexOf(added)
      lines.push(added)
      consumed = scan + (idx >= 0 ? idx + added.length : rawLine.length)
      break
    }
    lines.push(trimmed)
    consumed = nl === afterPrefix.length ? nl : nl + 1
    scan = consumed
    if (nl === afterPrefix.length) break
  }

  const translation = lines.join('').trim()
  if (!translation) return null
  let end = j + prefixLen + consumed
  while (end < text.length && (text[end] === ' ' || text[end] === '\t')) end += 1
  return { translation, end }
}

type InlineSpan = DialogueSpan & { kind: 'dialogue' | 'os' }

/** 扫描内心 OS：`**…**` 与 VN【内心】/【内心｜名】行正文 */
export function extractDatingInnerOsSpans(content: string): DialogueSpan[] {
  const t = String(content ?? '')
  const out: DialogueSpan[] = []
  let i = 0
  while (i < t.length) {
    if (t[i] === '【') {
      const close = t.indexOf('】', i + 1)
      if (close !== -1) {
        const tag = t.slice(i + 1, close)
        if (/^(?:内心|心声|OS|os)/.test(tag)) {
          const lineStart = close + 1
          let lineEnd = t.indexOf('\n', lineStart)
          if (lineEnd === -1) lineEnd = t.length
          const source = t.slice(lineStart, lineEnd).trim()
          if (source) out.push({ start: lineStart, end: lineEnd, source })
          i = lineEnd
          continue
        }
      }
    }
    // 跳过对白引号，避免误扫
    if (t[i] === '「') {
      const end = indexOfClosingCorner(t, i + 1)
      i = end === -1 ? i + 1 : end + 1
      continue
    }
    if (t[i] === QL || t[i] === Q_OPEN_ALT) {
      const end = indexOfClosingCurve(t, i + 1)
      i = end === -1 ? i + 1 : end + 1
      continue
    }
    if (t[i] === '"') {
      const end = t.indexOf('"', i + 1)
      i = end === -1 || end === i + 1 ? i + 1 : end + 1
      continue
    }
    if (t.slice(i, i + 2) === '**') {
      const end = t.indexOf('**', i + 2)
      if (end !== -1) {
        const source = t.slice(i + 2, end)
        if (source.trim()) out.push({ start: i + 2, end, source })
        i = end + 2
        continue
      }
    }
    i += 1
  }
  return out
}

function closeEndForSpan(text: string, span: InlineSpan): number {
  if (span.kind === 'os') {
    // **source** → 闭星号在 end 之后；VN 行无闭标记
    const after = text.slice(span.end, span.end + 2)
    if (after === '**') return span.end + 2
    return span.end
  }
  let closeEnd = span.end
  const afterSource = text[span.end]
  if (afterSource === '」' || afterSource === QR || afterSource === '\uFF02' || afterSource === '"') {
    closeEnd = span.end + 1
  }
  return closeEnd
}

function hasJapaneseKana(s: string): boolean {
  return /[\u3040-\u30ff]/.test(s)
}

function isPrimarilyChineseProse(s: string): boolean {
  const t = String(s ?? '').trim()
  if (t.length < 2) return false
  if (hasJapaneseKana(t)) return false
  if (TRANS_PREFIX_RE.test(t)) return false
  if (/^[「"“‟【*]/.test(t)) return false
  const han = (t.match(/[\u4e00-\u9fff]/g) || []).length
  if (han < 2) return false
  // 至少一半可识别字符是汉字（允许标点）
  const letters = (t.match(/[\u4e00-\u9fffa-zA-Z\u3040-\u30ff]/g) || []).length
  return letters === 0 || han / letters >= 0.6
}

function looksLikeOsVoiceChinese(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  // 承接上文的关联词 / 第一人称内心口吻 —— 更像漏进来的 OS 译文，而非第三人称旁白
  if (/^(?:但|可是|不过|而且|毕竟|只是|偏偏|原来|难道|怎么|为什么|不行|算了)/.test(t)) return true
  const firstPerson = (t.match(/我|俺|咱/g) || []).length
  const thirdPerson = (t.match(/他|她|他们|她们/g) || []).length
  return firstPerson >= 1 && firstPerson >= thirdPerson
}

/**
 * 模型常把 OS 译文直接接在闭 `**` 后且漏写 `[译]`，导致中文掉出灰色 OS 样式。
 * 在原文含假名、后接中文内心口吻时，当作漏标译文吸收。
 */
function readLeakedOsTranslationAt(
  text: string,
  from: number,
  source: string,
): { translation: string; end: number } | null {
  if (!hasJapaneseKana(source)) return null

  let j = from
  while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j += 1
  const sameLine = j < text.length && text[j] !== '\n'
  if (!sameLine) {
    if (j < text.length && text[j] === '\n') {
      j += 1
      while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j += 1
    }
  }
  if (j >= text.length) return null
  if (TRANS_PREFIX_RE.test(text.slice(j))) return null
  if (text.slice(j, j + 2) === '**') return null
  if (/^[「"“‟【]/.test(text[j]!)) return null

  const chunks: string[] = []
  let pos = j
  let lineIndex = 0
  while (pos < text.length) {
    if (text.slice(pos, pos + 2) === '**') break
    if (text[pos] === '【') break
    if (text[pos] === '「' || text[pos] === '"' || text[pos] === QL || text[pos] === Q_OPEN_ALT) break
    if (text[pos] === '\n' && text[pos + 1] === '\n') break

    let nl = text.indexOf('\n', pos)
    if (nl === -1) nl = text.length
    const rawLine = text.slice(pos, nl)
    const trimmed = rawLine.trim()
    if (!trimmed) break
    if (TRANS_PREFIX_RE.test(trimmed)) break
    if (!isPrimarilyChineseProse(trimmed)) break
    if (lineIndex === 0) {
      if (!sameLine && !looksLikeOsVoiceChinese(trimmed)) break
    } else if (!looksLikeOsVoiceChinese(trimmed) && lineIndex >= 1) {
      // 续行若突然变成旁白腔，停
      if (/^(?:他|她|其|门外|窗外|此时|这时)/.test(trimmed)) break
    }
    chunks.push(trimmed)
    lineIndex += 1
    pos = nl === text.length ? nl : nl + 1
    if (nl === text.length) break
    // 下一行若空行则停在换行后由外层处理
    if (pos < text.length && text[pos] === '\n') break
  }

  const translation = chunks.join('').trim()
  if (translation.length < 4) return null
  let end = pos
  while (end < text.length && (text[end] === ' ' || text[end] === '\t')) end += 1
  return { translation, end }
}

/**
 * 剥离正文中的 `[译]…`，按对白 / 内心 OS 出现顺序分别挂译文。
 * 支持闭标记后同行紧贴，或下一行单独 `[译]`。
 * `absorbLeakedOsChinese`：吸收「闭 ** 后漏写 [译] 的中文 OS 译文」，避免掉出灰色格式。
 */
export function peelDatingInlineTranslations(
  raw: string,
  opts?: { absorbLeakedOsChinese?: boolean; absorbLeakedDialogueChinese?: boolean },
): {
  content: string
  dialogueTranslations: PlotDialogueTranslation[]
  innerOsTranslations: PlotDialogueTranslation[]
} {
  const text = String(raw ?? '')
  if (!text.trim()) {
    return { content: text, dialogueTranslations: [], innerOsTranslations: [] }
  }

  const spans: InlineSpan[] = [
    ...extractDatingDialogueSpans(text).map((s) => ({ ...s, kind: 'dialogue' as const })),
    ...extractDatingInnerOsSpans(text).map((s) => ({ ...s, kind: 'os' as const })),
  ].sort((a, b) => a.start - b.start)

  if (!spans.length) {
    const cleaned = text
      .split('\n')
      .filter((line) => !TRANS_PREFIX_RE.test(line.trim()))
      .join('\n')
    return { content: cleaned, dialogueTranslations: [], innerOsTranslations: [] }
  }

  const dialogueTranslations: PlotDialogueTranslation[] = []
  const innerOsTranslations: PlotDialogueTranslation[] = []
  const pieces: string[] = []
  let cursor = 0
  const absorbOsLeak = opts?.absorbLeakedOsChinese === true
  const absorbDialogueLeak = opts?.absorbLeakedDialogueChinese === true

  for (const span of spans) {
    const closeEnd = closeEndForSpan(text, span)
    // 已被上一条 [译] 吃掉的书名号行等，勿回退 cursor，否则后半截会漏回正文并掉格式
    if (closeEnd <= cursor) continue
    if (span.start < cursor) {
      cursor = closeEnd
      continue
    }
    pieces.push(text.slice(cursor, closeEnd))
    let tr = readTranslationAt(text, closeEnd)
    if (!tr && absorbOsLeak && span.kind === 'os') {
      tr = readLeakedOsTranslationAt(text, closeEnd, span.source)
    }
    if (!tr && absorbDialogueLeak && span.kind === 'dialogue' && hasJapaneseKana(span.source)) {
      tr = readLeakedChineseDialogueQuoteAt(text, closeEnd)
    }
    const row: PlotDialogueTranslation = {
      source: span.source.trim(),
      translatedText: tr?.translation ?? '',
    }
    if (span.kind === 'dialogue') dialogueTranslations.push(row)
    else innerOsTranslations.push(row)
    cursor = Math.max(closeEnd, tr?.end ?? closeEnd)
  }
  pieces.push(text.slice(cursor))
  let content = pieces.join('')
  content = content
    .split('\n')
    .filter((line) => !TRANS_PREFIX_RE.test(line.trim()))
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')

  return {
    content,
    dialogueTranslations: dialogueTranslations.filter((t) => t.source),
    innerOsTranslations: innerOsTranslations.filter((t) => t.source),
  }
}

/**
 * 模型常把对白译文写成下一句带引号的中文对白（漏 `[译]`），
 * 正文里就会出现「日文对白 + 中文对白」两行。紧挨在日文对白后的纯中文引号句当作译文吸收。
 */
function readLeakedChineseDialogueQuoteAt(
  text: string,
  from: number,
): { translation: string; end: number } | null {
  let j = from
  while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n')) j += 1
  if (j >= text.length) return null
  if (TRANS_PREFIX_RE.test(text.slice(j))) return null

  const open = text[j]!
  let end = -1
  let inner = ''
  if (open === '「') {
    end = indexOfClosingCorner(text, j + 1)
    if (end === -1) return null
    inner = text.slice(j + 1, end)
  } else if (open === QL || open === Q_OPEN_ALT) {
    end = indexOfClosingCurve(text, j + 1)
    if (end === -1) return null
    inner = text.slice(j + 1, end)
  } else if (open === '"') {
    end = text.indexOf('"', j + 1)
    if (end === -1 || end === j + 1) return null
    inner = text.slice(j + 1, end)
  } else {
    return null
  }

  const src = inner.trim()
  if (!src || hasJapaneseKana(src) || !isPrimarilyChineseProse(src)) return null
  // 太短不太像整句译文
  if (src.length < 4) return null
  return { translation: src, end: end + 1 }
}

/** @deprecated 使用 peelDatingInlineTranslations；保留兼容 */
export function peelDatingDialogueTranslations(raw: string): {
  content: string
  translations: PlotDialogueTranslation[]
} {
  const peeled = peelDatingInlineTranslations(raw)
  return { content: peeled.content, translations: peeled.dialogueTranslations }
}

/** 注入 system/user：旁白 / 对白 / 内心 OS 语言 + 可选同步翻译 */
export function buildDatingLanguageAppendix(params: {
  plotOutputLanguage?: string | null
  dialogueLanguage?: string | null
  innerOsLanguage?: string | null
  dialogueTranslationSyncEnabled?: boolean
  innerOsTranslationSyncEnabled?: boolean
  dialogueTranslationLanguage?: string | null
  isVnMode?: boolean
  /** 约会对象姓名 */
  characterName?: string | null
  /** 玩家显示名 */
  playerName?: string | null
  /** 关系线索（学长学弟/职场等，可从人设截取） */
  relationHint?: string | null
  /** 约会对象人设/口吻摘录，供 `[译]` 贴人物 */
  characterPersonaBrief?: string | null
  characterGender?: 'male' | 'female' | 'other' | null
  playerGender?: 'male' | 'female' | 'other' | null
  /** true：API 设置「翻译」副接口开启；false：由模型写 [译] */
  translationDedicatedApi?: boolean
}): string {
  const plotCode = normalizeWeChatChatLanguageCode(
    params.plotOutputLanguage,
    WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  )
  const dialogueRaw = String(params.dialogueLanguage ?? '').trim()
  const dialogueCode = dialogueRaw
    ? normalizeWeChatChatLanguageCode(dialogueRaw, plotCode)
    : plotCode
  const osRaw = String(params.innerOsLanguage ?? '').trim()
  const osCode = osRaw ? normalizeWeChatChatLanguageCode(osRaw, plotCode) : plotCode
  const dialogueSyncOn = params.dialogueTranslationSyncEnabled === true
  const osSyncOn = params.innerOsTranslationSyncEnabled === true
  const dedicatedApi = params.translationDedicatedApi === true
  const transCode = normalizeWeChatChatLanguageCode(
    params.dialogueTranslationLanguage,
    WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
  )

  const plotNative = weChatChatLanguageNativeName(plotCode)
  const plotLabel = weChatChatLanguageLabel(plotCode)
  const dialogueNative = weChatChatLanguageNativeName(dialogueCode)
  const dialogueLabel = weChatChatLanguageLabel(dialogueCode)
  const osNative = weChatChatLanguageNativeName(osCode)
  const osLabel = weChatChatLanguageLabel(osCode)
  const transNative = weChatChatLanguageNativeName(transCode)
  const transLabel = weChatChatLanguageLabel(transCode)

  const allSame = plotCode === dialogueCode && plotCode === osCode
  const allZh = plotCode === 'zh-CN' && dialogueCode === 'zh-CN' && osCode === 'zh-CN'

  const parts: string[] = []

  if (!allZh || !allSame) {
    if (allSame) {
      parts.push(
        `
【输出语言 · 最高优先级之一】
- 本轮用户已指定：剧情**旁白**（叙述）、**内心 OS**（\`**…**\`）与**角色对白**一律使用 **${plotLabel}（${plotNative}）**。
- 禁止默认改回简体中文（协议标签/系统说明除外）。
`.trim(),
      )
    } else {
      parts.push(
        `
【输出语言 · 最高优先级之一】
- 本轮用户已分别指定：
  - **旁白**（非对白叙述）：**${plotLabel}（${plotNative}）**
  - **内心 OS**（\`**整句**\` / VN【内心】行正文）：**${osLabel}（${osNative}）**
  - **角色对白**（弯引号 /「」/ 英文引号内；VN 的【对白】行正文）：**${dialogueLabel}（${dialogueNative}）**
- **对白语言纯度（硬项）**：凡进入引号 /【对白】的台词必须是 ${dialogueNative}；**禁止**在对白引号内写其它语言整句。
- **OS 语言纯度（硬项）**：\`**…**\` /【内心】内必须是 ${osNative}；禁止把内心写成旁白或对白语言（除非该项与旁白/对白相同）。
- 禁止把对白写成旁白语言，也禁止把旁白整段改成对白语言；三者各守其界。
`.trim(),
      )
    }
  }

  if (dialogueSyncOn || osSyncOn) {
    const bits: string[] = []
    if (dialogueSyncOn) bits.push('对白')
    if (osSyncOn) bits.push('内心 OS')
    if (dedicatedApi) {
      parts.push(
        `
【同步翻译 · 客户端翻译 API · 硬项】
本轮已开启 ${bits.join(' / ')} 同步翻译，且使用**翻译副接口**。译文由客户端调用翻译服务商生成（目标：${transLabel} / ${transNative}），**不要**由你在正文里写译文。
- **禁止**输出 \`[译]\` / \`【译】\` / \`[翻译]\` 行。
- **禁止**把 ${transNative} 译文写进对白引号、内心 \`**…**\`、旁白，或单独成段夹在剧情里。
- 对白仍只用 **${dialogueNative}**；内心 OS 仍只用 **${osNative}**；旁白仍只用 **${plotNative}**。
`.trim(),
      )
    } else {
      const glossary = buildRelationAwareTranslationGlossary({
        speakerName: params.characterName,
        listenerName: params.playerName,
        relationHint: params.relationHint,
        speakerGender: params.characterGender,
        listenerGender: params.playerGender,
      })
      const voice = buildCharacterVoiceTranslationRules({
        targetLanguage: transCode,
        speakerName: params.characterName,
        speakerPersonaBrief: params.characterPersonaBrief,
      })
      const whereBits: string[] = []
      if (dialogueSyncOn) {
        whereBits.push(
          '每句**角色对白**（弯引号 /「」/ 英文引号闭合后，或 VN【对白】行末）紧跟单独一行 \`[译]……\`',
        )
      }
      if (osSyncOn) {
        whereBits.push(
          '每段**内心 OS**（\`**…**\` 闭合后，或 VN【内心】行末）紧跟单独一行 \`[译]……\`',
        )
      }
      parts.push(
        `
【同步输出翻译 · 硬项】
本轮已开启 ${bits.join(' / ')} 同步翻译（由聊天模型同轮输出）。目标语言：**${transLabel}（${transNative}）**。
- ${whereBits.join('；')}
- \`[译]\` 行**不**算剧情正文；客户端会剥离并挂到对应句下方。
- 「……」须**忠于上一句原文**（像系统翻译：通顺但不加戏；禁止另写一句、禁止「（轻笑）」等原文没有的括号舞台指示）。
- **禁止**把译文写进对白引号、内心标记或旁白里冒充原文。
- 旁白仍只用 **${plotNative}**；对白仍只用 **${dialogueNative}**；内心仍只用 **${osNative}**。

${voice}

${glossary}
`.trim(),
      )
    }
  }

  return parts.filter(Boolean).join('\n\n')
}

export function summarizeDatingLanguageSettings(params: {
  plotOutputLanguage?: string
  dialogueLanguage?: string
  innerOsLanguage?: string
  dialogueTranslationSyncEnabled?: boolean
  innerOsTranslationSyncEnabled?: boolean
  dialogueTranslationLanguage?: string
}): string {
  const plot = weChatChatLanguageLabel(params.plotOutputLanguage)
  const dialogue = weChatChatLanguageLabel(
    String(params.dialogueLanguage ?? '').trim() || params.plotOutputLanguage,
  )
  const os = weChatChatLanguageLabel(
    String(params.innerOsLanguage ?? '').trim() || params.plotOutputLanguage,
  )
  const bits: string[] = []
  if (plot === dialogue && plot === os) {
    bits.push(`旁白/对白/OS ${plot}`)
  } else {
    bits.push(`旁白 ${plot}`)
    if (dialogue !== plot) bits.push(`对白 ${dialogue}`)
    else bits.push('对白同旁白')
    if (os !== plot) bits.push(`OS ${os}`)
    else bits.push('OS同旁白')
  }
  const syncBits: string[] = []
  if (params.dialogueTranslationSyncEnabled) syncBits.push('对白')
  if (params.innerOsTranslationSyncEnabled) syncBits.push('OS')
  if (syncBits.length) {
    bits.push(`${syncBits.join('+')}译→${weChatChatLanguageLabel(params.dialogueTranslationLanguage)}`)
  }
  return bits.join(' · ')
}

/** 从人设摘要里抽一点关系线索，供译文选词（非严格 NLP，只做关键词提示） */
export function inferDatingRelationHintForTranslation(params: {
  characterName?: string | null
  playerName?: string | null
  characterPrompt?: string | null
  characterIdentity?: string | null
}): string {
  const name = String(params.characterName ?? '').trim() || '约会对象'
  const player = String(params.playerName ?? '').trim() || '玩家'
  const blob = `${params.characterIdentity ?? ''}\n${params.characterPrompt ?? ''}`.slice(0, 2400)
  const bits: string[] = []
  if (/学长|学姐|学弟|学妹|先輩|後輩|せんぱい|こうはい|社团|部活|同校|校园|班级|同学|学生/.test(blob)) {
    bits.push(
      `人设含校园/社团辈分线索：${name} 与 ${player} 之间的「先輩/後輩」优先译为学长/学姐、学弟/学妹，禁止译成笼统「前辈」或「小孩」`,
    )
  }
  if (/公司|职场|上司|下属|同事|社员|社长|部長|課長/.test(blob)) {
    bits.push(`人设含职场线索时，「先輩/後輩」才可按前辈/后辈译`)
  }
  bits.push(`称呼须与 ${name}↔${player} 的既有关系一致，勿按词典默认义笼统翻译`)
  return bits.join('；')
}

async function fillMissingTranslations(params: {
  byIndex: PlotDialogueTranslation[]
  translationLanguage?: string | null
  apiConfig?: ApiConfig | null
  translationRuntime?: TranslationRuntime | null
  /** true：忽略已有译文，一律用翻译 API 重译（同步翻译走服务商） */
  forceRetranslate?: boolean
  speakerName?: string
  listenerName?: string
  speakerPersonaBrief?: string
  relationHint?: string
  speakerGender?: 'male' | 'female' | 'other' | null
  listenerGender?: 'male' | 'female' | 'other' | null
  signal?: AbortSignal
}): Promise<PlotDialogueTranslation[]> {
  const needIdx: number[] = []
  const needTexts: string[] = []
  const fallbackByNeed = new Map<number, string>()
  params.byIndex.forEach((row, i) => {
    if (!row.source) return
    const existing = row.translatedText?.trim() || ''
    const need =
      params.forceRetranslate ||
      !existing ||
      looksLikeTruncatedTranslation(row.source, existing) ||
      looksLikeMidSentenceTranslationFragment(existing)
    if (need) {
      const j = needTexts.length
      needIdx.push(i)
      needTexts.push(row.source)
      if (existing && !looksLikeTruncatedTranslation(row.source, existing)) {
        fallbackByNeed.set(j, existing)
      }
    }
  })
  const runtime = params.translationRuntime
  const canNative = !!runtime && runtime.provider !== 'openai'
  const openaiCfg = runtime?.provider === 'openai' ? runtime.openaiConfig : params.apiConfig
  const canOpenai =
    !!openaiCfg?.apiUrl?.trim() && !!openaiCfg?.apiKey?.trim() && !!openaiCfg?.modelId?.trim()
  if (!needTexts.length || (!canNative && !canOpenai)) {
    return params.byIndex
  }
  try {
    const filled = await batchTranslateWeChatBubbleTexts({
      apiConfig: openaiCfg ?? undefined,
      translationRuntime: runtime,
      texts: needTexts,
      targetLanguage: params.translationLanguage ?? WECHAT_CHAT_DEFAULT_TRANSLATION_LANGUAGE,
      speakerName: params.speakerName,
      listenerName: params.listenerName,
      speakerPersonaBrief: params.speakerPersonaBrief,
      relationHint: params.relationHint,
      speakerGender: params.speakerGender,
      listenerGender: params.listenerGender,
      signal: params.signal,
    })
    const next = [...params.byIndex]
    needIdx.forEach((idx, j) => {
      const t = String(filled[j] ?? '').trim() || fallbackByNeed.get(j) || ''
      if (t) next[idx] = { ...next[idx]!, translatedText: t }
    })
    return next
  } catch {
    return params.byIndex
  }
}

/** peel + 缺译补全（对白 / 内心 OS），供落库前调用 */
export async function finalizeDatingPlotDialogueTranslations(params: {
  content: string
  syncEnabled: boolean
  innerOsSyncEnabled?: boolean
  translationLanguage?: string | null
  apiConfig?: ApiConfig | null
  translationRuntime?: TranslationRuntime | null
  /** true：副接口开启，忽略模型 [译] 一律走翻译 API（模型译文仅作失败兜底） */
  translationDedicatedApi?: boolean
  speakerName?: string
  listenerName?: string
  speakerPersonaBrief?: string
  relationHint?: string
  speakerGender?: 'male' | 'female' | 'other' | null
  listenerGender?: 'male' | 'female' | 'other' | null
  signal?: AbortSignal
}): Promise<{
  content: string
  dialogueTranslations?: PlotDialogueTranslation[]
  innerOsTranslations?: PlotDialogueTranslation[]
}> {
  const dialogueSync = params.syncEnabled === true
  const osSync = params.innerOsSyncEnabled === true
  const dedicated = params.translationDedicatedApi === true
  const peeled = peelDatingInlineTranslations(params.content, {
    absorbLeakedOsChinese: osSync,
    absorbLeakedDialogueChinese: dialogueSync,
  })

  if (!dialogueSync && !osSync) {
    return {
      content: peeled.content,
      dialogueTranslations: undefined,
      innerOsTranslations: undefined,
    }
  }

  const fillOpts = {
    translationLanguage: params.translationLanguage,
    apiConfig: dedicated ? undefined : params.apiConfig,
    translationRuntime: dedicated ? params.translationRuntime : null,
    // 副接口：一律重译；模型路径：只补缺译
    forceRetranslate: dedicated,
    speakerName: params.speakerName,
    listenerName: params.listenerName,
    speakerPersonaBrief: params.speakerPersonaBrief,
    relationHint: params.relationHint,
    speakerGender: params.speakerGender,
    listenerGender: params.listenerGender,
    signal: params.signal,
  }

  let dialogueTranslations: PlotDialogueTranslation[] | undefined
  let innerOsTranslations: PlotDialogueTranslation[] | undefined

  if (dialogueSync) {
    const spans = extractDatingDialogueSpans(peeled.content)
    let byIndex: PlotDialogueTranslation[] = spans.map((s, i) => {
      const prev = peeled.dialogueTranslations[i]
      const source = s.source.trim()
      let translatedText = (prev?.translatedText || '').trim()
      if (translatedText && isBadPeeledTranslation(source, translatedText, peeled.dialogueTranslations)) {
        translatedText = ''
      }
      // 半截译文（如「的话题」「是最棒的」）清空后走补全，不用字数比丢弃
      if (translatedText && looksLikeMidSentenceTranslationFragment(translatedText)) {
        translatedText = ''
      }
      if (translatedText && looksLikeTruncatedTranslation(source, translatedText)) {
        translatedText = ''
      }
      return { source, translatedText }
    })
    byIndex = await fillMissingTranslations({ byIndex, ...fillOpts })
    const filtered = byIndex.filter((r) => r.source)
    dialogueTranslations = filtered.some((r) => r.translatedText) ? filtered : undefined
  }

  if (osSync) {
    const spans = extractDatingInnerOsSpans(peeled.content)
    let byIndex: PlotDialogueTranslation[] = spans.map((s, i) => {
      const prev = peeled.innerOsTranslations[i]
      const source = s.source.trim()
      let translatedText = (prev?.translatedText || '').trim()
      if (translatedText && isBadPeeledTranslation(source, translatedText, peeled.innerOsTranslations)) {
        translatedText = ''
      }
      if (translatedText && looksLikeMidSentenceTranslationFragment(translatedText)) {
        translatedText = ''
      }
      if (translatedText && looksLikeTruncatedTranslation(source, translatedText)) {
        translatedText = ''
      }
      return { source, translatedText }
    })
    byIndex = await fillMissingTranslations({ byIndex, ...fillOpts })
    const filtered = byIndex.filter((r) => r.source)
    innerOsTranslations = filtered.some((r) => r.translatedText) ? filtered : undefined
  }

  return {
    content: peeled.content,
    dialogueTranslations,
    innerOsTranslations,
  }
}

function normalizeDialogueCompareKey(s: string): string {
  return String(s ?? '')
    .replace(/\s+/g, '')
    .replace(/[「」""''『』*＊]/g, '')
    .trim()
}

function isBadPeeledTranslation(
  source: string,
  translation: string,
  all: PlotDialogueTranslation[],
): boolean {
  const tr = normalizeDialogueCompareKey(translation)
  const src = normalizeDialogueCompareKey(source)
  if (!tr) return true
  for (const row of all) {
    const other = normalizeDialogueCompareKey(row.source)
    if (!other || other === src) continue
    if (other === tr) return true
    if (tr.length >= 4 && other.length >= 4 && (other.includes(tr) || tr.includes(other))) return true
  }
  return false
}
