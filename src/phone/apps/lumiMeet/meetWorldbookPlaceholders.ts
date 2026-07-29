import { isMeetProfilePlaceholder } from './comprehensivePersona'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 仅在非 `{{…}}` 占位符块内替换裸名，避免撕开已有 `{{char}}` / `{{user}}`。 */
function replaceBareTokenOutsidePlaceholders(
  content: string,
  token: string,
  replacement: string,
): string {
  const t = token.trim()
  const rep = replacement.trim()
  if (!t || !rep || !content.includes(t)) return content
  const parts = content.split(/(\{\{[^}]+\}\})/g)
  return parts
    .map((seg, idx) => {
      if (idx % 2 === 1) return seg
      return seg.split(t).join(rep)
    })
    .join('')
}

export type MeetWorldbookNameIds = {
  nickname: string
  realName?: string | null
  /** 写入尾声档案标题 / 正文时替换为 {{user}} */
  userDisplayName?: string | null
}

function uniqueNameChunks(names: Array<string | null | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of names) {
    const n = String(raw ?? '').trim()
    if (!n || n.length < 2) continue
    if (isMeetProfilePlaceholder(n)) continue
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  out.sort((a, b) => b.length - a.length)
  return out
}

/**
 * 拆除「真名{{char}} / {{char}}真名 / 真名（{{char}}）」等叠写，只保留占位符。
 * 解决模型把全名与 {{char}} 并写、或半截昵称替换后残留汉字的问题。
 */
export function unstackMeetPlaceholderNameGlue(
  text: string,
  opts: { charNames?: string[]; userNames?: string[] },
): string {
  let t = String(text ?? '')
  if (!t) return t

  const charNames = uniqueNameChunks(opts.charNames ?? [])
  const userNames = uniqueNameChunks(opts.userNames ?? [])

  const stripGlue = (names: string[], ph: '{{char}}' | '{{user}}') => {
    const phEsc = escapeRegExp(ph)
    for (const name of names) {
      const n = escapeRegExp(name)
      t = t.replace(new RegExp(`${n}\\s*${phEsc}`, 'g'), ph)
      t = t.replace(new RegExp(`${phEsc}\\s*${n}`, 'g'), ph)
      t = t.replace(new RegExp(`${n}\\s*[（(]\\s*${phEsc}\\s*[）)]`, 'g'), ph)
      t = t.replace(new RegExp(`${phEsc}\\s*[（(]\\s*${n}\\s*[）)]`, 'g'), ph)
      t = t.replace(new RegExp(`${n}\\s*[·•／/|]\\s*${phEsc}`, 'g'), ph)
      t = t.replace(new RegExp(`${phEsc}\\s*[·•／/|]\\s*${n}`, 'g'), ph)
    }
    t = t.replace(new RegExp(`(?:${phEsc}\\s*){2,}`, 'g'), ph)
  }

  stripGlue(charNames, '{{char}}')
  stripGlue(userNames, '{{user}}')
  return t
}

/**
 * 将遇见写入「档案法则 / 人设世界书分册」的正文中的角色实名、网名及用户展示名
 * 替换为 `{{char}}` / `{{user}}`，便于与微信侧占位符注入一致。
 */
export function rewriteMeetWorldbookNamesToPlaceholders(text: string, ids: MeetWorldbookNameIds): string {
  let t = String(text ?? '')
  const nick = String(ids.nickname ?? '').trim()
  const rn = String(ids.realName ?? '').trim()
  const ud = String(ids.userDisplayName ?? '').trim()

  const charChunks = uniqueNameChunks([rn, nick])
  const userChunks = uniqueNameChunks([ud])

  // 先拆叠写，再按长名优先替换裸名（避开已有 {{…}} 块，防止半截昵称撕开姓名）
  t = unstackMeetPlaceholderNameGlue(t, { charNames: charChunks, userNames: userChunks })

  for (const chunk of charChunks) {
    t = replaceBareTokenOutsidePlaceholders(t, chunk, '{{char}}')
  }
  for (const chunk of userChunks) {
    t = replaceBareTokenOutsidePlaceholders(t, chunk, '{{user}}')
  }

  t = unstackMeetPlaceholderNameGlue(t, { charNames: charChunks, userNames: userChunks })
  return t
}
