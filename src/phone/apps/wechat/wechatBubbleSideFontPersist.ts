import { personaDb } from './newFriendsPersona/idb'

const FONT_KV_PREFIX = 'wechat-bubble-side-font-v1::'

export function wechatBubbleSideFontKvKey(fontId: string): string {
  return `${FONT_KV_PREFIX}${fontId.trim()}`
}

export async function persistWeChatBubbleSideFontDataUrl(fontId: string, dataUrl: string): Promise<void> {
  const id = fontId.trim()
  const url = dataUrl.trim()
  if (!id || !url) return
  try {
    await personaDb.setPhoneKv(wechatBubbleSideFontKvKey(id), url)
  } catch (err) {
    console.warn('[wechat] bubble side font side-store write failed', id, err)
    throw err
  }
}

export async function deleteWeChatBubbleSideFontDataUrl(fontId: string): Promise<void> {
  const id = fontId.trim()
  if (!id) return
  try {
    await personaDb.deletePhoneKv(wechatBubbleSideFontKvKey(id))
  } catch {
    /* ignore */
  }
}

export async function loadWeChatBubbleSideFontDataUrl(fontId: string): Promise<string | null> {
  const id = fontId.trim()
  if (!id) return null
  try {
    const stored = await personaDb.getPhoneKv(wechatBubbleSideFontKvKey(id))
    if (typeof stored === 'string' && stored.trim()) return stored.trim()
  } catch {
    /* ignore */
  }
  return null
}
