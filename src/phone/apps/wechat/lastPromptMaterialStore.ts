/**
 * 最近一次主回复请求的真实 system / 对话材料快照，供思维溯源 token 按块拆分。
 * 在 call 前写入；publish 时读取（同轮）。
 */

export type LastPromptMaterial = {
  systemText: string
  /** role 拼接后的对话侧粗文本（不含 system） */
  messagesText: string
  recordedAtMs: number
  source?: 'private' | 'group' | 'offline' | 'other'
  /** 当轮注入的文心「回复提示词」原文（含【标题】，占位符未展开），供溯源对齐 */
  userRoleplayText?: string
  userRoleplayPresetName?: string
}

let last: LastPromptMaterial | null = null

export function recordLastPromptMaterial(params: {
  systemText: string
  messagesText?: string
  source?: LastPromptMaterial['source']
  userRoleplayText?: string | null
  userRoleplayPresetName?: string | null
}): void {
  const systemText = String(params.systemText ?? '').trim()
  if (!systemText) return
  const userRoleplayText = String(params.userRoleplayText ?? '').trim()
  const userRoleplayPresetName = String(params.userRoleplayPresetName ?? '').trim()
  last = {
    systemText,
    messagesText: String(params.messagesText ?? '').trim(),
    recordedAtMs: Date.now(),
    source: params.source,
    ...(userRoleplayText ? { userRoleplayText } : {}),
    ...(userRoleplayPresetName ? { userRoleplayPresetName } : {}),
  }
}

export function peekLastPromptMaterial(): LastPromptMaterial | null {
  return last
}

export function clearLastPromptMaterial(): void {
  last = null
}
