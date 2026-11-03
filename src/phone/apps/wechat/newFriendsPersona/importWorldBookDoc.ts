import mammoth from 'mammoth'
import type { WorldBook } from './types'
import { uid } from './utils'

/** 统一换行并整理空白，避免导入后糊成一大段 */
export function normalizeImportedDocText(raw: string): string {
  let s = String(raw ?? '').replace(/^\uFEFF/, '')
  // 各种换行 → \n
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  s = s.replace(/\u2028/g, '\n').replace(/\u2029/g, '\n\n')
  s = s.replace(/[\u000b\u000c]/g, '\n')
  // HTML 实体（docx→html 路径可能残留）
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
  // 行尾空白去掉，保留空行结构；连续空行最多留一段
  s = s
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

/** 把 mammoth HTML 转成带段落换行的纯文本 */
function htmlToPlainWithBreaks(html: string): string {
  const src = String(html ?? '').trim()
  if (!src) return ''

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(src, 'text/html')
      const blocks = new Set([
        'P',
        'DIV',
        'H1',
        'H2',
        'H3',
        'H4',
        'H5',
        'H6',
        'LI',
        'TR',
        'BLOCKQUOTE',
        'PRE',
        'SECTION',
        'ARTICLE',
      ])
      const parts: string[] = []

      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          parts.push(node.textContent ?? '')
          return
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return
        const el = node as HTMLElement
        const tag = el.tagName
        if (tag === 'BR') {
          parts.push('\n')
          return
        }
        if (tag === 'STYLE' || tag === 'SCRIPT') return
        for (const child of Array.from(el.childNodes)) walk(child)
        if (blocks.has(tag)) parts.push('\n\n')
      }

      walk(doc.body)
      return normalizeImportedDocText(parts.join(''))
    } catch {
      /* fall through */
    }
  }

  // 无 DOM 时的简易回退
  let s = src
  s = s.replace(/<\s*br\s*\/?>/gi, '\n')
  s = s.replace(/<\s*\/\s*(p|div|h[1-6]|li|tr|blockquote)\s*>/gi, '\n\n')
  s = s.replace(/<[^>]+>/g, '')
  return normalizeImportedDocText(s)
}

async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  // 优先走 HTML：段落 / 软换行更能保住分行
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
    const fromHtml = htmlToPlainWithBreaks(String(htmlResult.value ?? ''))
    if (fromHtml) return fromHtml
  } catch {
    /* fall through to raw */
  }
  const rawResult = await mammoth.extractRawText({ arrayBuffer })
  return normalizeImportedDocText(String(rawResult.value ?? ''))
}

/** 从 txt / docx 提取纯文本，供世界书 / 档案室导入 */
export async function extractTextFromPersonaDoc(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const mime = (file.type || '').toLowerCase()

  const isTxt =
    name.endsWith('.txt') || mime === 'text/plain' || mime === 'text/markdown'
  if (isTxt) {
    const raw = await file.text()
    return normalizeImportedDocText(raw)
  }

  const isDocx =
    name.endsWith('.docx') ||
    mime.includes('wordprocessingml') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (isDocx) {
    const arrayBuffer = await file.arrayBuffer()
    return extractDocxText(arrayBuffer)
  }

  if (name.endsWith('.doc')) {
    throw new Error('暂不支持旧版 .doc，请另存为 .docx 或 .txt 后再导入')
  }
  throw new Error('仅支持 .txt 或 .docx 文件')
}

export function personaDocBaseName(fileName: string): string {
  const base = fileName.replace(/\.(txt|docx)$/i, '').trim()
  return base || '导入文档'
}

/** 将全文打成「一卷一书一条」世界书，供新建人设草稿使用 */
export function buildWorldBooksFromImportedDoc(params: {
  entryName: string
  content: string
}): WorldBook[] {
  const now = Date.now()
  const text = normalizeImportedDocText(params.content)
  return [
    {
      id: uid('wb'),
      name: '导入世界书',
      enabled: true,
      collapsed: false,
      items: [
        {
          id: uid('it'),
          name: params.entryName.trim() || '导入文档',
          enabled: true,
          priority: 'before',
          keywords: '',
          content: text,
          updatedAt: now,
          collapsed: false,
        },
      ],
    },
  ]
}
