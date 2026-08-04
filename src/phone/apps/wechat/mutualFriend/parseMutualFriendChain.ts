import type { MutualFriendChainPayload, MutualFriendChainRelayTo } from './types'

const OPEN = '<<MUTUAL_FRIEND_CHAIN>>'
const CLOSE = '<<END_MUTUAL_FRIEND_CHAIN>>'

function splitFieldLine(line: string): { key: string; value: string } | null {
  const raw = String(line ?? '').trim()
  if (!raw) return null
  const m = raw.match(/^([^:：]{1,24})\s*[:：]\s*(.*)$/)
  if (!m) return null
  return { key: m[1]!.trim().toLowerCase(), value: m[2]!.trim() }
}

function isRelayHeader(line: string): boolean {
  const t = line.trim()
  return /^(RELAY|传话|<<RELAY>>)$/i.test(t)
}

function isOutHeader(line: string): boolean {
  const t = line.trim()
  return /^(OUT|私信|<<OUT>>)$/i.test(t)
}

function isBlockEnd(line: string): boolean {
  const t = line.trim()
  return /^(结束传话|结束私信|<<END_RELAY>>|<<END_OUT>>)$/i.test(t)
}

function normalizeIdKey(key: string): boolean {
  return key === 'id' || key === 'otherroleid' || key === '角色id' || key === '对方id'
}

function normalizeReasonKey(key: string): boolean {
  return key === 'reason' || key === '因' || key === '原因'
}

function normalizeMsgKey(key: string): boolean {
  return key === 'msg' || key === '告' || key === '转告' || key === '摘要' || key === 'relayedmessage'
}

function normalizeHeardKey(key: string): boolean {
  return key === 'heard' || key === '闻' || key === '知情' || key === 'heardback'
}

function normalizeLineKey(key: string): boolean {
  return key === 'line' || key === '说' || key === '气泡' || key === '话'
}

/** 解析标记行正文；失败再尝试旧版 JSON */
export function parseMutualFriendChainBody(body: string): MutualFriendChainPayload | null {
  const raw = String(body ?? '').trim()
  if (!raw) return null

  // 兼容旧版 JSON
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as MutualFriendChainPayload
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      /* fall through to markup */
    }
  }

  const relayTo: MutualFriendChainRelayTo[] = []
  const otherOutgoing: Array<{ otherRoleId?: string; reason?: string; lines?: string[] }> = []

  type Mode = 'none' | 'relay' | 'out'
  let mode: Mode = 'none'
  let curRelay: MutualFriendChainRelayTo | null = null
  let curOut: { otherRoleId?: string; reason?: string; lines: string[] } | null = null

  const flush = () => {
    if (mode === 'relay' && curRelay) {
      const oid = String(curRelay.otherRoleId || '').trim()
      const msg = String(curRelay.relayedMessage || '').trim()
      const heard = String(curRelay.heardBack || '').trim()
      const reason = String(curRelay.reason || '').trim()
      if (oid && (msg || heard || reason)) {
        relayTo.push({
          otherRoleId: oid,
          ...(reason ? { reason } : {}),
          ...(msg ? { relayedMessage: msg } : {}),
          ...(heard ? { heardBack: heard } : {}),
        })
      }
    }
    if (mode === 'out' && curOut) {
      const oid = String(curOut.otherRoleId || '').trim()
      const lines = curOut.lines.map((x) => x.trim()).filter(Boolean)
      const reason = String(curOut.reason || '').trim()
      if (oid && (lines.length || reason)) {
        otherOutgoing.push({
          otherRoleId: oid,
          ...(reason ? { reason } : {}),
          ...(lines.length ? { lines } : {}),
        })
      }
    }
    curRelay = null
    curOut = null
    mode = 'none'
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (isBlockEnd(trimmed)) {
      flush()
      continue
    }
    if (isRelayHeader(trimmed)) {
      flush()
      mode = 'relay'
      curRelay = {}
      continue
    }
    if (isOutHeader(trimmed)) {
      flush()
      mode = 'out'
      curOut = { lines: [] }
      continue
    }

    const field = splitFieldLine(trimmed)
    if (!field) continue

    if (mode === 'relay' && curRelay) {
      if (normalizeIdKey(field.key)) curRelay.otherRoleId = field.value
      else if (normalizeReasonKey(field.key)) curRelay.reason = field.value
      else if (normalizeMsgKey(field.key)) curRelay.relayedMessage = field.value
      else if (normalizeHeardKey(field.key)) curRelay.heardBack = field.value
      continue
    }
    if (mode === 'out' && curOut) {
      if (normalizeIdKey(field.key)) curOut.otherRoleId = field.value
      else if (normalizeReasonKey(field.key)) curOut.reason = field.value
      else if (normalizeLineKey(field.key)) curOut.lines.push(field.value)
      continue
    }
  }
  flush()

  if (!relayTo.length && !otherOutgoing.length) return null
  return {
    ...(relayTo.length ? { relayTo } : {}),
    ...(otherOutgoing.length ? { otherOutgoing } : {}),
  }
}

/** 从主回复原文剥离共同好友链标记块，返回可见正文与 payload */
export function parseMutualFriendChainMarkers(raw: string): {
  text: string
  payload: MutualFriendChainPayload | null
} {
  let text = String(raw ?? '')
  const open = text.indexOf(OPEN)
  const close = text.indexOf(CLOSE)
  if (open === -1 || close === -1 || close <= open) {
    return { text, payload: null }
  }
  const body = text.slice(open + OPEN.length, close).trim()
  text = `${text.slice(0, open)}\n${text.slice(close + CLOSE.length)}`.trim()
  return { text, payload: parseMutualFriendChainBody(body) }
}

/** 从已拆好的气泡里再扫一遍（标记偶发落在末条） */
export function stripMutualFriendChainFromBubbles(bubbles: string[]): {
  bubbles: string[]
  payload: MutualFriendChainPayload | null
} {
  let payload: MutualFriendChainPayload | null = null
  const next = bubbles.map((b) => {
    const r = parseMutualFriendChainMarkers(b)
    if (r.payload) payload = r.payload
    return r.text
  })
  return {
    bubbles: next.map((t) => t.trim()).filter(Boolean),
    payload,
  }
}
