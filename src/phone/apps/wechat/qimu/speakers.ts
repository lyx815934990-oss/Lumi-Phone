import type { CurtainMessage } from './types'

export function speakerLabel(
  msg: CurtainMessage,
  partnerName: string,
  userRole: string,
  charRole: string,
): string {
  if (msg.role === 'system') return '旁白'
  if (msg.role === 'user') {
    return msg.channel === 'wing' ? '你' : userRole || '你'
  }
  if (msg.role === 'partner') {
    return msg.channel === 'wing' ? partnerName : charRole || partnerName
  }
  if (msg.role === 'npc') return '旁白'
  return ''
}
