/**
 * 约会剧情删改后：按剩余 AI 轮重放人生账本补丁，使账本回到「未发生被删轮」的状态。
 */

import type { PlotItem } from '../dating/types'
import { personaDb } from '../newFriendsPersona/idb'
import { appendLifeChangeHistory } from './lifeChangeHistory'
import { emptyLifeMutableSheet, normalizeLifeMutableSheet } from './compute'
import { loadCharacterStorySpan } from './load'
import {
  mergeLifeLedgerInlinePatchesOntoSheets,
  type LifeLedgerInlinePatch,
  type LifeLedgerPlotRevert,
} from './lifeLedgerPatch'
import { syncSharedSocialCircleBetweenSheets } from './sharedSocialCircle'
import type { LifeMutableSheet } from './types'

export type { LifeLedgerPlotRevert }

function cloneLifeSheet(sheet: LifeMutableSheet): LifeMutableSheet {
  return JSON.parse(JSON.stringify(sheet)) as LifeMutableSheet
}

function sanitizeSheet(raw: unknown): LifeMutableSheet | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  try {
    return normalizeLifeMutableSheet(raw as LifeMutableSheet)
  } catch {
    return undefined
  }
}

function sanitizePatches(raw: unknown): LifeLedgerInlinePatch[] {
  if (!Array.isArray(raw)) return []
  const out: LifeLedgerInlinePatch[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const subjectRaw = String(r.subject ?? '').trim().toLowerCase()
    const subject =
      subjectRaw === 'player' || subjectRaw.includes('玩家')
        ? 'player'
        : subjectRaw === 'character' || subjectRaw.includes('角色') || !subjectRaw
          ? 'character'
          : null
    if (!subject) continue
    const changes =
      r.changes && typeof r.changes === 'object' && !Array.isArray(r.changes)
        ? (r.changes as Record<string, unknown>)
        : null
    if (!changes || !Object.keys(changes).length) continue
    out.push({ subject, changes })
  }
  return out
}

export function sanitizeLifeLedgerPlotRevert(raw: unknown): LifeLedgerPlotRevert | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const characterId = typeof o.characterId === 'string' ? o.characterId.trim() : ''
  const playerIdentityId = typeof o.playerIdentityId === 'string' ? o.playerIdentityId.trim() : ''
  if (!characterId || !playerIdentityId) return null
  const patches = sanitizePatches(o.patches)
  if (!patches.length) return null
  const characterSheetBefore = sanitizeSheet(o.characterSheetBefore)
  const playerSheetBefore = sanitizeSheet(o.playerSheetBefore)
  if (!characterSheetBefore && !playerSheetBefore) return null
  return {
    characterId,
    playerIdentityId,
    characterSheetBefore,
    playerSheetBefore,
    patches,
  }
}

function plotHasLifeRevert(plot: Pick<PlotItem, 'type' | 'lifeLedgerRevert'>): boolean {
  return plot.type === 'ai' && !!sanitizeLifeLedgerPlotRevert(plot.lifeLedgerRevert)
}

/**
 * 按「删除前剧情列表」中带账本回滚信息的 AI 轮顺序：
 * 以最早一轮的 sheetBefore 为基线，仅重放仍保留在 nextPlots 中的补丁。
 */
export async function rebuildLifeLedgerFromDatingPlotList(params: {
  characterId: string
  prevPlots: ReadonlyArray<Pick<PlotItem, 'id' | 'type' | 'lifeLedgerRevert'>>
  nextPlots: ReadonlyArray<Pick<PlotItem, 'id' | 'type' | 'lifeLedgerRevert'>>
}): Promise<{ restored: boolean; reason?: string }> {
  const cid = params.characterId.trim()
  if (!cid) return { restored: false, reason: 'no_character' }

  const chain = params.prevPlots.filter(plotHasLifeRevert)
  if (!chain.length) return { restored: false, reason: 'no_chain' }

  const remainingIds = new Set(
    params.nextPlots.map((p) => String(p.id ?? '').trim()).filter(Boolean),
  )
  const first = sanitizeLifeLedgerPlotRevert(chain[0]!.lifeLedgerRevert)
  if (!first) return { restored: false, reason: 'bad_baseline' }

  const pid = first.playerIdentityId
  const identity = await personaDb.getPlayerIdentity(pid)
  if (!identity?.id) return { restored: false, reason: 'identity_missing' }

  const charRow = await personaDb.getCharacter(cid)
  if (!charRow) return { restored: false, reason: 'character_missing' }

  const span = await loadCharacterStorySpan(cid)

  // 两侧基线：取链上最早出现的对应 sheetBefore；缺省则读当前库（避免误清空）
  let charBaseline: LifeMutableSheet | undefined
  let playerBaseline: LifeMutableSheet | undefined
  for (const plot of chain) {
    const rev = sanitizeLifeLedgerPlotRevert(plot.lifeLedgerRevert)
    if (!rev) continue
    if (!charBaseline && rev.characterSheetBefore) charBaseline = cloneLifeSheet(rev.characterSheetBefore)
    if (!playerBaseline && rev.playerSheetBefore) playerBaseline = cloneLifeSheet(rev.playerSheetBefore)
    if (charBaseline && playerBaseline) break
  }

  const currentChar = (await personaDb.getCharacterLifeMutable(cid))?.sheet
  const currentPlayer = (await personaDb.getPlayerLifeMutable(pid, cid))?.sheet

  let characterSheet = cloneLifeSheet(
    charBaseline ?? currentChar ?? emptyLifeMutableSheet(),
  )
  let playerSheet = cloneLifeSheet(
    playerBaseline ?? currentPlayer ?? emptyLifeMutableSheet(),
  )

  const beforeChar = cloneLifeSheet(characterSheet)
  const beforePlayer = cloneLifeSheet(playerSheet)

  for (const plot of chain) {
    const id = String(plot.id ?? '').trim()
    if (!id || !remainingIds.has(id)) continue
    const rev = sanitizeLifeLedgerPlotRevert(plot.lifeLedgerRevert)
    if (!rev?.patches.length) continue
    const merged = mergeLifeLedgerInlinePatchesOntoSheets({
      characterSheet,
      playerSheet,
      patches: rev.patches,
      characterBirthdayMD: charRow.birthdayMD,
      playerBirthdayMD: identity.birthdayMD,
      span,
    })
    characterSheet = merged.characterSheet
    playerSheet = merged.playerSheet
  }

  try {
    const synced = syncSharedSocialCircleBetweenSheets(characterSheet, playerSheet)
    characterSheet = synced.character
    playerSheet = synced.player

    characterSheet = appendLifeChangeHistory(characterSheet, {
      before: beforeChar,
      summary: '剧情删改后回滚人生账本',
      source: 'inline',
    })
    playerSheet = appendLifeChangeHistory(playerSheet, {
      before: beforePlayer,
      summary: '剧情删改后回滚人生账本',
      source: 'inline',
    })

    await personaDb.putCharacterLifeMutable(cid, characterSheet)
    await personaDb.putPlayerLifeMutable(pid, cid, playerSheet)
    return { restored: true }
  } catch (e) {
    console.warn('[life-ledger] rebuild after plot mutation failed', e)
    return { restored: false, reason: 'save_failed' }
  }
}
