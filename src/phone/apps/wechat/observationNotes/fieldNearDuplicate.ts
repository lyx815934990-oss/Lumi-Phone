/**
 * 私藏侧写字段：同义润色 / 微增描写判定为「无效更新」，落库前跳过。
 * 例：「很喜欢喝奶茶，特别是有小丸子小料的」↔「……，喝起来甜甜的」
 */

function normalizeObsCompareText(raw: string): string {
  return String(raw ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(
      /[\s\u3000\u200b-\u200d\ufeff（）()【】\[\]「」『』""''"'、，,。.!！?？…~～·•|｜/／\\-—–_:：;；]/gu,
      '',
    )
}

function isObsPlaceholderText(raw: string): boolean {
  const t = String(raw ?? '').trim()
  if (!t) return true
  if (t === '（尚未判定）' || t === '私密') return true
  return /^(尚不清楚|暂时不知道|还没摸清楚|还不清楚|不太清楚|暂不清楚|不知道|不清楚|暂无|无)$/u.test(
    t,
  )
}

function charBigrams(s: string): Set<string> {
  const out = new Set<string>()
  if (s.length < 2) {
    if (s) out.add(s)
    return out
  }
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2))
  return out
}

function bigramDice(a: string, b: string): number {
  const A = charBigrams(a)
  const B = charBigrams(b)
  if (!A.size && !B.size) return 1
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) {
    if (B.has(x)) inter++
  }
  return (2 * inter) / (A.size + B.size)
}

/** 短称呼/备注：只认归一化全等，避免「阿晚」↔「阿晚呀」被误杀时仍允许；但「季修晗」↔「季修晗🐾」应可更新 */
function isStrictIdentityPath(path: string): boolean {
  return path === 'remarkNickname' || path === 'preferredAddress' || path === 'affection'
}

/**
 * 两段侧写正文是否「意思差不多、不值得再刷一条更新」。
 * @returns true → 应跳过 apply 与 diff
 */
export function isObservationFieldNearDuplicate(
  previousText: string,
  nextText: string,
  path = '',
): boolean {
  const prev = String(previousText ?? '').trim()
  const next = String(nextText ?? '').trim()
  if (prev === next) return true

  if (path === 'affection') {
    const a = Number(prev.replace(/[^\d.]/g, ''))
    const b = Number(next.replace(/[^\d.]/g, ''))
    return Number.isFinite(a) && Number.isFinite(b) && Math.round(a) === Math.round(b)
  }

  if (path === 'personalityRadar' || path === 'abilityRadar') {
    return normalizeObsCompareText(prev) === normalizeObsCompareText(next)
  }

  const pn = normalizeObsCompareText(prev)
  const nn = normalizeObsCompareText(next)
  if (pn === nn) return true
  if (!pn && !nn) return true

  const prevPh = isObsPlaceholderText(prev)
  const nextPh = isObsPlaceholderText(next)
  // 「尚不清楚」↔ 实质内容：必须落库
  if (prevPh !== nextPh) return false
  if (prevPh && nextPh) return true

  if (isStrictIdentityPath(path)) {
    // 备注/称呼：允许标点/空白差异；实质增字（emoji、呀、小名扩展）算有效更新
    return pn === nn
  }

  // 过短：只认全等，降低误杀
  if (Math.min(pn.length, nn.length) < 4) return false

  const shorter = pn.length <= nn.length ? pn : nn
  const longer = pn.length <= nn.length ? nn : pn
  const extra = longer.length - shorter.length

  // 一方包含另一方，且增量只是轻度润色（如加「喝起来甜甜的」）
  if (longer.includes(shorter)) {
    const rel = shorter.length > 0 ? extra / shorter.length : 1
    if (extra <= 18 && (extra <= 8 || rel <= 0.28)) return true
    if (shorter.length / longer.length >= 0.88) return true
  }

  const dice = bigramDice(pn, nn)
  if (dice >= 0.9) return true
  if (
    dice >= 0.86 &&
    Math.abs(pn.length - nn.length) <= Math.max(4, Math.floor(Math.min(pn.length, nn.length) * 0.18))
  ) {
    return true
  }

  return false
}
