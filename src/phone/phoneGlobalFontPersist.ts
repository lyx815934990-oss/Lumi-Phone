import { personaDb } from './apps/wechat/newFriendsPersona/idb'

const FONT_KV_PREFIX = 'phone-global-font-v1::'

export function phoneGlobalFontKvKey(fontId: string): string {
  return `${FONT_KV_PREFIX}${fontId.trim()}`
}

export async function persistPhoneGlobalFontDataUrl(fontId: string, dataUrl: string): Promise<void> {
  const id = fontId.trim()
  const url = dataUrl.trim()
  if (!id || !url) return
  try {
    await personaDb.setPhoneKv(phoneGlobalFontKvKey(id), url)
  } catch (err) {
    console.warn('[phone] global font side-store write failed', id, err)
    throw err
  }
}

export async function deletePhoneGlobalFontDataUrl(fontId: string): Promise<void> {
  const id = fontId.trim()
  if (!id) return
  try {
    await personaDb.deletePhoneKv(phoneGlobalFontKvKey(id))
  } catch {
    /* ignore */
  }
}

export async function loadPhoneGlobalFontDataUrl(fontId: string): Promise<string | null> {
  const id = fontId.trim()
  if (!id) return null
  try {
    const stored = await personaDb.getPhoneKv(phoneGlobalFontKvKey(id))
    if (typeof stored === 'string' && stored.trim()) return stored.trim()
  } catch {
    /* ignore */
  }
  return null
}
