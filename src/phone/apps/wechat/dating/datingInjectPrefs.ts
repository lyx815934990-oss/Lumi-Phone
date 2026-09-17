/**
 * 线下约会存档中的「近端剧情注入」偏好（线上互注线下时同源读取）。
 */
import { personaDb } from '../newFriendsPersona/idb'
import {
  clampDatingMaxContextTokens,
  clampDatingPlotSummaryInjectRounds,
  datingContextCharBudgetsFromTokens,
  normalizeDatingPlotContextInjectMode,
  DATING_AI_DEFAULT_CONTEXT_TOKENS,
  DATING_PLOT_CONTEXT_INJECT_MODE_DEFAULT,
  DATING_PLOT_SUMMARY_INJECT_ROUNDS_DEFAULT,
  type DatingPlotContextInjectMode,
} from './types'

const DATING_ARCHIVES_KV_KEY = 'wechat-dating-archives-v1'

export type DatingPlotInjectPrefs = {
  mode: DatingPlotContextInjectMode
  maxContextTokens: number
  summaryRounds: number
  /** full_text 模式下「最近剧情 / 线下原文」汉字软上限 */
  historyCharCap: number
}

export function datingPlotInjectPrefsFromArchiveFields(raw: {
  datingMaxContextTokens?: unknown
  datingPlotContextInjectMode?: unknown
  datingPlotSummaryInjectRounds?: unknown
} | null | undefined): DatingPlotInjectPrefs {
  const maxContextTokens = clampDatingMaxContextTokens(
    typeof raw?.datingMaxContextTokens === 'number' && Number.isFinite(raw.datingMaxContextTokens)
      ? raw.datingMaxContextTokens
      : DATING_AI_DEFAULT_CONTEXT_TOKENS,
  )
  const mode = normalizeDatingPlotContextInjectMode(raw?.datingPlotContextInjectMode)
  const summaryRounds = clampDatingPlotSummaryInjectRounds(
    typeof raw?.datingPlotSummaryInjectRounds === 'number' &&
      Number.isFinite(raw.datingPlotSummaryInjectRounds)
      ? raw.datingPlotSummaryInjectRounds
      : DATING_PLOT_SUMMARY_INJECT_ROUNDS_DEFAULT,
  )
  return {
    mode: mode || DATING_PLOT_CONTEXT_INJECT_MODE_DEFAULT,
    maxContextTokens,
    summaryRounds,
    historyCharCap: datingContextCharBudgetsFromTokens(maxContextTokens).historyPrompt,
  }
}

/** 从本机约会存档读取角色的近端剧情注入偏好（失败则满档默认）。 */
export async function loadDatingPlotInjectPrefs(
  characterId: string | null | undefined,
): Promise<DatingPlotInjectPrefs> {
  const cid = String(characterId ?? '').trim()
  const fallback = datingPlotInjectPrefsFromArchiveFields(null)
  if (!cid) return fallback
  try {
    const raw = await personaDb.getPhoneKv(DATING_ARCHIVES_KV_KEY)
    if (!raw || typeof raw !== 'object') return fallback
    const arch = (raw as Record<string, unknown>)[cid]
    if (!arch || typeof arch !== 'object') return fallback
    return datingPlotInjectPrefsFromArchiveFields(arch as Record<string, unknown>)
  } catch {
    return fallback
  }
}
