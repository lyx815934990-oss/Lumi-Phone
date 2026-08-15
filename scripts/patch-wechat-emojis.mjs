/**
 * wechat-emojis 包缺少 .d.ts，且源码含 `enum`，在 erasableSyntaxOnly 下会 TS1294。
 * 安装/构建前把 enum 改成 const + type。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(root, 'node_modules', 'wechat-emojis', 'wechatEmoji.ts')

if (!fs.existsSync(file)) {
  console.warn('[patch-wechat-emojis] skip: file missing')
  process.exit(0)
}

let src = fs.readFileSync(file, 'utf8')
if (!src.includes('export enum EmojiCategory')) {
  process.exit(0)
}

const replacement = `export const EmojiCategory = {
  FACE: 'face',
  GESTURE: 'gesture',
  ANIMAL: 'animal',
  BLESSING: 'blessing',
  OTHER: 'other',
} as const
export type EmojiCategory = (typeof EmojiCategory)[keyof typeof EmojiCategory]`

const next = src.replace(/export enum EmojiCategory \{[\s\S]*?\n\}/, replacement)
if (next === src) {
  console.warn('[patch-wechat-emojis] enum block not matched')
  process.exit(1)
}
fs.writeFileSync(file, next)
console.log('[patch-wechat-emojis] EmojiCategory enum -> const')
