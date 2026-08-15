/**
 * 查手机 · 团购生活 AI 标记块解析
 */

import {
  emptyMarketDataset,
  type BrowseGroup,
  type BrowseRecord,
  type MarketDataset,
  type MarketKind,
  type MarketOrder,
  type OrderStatus,
  type PlaceReview,
} from './types'

const COVER_TONES = [
  'linear-gradient(145deg,#1e2a28 0%,#3c8c86 55%,#b8d4d1 100%)',
  'linear-gradient(160deg,#101012 0%,#2a3836 50%,#6a8a86 100%)',
  'linear-gradient(150deg,#24302e 0%,#4a6e6a 45%,#c5d8d5 100%)',
  'linear-gradient(155deg,#1a2224 0%,#355552 60%,#8fb0ab 100%)',
  'linear-gradient(140deg,#222826 0%,#3c8c86 40%,#dfe8e6 100%)',
]

function fieldMap(block: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([^：:]{1,24})\s*[：:]\s*(.*)$/)
    if (!m) continue
    map[m[1]!.trim()] = m[2]!.trim()
  }
  return map
}

function pick(map: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (map[k]?.trim()) return map[k]!.trim()
  }
  return ''
}

function extractBlocks(raw: string, start: string, end: string): string[] {
  const out: string[] = []
  const re = new RegExp(`${start}([\\s\\S]*?)${end}`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) out.push(m[1] || '')
  return out
}

function parseKind(raw: string): MarketKind | null {
  const s = raw.trim()
  const table: Record<string, MarketKind> = {
    酒店: 'hotel',
    hotel: 'hotel',
    餐厅: 'restaurant',
    restaurant: 'restaurant',
    团购券: 'voucher',
    团购: 'voucher',
    voucher: 'voucher',
    娱乐游玩: 'play',
    娱乐: 'play',
    游玩: 'play',
    play: 'play',
  }
  return table[s] ?? table[s.toLowerCase()] ?? null
}

function parseStatus(raw: string): OrderStatus {
  const s = raw.trim()
  if (/待使用|待核销/.test(s)) return 'pending'
  if (/已确认|确认/.test(s)) return 'confirmed'
  if (/已核销|核销/.test(s)) return 'redeemed'
  if (/已完成|完成/.test(s)) return 'done'
  if (/已过期|过期/.test(s)) return 'expired'
  if (/已退款|退款/.test(s)) return 'refunded'
  return 'done'
}

function parseGroup(raw: string): BrowseGroup {
  const s = raw.trim().toLowerCase()
  if (s === 'today' || s === '今天') return 'today'
  if (s === 'yesterday' || s === '昨天') return 'yesterday'
  return 'earlier'
}

function parseInfoRows(block: string): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^字段[：:]\s*(.+?)\s*[|｜]\s*(.+)\s*$/)
    if (!m) continue
    rows.push({ label: m[1]!.trim(), value: m[2]!.trim() })
  }
  return rows
}

function parseOrder(block: string, index: number): MarketOrder | null {
  const map = fieldMap(block)
  const id = pick(map, 'id', 'ID') || `ord_${index + 1}`
  const kind = parseKind(pick(map, '类型', 'kind'))
  const title = pick(map, '标题', '名称', 'title')
  if (!kind || !title) return null
  const amount = Number(pick(map, '金额', '花费', 'amount'))
  const ratingRaw = pick(map, '评分', 'rating')
  const reviewText = pick(map, '评价', '短评')
  const photos = pick(map, '配图')
    .split(/[,，|]/)
    .map((x) => x.trim())
    .filter(Boolean)
  return {
    id,
    kind,
    title,
    coverTone: COVER_TONES[index % COVER_TONES.length]!,
    coverCaption: pick(map, '画面') || title.slice(0, 6),
    dateLine: pick(map, '日期行', '摘要') || pick(map, '下单时间') || '近期',
    status: parseStatus(pick(map, '状态', 'status') || '已完成'),
    amountYuan: Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 88,
    infoRows: parseInfoRows(block),
    couponCodeMasked: pick(map, '券码') || undefined,
    rating: ratingRaw ? Math.max(0, Math.min(5, Number(ratingRaw))) : undefined,
    review: reviewText
      ? {
          rating: ratingRaw ? Math.max(0, Math.min(5, Number(ratingRaw))) : 4.5,
          text: reviewText,
          atLabel: pick(map, '评价时间') || '3天前',
          likes: Math.max(0, Math.round(Number(pick(map, '评价赞')) || 0)) || undefined,
          photoTones: photos.length ? photos.map((_, i) => COVER_TONES[(index + i) % COVER_TONES.length]!) : undefined,
        }
      : undefined,
    orderedAtLabel: pick(map, '下单时间') || '上周',
  }
}

function parseBrowse(block: string, index: number): BrowseRecord | null {
  const map = fieldMap(block)
  const title = pick(map, '标题', '名称')
  const kind = parseKind(pick(map, '类型') || '餐厅')
  if (!title || !kind) return null
  return {
    id: pick(map, 'id') || `br_${index + 1}`,
    kind,
    title,
    coverTone: COVER_TONES[(index + 1) % COVER_TONES.length]!,
    group: parseGroup(pick(map, '分组') || 'earlier'),
    timeLabel: pick(map, '时间') || '昨天',
    orderId: pick(map, '订单') || undefined,
  }
}

function parseReview(block: string, index: number): PlaceReview | null {
  const map = fieldMap(block)
  const placeName = pick(map, '地点', '商家', '名称', '店名')
  const text = pick(map, '正文', '评价', '内容', '短评')
  if (!placeName || !text) return null
  const kindRaw = pick(map, '类别', '类型', 'kind', '分类')
  const orderId = pick(map, '订单') || undefined
  // 明确地点/探店 → place；明确体验/团购或带订单 → experience；其余默认 place
  const kind: PlaceReview['kind'] = /地点|探店|打卡|^place$/i.test(kindRaw)
    ? 'place'
    : /体验|团购|^experience$/i.test(kindRaw) || !!orderId
      ? 'experience'
      : 'place'
  const photos = pick(map, '配图')
    .split(/[,，|]/)
    .map((x) => x.trim())
    .filter(Boolean)
  return {
    id: pick(map, 'id') || `rv_${index + 1}`,
    placeName,
    rating: Math.max(0, Math.min(5, Number(pick(map, '评分')) || 4)),
    text,
    atLabel: pick(map, '时间') || '上周',
    likes: Math.max(0, Math.round(Number(pick(map, '赞')) || 0)) || undefined,
    photoTones: photos.length ? photos.map((_, i) => COVER_TONES[(index + i) % COVER_TONES.length]!) : undefined,
    orderId,
    kind,
  }
}

export const MARKET_MARKUP_FORMAT = `
【输出格式 · 硬性】
- 禁止 JSON、禁止 markdown 代码围栏、禁止前后解释。
- 只输出下方标记块；每行「字段名：值」。
- 订单 6~12 条 <<MK_ORDER>>，须覆盖酒店/餐厅/团购券/娱乐游玩至少各 1。
- 信息字段用「字段：标签|值」多行写出（按类型写入住/用餐/有效期等）。
- 团购券券码仅后4位明文，前缀打码，如 ****4821。
- 浏览记录 5~10 条 <<MK_BROWSE>>（团购App站内浏览，非浏览器）。
- 评价 4~10 条 <<MK_REVIEW>>：其中 **团购体验 ≥2**（类别：团购体验，可写订单 id），**地点评价 ≥2**（类别：地点评价，**不要**写订单字段；写路过/探店/打卡感）。
- 文案要有踩雷/惊喜/性价比吐槽，禁止「还可以」。
- 统计块 <<MK_STATS>>。

<<MK_STATS>>
本月消费：1280
笔数：6
<<END_MK_STATS>>

<<MK_ORDER>>
id：o1
类型：酒店
标题：云隐山居民宿
日期行：11月2日 入住
状态：待使用
金额：628
下单时间：10月28日 21:06
字段：入住日期|11月2日
字段：离店日期|11月3日
字段：房型|山景大床房
字段：下单时间|10月28日 21:06
画面：山间木屋
<<END_MK_ORDER>>

<<MK_ORDER>>
id：o2
类型：餐厅
标题：深夜食堂·南门店
日期行：今晚 19:30 · 2人
状态：已完成
金额：186
评分：4.8
评价：汤底很冲但不腻，靠窗位有点挤
评价时间：昨天
评价赞：3
字段：用餐|今晚 19:30
字段：人数|2人
字段：下单时间|昨天 15:20
画面：暖黄灯笼
<<END_MK_ORDER>>

<<MK_BROWSE>>
id：b1
类型：餐厅
标题：某火锅探店
分组：today
时间：14:22
<<END_MK_BROWSE>>

<<MK_REVIEW>>
id：r1
类别：团购体验
地点：深夜食堂·南门店
评分：4.8
正文：汤底很冲但不腻，靠窗位有点挤
时间：昨天
赞：3
订单：o2
<<END_MK_REVIEW>>

<<MK_REVIEW>>
id：r2
类别：地点评价
地点：江北夜市入口
评分：4.2
正文：烟火气足，但垃圾桶边上站着吃有点顶；糖葫芦倒是脆
时间：上周六
赞：1
<<END_MK_REVIEW>>

<<MK_REVIEW>>
id：r3
类别：地点评价
地点：旧码头书店咖啡馆
评分：3.6
正文：座位少、插座更少，适合拍两张就走，别指望久坐办公
时间：月初
赞：0
<<END_MK_REVIEW>>
`.trim()

export function parseMarketMarkup(raw: string): MarketDataset | null {
  if (!raw?.trim()) return null
  const text = raw.replace(/```/g, '')
  const orders = extractBlocks(text, '<<MK_ORDER>>', '<<END_MK_ORDER>>')
    .map((b, i) => parseOrder(b, i))
    .filter((x): x is MarketOrder => !!x)
  if (orders.length < 4) return null

  const browses = extractBlocks(text, '<<MK_BROWSE>>', '<<END_MK_BROWSE>>')
    .map((b, i) => parseBrowse(b, i))
    .filter((x): x is BrowseRecord => !!x)

  const reviews = extractBlocks(text, '<<MK_REVIEW>>', '<<END_MK_REVIEW>>')
    .map((b, i) => parseReview(b, i))
    .filter((x): x is PlaceReview => !!x)

  // 从订单评价补一条体验评价（若 reviews 未含）
  for (const o of orders) {
    if (!o.review) continue
    if (reviews.some((r) => r.orderId === o.id || (r.kind === 'experience' && r.placeName === o.title))) continue
    reviews.push({
      id: `rv_from_${o.id}`,
      placeName: o.title,
      rating: o.review.rating,
      text: o.review.text,
      atLabel: o.review.atLabel,
      likes: o.review.likes,
      photoTones: o.review.photoTones,
      orderId: o.id,
      kind: 'experience',
    })
  }

  // 若模型漏写地点评价：用浏览记录 / 无评价订单补 2~3 条地点手账，避免「地点评价」空页
  const placeCount = () => reviews.filter((r) => r.kind === 'place').length
  if (placeCount() < 2) {
    const seeds: Array<{ name: string; hint: string }> = []
    for (const b of browses) {
      if (seeds.some((s) => s.name === b.title)) continue
      if (reviews.some((r) => r.placeName === b.title)) continue
      seeds.push({ name: b.title, hint: b.timeLabel })
      if (seeds.length >= 4) break
    }
    for (const o of orders) {
      if (seeds.some((s) => s.name === o.title)) continue
      if (reviews.some((r) => r.placeName === o.title && r.kind === 'place')) continue
      seeds.push({ name: o.title, hint: o.dateLine })
      if (seeds.length >= 4) break
    }
    const fillers = [
      '路过打卡了一下，环境比照片素一点，不过坐得住',
      '位置好找，但人声吵；适合匆匆吃一口就走',
      '性价比一般，装修花活多，味道中规中矩',
      '意外还行，下次可能还会来，别周末高峰就好',
    ]
    let i = 0
    while (placeCount() < 2 && i < seeds.length) {
      const seed = seeds[i]!
      reviews.push({
        id: `rv_place_fill_${i + 1}`,
        placeName: seed.name,
        rating: 3.5 + ((i * 0.4) % 1.5),
        text: fillers[i % fillers.length]!,
        atLabel: seed.hint || '近期',
        likes: i % 2 === 0 ? 1 : undefined,
        photoTones: [COVER_TONES[(i + 2) % COVER_TONES.length]!],
        kind: 'place',
      })
      i += 1
    }
  }

  const data = emptyMarketDataset()
  data.orders = orders
  data.browses = browses
  data.reviews = reviews

  const stats = extractBlocks(text, '<<MK_STATS>>', '<<END_MK_STATS>>')[0]
  if (stats) {
    const map = fieldMap(stats)
    const spend = Number(pick(map, '本月消费', '消费'))
    const count = Number(pick(map, '笔数', '订单数'))
    if (Number.isFinite(spend)) data.monthSpendYuan = Math.max(0, Math.round(spend))
    if (Number.isFinite(count)) data.orderCount = Math.max(0, Math.round(count))
  } else {
    data.monthSpendYuan = orders.reduce((s, o) => s + o.amountYuan, 0)
    data.orderCount = orders.length
  }

  return data
}

export function isMarketDatasetReady(data: MarketDataset | null): boolean {
  if (!data || data.orders.length < 4) return false
  const place = data.reviews.filter((r) => r.kind === 'place').length
  const exp = data.reviews.filter((r) => r.kind === 'experience').length
  // 允许兜底补地点评价后通过；至少各有 1 条更稳
  return place >= 1 && exp >= 1
}
