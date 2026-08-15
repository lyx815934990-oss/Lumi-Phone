import { hasMarketContent, type MarketDataset } from './types'

export function formatMarketContinuityBrief(data: MarketDataset | null | undefined): string {
  if (!data || !hasMarketContent(data)) return ''
  const lines: string[] = [
    '【既有团购记录·连续性锚定】',
    '新一轮须承接口味与常去商家气质；可新增订单/评价，勿把整本账本换成完全无关的另一套消费人设。',
  ]
  const orders = (data.orders || []).slice(0, 8)
  if (orders.length) {
    lines.push('既有订单（可保留气质并增新条）：')
    for (const o of orders) {
      lines.push(`- ${o.dateLine}｜${o.title.slice(0, 28)}｜状态参考可演进`)
    }
  }
  const reviews = (data.reviews || []).slice(0, 4)
  if (reviews.length) {
    lines.push(
      `既有评价口吻参考：${reviews.map((r) => r.text.slice(0, 20)).join(' / ')}`,
    )
  }
  return lines.join('\n')
}
