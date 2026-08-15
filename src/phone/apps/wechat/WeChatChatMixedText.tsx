import type { CSSProperties } from 'react'

import { getWechatClassicEmojiUrlByName } from './stickers/wechatClassicStickerPack'

/**
 * 聊天室英文/数字：跟随微信主题字体（--wx-font / 系统 UI），不再拆成 Corbel Light。
 * 保留导出名以免外部引用断裂。
 */
export const WECHAT_CHAT_LATIN_NUM_FONT_FAMILY = 'var(--wx-chat-font, var(--wx-font))'

export const WECHAT_CHAT_LATIN_NUM_STYLE: CSSProperties = {
  fontFamily: WECHAT_CHAT_LATIN_NUM_FONT_FAMILY,
}

const URL_INLINE_RE = /https?:\/\/[^\s<>"')\]}，。；、]+/gi

const WECHAT_CLASSIC_EMOJI_INLINE_STYLE: CSSProperties = {
  display: 'inline-block',
  width: 22,
  height: 22,
  verticalAlign: 'text-bottom',
  objectFit: 'contain',
}

const WECHAT_CLASSIC_EMOJI_BRACKET_RE = /\[([^\[\]\n]{1,24})\]/g

type TextSegment = { kind: 'url' | 'text'; value: string }
type MixedSegment = { kind: 'url' | 'text' | 'emoji'; value: string; emojiUrl?: string }

function splitTextWithWechatClassicEmojis(text: string): MixedSegment[] {
  const emojiMap = getWechatClassicEmojiUrlByName()
  const out: MixedSegment[] = []
  let last = 0
  for (const m of text.matchAll(WECHAT_CLASSIC_EMOJI_BRACKET_RE)) {
    const idx = m.index ?? 0
    const name = String(m[1] ?? '').trim()
    const url = name ? emojiMap.get(name) : undefined
    if (!url) continue
    if (idx > last) out.push({ kind: 'text', value: text.slice(last, idx) })
    out.push({ kind: 'emoji', value: name, emojiUrl: url })
    last = idx + m[0]!.length
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) })
  if (!out.length) out.push({ kind: 'text', value: text })
  return out
}

const URL_SPAN_STYLE: CSSProperties = {
  wordBreak: 'break-all',
  overflowWrap: 'anywhere',
}

function splitTextAndUrls(text: string): TextSegment[] {
  const out: TextSegment[] = []
  let last = 0
  for (const m of text.matchAll(URL_INLINE_RE)) {
    const idx = m.index ?? 0
    if (idx > last) out.push({ kind: 'text', value: text.slice(last, idx) })
    const url = String(m[0] ?? '').trim()
    if (url) out.push({ kind: 'url', value: url })
    last = idx + m[0]!.length
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) })
  if (!out.length) out.push({ kind: 'text', value: text })
  return out
}

function renderTextWithClassicEmojis(text: string, keyPrefix: string) {
  return splitTextWithWechatClassicEmojis(text).map((seg, index) => {
    if (seg.kind === 'emoji' && seg.emojiUrl) {
      return (
        <img
          key={`${keyPrefix}-wx-${index}`}
          src={seg.emojiUrl}
          alt={`[${seg.value}]`}
          style={WECHAT_CLASSIC_EMOJI_INLINE_STYLE}
          draggable={false}
        />
      )
    }
    // 中英数统一继承气泡字体，不再对拉丁强制细体
    return <span key={`${keyPrefix}-txt-${index}`}>{seg.value}</span>
  })
}

/** 原生输入框：跟随气泡/微信主题字体（系统 UI） */
export const wechatChatComposerFontStyle: CSSProperties = {
  fontFamily: 'var(--wx-chat-font, var(--wx-font))',
}

/** 混排文案：中英数与表情同字体；仅拆 URL / 经典表情 */
export function WeChatChatMixedText({
  text,
  className,
  style,
  templateFont = false,
}: {
  text: string
  className?: string
  style?: CSSProperties
  /** true：显式使用当前气泡模版字体栈 */
  templateFont?: boolean
}) {
  const segments = splitTextAndUrls(String(text ?? ''))
  return (
    <span
      className={className}
      style={templateFont ? { fontFamily: 'var(--wx-chat-font)', ...style } : style}
    >
      {segments.map((seg, index) => {
        if (seg.kind === 'url') {
          return (
            <span key={`url-${index}`} style={URL_SPAN_STYLE}>
              {seg.value}
            </span>
          )
        }
        return <span key={`txt-${index}`}>{renderTextWithClassicEmojis(seg.value, `txt-${index}`)}</span>
      })}
    </span>
  )
}
