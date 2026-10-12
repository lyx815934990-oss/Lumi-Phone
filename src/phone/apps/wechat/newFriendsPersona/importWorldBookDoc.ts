import mammoth from 'mammoth'
import type { WorldBook } from './types'
import { uid } from './utils'

/** 从 txt / docx 提取纯文本，供世界书单条导入 */
export async function extractTextFromPersonaDoc(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const mime = (file.type || '').toLowerCase()

  const isTxt =
    name.endsWith('.txt') || mime === 'text/plain' || mime === 'text/markdown'
  if (isTxt) {
    const raw = await file.text()
    return raw.replace(/^\uFEFF/, '').trim()
  }

  const isDocx =
    name.endsWith('.docx') ||
    mime.includes('wordprocessingml') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (isDocx) {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return String(result.value ?? '').trim()
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
  const text = params.content.trim()
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
