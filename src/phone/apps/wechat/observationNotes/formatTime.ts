/** 相对时间 / 日期展示 */

export function formatObsRelativeTime(ts: number, now = Date.now()): string {
  if (!Number.isFinite(ts) || ts <= 0) return '未知'
  const diff = Math.max(0, now - ts)
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}天前`
  const d = new Date(ts)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

export function formatObsUpdatedAt(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return '—'
  const d = new Date(ts)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** 标题栏用短日期，如 8.17 */
export function formatObsHeaderDate(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return '—'
  const d = new Date(ts)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

export function formatObsHistoryDate(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return '—'
  const d = new Date(ts)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
