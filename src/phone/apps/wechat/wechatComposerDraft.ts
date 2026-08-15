import { personaDb } from './newFriendsPersona/idb'

const DRAFT_KV_PREFIX = 'wechat.composerDraft.v1:'

function draftKey(conversationKey: string): string {
  return `${DRAFT_KV_PREFIX}${String(conversationKey || '').trim()}`
}

/** 读取会话输入草稿（trim 后为空则视为无草稿） */
export async function loadWeChatComposerDraft(conversationKey: string): Promise<string> {
  const ck = conversationKey.trim()
  if (!ck) return ''
  try {
    const raw = await personaDb.getPhoneKv(draftKey(ck))
    if (typeof raw === 'string') return raw.trim()
    if (raw && typeof raw === 'object' && typeof (raw as { text?: unknown }).text === 'string') {
      return String((raw as { text: string }).text).trim()
    }
  } catch {
    /* ignore */
  }
  return ''
}

/** 写入或清除草稿；空字符串会删除键 */
export async function saveWeChatComposerDraft(conversationKey: string, text: string): Promise<void> {
  const ck = conversationKey.trim()
  if (!ck) return
  const t = String(text ?? '').trim()
  try {
    if (!t) {
      await personaDb.deletePhoneKv(draftKey(ck))
      return
    }
    await personaDb.setPhoneKv(draftKey(ck), { text: t, updatedAt: Date.now() })
  } catch {
    /* ignore */
  }
}

export async function clearWeChatComposerDraft(conversationKey: string): Promise<void> {
  await saveWeChatComposerDraft(conversationKey, '')
}

/** 列表预览：截断草稿正文 */
export function formatWeChatDraftPreview(text: string, maxLen = 40): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
}
