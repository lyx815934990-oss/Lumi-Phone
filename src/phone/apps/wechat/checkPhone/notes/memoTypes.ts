export type PaperStyle = 'solid' | 'lined' | 'grid'

export type MemoTextModifier =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'highlight-yellow'
  | 'highlight-blue'
  | 'highlight-pink'

export type MemoBlock =
  | { type: 'h1'; content: string; translation?: string }
  | { type: 'h2'; content: string; translation?: string }
  | {
      type: 'text'
      content: string
      modifiers?: MemoTextModifier[]
      color?: string
      translation?: string
    }
  | { type: 'image'; url: string; caption?: string; translation?: string }
  | {
      type: 'voice'
      duration: string
      transcript: string
      /** 语音转写的同步译文 */
      translation?: string
    }
  | { type: 'file'; fileType: 'pdf' | 'doc' | 'docx' | 'txt' | 'other'; fileName: string; size: string }

export interface PrivateMemo {
  id: string
  title: string
  /** 标题同步译文（勾选「自带翻译」时由模型写入） */
  titleTranslation?: string
  date: string
  paperStyle: PaperStyle
  paperColor: string
  blocks: MemoBlock[]
}
