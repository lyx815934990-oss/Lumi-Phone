import { create } from 'zustand'

import type {
  DatingInteractiveSession,
  InteractiveBubble,
  InteractiveBubbleKind,
  InteractiveTurn,
} from './datingInteractiveTypes'

const LS_KEY = 'wechat-dating-interactive-session:v1'

function recomposeRawText(bubbles: InteractiveBubble[]): string {
  return bubbles
    .map((b) => {
      const t = b.text.trim()
      if (!t) return ''
      if (b.kind === 'dialogue') return `"${t}"`
      if (b.kind === 'thought') return `**${t}**`
      return t
    })
    .filter(Boolean)
    .join('\n')
}

function isBubbleKind(v: unknown): v is InteractiveBubbleKind {
  return v === 'action' || v === 'dialogue' || v === 'thought'
}

function normalizeBubble(raw: unknown): InteractiveBubble | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  const text = String(o.text ?? '').trim()
  if (!id || !text || !isBubbleKind(o.kind)) return null
  return { id, kind: o.kind, text }
}

function normalizeTurn(raw: unknown): InteractiveTurn | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  const role = o.role === 'user' || o.role === 'char' ? o.role : null
  if (!id || !role) return null
  const bubbles: InteractiveBubble[] = []
  if (Array.isArray(o.bubbles)) {
    for (const row of o.bubbles) {
      const b = normalizeBubble(row)
      if (b) bubbles.push(b)
    }
  }
  const rawText = typeof o.rawText === 'string' ? o.rawText : undefined
  const plotId = typeof o.plotId === 'string' && o.plotId.trim() ? o.plotId.trim() : undefined
  const createdAt = Number(o.createdAt)
  const turn: InteractiveTurn = {
    id,
    role,
    bubbles,
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now(),
    ...(rawText != null ? { rawText } : {}),
    ...(plotId ? { plotId } : {}),
  }
  if (Array.isArray(o.versions)) {
    const versions: InteractiveBubble[][] = []
    for (const ver of o.versions) {
      if (!Array.isArray(ver)) continue
      const list: InteractiveBubble[] = []
      for (const row of ver) {
        const b = normalizeBubble(row)
        if (b) list.push(b)
      }
      if (list.length) versions.push(list)
    }
    if (versions.length) {
      turn.versions = versions
      const idx = Number(o.currentVersionIndex)
      turn.currentVersionIndex =
        Number.isFinite(idx) && idx >= 0 && idx < versions.length ? idx : versions.length - 1
    }
  }
  return turn
}

function normalizeSession(raw: unknown): DatingInteractiveSession | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  const characterId = String(o.characterId ?? '').trim()
  const characterName = String(o.characterName ?? '').trim() || '角色'
  if (!id || !characterId) return null
  const turns: InteractiveTurn[] = []
  if (Array.isArray(o.turns)) {
    for (const row of o.turns) {
      const t = normalizeTurn(row)
      if (t) turns.push(t)
    }
  }
  const startedAt = Number(o.startedAt)
  return {
    id,
    characterId,
    characterName,
    startedAt: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : Date.now(),
    turns,
  }
}

function loadPersistedSession(): DatingInteractiveSession | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return normalizeSession(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function persistSession(session: DatingInteractiveSession | null) {
  if (typeof localStorage === 'undefined') return
  try {
    if (!session) {
      localStorage.removeItem(LS_KEY)
      return
    }
    localStorage.setItem(LS_KEY, JSON.stringify(session))
  } catch {
    /* quota / private mode */
  }
}

type DatingInteractiveStore = {
  session: DatingInteractiveSession | null
  generating: boolean
  /**
   * 进入互动：同角色已有会话则续上；换角色或无会话才新建。
   * 不会因为再次点开而把未收束的对戏清掉。
   */
  ensureSession: (opts: { characterId: string; characterName: string }) => void
  /** 收束后调用：丢掉内存会话（纪要已写入剧情） */
  clearSession: () => void
  setTurns: (turns: InteractiveTurn[]) => void
  /** 给某一拍挂上已写入剧情页的 plotId */
  attachTurnPlotId: (turnId: string, plotId: string) => void
  /** 编辑某一条气泡正文；返回更新后的 turn（便于同步剧情卡） */
  updateBubble: (
    turnId: string,
    bubbleId: string,
    text: string,
  ) => InteractiveTurn | null
  /**
   * 删除某一条气泡。若该拍已空则整拍移除。
   * removedTurnPlotId：整拍被删时需从剧情页删掉的 plotId
   */
  removeBubble: (
    turnId: string,
    bubbleId: string,
  ) => { turn: InteractiveTurn | null; removedTurnPlotId: string | null }
  /** 删除某一拍；后续生成只注入剩余 turns，不再带上已删内容 */
  removeTurn: (turnId: string) => void
  setGenerating: (v: boolean) => void
  /** 有未闭合对戏内容（需提交记忆） */
  hasPendingContent: () => boolean
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function commitSession(
  set: (partial: Partial<DatingInteractiveStore>) => void,
  session: DatingInteractiveSession | null,
  extra?: Partial<Pick<DatingInteractiveStore, 'generating'>>,
) {
  persistSession(session)
  set({ session, ...extra })
}

export const useDatingInteractiveStore = create<DatingInteractiveStore>((set, get) => ({
  session: loadPersistedSession(),
  generating: false,

  ensureSession: ({ characterId, characterName }) => {
    const id = characterId.trim()
    if (!id) return
    const name = characterName.trim() || '角色'
    const cur = get().session
    if (cur && cur.characterId === id) {
      // 同角色续场：只刷新显示名，保留 turns
      if (cur.characterName !== name) {
        commitSession(set, { ...cur, characterName: name }, { generating: false })
      } else {
        set({ generating: false })
      }
      return
    }
    commitSession(
      set,
      {
        id: uid('ix'),
        characterId: id,
        characterName: name,
        startedAt: Date.now(),
        turns: [],
      },
      { generating: false },
    )
  },

  clearSession: () => commitSession(set, null, { generating: false }),

  setTurns: (turns) => {
    const s = get().session
    if (!s) return
    commitSession(set, { ...s, turns })
  },

  attachTurnPlotId: (turnId, plotId) => {
    const s = get().session
    if (!s) return
    const tid = String(turnId || '').trim()
    const pid = String(plotId || '').trim()
    if (!tid || !pid) return
    commitSession(set, {
      ...s,
      turns: s.turns.map((t) => (t.id === tid ? { ...t, plotId: pid } : t)),
    })
  },

  updateBubble: (turnId, bubbleId, text) => {
    const s = get().session
    if (!s) return null
    const tid = String(turnId || '').trim()
    const bid = String(bubbleId || '').trim()
    const nextText = String(text ?? '').trim()
    if (!tid || !bid || !nextText) return null
    let updated: InteractiveTurn | null = null
    const turns = s.turns.map((t) => {
      if (t.id !== tid) return t
      const bubbles = t.bubbles.map((b) => (b.id === bid ? { ...b, text: nextText } : b))
      updated = {
        ...t,
        bubbles,
        rawText: t.role === 'user' ? recomposeRawText(bubbles) : t.rawText,
      }
      return updated
    })
    if (!updated) return null
    commitSession(set, { ...s, turns })
    return updated
  },

  removeBubble: (turnId, bubbleId) => {
    const s = get().session
    if (!s) return { turn: null, removedTurnPlotId: null }
    const tid = String(turnId || '').trim()
    const bid = String(bubbleId || '').trim()
    if (!tid || !bid) return { turn: null, removedTurnPlotId: null }
    const target = s.turns.find((t) => t.id === tid)
    if (!target) return { turn: null, removedTurnPlotId: null }

    const bubbles = target.bubbles.filter((b) => b.id !== bid)
    if (!bubbles.length) {
      commitSession(set, { ...s, turns: s.turns.filter((t) => t.id !== tid) })
      return { turn: null, removedTurnPlotId: target.plotId?.trim() || null }
    }

    const updated: InteractiveTurn = {
      ...target,
      bubbles,
      rawText: target.role === 'user' ? recomposeRawText(bubbles) : target.rawText,
    }
    commitSession(set, {
      ...s,
      turns: s.turns.map((t) => (t.id === tid ? updated : t)),
    })
    return { turn: updated, removedTurnPlotId: null }
  },

  removeTurn: (turnId) => {
    const s = get().session
    if (!s) return
    const id = String(turnId || '').trim()
    if (!id) return
    commitSession(set, { ...s, turns: s.turns.filter((t) => t.id !== id) })
  },

  setGenerating: (v) => set({ generating: v }),

  hasPendingContent: () => {
    const turns = get().session?.turns ?? []
    return turns.some((t) => t.bubbles.length > 0 || !!t.rawText?.trim())
  },
}))
