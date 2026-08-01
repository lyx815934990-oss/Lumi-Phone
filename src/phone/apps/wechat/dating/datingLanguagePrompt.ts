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
本轮已开启 ${bits.join(' / ')} 同步翻译，且使用**翻译副接口**。译文由客户端在剧情落库后再调用翻译服务商生成（目标：${transLabel} / ${transNative}），**不要**由你写译文。
- **禁止**输出 \`[译]\` / \`【译】\` / \`[翻译]\` / \`【同步译文】\` 附录。
- **禁止**把 ${transNative} 译文写进对白引号、内心 \`**…**\`、旁白，或夹在剧情中间。
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
      const appendixBits: string[] = []
      if (dialogueSyncOn) {
        appendixBits.push(
          '先写小节 \`对白：\`，再按正文中对白**出现顺序**逐条 \`1|译文\`、\`2|译文\`…（条数须与对白句数一致）',
        )
      }
      if (osSyncOn) {
        appendixBits.push(
          '再写一行 \`内心：\`，按正文中内心 OS**出现顺序**逐条 \`1|译文\`、\`2|译文\`…（条数须与 OS 段数一致）',
        )
      }
      parts.push(
        `
【同步输出翻译 · 同轮一次 · 硬项】
本轮已开启 ${bits.join(' / ')} 同步翻译（**仅此一次请求**：先写干净原文，文末再附译文附录）。目标语言：**${transLabel}（${transNative}）**。
- **正文阶段**：只写旁白 / 对白 / 内心 OS 原文。旁白用 **${plotNative}**；对白用 **${dialogueNative}**；内心用 **${osNative}**。
- **禁止**在对白或 OS 后紧跟 \`[译]\`；**禁止**把译文夹进引号、\`**…**\` 或旁白中间。
- **全文写完后**，另起一段，原样输出标题行 \`【同步译文】\`，然后：
  - ${appendixBits.join('\n  - ')}
- 附录不属于剧情正文；客户端会裁掉附录并把译文挂到对应句。
- 每条译文须**忠于对应原文**（通顺、不加戏；禁止另写一句；禁止原文没有的「（轻笑）」等舞台指示）。

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

const SYNC_TRANS_APPENDIX_MARKERS = ['【同步译文】', '<<<SYNC_TRANSLATIONS>>>', '【译文附录】'] as const

/** 定位文末「【同步译文】」附录起点（取最后一次出现，避免正文误提） */
export function findDatingSyncTranslationAppendixStart(raw: string): number {
  const text = String(raw ?? '')
  let best = -1
  for (const m of SYNC_TRANS_APPENDIX_MARKERS) {
    const i = text.lastIndexOf(m)
    if (i > best) best = i
  }
  return best
}

function stripSyncTransLineNoise(line: string): string {
  return String(line ?? '')
    .replace(TRANS_PREFIX_RE, '')
    .replace(/^\d+\s*[|｜．.、:：)）]\s*/u, '')
    .replace(/^[-*•]\s+/u, '')
    .trim()
}

/** 解析 \`【同步译文】\` 附录正文 → 对白/内心译文列表（按出现顺序） */
export function parseDatingSyncTranslationAppendix(appendixBody: string): {
  dialogueTranslatedTexts: string[]
  innerOsTranslatedTexts: string[]
} {
  const dialogueTranslatedTexts: string[] = []
  const osTranslatedTexts: string[] = []
  let mode: 'none' | 'dialogue' | 'os' = 'none'
  for (const rawLine of String(appendixBody ?? '').split('\n')) {
    const t = rawLine.trim()
    if (!t) continue
    if (/^<<<END_SYNC_TRANSLATIONS>>>/i.test(t)) break
    if (/^(?:对白|【对白译】|\[对白\])\s*[:：]?\s*$/iu.test(t)) {
      mode = 'dialogue'
      continue
    }
    if (/^(?:内心|OS|心声|【内心译】|\[内心\])\s*[:：]?\s*$/iu.test(t)) {
      mode = 'os'
      continue
    }
    const dialogueHeaderInline = t.match(/^(?:对白|【对白译】|\[对白\])\s*[:：]\s*(.+)$/iu)
    if (dialogueHeaderInline) {
      mode = 'dialogue'
      const body = stripSyncTransLineNoise(dialogueHeaderInline[1] || '')
      if (body) dialogueTranslatedTexts.push(body)
      continue
    }
    const osHeaderInline = t.match(/^(?:内心|OS|心声|【内心译】|\[内心\])\s*[:：]\s*(.+)$/iu)
    if (osHeaderInline) {
      mode = 'os'
      const body = stripSyncTransLineNoise(osHeaderInline[1] || '')
      if (body) osTranslatedTexts.push(body)
      continue
    }
    if (mode === 'none') continue
    const body = stripSyncTransLineNoise(t)
    if (!body) continue
    if (mode === 'dialogue') dialogueTranslatedTexts.push(body)
    else osTranslatedTexts.push(body)
  }
  return { dialogueTranslatedTexts, innerOsTranslatedTexts: osTranslatedTexts }
}

/**
 * 切开「先原文、后【同步译文】附录」。
 * 兼容旧版句后紧跟 \`[译]\`（附录为空时由 peel 处理）。
 */
export function splitDatingSyncTranslationAppendix(raw: string): {
  content: string
  dialogueTranslatedTexts: string[]
  innerOsTranslatedTexts: string[]
} {
  const text = String(raw ?? '')
  const start = findDatingSyncTranslationAppendixStart(text)
  if (start < 0) {
    return { content: text, dialogueTranslatedTexts: [], innerOsTranslatedTexts: [] }
  }
  let markerEnd = start
  for (const m of SYNC_TRANS_APPENDIX_MARKERS) {
    if (text.startsWith(m, start)) {
      markerEnd = start + m.length
      break
    }
  }
  while (markerEnd < text.length && (text[markerEnd] === '\r' || text[markerEnd] === '\n')) {
    markerEnd += 1
  }
  const content = text.slice(0, start).replace(/\s+$/u, '')
  const parsed = parseDatingSyncTranslationAppendix(text.slice(markerEnd))
  return {
    content,
    dialogueTranslatedTexts: parsed.dialogueTranslatedTexts,
    innerOsTranslatedTexts: parsed.innerOsTranslatedTexts,
  }
}

function mergeTranslationByIndex(
  spans: { source: string }[],
  appendixTexts: string[],
  peeledPrev: PlotDialogueTranslation[],
): PlotDialogueTranslation[] {
  return spans.map((s, i) => {
    const fromAppendix = String(appendixTexts[i] ?? '').trim()
    const fromPeeled = String(peeledPrev[i]?.translatedText ?? '').trim()
    let translatedText = fromAppendix || fromPeeled
    const source = s.source.trim()
    if (translatedText && isBadPeeledTranslation(source, translatedText, peeledPrev)) {
      translatedText = fromAppendix && !isBadPeeledTranslation(source, fromAppendix, peeledPrev)
        ? fromAppendix
        : ''
    }
    if (translatedText && looksLikeMidSentenceTranslationFragment(translatedText)) {
      translatedText = ''
    }
    if (translatedText && looksLikeTruncatedTranslation(source, translatedText)) {
      translatedText = ''
    }
    return { source, translatedText }
  })
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

/**
 * 切开文末译文附录 + 兼容旧版句后 \`[译]\`。
 * - 模型同轮路径（非副接口）：只用这一次回复里的译文，**不再**二次请求翻译 API。
 * - 副接口路径：仍在落库前走翻译服务商补全/重译。
 */
export async function finalizeDatingPlotDialogueTranslations(params: {
  content: string
  syncEnabled: boolean
  innerOsSyncEnabled?: boolean
  translationLanguage?: string | null
  apiConfig?: ApiConfig | null
  translationRuntime?: TranslationRuntime | null
  /** true：副接口开启，忽略模型译文一律走翻译 API */
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
  const split = splitDatingSyncTranslationAppendix(params.content)
  const peeled = peelDatingInlineTranslations(split.content, {
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
    let byIndex = mergeTranslationByIndex(
      spans,
      dedicated ? [] : split.dialogueTranslatedTexts,
      peeled.dialogueTranslations,
    )
    // 仅翻译副接口才二次请求；模型同轮附录路径保持一次请求
    if (dedicated) {
      byIndex = await fillMissingTranslations({ byIndex, ...fillOpts })
    }
    const filtered = byIndex.filter((r) => r.source)
    dialogueTranslations = filtered.some((r) => r.translatedText) ? filtered : undefined
  }

  if (osSync) {
    const spans = extractDatingInnerOsSpans(peeled.content)
    let byIndex = mergeTranslationByIndex(
      spans,
      dedicated ? [] : split.innerOsTranslatedTexts,
      peeled.innerOsTranslations,
    )
    if (dedicated) {
      byIndex = await fillMissingTranslations({ byIndex, ...fillOpts })
    }
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
