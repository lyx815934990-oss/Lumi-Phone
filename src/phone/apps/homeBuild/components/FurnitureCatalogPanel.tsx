import { useEffect, useMemo, useState } from 'react'
import { Package, Hand, X } from 'lucide-react'
import {
  catalogByCategory,
  catalogByTab,
  catalogCategoryLabel,
  categoriesForTab,
  loadHomeCatalog,
} from '../catalog'
import { requestFurnitureThumb } from '../furnitureThumbRenderer'
import { beginOcPickPlacement } from '../ocPickActions'
import { useHomeBuildStore } from '../store'
import { setWalkAvatar3dEnabled } from '../walkInput'
import { loadWalkSettings, saveWalkSettings } from '../walkSettings'
import type { CatalogItem, CatalogTab } from '../types'
import { CATALOG_TAB_LABELS } from '../types'
import { CatalogModelThumb } from './CatalogModelThumb'

const TABS: CatalogTab[] = ['furniture', 'lighting', 'decor', 'building']

export function FurnitureCatalogPanel() {
  const mode = useHomeBuildStore((s) => s.mode)
  const catalogOpen = useHomeBuildStore((s) => s.catalogOpen)
  const setCatalogOpen = useHomeBuildStore((s) => s.setCatalogOpen)
  const pendingCatalogId = useHomeBuildStore((s) => s.pendingCatalogId)
  const setPendingCatalog = useHomeBuildStore((s) => s.setPendingCatalog)
  const selectedFurnitureId = useHomeBuildStore((s) => s.selectedFurnitureId)
  const ocPicking = useHomeBuildStore((s) => s.ocPicking)
  const setOcPicking = useHomeBuildStore((s) => s.setOcPicking)
  const draft = useHomeBuildStore((s) => s.draft)

  const [items, setItems] = useState<CatalogItem[]>([])
  const [tab, setTab] = useState<CatalogTab>('furniture')
  const [category, setCategory] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode !== 'ghost') return
    let cancelled = false
    setLoading(true)
    void loadHomeCatalog().then((list) => {
      if (cancelled) return
      setItems(list)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [mode])

  const subCategories = useMemo(() => categoriesForTab(items, tab), [items, tab])

  useEffect(() => {
    setCategory('all')
  }, [tab])

  const filtered = useMemo(() => {
    const inTab = catalogByTab(items, tab)
    if (category === 'all') return inTab
    return catalogByCategory(inTab, category)
  }, [items, tab, category])

  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of catalogByTab(items, tab)) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1)
    }
    return map
  }, [items, tab])

  useEffect(() => {
    if (!catalogOpen || filtered.length === 0) return
    for (const item of filtered.slice(0, 8)) {
      void requestFurnitureThumb(item.modelPath)
    }
  }, [catalogOpen, filtered])

  if (mode !== 'ghost') return null

  const editingFurniture = Boolean(selectedFurnitureId)
  const showFab = !catalogOpen && !ocPicking

  const startOcPick = () => {
    setWalkAvatar3dEnabled(true)
    saveWalkSettings({ ...loadWalkSettings(), avatar3dEnabled: true })
    setPendingCatalog(null)
    beginOcPickPlacement(draft, setOcPicking)
  }

  return (
    <>
      {showFab ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom))] z-30 flex flex-col items-center gap-2 px-3">
          {pendingCatalogId ? (
            <p className="hb-catalog-hint pointer-events-none">点地面放置 · 再点可取消</p>
          ) : !editingFurniture ? (
            <p className="pointer-events-none text-center text-[11px] text-white/50">
              点地放置家具 · 或「放置 OC」调整落点
            </p>
          ) : null}

          <div
            className={
              editingFurniture
                ? 'pointer-events-auto flex w-full max-w-md items-center justify-end gap-2'
                : 'pointer-events-auto flex w-full max-w-md items-center justify-center gap-2.5'
            }
          >
            <button
              type="button"
              className="hb-catalog-fab"
              data-pending={Boolean(pendingCatalogId)}
              onClick={() => setCatalogOpen(true)}
              aria-label="打开家具目录"
            >
              <Package className="size-4" strokeWidth={2} />
              家具目录
              {pendingCatalogId ? <span className="hb-catalog-fab-badge">待放置</span> : null}
            </button>
            <button
              type="button"
              className="hb-oc-pick-fab-dock"
              onClick={startOcPick}
              aria-label="拎起同住 OC"
            >
              <Hand className="size-4" strokeWidth={2} />
              拎起 OC
            </button>
          </div>
        </div>
      ) : null}

      {catalogOpen ? (
        <div
          className="hb-catalog-sheet pointer-events-auto absolute inset-x-0 bottom-0 z-40 max-h-[56%] overflow-hidden"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="hb-catalog-sheet-handle" />
          <div className="flex items-center justify-between px-4 pt-2.5">
            <div>
              <p className="text-[13px] font-semibold text-neutral-900">放置目录</p>
              <p className="text-[10px] text-neutral-400">选择后点击地面摆放</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-black/5 p-2 text-neutral-500 hover:bg-black/10"
              onClick={() => setCatalogOpen(false)}
              aria-label="关闭目录"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto px-4">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-medium"
                style={{
                  background: tab === t ? 'rgba(44,111,173,0.14)' : 'rgba(0,0,0,0.04)',
                  color: tab === t ? '#2c6fad' : 'rgba(26,26,30,0.55)',
                }}
                onClick={() => setTab(t)}
              >
                {CATALOG_TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-1 overflow-x-auto px-4 pb-0.5">
            <button
              type="button"
              className="shrink-0 rounded-lg px-2.5 py-1 text-[10px]"
              style={{
                background: category === 'all' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.03)',
                color: category === 'all' ? '#1a1a1e' : 'rgba(26,26,30,0.45)',
              }}
              onClick={() => setCategory('all')}
            >
              全部 · {catalogByTab(items, tab).length}
            </button>
            {subCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className="shrink-0 rounded-lg px-2.5 py-1 text-[10px]"
                style={{
                  background: category === cat ? 'rgba(44,111,173,0.14)' : 'rgba(0,0,0,0.03)',
                  color: category === cat ? '#2c6fad' : 'rgba(26,26,30,0.45)',
                }}
                onClick={() => setCategory(cat)}
              >
                {catalogCategoryLabel(cat)} · {countsByCategory.get(cat) ?? 0}
              </button>
            ))}
          </div>

          <div className="mt-2.5 max-h-[32vh] overflow-y-auto px-4 pb-2">
            {loading ? (
              <p className="py-6 text-center text-[11px] text-neutral-400">加载目录…</p>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-neutral-400">该分类暂无模型</p>
            ) : (
              <div className="hb-catalog-grid">
                {filtered.map((item) => {
                  const active = pendingCatalogId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="hb-catalog-item"
                      onClick={() => setPendingCatalog(active ? null : item.id)}
                    >
                      <CatalogModelThumb
                        modelPath={item.modelPath}
                        previewColor={item.previewColor}
                        active={active}
                      />
                      <span className="truncate text-[10px] text-neutral-700">{item.name}</span>
                      <span className="truncate text-[9px] text-neutral-400">
                        {catalogCategoryLabel(item.category)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
