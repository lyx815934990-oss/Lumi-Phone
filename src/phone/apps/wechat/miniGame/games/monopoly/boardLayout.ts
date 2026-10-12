/** 大富翁4fun 风 · 视觉坐标（与逻辑 nextId 无关，仅供渲染） */
export const RICHMAN_LAYOUT: Record<number, { x: number; y: number }> = {
  // 主环：蜿蜒一圈（百分比）
  0: { x: 18, y: 82 },
  1: { x: 30, y: 88 },
  2: { x: 44, y: 90 },
  3: { x: 58, y: 88 },
  4: { x: 70, y: 82 },
  5: { x: 80, y: 72 },
  6: { x: 86, y: 60 },
  7: { x: 88, y: 46 },
  8: { x: 84, y: 34 },
  9: { x: 74, y: 24 },
  10: { x: 60, y: 18 },
  11: { x: 46, y: 16 },
  12: { x: 32, y: 18 },
  13: { x: 20, y: 26 },
  14: { x: 14, y: 38 },
  15: { x: 12, y: 52 },
  16: { x: 14, y: 64 },
  17: { x: 18, y: 74 },
  18: { x: 28, y: 78 },
  19: { x: 40, y: 80 },
  20: { x: 52, y: 78 },
  21: { x: 62, y: 74 },
  22: { x: 70, y: 68 },
  23: { x: 76, y: 58 },

  // 支线 A 记忆回廊（右侧内弯）
  24: { x: 72, y: 58 },
  25: { x: 66, y: 48 },
  26: { x: 70, y: 38 },
  27: { x: 78, y: 32 },

  // 支线 B 生活小径（左上内弯）
  28: { x: 28, y: 30 },
  29: { x: 34, y: 38 },
  30: { x: 30, y: 48 },
  31: { x: 22, y: 56 },

  // 支线 C 功能庭院（中下内弯）
  32: { x: 42, y: 62 },
  33: { x: 50, y: 56 },
  34: { x: 56, y: 60 },
  35: { x: 58, y: 68 },
}

/** 场景装饰点（草地/树/蘑菇感） */
export const SCENE_DECOR: Array<{
  x: number
  y: number
  kind: 'tree' | 'bush' | 'rock' | 'mushroom' | 'water'
  scale?: number
}> = [
  { x: 50, y: 48, kind: 'tree', scale: 1.2 },
  { x: 42, y: 42, kind: 'bush', scale: 0.9 },
  { x: 56, y: 40, kind: 'mushroom', scale: 0.8 },
  { x: 48, y: 54, kind: 'rock', scale: 0.7 },
  { x: 36, y: 58, kind: 'bush', scale: 1 },
  { x: 64, y: 52, kind: 'tree', scale: 0.85 },
  { x: 52, y: 34, kind: 'water', scale: 1.4 },
  { x: 38, y: 36, kind: 'mushroom', scale: 0.7 },
  { x: 68, y: 42, kind: 'bush', scale: 0.75 },
  { x: 44, y: 68, kind: 'tree', scale: 0.7 },
]
