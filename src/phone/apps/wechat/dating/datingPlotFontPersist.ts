import { personaDb } from '../newFriendsPersona/idb'
import type { DatingPlotFontLibraryItem, DatingPlotFontSettings } from './datingPlotFontSettings'
import { normalizeDatingPlotFontSettings } from './datingPlotFontSettings'

export const DATING_PLOT_FONT_KV_PREFIX = 'wechat-dating-plot-font-v1::'

export function datingPlotFontKvKey(characterId: string, assetId: string): string {
  return `${DATING_PLOT_FONT_KV_PREFIX}${characterId.trim()}::${assetId.trim()}`
}

export async function persistDatingPlotFontDataUrl(
  characterId: string,
  assetId: string,
  dataUrl: string,
): Promise<void> {
  const cid = characterId.trim()
  const aid = assetId.trim()
  const url = dataUrl.trim()
  if (!cid || !aid || !url) return
  try {
    await personaDb.setPhoneKv(datingPlotFontKvKey(cid, aid), url)
  } catch (err) {
    console.warn('[dating] plot font side-store write failed', aid, err)
    throw err
  }
}

export async function deleteDatingPlotFontDataUrl(characterId: string, assetId: string): Promise<void> {
  const cid = characterId.trim()
  const aid = assetId.trim()
  if (!cid || !aid) return
  try {
    await personaDb.deletePhoneKv(datingPlotFontKvKey(cid, aid))
  } catch {
    /* ignore */
  }
}

/** 删除某角色全部剧情字体侧存（删角色 / 清约会档时调用） */
export async function deleteAllDatingPlotFontsForCharacter(characterId: string): Promise<number> {
  const cid = characterId.trim()
  if (!cid) return 0
  const prefix = `${DATING_PLOT_FONT_KV_PREFIX}${cid}::`
  let removed = 0
  try {
    const keys = await personaDb.listPhoneKvKeysByPrefix(prefix)
    for (const key of keys) {
      await personaDb.deletePhoneKv(key)
      removed += 1
    }
  } catch {
    /* ignore */
  }
  return removed
}

/** 加载该角色字体库全部 dataUrl */
export async function hydrateDatingPlotFontDataUrls(
  characterId: string,
  settings: DatingPlotFontSettings | null | undefined,
): Promise<Record<string, string>> {
  const cid = characterId.trim()
  const normalized = normalizeDatingPlotFontSettings(settings)
  const out: Record<string, string> = {}
  if (!cid || !normalized.library.length) return out
  await Promise.all(
    normalized.library.map(async (a: DatingPlotFontLibraryItem) => {
      try {
        const stored = await personaDb.getPhoneKv(datingPlotFontKvKey(cid, a.id))
        if (typeof stored === 'string' && stored.trim()) {
          out[a.id] = stored.trim()
        }
      } catch {
        /* ignore */
      }
    }),
  )
  return out
}
