/** 时间轴 / 曲线共用的像素 ↔ 时间映射工具 */

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * 将容器内横向像素位置映射为相对入睡时刻的分钟偏移。
 * @param x 相对容器左缘的像素 x
 * @param timelineWidth 容器宽度
 * @param totalSleepMin 入睡→起床总分钟
 */
export function pixelToOffsetMin(x: number, timelineWidth: number, totalSleepMin: number): number {
  const w = Math.max(1, timelineWidth)
  const ratio = clamp(x / w, 0, 1)
  return ratio * Math.max(1, totalSleepMin)
}

/** 相对分钟 → 容器内像素 x */
export function offsetMinToPixel(offsetMin: number, timelineWidth: number, totalSleepMin: number): number {
  const total = Math.max(1, totalSleepMin)
  return clamp(offsetMin / total, 0, 1) * Math.max(1, timelineWidth)
}

/**
 * 通用：像素 → 绝对时间 Date
 * sleepStart / sleepEnd 为入睡、起床 Date
 */
export function pixelToTime(
  x: number,
  timelineWidth: number,
  sleepStart: Date,
  sleepEnd: Date,
): Date {
  const w = Math.max(1, timelineWidth)
  const ratio = clamp(x / w, 0, 1)
  const span = Math.max(1, sleepEnd.getTime() - sleepStart.getTime())
  return new Date(sleepStart.getTime() + ratio * span)
}

export function timeToPixel(time: Date, timelineWidth: number, sleepStart: Date, sleepEnd: Date): number {
  const span = Math.max(1, sleepEnd.getTime() - sleepStart.getTime())
  const ratio = clamp((time.getTime() - sleepStart.getTime()) / span, 0, 1)
  return ratio * Math.max(1, timelineWidth)
}

export function formatClockFromDate(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  return `${h < 10 ? `0${h}` : h}:${m < 10 ? `0${m}` : m}`
}

export function formatClockFromOffset(fellAsleepAt: string, offsetMin: number): string {
  return formatClockFromDate(new Date(new Date(fellAsleepAt).getTime() + offsetMin * 60_000))
}

export function formatDurationMin(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m}分钟`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h}小时${rest}分钟` : `${h}小时`
}

export function clientXToLocalX(clientX: number, el: HTMLElement): number {
  const rect = el.getBoundingClientRect()
  return clientX - rect.left
}
