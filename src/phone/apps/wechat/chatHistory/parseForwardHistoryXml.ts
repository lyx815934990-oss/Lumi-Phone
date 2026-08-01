import type { WeChatChatHistoryPayload, WeChatForwardedMessageItem } from '../newFriendsPersona/types'
import { expandChatHistoryMessages } from './expandChatHistoryMessages'
import { peelChatHistoryLineTimePrefix } from './parseChatHistoryTimeHint'
import { matchAnyDirectiveName, pickNamed } from '../directives/parseSpaceDirective'
import { WxCmd } from '../directives/wechatDirectiveLexicon'

const FORWARD_HISTORY_RE =
  /<forward_history\s+title\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))(?:\s+(?:when|at)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?\s*>\s*([\s\S]*?)<\/forward_history>/i

const HISTORY_LINE_RE = /^\[([^:\]：]+?)[:：]\s*([^\]]*?)\]\s*$/
const HISTORY_PLAIN_LINE_RE = /^([^:\[：]{1,64})[:：]\s*(.+)$/

function parseHistoryBody(body: string, blockWhenHint?: string): WeChatForwardedMessageItem[] {
  const out: WeChatForwardedMessageItem[] = []
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (line === WxCmd.forwardClose || line === WxCmd.forwardOpen) continue

    const bracketed = /^\[(.+)\]\s*$/.exec(line)
    if (bracketed) {
      const peeled = peelChatHistoryLineTimePrefix(bracketed[1]!, Date.now(), blockWhenHint)
      if (peeled) {
        out.push({
          senderName: peeled.senderPart.slice(0, 64) || '未知',
          content: peeled.content.slice(0, 500) || '...',
          ...(peeled.timestamp != null ? { timestamp: peeled.timestamp } : {}),
          ...(peeled.timeHint ? { timeHint: peeled.timeHint } : {}),
        })
        continue
      }
    }

    // 新格式行：可选时间前缀 + 名: 内容（无方括号）
    const peeledPlain = peelChatHistoryLineTimePrefix(line, Date.now(), blockWhenHint)
    if (peeledPlain) {
      out.push({
        senderName: peeledPlain.senderPart.slice(0, 64) || '未知',
        content: peeledPlain.content.slice(0, 500) || '...',
        ...(peeledPlain.timestamp != null ? { timestamp: peeledPlain.timestamp } : {}),
        ...(peeledPlain.timeHint ? { timeHint: peeledPlain.timeHint } : {}),
      })
      continue
    }

    const legacy = HISTORY_LINE_RE.exec(line) ?? HISTORY_PLAIN_LINE_RE.exec(line)
    if (!legacy) continue
    const senderName = String(legacy[1] ?? '').trim().slice(0, 64)
    const content = String(legacy[2] ?? '').trim().slice(0, 500)
    if (!senderName && !content) continue
    out.push({ senderName: senderName || '未知', content: content || '...' })
  }
  return expandChatHistoryMessages(out)
}

function stripForwardHistoryCodeFence(raw: string): string {
  const fenced = raw.match(/```(?:xml|html|text)?\s*([\s\S]*?)```/i)
  if (
    fenced &&
    (/<forward_history\b/i.test(fenced[1] ?? '') || /转发记录/.test(fenced[1] ?? ''))
  ) {
    return String(fenced[1] ?? '').trim()
  }
  return raw
}

function parseForwardHistoryMatch(match: RegExpExecArray): WeChatChatHistoryPayload | null {
  const title = (match[1] ?? match[2] ?? match[3] ?? '').trim() || '聊天记录'
  const occurredAtHint = (match[4] ?? match[5] ?? match[6] ?? '').trim() || undefined
  const messages = parseHistoryBody(String(match[7] ?? ''), occurredAtHint)
  if (!messages.length) return null
  return {
    kind: 'chat_history',
    title,
    messages,
    ...(occurredAtHint ? { occurredAtHint } : {}),
  }
}

function parseSpaceForwardBlock(
  openLine: string,
  body: string,
): WeChatChatHistoryPayload | null {
  const parts = matchAnyDirectiveName(openLine.trim(), [WxCmd.forwardOpen])
  if (!parts) return null
  const title =
    pickNamed(parts, ['标题', 'title']) ||
    parts.rest.replace(/\s*(?:时间|when|at)=("[^"]*"|'[^']*'|\S+)/gi, '').trim() ||
    '聊天记录'
  const occurredAtHint =
    pickNamed(parts, ['时间', 'when', 'at']) || undefined
  const messages = parseHistoryBody(body, occurredAtHint)
  if (!messages.length) return null
  return {
    kind: 'chat_history',
    title: title.slice(0, 80) || '聊天记录',
    messages,
    ...(occurredAtHint ? { occurredAtHint } : {}),
  }
}

export type ForwardHistorySplitPart =
  | { kind: 'text'; text: string }
  | { kind: 'forward_history'; forwardHistory: WeChatChatHistoryPayload }

/** 按出现顺序拆分正文与聊天记录块（新「转发记录」或旧 XML，可穿插） */
export function splitRawByForwardHistory(raw: string): ForwardHistorySplitPart[] {
  let remaining = stripForwardHistoryCodeFence(String(raw ?? '')).replace(/\\n/g, '\n')
  const out: ForwardHistorySplitPart[] = []
  while (remaining.length > 0) {
    const xmlMatch = FORWARD_HISTORY_RE.exec(remaining)
    const spaceIdx = remaining.search(/(?:^|\n)转发记录(?:\s|$)/m)
    const spaceOpenAt = spaceIdx < 0 ? -1 : remaining[spaceIdx] === '\n' ? spaceIdx + 1 : spaceIdx
    const xmlAt = xmlMatch?.index ?? -1

    const useSpace =
      spaceOpenAt >= 0 && (xmlAt < 0 || spaceOpenAt <= xmlAt)

    if (useSpace) {
      const before = remaining.slice(0, spaceOpenAt).trim()
      if (before) out.push({ kind: 'text', text: before })
      const fromOpen = remaining.slice(spaceOpenAt)
      const closeRel = fromOpen.search(/(?:^|\n)结束转发记录\s*(?:\n|$)/m)
      if (closeRel < 0) {
        out.push({ kind: 'text', text: fromOpen.trim() })
        break
      }
      const closeLineStart =
        fromOpen[closeRel] === '\n' ? closeRel + 1 : closeRel
      const block = fromOpen.slice(0, closeLineStart).trimEnd()
      const nl = block.indexOf('\n')
      const openLine = nl >= 0 ? block.slice(0, nl) : block
      const body = nl >= 0 ? block.slice(nl + 1) : ''
      const payload = parseSpaceForwardBlock(openLine, body)
      if (payload) out.push({ kind: 'forward_history', forwardHistory: payload })
      const afterClose = fromOpen.slice(closeLineStart).replace(/^结束转发记录\s*/, '')
      remaining = afterClose.replace(/^\n+/, '')
      continue
    }

    if (!xmlMatch || xmlMatch.index == null) {
      const tail = remaining.trim()
      if (tail) out.push({ kind: 'text', text: tail })
      break
    }
    const before = remaining.slice(0, xmlMatch.index).trim()
    if (before) out.push({ kind: 'text', text: before })
    const payload = parseForwardHistoryMatch(xmlMatch)
    if (payload) out.push({ kind: 'forward_history', forwardHistory: payload })
    remaining = remaining.slice(xmlMatch.index + xmlMatch[0].length)
  }
  return out
}

export function extractForwardHistoryFromRaw(raw: string): {
  forwardHistory: WeChatChatHistoryPayload | null
  rest: string
} {
  const parts = splitRawByForwardHistory(raw)
  const firstHistory = parts.find((p): p is Extract<ForwardHistorySplitPart, { kind: 'forward_history' }> => p.kind === 'forward_history')
  const rest = parts
    .filter((p): p is Extract<ForwardHistorySplitPart, { kind: 'text' }> => p.kind === 'text')
    .map((p) => p.text)
    .join('\n\n')
    .trim()
  if (!firstHistory) return { forwardHistory: null, rest }
  return { forwardHistory: firstHistory.forwardHistory, rest }
}
