import { homeModelUrl } from './modelUrl'
import type { CatalogItem, CatalogTab } from './types'

type ManifestItem = {
  id: string
  category: string
  chineseName: string
  output: string
}

/** 清单细分类 → 大类 Tab（与资源文件夹一一对应） */
const TAB_BY_CATEGORY: Record<string, CatalogTab> = {
  '01-床': 'furniture',
  '02-沙发': 'furniture',
  '03-桌': 'furniture',
  '07-收纳柜': 'furniture',
  '15-椅子': 'furniture',
  '12-办公电子': 'furniture',
  '08-灯光': 'lighting',
  '06-装饰': 'decor',
  '05-绿植': 'decor',
  '16-台面小物': 'decor',
  '13-运动休闲': 'decor',
  '11-墙面门窗': 'building',
  '09-厨房电器': 'building',
  '10-卫浴': 'building',
}

/** 细分类展示名与排序（按编号） */
export const CATALOG_CATEGORY_META: Record<
  string,
  { label: string; order: number; tab: CatalogTab }
> = {
  '01-床': { label: '床', order: 1, tab: 'furniture' },
  '02-沙发': { label: '沙发', order: 2, tab: 'furniture' },
  '15-椅子': { label: '椅子', order: 3, tab: 'furniture' },
  '03-桌': { label: '桌', order: 4, tab: 'furniture' },
  '07-收纳柜': { label: '收纳柜', order: 5, tab: 'furniture' },
  '12-办公电子': { label: '办公电子', order: 6, tab: 'furniture' },
  '08-灯光': { label: '灯光', order: 10, tab: 'lighting' },
  '05-绿植': { label: '绿植', order: 20, tab: 'decor' },
  '06-装饰': { label: '装饰', order: 21, tab: 'decor' },
  '16-台面小物': { label: '台面小物', order: 22, tab: 'decor' },
  '13-运动休闲': { label: '运动休闲', order: 23, tab: 'decor' },
  '11-墙面门窗': { label: '墙面门窗/楼梯', order: 30, tab: 'building' },
  '09-厨房电器': { label: '厨房电器', order: 31, tab: 'building' },
  '10-卫浴': { label: '卫浴', order: 32, tab: 'building' },
}

const PREVIEW_COLORS = ['#c4a574', '#8b7355', '#6b8cae', '#7a9a7a', '#a08080', '#909090']

function previewColorForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PREVIEW_COLORS[h % PREVIEW_COLORS.length]!
}

export function catalogCategoryLabel(category: string): string {
  return CATALOG_CATEGORY_META[category]?.label ?? category.replace(/^\d+-/, '')
}

function mapManifestItems(items: ManifestItem[]): CatalogItem[] {
  return items
    .filter((item) => {
      if (item.category.startsWith('14-')) return false
      return Boolean(TAB_BY_CATEGORY[item.category])
    })
    .map((item) => ({
      id: item.id,
      name: item.chineseName,
      category: item.category,
      tab: TAB_BY_CATEGORY[item.category] ?? 'decor',
      modelPath: homeModelUrl(item.output),
      previewColor: previewColorForId(item.id),
    }))
    .sort((a, b) => {
      const oa = CATALOG_CATEGORY_META[a.category]?.order ?? 99
      const ob = CATALOG_CATEGORY_META[b.category]?.order ?? 99
      if (oa !== ob) return oa - ob
      return a.name.localeCompare(b.name, 'zh')
    })
}

/** 启动即用的小目录子集 */
export const STARTER_CATALOG: CatalogItem[] = mapManifestItems([
  { id: '双人床', category: '01-床', chineseName: '双人床', output: '已整理/01-床/双人床.glb' },
  { id: '三人沙发', category: '02-沙发', chineseName: '三人沙发', output: '已整理/02-沙发/三人沙发.glb' },
  { id: '书桌', category: '03-桌', chineseName: '书桌', output: '已整理/03-桌/书桌.glb' },
  { id: '扶手椅', category: '02-沙发', chineseName: '扶手椅', output: '已整理/02-沙发/扶手椅.glb' },
  { id: '落地灯', category: '08-灯光', chineseName: '落地灯', output: '已整理/08-灯光/落地灯.glb' },
  { id: '闹钟', category: '06-装饰', chineseName: '闹钟', output: '已整理/06-装饰/闹钟.glb' },
])

let cachedCatalog: CatalogItem[] | null = null

export async function loadHomeCatalog(): Promise<CatalogItem[]> {
  if (cachedCatalog) return cachedCatalog
  try {
    const base = import.meta.env.BASE_URL
    const prefix = base.endsWith('/') ? base : `${base}/`
    const res = await fetch(`${prefix}home-models/manifest.json`)
    if (!res.ok) throw new Error('manifest missing')
    const data = (await res.json()) as { items: ManifestItem[] }
    cachedCatalog = mapManifestItems(data.items)
    return cachedCatalog
  } catch {
    cachedCatalog = STARTER_CATALOG
    return cachedCatalog
  }
}

export function catalogByTab(items: CatalogItem[], tab: CatalogTab): CatalogItem[] {
  return items.filter((c) => c.tab === tab)
}

export function catalogByCategory(items: CatalogItem[], category: string): CatalogItem[] {
  return items.filter((c) => c.category === category)
}

/** 某大类下出现的细分类（按 order 排序） */
export function categoriesForTab(items: CatalogItem[], tab: CatalogTab): string[] {
  const set = new Set<string>()
  for (const item of items) {
    if (item.tab === tab) set.add(item.category)
  }
  return Array.from(set).sort((a, b) => {
    const oa = CATALOG_CATEGORY_META[a]?.order ?? 99
    const ob = CATALOG_CATEGORY_META[b]?.order ?? 99
    return oa - ob
  })
}

export function findCatalogItem(items: CatalogItem[], id: string): CatalogItem | undefined {
  return items.find((c) => c.id === id)
}
