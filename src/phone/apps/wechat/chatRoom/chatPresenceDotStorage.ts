import { personaDb } from '../newFriendsPersona/idb'

const KV = 'wechat-show-presence-dot:v1:'

export async function loadShowChatPresenceDot(conversationKey: string): Promise<boolean> {
  const key = (conversationKey || '').trim()
  if (!key) return false
  try {
    const raw = await personaDb.getPhoneKv(`${KV}${key}`)
    return raw === true
  } catch {
    return false
  }
}

export async function saveShowChatPresenceDot(conversationKey: string, on: boolean): Promise<void> {
  const key = (conversationKey || '').trim()
  if (!key) return
  await personaDb.setPhoneKv(`${KV}${key}`, !!on)
}
