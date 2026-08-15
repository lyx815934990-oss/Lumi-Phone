import { personaDb } from '../../newFriendsPersona/idb'
import { emptyMarketDataset, hasMarketContent, type MarketDataset } from './types'

const MARKET_KV_PREFIX = 'checkPhone.market.v1:'

function marketKey(characterId: string) {
  return `${MARKET_KV_PREFIX}${String(characterId || 'unknown').trim()}`
}

export function normalizeMarketDataset(raw: unknown): MarketDataset {
  if (!raw || typeof raw !== 'object') return emptyMarketDataset()
  const r = raw as Partial<MarketDataset>
  const orders = Array.isArray(r.orders)
    ? r.orders.filter((x) => x && typeof x === 'object' && typeof (x as { id?: string }).id === 'string')
    : []
  return {
    monthSpendYuan:
      typeof r.monthSpendYuan === 'number' && Number.isFinite(r.monthSpendYuan)
        ? Math.max(0, r.monthSpendYuan)
        : orders.reduce((s, o) => s + (typeof o.amountYuan === 'number' ? o.amountYuan : 0), 0),
    orderCount:
      typeof r.orderCount === 'number' && Number.isFinite(r.orderCount)
        ? Math.max(0, Math.round(r.orderCount))
        : orders.length,
    orders,
    browses: Array.isArray(r.browses)
      ? r.browses.filter((x) => x && typeof x === 'object' && typeof (x as { id?: string }).id === 'string')
      : [],
    reviews: Array.isArray(r.reviews)
      ? r.reviews.filter((x) => x && typeof x === 'object' && typeof (x as { id?: string }).id === 'string')
      : [],
  }
}

export async function loadMarketDataset(characterId: string): Promise<MarketDataset> {
  const raw = await personaDb.getPhoneKv(marketKey(characterId))
  return normalizeMarketDataset(raw)
}

export async function saveMarketDataset(characterId: string, dataset: MarketDataset): Promise<void> {
  await personaDb.setPhoneKv(marketKey(characterId), normalizeMarketDataset(dataset))
}

export async function clearMarketDataset(characterId: string): Promise<void> {
  await saveMarketDataset(characterId, emptyMarketDataset())
}

export { hasMarketContent }
