import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ADDABLE_WIDGET_KINDS,
  MULTI_INSTANCE_WIDGET_KINDS,
  WIDGET_META,
  createDefaultGalleryState,
  defaultConfigForKind,
  loadGalleryState,
  saveGalleryState,
} from './storage'
import {
  findFirstFreeOrigin,
  applyPlacementWithYield,
  evacuateReservedProfileCells,
  resolveGridOrigin,
  type ProfileAnchor,
} from './galleryGrid'
import type {
  GalleryWidgetKind,
  GalleryWidgetPlacement,
  GalleryWidgetSize,
  WidgetGalleryState,
} from './types'

type WidgetGalleryContextValue = {
  state: WidgetGalleryState
  enabledOnPage: (page: number) => GalleryWidgetPlacement[]
  reorderPage: (page: number, orderedIds: string[]) => void
  /** 网格占位：更新组件左上角格点（会挤占/避让） */
  setPlacementOrigin: (id: string, col: number, row: number) => void
  /** 跨页移动并落格（被挤组件自动让位） */
  movePlacementToPage: (
    id: string,
    page: number,
    col?: number,
    row?: number,
  ) => void
  /** 交换两个组件的网格原点 */
  swapPlacementOrigins: (aId: string, bId: string) => void
  setPlacementEnabled: (id: string, enabled: boolean) => void
  setPlacementSize: (id: string, size: GalleryWidgetSize) => void
  setPlacementCharacter: (id: string, characterId: string | undefined) => void
  /** 将组件加到桌面第二页；返回是否成功新增/启用 */
  addWidget: (kind: GalleryWidgetKind, page?: number) => boolean
  /** 从桌面移除（禁用） */
  removeWidget: (id: string) => void
  /** 尚未出现在桌面上、可供添加的 kind 列表 */
  availableToAdd: GalleryWidgetKind[]
  resetToDefault: () => void
  /** 名片挪位后按新预留格挤开组件，返回挤让后的 placements */
  reflowProfileReserve: (anchor: ProfileAnchor) => GalleryWidgetPlacement[]
  patchConfig: (id: string, patch: Record<string, unknown>) => void
  /**
   * 原子更新 placement（角色 + config 等一次写入，避免连续 patch 互相覆盖）。
   * `config` 与已有 config 浅合并。
   */
  patchPlacement: (
    id: string,
    patch: {
      characterId?: string | undefined
      clearCharacter?: boolean
      config?: Record<string, unknown>
    },
  ) => void
  kindsEnabled: Record<GalleryWidgetKind, boolean>
}

const WidgetGalleryContext = createContext<WidgetGalleryContextValue | null>(null)

function normalizeOrders(placements: GalleryWidgetPlacement[]): GalleryWidgetPlacement[] {
  const byPage = new Map<number, GalleryWidgetPlacement[]>()
  for (const p of placements) {
    const list = byPage.get(p.page) ?? []
    list.push(p)
    byPage.set(p.page, list)
  }
  const next: GalleryWidgetPlacement[] = []
  for (const [, list] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
    list
      .sort((a, b) => a.order - b.order)
      .forEach((p, i) => next.push({ ...p, order: i }))
  }
  return next
}

export function WidgetGalleryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WidgetGalleryState>(() => {
    const loaded = loadGalleryState()
    const placements = evacuateReservedProfileCells(loaded.placements)
    const next = { ...loaded, placements: normalizeOrders(placements) }
    if (
      placements.some((p, i) => {
        const a = loaded.placements[i]
        return !a || a.col !== p.col || a.row !== p.row || a.page !== p.page
      }) ||
      placements.length !== loaded.placements.length
    ) {
      saveGalleryState(next)
    }
    return next
  })
  const stateRef = useRef(state)
  stateRef.current = state

  const persist = useCallback((next: WidgetGalleryState) => {
    const evacuated = evacuateReservedProfileCells(next.placements)
    const normalized = { ...next, placements: normalizeOrders(evacuated) }
    stateRef.current = normalized
    setState(normalized)
    saveGalleryState(normalized)
  }, [])

  const persistWith = useCallback(
    (recipe: (prev: WidgetGalleryState) => WidgetGalleryState) => {
      persist(recipe(stateRef.current))
    },
    [persist],
  )

  const enabledOnPage = useCallback(
    (page: number) =>
      state.placements
        .filter((p) => p.enabled && p.page === page)
        .sort((a, b) => a.order - b.order),
    [state.placements],
  )

  const reorderPage = useCallback(
    (page: number, orderedIds: string[]) => {
      persist({
        ...state,
        placements: state.placements.map((p) => {
          if (p.page !== page) return p
          const idx = orderedIds.indexOf(p.id)
          if (idx < 0) return p
          return { ...p, order: idx }
        }),
      })
    },
    [persist, state],
  )

  const setPlacementOrigin = useCallback(
    (id: string, col: number, row: number) => {
      const self = state.placements.find((p) => p.id === id)
      if (!self) return
      persist({
        ...state,
        placements: applyPlacementWithYield(
          state.placements,
          id,
          self.page,
          { col, row },
        ),
      })
    },
    [persist, state],
  )

  const movePlacementToPage = useCallback(
    (id: string, page: number, col?: number, row?: number) => {
      const self = state.placements.find((p) => p.id === id)
      if (!self) return
      const origin =
        typeof col === 'number' && typeof row === 'number'
          ? { col, row }
          : resolveGridOrigin(self)
      persist({
        ...state,
        placements: applyPlacementWithYield(state.placements, id, page, origin),
      })
    },
    [persist, state],
  )

  const swapPlacementOrigins = useCallback(
    (aId: string, bId: string) => {
      const a = state.placements.find((p) => p.id === aId)
      const b = state.placements.find((p) => p.id === bId)
      if (!a || !b) return
      const ao = resolveGridOrigin(a)
      const bo = resolveGridOrigin(b)
      persist({
        ...state,
        placements: state.placements.map((p) => {
          if (p.id === aId) {
            return { ...p, col: bo.col, row: bo.row, x: undefined, y: undefined }
          }
          if (p.id === bId) {
            return { ...p, col: ao.col, row: ao.row, x: undefined, y: undefined }
          }
          return p
        }),
      })
    },
    [persist, state],
  )

  const setPlacementEnabled = useCallback(
    (id: string, enabled: boolean) => {
      persist({
        ...state,
        placements: state.placements.map((p) => (p.id === id ? { ...p, enabled } : p)),
      })
    },
    [persist, state],
  )

  const setPlacementSize = useCallback(
    (id: string, _size: GalleryWidgetSize) => {
      persist({
        ...state,
        placements: state.placements.map((p) => {
          if (p.id !== id) return p
          // 复古相机固定 4×2，其余固定 2×2
          const size =
            p.kind === 'retroCamera' ||
            p.kind === 'polaroidTriple' ||
            p.kind === 'anniversary' ||
            p.kind === 'musicNowPlaying' ||
            p.kind === 'musicVinylDeck'
              ? '4x2'
              : '2x2'
          return { ...p, size }
        }),
      })
    },
    [persist, state],
  )

  const setPlacementCharacter = useCallback(
    (id: string, characterId: string | undefined) => {
      persist({
        ...state,
        placements: state.placements.map((p) =>
          p.id === id ? { ...p, characterId } : p,
        ),
      })
    },
    [persist, state],
  )

  const patchConfig = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      persistWith((prev) => ({
        ...prev,
        placements: prev.placements.map((p) =>
          p.id === id
            ? { ...p, config: { ...(p.config ?? {}), ...patch } }
            : p,
        ),
      }))
    },
    [persistWith],
  )

  const patchPlacement = useCallback(
    (
      id: string,
      patch: {
        characterId?: string | undefined
        clearCharacter?: boolean
        config?: Record<string, unknown>
      },
    ) => {
      persistWith((prev) => ({
        ...prev,
        placements: prev.placements.map((p) => {
          if (p.id !== id) return p
          const next: GalleryWidgetPlacement = { ...p }
          if (patch.clearCharacter) next.characterId = undefined
          else if (patch.characterId !== undefined) next.characterId = patch.characterId
          if (patch.config) {
            next.config = { ...(p.config ?? {}), ...patch.config }
          }
          return next
        }),
      }))
    },
    [persistWith],
  )

  const kindsEnabled = useMemo(() => {
    const map = {} as Record<GalleryWidgetKind, boolean>
    for (const p of state.placements) {
      if (p.enabled) map[p.kind] = true
    }
    return map
  }, [state.placements])

  const availableToAdd = useMemo(
    () =>
      ADDABLE_WIDGET_KINDS.filter((kind) => {
        if (MULTI_INSTANCE_WIDGET_KINDS.includes(kind)) return true
        return !kindsEnabled[kind]
      }),
    [kindsEnabled],
  )

  const addWidget = useCallback(
    (kind: GalleryWidgetKind, page = 0) => {
      const multi = MULTI_INSTANCE_WIDGET_KINDS.includes(kind)
      if (!multi && kindsEnabled[kind]) return false

      // 单例：优先启用已有禁用实例
      if (!multi) {
        const existing = state.placements.find((p) => p.kind === kind)
        if (existing) {
          const pageItems = state.placements.filter((p) => p.enabled && p.page === page)
          const size = existing.size || WIDGET_META[kind].defaultSize
          const origin =
            findFirstFreeOrigin(
              state.placements.filter((p) => p.page === page && p.enabled),
              size,
              existing.id,
              page,
            ) ?? { col: 0, row: 0 }
          persist({
            ...state,
            placements: state.placements.map((p) =>
              p.id === existing.id
                ? {
                    ...p,
                    enabled: true,
                    page,
                    order: pageItems.length,
                    size,
                    col: origin.col,
                    row: origin.row,
                    x: undefined,
                    y: undefined,
                  }
                : p,
            ),
          })
          return true
        }
      }

      // 多例：若有未启用的同 kind 空槽，优先启用一枚；否则新建
      if (multi) {
        const dormant = state.placements.find((p) => p.kind === kind && !p.enabled)
        if (dormant) {
          const pageItems = state.placements.filter((p) => p.enabled && p.page === page)
          const size = dormant.size || WIDGET_META[kind].defaultSize
          const origin =
            findFirstFreeOrigin(
              state.placements.filter((p) => p.page === page && p.enabled),
              size,
              dormant.id,
              page,
            ) ?? { col: 0, row: 0 }
          persist({
            ...state,
            placements: state.placements.map((p) =>
              p.id === dormant.id
                ? {
                    ...p,
                    enabled: true,
                    page,
                    order: pageItems.length,
                    size,
                    col: origin.col,
                    row: origin.row,
                    characterId: undefined,
                    config: defaultConfigForKind(kind),
                    x: undefined,
                    y: undefined,
                  }
                : p,
            ),
          })
          return true
        }
      }

      const pageItems = state.placements.filter((p) => p.enabled && p.page === page)
      const size = WIDGET_META[kind].defaultSize
      const order = pageItems.length
      const origin =
        findFirstFreeOrigin(
          state.placements.filter((p) => p.page === page),
          size,
          undefined,
          page,
        ) ?? { col: 0, row: 0 }
      const next: GalleryWidgetPlacement = {
        id: `wg-${kind}-${Date.now().toString(36)}`,
        kind,
        size,
        page,
        order,
        col: origin.col,
        row: origin.row,
        enabled: true,
        config: defaultConfigForKind(kind),
      }
      persist({ ...state, placements: [...state.placements, next] })
      return true
    },
    [kindsEnabled, persist, state],
  )

  const removeWidget = useCallback(
    (id: string) => {
      persist({
        ...state,
        placements: state.placements.map((p) =>
          p.id === id ? { ...p, enabled: false } : p,
        ),
      })
    },
    [persist, state],
  )

  const resetToDefault = useCallback(() => {
    persist(createDefaultGalleryState())
  }, [persist])

  const reflowProfileReserve = useCallback(
    (anchor: ProfileAnchor) => {
      const evacuated = normalizeOrders(
        evacuateReservedProfileCells(state.placements, anchor),
      )
      const next = { ...state, placements: evacuated }
      setState(next)
      saveGalleryState(next)
      return evacuated
    },
    [state],
  )

  const value = useMemo(
    () => ({
      state,
      enabledOnPage,
      reorderPage,
      setPlacementOrigin,
      movePlacementToPage,
      swapPlacementOrigins,
      setPlacementEnabled,
      setPlacementSize,
      setPlacementCharacter,
      addWidget,
      removeWidget,
      availableToAdd,
      resetToDefault,
      reflowProfileReserve,
      patchConfig,
      patchPlacement,
      kindsEnabled,
    }),
    [
      state,
      enabledOnPage,
      reorderPage,
      setPlacementOrigin,
      movePlacementToPage,
      swapPlacementOrigins,
      setPlacementEnabled,
      setPlacementSize,
      setPlacementCharacter,
      addWidget,
      removeWidget,
      availableToAdd,
      resetToDefault,
      reflowProfileReserve,
      patchConfig,
      patchPlacement,
      kindsEnabled,
    ],
  )

  return (
    <WidgetGalleryContext.Provider value={value}>{children}</WidgetGalleryContext.Provider>
  )
}

export function useWidgetGallery(): WidgetGalleryContextValue {
  const ctx = useContext(WidgetGalleryContext)
  if (!ctx) {
    throw new Error('useWidgetGallery must be used within WidgetGalleryProvider')
  }
  return ctx
}
