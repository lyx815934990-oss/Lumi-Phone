/** 查手机 · 团购生活记录 */

export type MarketKind = 'hotel' | 'restaurant' | 'voucher' | 'play'

export const MARKET_KIND_LABEL: Record<MarketKind, string> = {
  hotel: '酒店',
  restaurant: '餐厅',
  voucher: '团购券',
  play: '娱乐游玩',
}

export const MARKET_KINDS: MarketKind[] = ['hotel', 'restaurant', 'voucher', 'play']

export type MarketFilter = 'all' | MarketKind

/** 待使用 / 已确认 / 已核销 / 已完成 / 已过期 / 已退款 */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'redeemed'
  | 'done'
  | 'expired'
  | 'refunded'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待使用',
  confirmed: '已确认',
  redeemed: '已核销',
  done: '已完成',
  expired: '已过期',
  refunded: '已退款',
}

export type MarketReview = {
  rating: number
  text: string
  atLabel: string
  likes?: number
  /** 配图占位色调 */
  photoTones?: string[]
}

export type MarketOrder = {
  id: string
  kind: MarketKind
  title: string
  /** 商家/项目封面渐变 */
  coverTone: string
  coverCaption?: string
  /** 列表中间一行日期信息 */
  dateLine: string
  status: OrderStatus
  amountYuan: number
  /** 类型专属字段行：label + value */
  infoRows: Array<{ label: string; value: string }>
  /** 团购券打码券码，如 ****1234 */
  couponCodeMasked?: string
  rating?: number
  review?: MarketReview
  orderedAtLabel: string
}

export type BrowseGroup = 'today' | 'yesterday' | 'earlier'

export type BrowseRecord = {
  id: string
  kind: MarketKind
  title: string
  coverTone: string
  group: BrowseGroup
  timeLabel: string
  /** 可选关联订单 */
  orderId?: string
}

export type PlaceReview = {
  id: string
  placeName: string
  rating: number
  text: string
  atLabel: string
  likes?: number
  photoTones?: string[]
  /** 关联订单（团购体验评价） */
  orderId?: string
  /** experience = 团购体验；place = 地点评价 */
  kind: 'experience' | 'place'
}

export type MarketDataset = {
  monthSpendYuan: number
  orderCount: number
  orders: MarketOrder[]
  browses: BrowseRecord[]
  reviews: PlaceReview[]
}

export type MarketScreen =
  | { kind: 'home' }
  | { kind: 'detail'; orderId: string }
  | { kind: 'browse' }
  | { kind: 'reviews' }

export function emptyMarketDataset(): MarketDataset {
  return {
    monthSpendYuan: 0,
    orderCount: 0,
    orders: [],
    browses: [],
    reviews: [],
  }
}

export function hasMarketContent(data: MarketDataset | null | undefined): boolean {
  return !!data && Array.isArray(data.orders) && data.orders.length > 0
}

export function formatYuan(n: number): string {
  const v = Math.max(0, Math.round(n))
  return v.toLocaleString('zh-CN')
}
