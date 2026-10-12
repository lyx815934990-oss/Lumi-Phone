import type { MonopolyTileDef } from './monopolyTypes'
import { ZONE_LABEL } from './monopolyTypes'

/**
 * 主环 24 格 + 3 条支线功能路径（各 4 格）= 36 格
 * 落到菱形「入口」格会拐进支线；支线走完接回主环。
 *
 * 主环 next: 0→1→…→23→0
 * 支线 A 记忆回廊: gate5 → 24→25→26→27→8
 * 支线 B 生活小径: gate13 → 28→29→30→31→16
 * 支线 C 功能庭院: gate19 → 32→33→34→35→21
 */
function T(
  partial: Omit<MonopolyTileDef, 'zone' | 'shape'> &
    Partial<Pick<MonopolyTileDef, 'zone' | 'shape'>>,
): MonopolyTileDef {
  return {
    zone: 'main',
    shape: 'rect',
    ...partial,
  }
}

export const MONOPOLY_BOARD: MonopolyTileDef[] = [
  // ——— 主环（略不规则椭圆，避免死板方框）———
  T({ id: 0, name: '起点 · 校门口', kind: 'go', nextId: 1, x: 12, y: 88, shape: 'hex', flavor: '新的一圈开始了，发薪日到账。' }),
  T({
    id: 1,
    name: '教学楼走廊',
    kind: 'property',
    nextId: 2,
    x: 28,
    y: 92,
    colorGroup: 'campus',
    price: 600,
    rentBase: 40,
    rentHouse: [120, 360, 800, 1200, 1600],
    houseCost: 500,
    flavor: '脚步声在瓷砖上回响。',
  }),
  T({
    id: 2,
    name: '食堂窗口',
    kind: 'property',
    nextId: 3,
    x: 44,
    y: 94,
    colorGroup: 'campus',
    price: 700,
    rentBase: 50,
    rentHouse: [150, 420, 900, 1300, 1700],
    houseCost: 500,
    flavor: '打饭的队伍又排到了门口。',
  }),
  T({ id: 3, name: '小剧场彩蛋', kind: 'event', nextId: 4, x: 60, y: 92, shape: 'round', flavor: '一张票据从口袋里滑出来。' }),
  T({
    id: 4,
    name: '操场招新区',
    kind: 'property',
    nextId: 5,
    x: 76,
    y: 88,
    colorGroup: 'campus',
    price: 800,
    rentBase: 60,
    rentHouse: [180, 500, 1000, 1400, 1800],
    houseCost: 500,
    flavor: '横幅在风里啪啪响。',
  }),
  T({
    id: 5,
    name: '记忆回廊入口',
    kind: 'gate',
    nextId: 6,
    x: 90,
    y: 78,
    shape: 'diamond',
    branchEntryId: 24,
    flavor: '门缝里漏出半截旧日的光。',
  }),
  T({
    id: 6,
    name: '琴房',
    kind: 'property',
    nextId: 7,
    x: 94,
    y: 62,
    colorGroup: 'arts',
    price: 1000,
    rentBase: 80,
    rentHouse: [220, 600, 1200, 1600, 2000],
    houseCost: 600,
    flavor: '隔音门缝里漏出半截旋律。',
  }),
  T({
    id: 7,
    name: '墨渊画材',
    kind: 'property',
    nextId: 8,
    x: 94,
    y: 46,
    colorGroup: 'arts',
    price: 1100,
    rentBase: 90,
    rentHouse: [250, 680, 1300, 1700, 2100],
    houseCost: 600,
    flavor: '松节油和颜料的气味缠在一起。',
  }),
  T({
    id: 8,
    name: '图书馆',
    kind: 'property',
    nextId: 9,
    x: 90,
    y: 30,
    colorGroup: 'arts',
    price: 1200,
    rentBase: 100,
    rentHouse: [280, 720, 1400, 1800, 2200],
    houseCost: 600,
    flavor: '占座屏还亮着你的名字。',
  }),
  T({ id: 9, name: '教导处谈话室', kind: 'jail', nextId: 10, x: 78, y: 14, shape: 'hex', flavor: '只是路过探望——暂时。' }),
  T({
    id: 10,
    name: '快递柜',
    kind: 'property',
    nextId: 11,
    x: 62,
    y: 8,
    colorGroup: 'daily',
    price: 1400,
    rentBase: 110,
    rentHouse: [320, 800, 1500, 1900, 2300],
    houseCost: 700,
    flavor: '取件码还剩三十秒。',
  }),
  T({
    id: 11,
    name: '地铁站',
    kind: 'property',
    nextId: 12,
    x: 46,
    y: 6,
    colorGroup: 'daily',
    price: 1500,
    rentBase: 120,
    rentHouse: [350, 860, 1600, 2000, 2400],
    houseCost: 700,
    flavor: '闸机滴一声，人潮把你推向前。',
  }),
  T({ id: 12, name: '道具柜', kind: 'item', nextId: 13, x: 30, y: 8, shape: 'round', flavor: '柜门一开，摸到一张卡。' }),
  T({
    id: 13,
    name: '生活小径入口',
    kind: 'gate',
    nextId: 14,
    x: 16,
    y: 16,
    shape: 'diamond',
    branchEntryId: 28,
    flavor: '巷口的灯一盏盏亮起来。',
  }),
  T({
    id: 14,
    name: '电影院',
    kind: 'property',
    nextId: 15,
    x: 8,
    y: 30,
    colorGroup: 'date',
    price: 1800,
    rentBase: 150,
    rentHouse: [420, 1000, 1900, 2300, 2800],
    houseCost: 800,
    flavor: '选座页还停在并排的两个空位。',
  }),
  T({
    id: 15,
    name: '咖啡馆角落',
    kind: 'property',
    nextId: 16,
    x: 6,
    y: 46,
    colorGroup: 'date',
    price: 1900,
    rentBase: 160,
    rentHouse: [450, 1050, 2000, 2400, 2900],
    houseCost: 800,
    flavor: '窗边那桌总是被你们预定。',
  }),
  T({
    id: 16,
    name: '酒店大堂',
    kind: 'property',
    nextId: 17,
    x: 6,
    y: 62,
    colorGroup: 'date',
    price: 2000,
    rentBase: 180,
    rentHouse: [500, 1100, 2100, 2600, 3200],
    houseCost: 800,
    flavor: '入住单上的字迹还没干。',
  }),
  T({ id: 17, name: '天台休息区', kind: 'parking', nextId: 18, x: 10, y: 76, shape: 'hex', flavor: '风很大，什么都不用急。' }),
  T({
    id: 18,
    name: '合租门口',
    kind: 'property',
    nextId: 19,
    x: 22,
    y: 84,
    colorGroup: 'life',
    price: 2200,
    rentBase: 200,
    rentHouse: [550, 1200, 2200, 2800, 3400],
    houseCost: 900,
    flavor: '水电分账页又弹出红点。',
  }),
  T({
    id: 19,
    name: '功能庭院入口',
    kind: 'gate',
    nextId: 20,
    x: 38,
    y: 86,
    shape: 'diamond',
    branchEntryId: 32,
    flavor: '庭院里摆着一排功能摊位。',
  }),
  T({
    id: 20,
    name: '智能门锁',
    kind: 'property',
    nextId: 21,
    x: 52,
    y: 84,
    colorGroup: 'life',
    price: 2300,
    rentBase: 210,
    rentHouse: [580, 1250, 2300, 2900, 3500],
    houseCost: 900,
    flavor: '开锁日志记着你们各自的时间戳。',
  }),
  T({
    id: 21,
    name: '外卖取餐点',
    kind: 'property',
    nextId: 22,
    x: 66,
    y: 82,
    colorGroup: 'life',
    price: 2400,
    rentBase: 220,
    rentHouse: [600, 1300, 2400, 3000, 3600],
    houseCost: 900,
    flavor: '骑手定位在楼下打转。',
  }),
  T({ id: 22, name: '停车场缴费', kind: 'tax', nextId: 23, x: 80, y: 78, shape: 'capsule', flavor: '小票机吐出一张账单。' }),
  T({
    id: 23,
    name: '广播站',
    kind: 'property',
    nextId: 0,
    x: 88,
    y: 70,
    colorGroup: 'work',
    price: 3000,
    rentBase: 280,
    rentHouse: [750, 1600, 3000, 3600, 4400],
    houseCost: 1100,
    flavor: '红灯亮着，麦还热着。',
  }),

  // ——— 支线 A · 记忆回廊（内侧弧线）———
  T({
    id: 24,
    name: '雨中校道',
    kind: 'property',
    nextId: 25,
    x: 72,
    y: 68,
    zone: 'memory',
    shape: 'capsule',
    colorGroup: 'memory',
    price: 2600,
    rentBase: 240,
    rentHouse: [650, 1400, 2600, 3200, 3900],
    houseCost: 1000,
    flavor: '伞下只剩两个人的呼吸声。',
  }),
  T({
    id: 25,
    name: '旧礼堂侧幕',
    kind: 'property',
    nextId: 26,
    x: 68,
    y: 54,
    zone: 'memory',
    shape: 'capsule',
    colorGroup: 'memory',
    price: 2700,
    rentBase: 250,
    rentHouse: [680, 1450, 2700, 3300, 4000],
    houseCost: 1000,
    flavor: '幕后积灰的道具还没搬走。',
  }),
  T({
    id: 26,
    name: '空教室',
    kind: 'property',
    nextId: 27,
    x: 72,
    y: 40,
    zone: 'memory',
    shape: 'capsule',
    colorGroup: 'memory',
    price: 2800,
    rentBase: 260,
    rentHouse: [700, 1500, 2800, 3400, 4100],
    houseCost: 1000,
    flavor: '粉笔灰在斜阳里浮着。',
  }),
  T({
    id: 27,
    name: '回廊出口',
    kind: 'branch_exit',
    nextId: 8,
    x: 78,
    y: 28,
    zone: 'memory',
    shape: 'diamond',
    flavor: '光一亮，又回到主路上。',
  }),

  // ——— 支线 B · 生活小径 ———
  T({
    id: 28,
    name: '共享单车点',
    kind: 'property',
    nextId: 29,
    x: 28,
    y: 28,
    zone: 'life_path',
    shape: 'capsule',
    colorGroup: 'daily',
    price: 1600,
    rentBase: 130,
    rentHouse: [380, 900, 1700, 2100, 2500],
    houseCost: 700,
    flavor: '车篮里还留着半张便利店小票。',
  }),
  T({ id: 29, name: '失物招领', kind: 'event', nextId: 30, x: 34, y: 38, zone: 'life_path', shape: 'round', flavor: '告示栏多了一行字。' }),
  T({ id: 30, name: '巷口道具摊', kind: 'item', nextId: 31, x: 30, y: 50, zone: 'life_path', shape: 'round', flavor: '稀有道具的轮廓闪了一下。' }),
  T({
    id: 31,
    name: '小径出口',
    kind: 'branch_exit',
    nextId: 16,
    x: 24,
    y: 60,
    zone: 'life_path',
    shape: 'diamond',
    flavor: '巷尾接通酒店大堂一侧。',
  }),

  // ——— 支线 C · 功能庭院（更多功能格）———
  T({ id: 32, name: '彩蛋摊位', kind: 'event', nextId: 33, x: 42, y: 62, zone: 'func_yard', shape: 'round', flavor: '关系版本更新日志刷出一行。' }),
  T({ id: 33, name: '庭院道具柜', kind: 'item', nextId: 34, x: 50, y: 56, zone: 'func_yard', shape: 'round', flavor: '金属柜锁咔哒一声。' }),
  T({ id: 34, name: '时间胶囊税', kind: 'tax', nextId: 35, x: 58, y: 58, zone: 'func_yard', shape: 'capsule', flavor: '解封倒计时扣走一点现金。' }),
  T({
    id: 35,
    name: '庭院出口',
    kind: 'branch_exit',
    nextId: 21,
    x: 64,
    y: 66,
    zone: 'func_yard',
    shape: 'diamond',
    flavor: '穿过藤架，回到取餐点旁。',
  }),
]

export const TILE_BY_ID: ReadonlyMap<number, MonopolyTileDef> = new Map(
  MONOPOLY_BOARD.map((t) => [t.id, t]),
)

export const GO_TILE_ID = 0
export const JAIL_TILE_ID = 9

export function getTile(id: number): MonopolyTileDef {
  const t = TILE_BY_ID.get(id)
  if (!t) throw new Error(`Unknown monopoly tile ${id}`)
  return t
}

export function tilesInColorGroup(group: NonNullable<MonopolyTileDef['colorGroup']>): MonopolyTileDef[] {
  return MONOPOLY_BOARD.filter((t) => t.colorGroup === group)
}

export function zoneLabelForGate(gateId: number): string {
  const gate = TILE_BY_ID.get(gateId)
  const entry = gate?.branchEntryId != null ? TILE_BY_ID.get(gate.branchEntryId) : null
  if (entry) return ZONE_LABEL[entry.zone]
  return '支线'
}

/** 沿 nextId 走 steps 步，返回经过的格子 id 列表（不含起点） */
export function walkPath(from: number, steps: number): number[] {
  const path: number[] = []
  let pos = from
  for (let i = 0; i < steps; i++) {
    const tile = TILE_BY_ID.get(pos)
    if (!tile) break
    pos = tile.nextId
    path.push(pos)
  }
  return path
}

/** 路径中是否经过起点（发薪） */
export function pathPassedGo(from: number, path: number[]): boolean {
  if (path.includes(GO_TILE_ID) && from !== GO_TILE_ID) return true
  return false
}
