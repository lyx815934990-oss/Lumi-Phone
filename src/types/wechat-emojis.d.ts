/** wechat-emojis@1.0.2 未发布 .d.ts，本地补类型（完整 109 枚目录） */
declare module 'wechat-emojis' {
  export enum EmojiCategory {
    FACE = 'face',
    GESTURE = 'gesture',
    ANIMAL = 'animal',
    BLESSING = 'blessing',
    OTHER = 'other',
  }

  export type EmojiInfo = {
    name: string
    category: EmojiCategory | string
    path: string
    englishName?: string
  }

  export function getAllEmojis(): EmojiInfo[]
  export function getEmojisByCategory(category: EmojiCategory | string): EmojiInfo[]
  export function getEmojiInfo(name: string): EmojiInfo | undefined
  export function getEmojiPath(name: string): string | undefined
  export function getEmojiNames(category?: EmojiCategory | string): string[]
  export function hasEmoji(name: string): boolean
}
