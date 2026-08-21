function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function fmtCallStatusDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${pad2(mm)}:${pad2(ss)}`
}

export type CallStatusKind = 'rejected' | 'no_answer' | 'duration'

/**
 * 按发起方区分通话结果文案（对齐微信语义）：
 * - 用户发起：右侧气泡 →「对方已拒接 / 对方未应答 / 通话时长」
 * - 角色发起：左侧气泡 →「已拒绝 / 未接听 / 通话时长」
 */
export function formatCallStatusLabel(
  status: CallStatusKind,
  initiatedBySelf: boolean,
  durationSec = 0,
): string {
  if (status === 'duration') return `通话时长 ${fmtCallStatusDuration(durationSec)}`
  if (initiatedBySelf) {
    return status === 'rejected' ? '对方已拒接' : '对方未应答'
  }
  return status === 'rejected' ? '已拒绝' : '未接听'
}

/** X DM 居中通话记录文案 */
export function formatTwitterCallStatusLabel(
  status: CallStatusKind,
  initiatedBySelf: boolean,
  durationSec = 0,
): string {
  if (status === 'duration') return `语音通话 ${fmtCallStatusDuration(durationSec)}`
  if (initiatedBySelf) {
    return status === 'rejected' ? '语音通话 · 对方已拒接' : '语音通话 · 未接听'
  }
  return status === 'rejected' ? '语音通话 · 已拒绝' : '语音通话 · 未接听'
}
