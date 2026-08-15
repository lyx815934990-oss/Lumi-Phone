export {
  pixelToTime,
  timeToPixel,
  pixelToOffsetMin,
  offsetMinToPixel,
  formatClockFromDate,
  formatClockFromOffset,
  formatDurationMin,
  clientXToLocalX,
  clamp,
} from './timeMap'
export { sleepHaptic } from './haptics'
export { useDragScrubber } from './useDragScrubber'
export { SleepGlassTooltip, SleepScrubLine } from './SleepGlassTooltip'
export {
  findStageAtOffset,
  findStageIndexAtOffset,
  findHeartRateAtOffset,
  sampleIndexAtOffset,
  segmentsOfKind,
} from './lookups'

/**
 * 后续迭代：双指捏合缩放时间轴（pinch-to-zoom）
 * - 在时间轴容器上监听 gesture/touch 双指 span，映射为 hourWindow 缩放
 * - 放大后支持横向平移查看局部小时细节
 * - 当前版本仅实现点击 / 长按扫描，缩放暂不实现以控制成本
 */
