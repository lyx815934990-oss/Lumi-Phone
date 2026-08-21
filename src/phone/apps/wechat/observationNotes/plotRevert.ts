/**
 * 约会剧情删改后：按剩余 AI 轮重放私藏侧写补丁，使侧写回到「未发生被删轮」的状态。
 */

import type { PlotItem } from '../dating/types'
import { personaDb } from '../newFriendsPersona/idb'
import {
  applyObservationNotesFieldPatches,
  type ObservationNotesFieldPatch,
} from './obsNotesPatch'
import { saveObservationNotes } from './store'
import type { ObservationNotesDoc } from './types'

export type ObservationNotesPlotRevert = {
  playerIdentityId: string
  /** 本轮补丁落库前的完整侧写快照 */
  docBefore: ObservationNotesDoc
  /** 本轮实际写入的补丁（用于删改后按剩余轮重放） */
  patches: ObservationNotesFieldPatch[]
}

function cloneObsDoc(doc: ObservationNotesDoc): ObservationNotesDoc {
  return JSON.parse(JSON.stringify(doc)) as ObservationNotesDoc
}

export function sanitizeObservationNotesPlotRevert(raw: unknown): ObservationNotesPlotRevert | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const pid = typeof o.playerIdentityId === 'string' ? o.playerIdentityId.trim() : ''
  const docBefore = o.docBefore
  const patches = o.patches
  if (!pid || !docBefore || typeof docBefore !== 'object') return null
  if (!Array.isArray(patches) || !patches.length) return null
  const cleanPatches: ObservationNotesFieldPatch[] = []
  for (const p of patches) {
    if (!p || typeof p !== 'object') continue
    const row = p as Record<string, unknown>
    const path = typeof row.path === 'string' ? row.path.trim() : ''
    const newText = typeof row.newText === 'string' ? row.newText : ''
    if (!path || !String(newText).trim()) continue
    cleanPatches.push({
      path,
      label: typeof row.label === 'string' ? row.label : path,
      newText: String(newText).slice(0, 800),
      voice: row.voice === 'objective' ? 'objective' : 'marginalia',
      action: row.action === 'replace' || row.action === 'append' ? row.action : undefined,
    })
  }
  if (!cleanPatches.length) return null
  return {
    playerIdentityId: pid,
    docBefore: docBefore as ObservationNotesDoc,
    patches: cleanPatches,
  }
}

function plotHasObsRevert(plot: Pick<PlotItem, 'type' | 'observationNotesRevert'>): boolean {
  return plot.type === 'ai' && !!sanitizeObservationNotesPlotRevert(plot.observationNotesRevert)
}

/**
 * 按「删除前剧情列表」中带侧写回滚信息的 AI 轮顺序：
 * 以最早一轮的 docBefore 为基线，仅重放仍保留在 nextPlots 中的补丁。
 */
export async function rebuildObservationNotesFromDatingPlotList(params: {
  characterId: string
  prevPlots: ReadonlyArray<Pick<PlotItem, 'id' | 'type' | 'observationNotesRevert'>>
  nextPlots: ReadonlyArray<Pick<PlotItem, 'id' | 'type' | 'observationNotesRevert'>>
}): Promise<{ restored: boolean; reason?: string }> {
  const cid = params.characterId.trim()
  if (!cid) return { restored: false, reason: 'no_character' }

  const chain = params.prevPlots.filter(plotHasObsRevert)
  if (!chain.length) return { restored: false, reason: 'no_chain' }

  const remainingIds = new Set(
    params.nextPlots.map((p) => String(p.id ?? '').trim()).filter(Boolean),
  )
  const first = sanitizeObservationNotesPlotRevert(chain[0]!.observationNotesRevert)
  if (!first) return { restored: false, reason: 'bad_baseline' }

  let doc = cloneObsDoc(first.docBefore)
  const pid = first.playerIdentityId

  for (const plot of chain) {
    const id = String(plot.id ?? '').trim()
    if (!id || !remainingIds.has(id)) continue
    const rev = sanitizeObservationNotesPlotRevert(plot.observationNotesRevert)
    if (!rev?.patches.length) continue
    // 重放历史补丁（已废弃的心动/深刻条会被忽略）
    const applied = applyObservationNotesFieldPatches(doc, rev.patches)
    doc = applied.doc
  }

  const now = Date.now()
  const saved: ObservationNotesDoc = {
    ...doc,
    heartMoments: [],
    deepMemories: [],
    conversationCharacterId: cid,
    playerIdentityId: pid,
    updatedAt: now,
    pendingDiffs: [],
    changeHistory: [
      {
        id: `h_${now.toString(36)}_rollback`,
        at: now,
        summary: '剧情删改后回滚私藏侧写',
        diffs: [],
      },
      ...(Array.isArray(doc.changeHistory) ? doc.changeHistory : []),
    ].slice(0, 40),
  }

  try {
    // 校验身份卡仍在
    const identity = await personaDb.getPlayerIdentity(pid)
    if (!identity?.id) return { restored: false, reason: 'identity_missing' }
    await saveObservationNotes(saved)
    return { restored: true }
  } catch (e) {
    console.warn('[obs-notes] rebuild after plot mutation failed', e)
    return { restored: false, reason: 'save_failed' }
  }
}
