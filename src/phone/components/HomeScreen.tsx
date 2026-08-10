import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DESKTOP_LAYOUT_SLOT_COUNT, DESKTOP_PAGE2_APP_IDS, type AppSlot } from '../types'
import { personaDb } from '../apps/wechat/newFriendsPersona/idb'
import {
  WECHAT_LUMI_PEER_CHARACTER_ID,
  resolvePrivateWeChatConversationKey,
  wechatConversationKey,
} from '../apps/wechat/wechatConversationKey'
import { DesktopAppTile } from './DesktopAppTile'
import { Dock } from './Dock'
import { HomeAccountCenterPage } from './HomeAccountCenterPage'
import { PersonalCard } from './PersonalCard'
import { StatusBar } from './StatusBar'
import { resolvePublicImageUrl } from '../../publicAssetUrl'
import { useCustomization } from '../CustomizationContext'
import { useLongPress } from '../hooks/useLongPress'
import { HomeWidgetGalleryPage } from '../widgetGallery'
import { WidgetEditAddUi } from '../widgetGallery/WidgetEditAddUi'
import { useWidgetGallery } from '../widgetGallery/WidgetGalleryContext'
import {
  GALLERY_GRID_COLS,
  GALLERY_GRID_GAP,
  GALLERY_GRID_ROWS,
  HOME_PROFILE_SPAN,
  clampProfileAnchor,
  homeProfileHomeCells,
  widgetOccupiedHomeCells,
  type ProfileAnchor,
} from '../widgetGallery/galleryGrid'

type Props = {
  onOpenApp: (id: AppSlot['id']) => void
  /** 打开全屏账号中心（主屏向右滑 / 点账号页） */
  onOpenUserAccount?: () => void
  /** 内嵌态备用；全屏路由时也可同步登录态 */
  onUserAccountAuthChange?: () => void
}

function useWeChatHomeUnreadBadge(): number {
  const { state } = useCustomization()
  const [playerIdentityId, setPlayerIdentityId] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    void personaDb.getCurrentIdentityId().then((id) => setPlayerIdentityId(id?.trim() ? id : '__none__'))
  }, [])

  const refresh = useCallback(() => {
    if (playerIdentityId === null) return
    const pid = playerIdentityId
    const list = state.wechatPersonaContacts ?? []
    void (async () => {
      const keySet = new Set<string>()
      keySet.add(wechatConversationKey(WECHAT_LUMI_PEER_CHARACTER_ID, pid))
      for (const c of list) {
        const ch = await personaDb.getCharacter(c.characterId)
        keySet.add(resolvePrivateWeChatConversationKey(c.characterId, ch, pid))
      }
      const keys = Array.from(keySet)
      const counts = await Promise.all(keys.map((k) => personaDb.countUnreadWeChatCharacterMessages(k)))
      setCount(counts.reduce((a, b) => a + b, 0))
    })()
  }, [state.wechatPersonaContacts, playerIdentityId])

  useEffect(() => {
    refresh()
    const on = () => refresh()
    window.addEventListener('wechat-storage-changed', on)
    return () => window.removeEventListener('wechat-storage-changed', on)
  }, [refresh])

  return count
}

const HOME_WIDGET_LAYOUT_STORAGE_KEY = 'lumi-home-widget-layout-v1'
const RESET_HOME_WIDGET_LAYOUT_EVENT = 'lumi-reset-home-widget-layout'

/** v8：组件页溢出图标可拖拽落位（持久化坐标） */
const FREE_HOME_LAYOUT_VERSION = 8

type OverflowIconPlacement = { id: AppSlot['id']; col: number; row: number }
/** 图标槽格点（1-based，与 CSS grid 行列线一致；每格 1×1） */
type GridPoint = { col: number; row: number }

type GridArea = {
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}

type HomeWidgetLayout = {
  profile: GridArea
  desktopSlots: Array<{ col: number; row: number }>
}

/** 名片在 4×7 上的 4×3 占位（CSS 1-based 线） */
function getProfileGridArea(profileAnchor: ProfileAnchor): GridArea {
  const row0 = clampProfileAnchor(profileAnchor)
  return {
    colStart: 1,
    colEnd: GALLERY_GRID_COLS + 1,
    rowStart: row0 + 1,
    rowEnd: row0 + HOME_PROFILE_SPAN.h + 1,
  }
}

function cellKey(c: GridPoint): string {
  return `${c.col},${c.row}`
}

/**
 * 图标可占格：整页 4×7 去掉名片 4×3。
 * 名片停在中间时，上下两侧都可放图标。
 */
function listAllDesktopCells(profileAnchor: ProfileAnchor): GridPoint[] {
  const reserved = new Set(
    homeProfileHomeCells(profileAnchor).map((c) => `${c.col},${c.row}`),
  )
  const out: GridPoint[] = []
  for (let row = 1; row <= GALLERY_GRID_ROWS; row += 1) {
    for (let col = 1; col <= GALLERY_GRID_COLS; col += 1) {
      if (reserved.has(`${col},${row}`)) continue
      out.push({ col, row })
    }
  }
  return out
}

/**
 * 图标向上顶格：按槽位顺序，依次落到桌面区最靠上的空位。
 * 用于布局版本升级 / 纠正名片下方空洞。
 */
function packIconSlotsUp(
  profileAnchor: ProfileAnchor,
  slots: GridPoint[],
  blockedCells?: Array<{ col: number; row: number }>,
): GridPoint[] {
  const n = DESKTOP_LAYOUT_SLOT_COUNT
  const blocked = new Set((blockedCells ?? []).map((c) => cellKey(c)))
  const freeCells = listAllDesktopCells(profileAnchor)
    .filter((c) => !blocked.has(cellKey(c)))
    .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col))

  const padded = slots.slice(0, n).map((s) => ({ col: s.col, row: s.row }))
  while (padded.length < n) {
    padded.push(freeCells[padded.length] ?? { col: 1, row: 1 })
  }

  return padded.map((_, i) => freeCells[i] ?? padded[i]!)
}

/**
 * 组件占位优先：仅重排「当前在主屏上的」图标；
 * 挤不下的并入溢出区。不会把用户放到下一页的图标自动吸回主屏。
 */
function packIconsAroundWidgets(
  profileAnchor: ProfileAnchor,
  desktopLayout: Array<AppSlot['id'] | null>,
  overflowIds: AppSlot['id'][],
  blockedCells: Array<{ col: number; row: number }>,
  slotOrigins?: GridPoint[],
): {
  slots: GridPoint[]
  desktopLayout: Array<AppSlot['id'] | null>
  overflowIds: AppSlot['id'][]
} {
  const blocked = new Set(blockedCells.map((c) => cellKey(c)))
  const freeCells = listAllDesktopCells(profileAnchor)
    .filter((c) => !blocked.has(cellKey(c)))
    .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col))

  const seen = new Set<string>()
  const desktopIds: AppSlot['id'][] = []
  const prevSlotById = new Map<AppSlot['id'], GridPoint>()
  for (let i = 0; i < desktopLayout.length; i += 1) {
    const id = desktopLayout[i]
    if (!id || seen.has(id)) continue
    seen.add(id)
    desktopIds.push(id)
    const prev = slotOrigins?.[i]
    if (prev && prev.col >= 1 && prev.row >= 1) {
      prevSlotById.set(id, { col: prev.col, row: prev.row })
    }
  }

  const nextLayout: Array<AppSlot['id'] | null> = Array.from(
    { length: DESKTOP_LAYOUT_SLOT_COUNT },
    () => null,
  )
  const nextSlots: GridPoint[] = Array.from(
    { length: DESKTOP_LAYOUT_SLOT_COUNT },
    () => ({ col: -1, row: -1 }),
  )

  const used = new Set<string>()
  const reassign: AppSlot['id'][] = []
  let slotWrite = 0

  for (const id of desktopIds) {
    if (slotWrite >= DESKTOP_LAYOUT_SLOT_COUNT) {
      reassign.push(id)
      continue
    }
    const prev = prevSlotById.get(id)
    if (prev && !blocked.has(cellKey(prev)) && !used.has(cellKey(prev))) {
      nextLayout[slotWrite] = id
      nextSlots[slotWrite] = { col: prev.col, row: prev.row }
      used.add(cellKey(prev))
      slotWrite += 1
    } else {
      reassign.push(id)
    }
  }

  let freeIdx = 0
  const spilled: AppSlot['id'][] = []
  for (const id of reassign) {
    while (freeIdx < freeCells.length && used.has(cellKey(freeCells[freeIdx]!))) {
      freeIdx += 1
    }
    if (freeIdx >= freeCells.length || slotWrite >= DESKTOP_LAYOUT_SLOT_COUNT) {
      spilled.push(id)
      continue
    }
    const cell = freeCells[freeIdx]!
    nextLayout[slotWrite] = id
    nextSlots[slotWrite] = { col: cell.col, row: cell.row }
    used.add(cellKey(cell))
    slotWrite += 1
    freeIdx += 1
  }

  const overflowOut: AppSlot['id'][] = []
  const overflowSeen = new Set<string>()
  for (const id of spilled) {
    if (overflowSeen.has(id)) continue
    overflowSeen.add(id)
    overflowOut.push(id)
  }
  for (const id of overflowIds) {
    if (!id || seen.has(id) || overflowSeen.has(id)) continue
    overflowSeen.add(id)
    overflowOut.push(id)
  }

  return {
    slots: nextSlots,
    desktopLayout: nextLayout,
    overflowIds: overflowOut,
  }
}

/** 下一页（无名片）整页 4×7 空格，给溢出图标落位，不压缩组件网格高度 */
function listAllPageCells(): GridPoint[] {
  const out: GridPoint[] = []
  for (let row = 1; row <= GALLERY_GRID_ROWS; row += 1) {
    for (let col = 1; col <= GALLERY_GRID_COLS; col += 1) {
      out.push({ col, row })
    }
  }
  return out
}

/** 保留已有落点；冲突 / 新图标填剩余空格 */
function reconcileOverflowPlacements(
  overflowIds: AppSlot['id'][],
  prev: OverflowIconPlacement[],
  blockedCells: Array<{ col: number; row: number }>,
): OverflowIconPlacement[] {
  const blocked = new Set(blockedCells.map((c) => cellKey(c)))
  const free = listAllPageCells()
    .filter((c) => !blocked.has(cellKey(c)))
    .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col))
  const prevById = new Map(prev.map((p) => [p.id, p] as const))
  const used = new Set<string>()
  const out: OverflowIconPlacement[] = []
  const pending: AppSlot['id'][] = []

  for (const id of overflowIds) {
    const old = prevById.get(id)
    if (
      old &&
      old.col >= 1 &&
      old.row >= 1 &&
      !blocked.has(cellKey(old)) &&
      !used.has(cellKey(old))
    ) {
      out.push({ id, col: old.col, row: old.row })
      used.add(cellKey(old))
    } else {
      pending.push(id)
    }
  }

  let freeIdx = 0
  for (const id of pending) {
    while (freeIdx < free.length && used.has(cellKey(free[freeIdx]!))) freeIdx += 1
    if (freeIdx >= free.length) break
    const cell = free[freeIdx]!
    out.push({ id, col: cell.col, row: cell.row })
    used.add(cellKey(cell))
    freeIdx += 1
  }
  return out
}

type IconLayoutSnapshot = {
  dockIds: AppSlot['id'][]
  desktopLayout: Array<AppSlot['id'] | null>
  slots: GridPoint[]
  overflowPlacements: OverflowIconPlacement[]
}

type VacatedSlot =
  | { zone: 'dock'; index: number }
  | { zone: 'desktop'; index: number; col: number; row: number }
  | { zone: 'overflow'; col: number; row: number }

function cloneIconLayout(base: IconLayoutSnapshot): IconLayoutSnapshot {
  return {
    dockIds: [...base.dockIds],
    desktopLayout: [...base.desktopLayout],
    slots: base.slots.map((s) => ({ col: s.col, row: s.row })),
    overflowPlacements: base.overflowPlacements.map((p) => ({ ...p })),
  }
}

/** 从布局中移除某 app，并记录原空位（用于对被挤走的图标回填） */
function extractAppFromLayout(
  layout: IconLayoutSnapshot,
  activeId: AppSlot['id'],
  source: DragSource,
): VacatedSlot | null {
  let vacated: VacatedSlot | null = null

  if (source.zone === 'dock') {
    vacated = { zone: 'dock', index: source.index }
    if (layout.dockIds[source.index] === activeId) {
      layout.dockIds[source.index] = '__empty__' as AppSlot['id']
    }
  } else if (source.zone === 'desktop') {
    const slot = layout.slots[source.index] ?? { col: 1, row: 1 }
    vacated = { zone: 'desktop', index: source.index, col: slot.col, row: slot.row }
    if (layout.desktopLayout[source.index] === activeId) {
      layout.desktopLayout[source.index] = null
    }
  } else {
    const cur = layout.overflowPlacements[source.index]
    if (cur) {
      vacated = { zone: 'overflow', col: cur.col, row: cur.row }
    }
  }

  for (let i = 0; i < layout.dockIds.length; i += 1) {
    if (layout.dockIds[i] === activeId) {
      layout.dockIds[i] = '__empty__' as AppSlot['id']
    }
  }
  for (let i = 0; i < layout.desktopLayout.length; i += 1) {
    if (layout.desktopLayout[i] === activeId) layout.desktopLayout[i] = null
  }
  layout.overflowPlacements = layout.overflowPlacements.filter((p) => p.id !== activeId)

  return vacated
}

function placeDisplacedApp(
  layout: IconLayoutSnapshot,
  displacedId: AppSlot['id'],
  vacated: VacatedSlot | null,
) {
  if (vacated?.zone === 'dock') {
    layout.dockIds[vacated.index] = displacedId
    return
  }
  if (vacated?.zone === 'desktop') {
    layout.desktopLayout[vacated.index] = displacedId
    layout.slots[vacated.index] = { col: vacated.col, row: vacated.row }
    return
  }
  if (vacated?.zone === 'overflow') {
    layout.overflowPlacements.push({
      id: displacedId,
      col: vacated.col,
      row: vacated.row,
    })
    return
  }
  // 无处可回：塞进溢出区第一个空位
  const used = new Set(layout.overflowPlacements.map((p) => cellKey(p)))
  for (const cell of listAllPageCells()) {
    if (used.has(cellKey(cell))) continue
    layout.overflowPlacements.push({ id: displacedId, col: cell.col, row: cell.row })
    return
  }
}

/**
 * 统一落点预览：支持主屏 / Dock / 组件页溢出区之间互拖。
 * 每次都从拖拽起点快照计算，避免跨页预览漂移。
 */
function previewIconDrop(
  base: IconLayoutSnapshot,
  activeId: AppSlot['id'],
  source: DragSource,
  target: DropTarget,
): IconLayoutSnapshot {
  const layout = cloneIconLayout(base)
  const vacated = extractAppFromLayout(layout, activeId, source)

  if (target.zone === 'dock') {
    const displaced = layout.dockIds[target.index]
    layout.dockIds[target.index] = activeId
    if (
      displaced &&
      displaced !== activeId &&
      displaced !== ('__empty__' as AppSlot['id'])
    ) {
      placeDisplacedApp(layout, displaced, vacated)
    }
  } else if (target.zone === 'desktop') {
    const hit = findSlotIndexAtCell(layout.slots, layout.desktopLayout, target)
    if (hit >= 0) {
      const displaced = layout.desktopLayout[hit]
      layout.desktopLayout[hit] = activeId
      if (displaced && displaced !== activeId) {
        placeDisplacedApp(layout, displaced, vacated)
      }
    } else {
      let slotIndex =
        vacated?.zone === 'desktop'
          ? vacated.index
          : layout.desktopLayout.findIndex((slot) => slot === null)
      if (slotIndex < 0) {
        // 主屏槽满：挤出一个到 vacated / 溢出
        for (let i = layout.desktopLayout.length - 1; i >= 0; i -= 1) {
          if (layout.desktopLayout[i]) {
            slotIndex = i
            break
          }
        }
        if (slotIndex >= 0) {
          const kicked = layout.desktopLayout[slotIndex]!
          layout.desktopLayout[slotIndex] = null
          placeDisplacedApp(layout, kicked, vacated)
        } else {
          slotIndex = 0
          while (layout.desktopLayout.length <= slotIndex) {
            layout.desktopLayout.push(null)
            layout.slots.push({ col: -1, row: -1 })
          }
        }
      }
      while (layout.slots.length <= slotIndex) {
        layout.slots.push({ col: -1, row: -1 })
      }
      while (layout.desktopLayout.length <= slotIndex) {
        layout.desktopLayout.push(null)
      }
      layout.desktopLayout[slotIndex] = activeId
      layout.slots[slotIndex] = { col: target.col, row: target.row }
    }
  } else {
    const hit = layout.overflowPlacements.findIndex(
      (p) => p.col === target.col && p.row === target.row,
    )
    if (hit >= 0) {
      const displaced = layout.overflowPlacements[hit]!
      layout.overflowPlacements[hit] = {
        id: activeId,
        col: target.col,
        row: target.row,
      }
      if (displaced.id !== activeId) {
        placeDisplacedApp(layout, displaced.id, vacated)
      }
    } else {
      layout.overflowPlacements.push({
        id: activeId,
        col: target.col,
        row: target.row,
      })
    }
  }

  return {
    dockIds: layout.dockIds.filter((id) => id !== ('__empty__' as AppSlot['id'])),
    desktopLayout: layout.desktopLayout,
    slots: layout.slots,
    overflowPlacements: layout.overflowPlacements,
  }
}

type IconCellPos = { zone: 'desktop' | 'overflow'; col: number; row: number; index: number }

function findIconCellPos(
  layout: IconLayoutSnapshot,
  id: AppSlot['id'],
): IconCellPos | null {
  for (let i = 0; i < layout.desktopLayout.length; i += 1) {
    if (layout.desktopLayout[i] !== id) continue
    const s = layout.slots[i]
    if (!s || s.col < 1 || s.row < 1) continue
    return { zone: 'desktop', col: s.col, row: s.row, index: i }
  }
  for (let i = 0; i < layout.overflowPlacements.length; i += 1) {
    const p = layout.overflowPlacements[i]!
    if (p.id !== id) continue
    return { zone: 'overflow', col: p.col, row: p.row, index: i }
  }
  return null
}

function removeIconById(layout: IconLayoutSnapshot, id: AppSlot['id']) {
  for (let i = 0; i < layout.dockIds.length; i += 1) {
    if (layout.dockIds[i] === id) layout.dockIds[i] = '__empty__' as AppSlot['id']
  }
  for (let i = 0; i < layout.desktopLayout.length; i += 1) {
    if (layout.desktopLayout[i] === id) layout.desktopLayout[i] = null
  }
  layout.overflowPlacements = layout.overflowPlacements.filter((p) => p.id !== id)
}

function nearestFreeCell(
  desired: GridPoint,
  freeCells: GridPoint[],
  used: Set<string>,
): GridPoint | null {
  const candidates = freeCells.filter((c) => !used.has(cellKey(c)))
  if (!candidates.length) return null
  candidates.sort((a, b) => {
    const da = Math.abs(a.col - desired.col) + Math.abs(a.row - desired.row)
    const db = Math.abs(b.col - desired.col) + Math.abs(b.row - desired.row)
    if (da !== db) return da - db
    if (a.row !== b.row) return a.row - b.row
    return a.col - b.col
  })
  return candidates[0] ?? null
}

function claimDesktopSlotIndex(layout: IconLayoutSnapshot, preferIndex?: number): number {
  if (
    typeof preferIndex === 'number' &&
    preferIndex >= 0 &&
    preferIndex < layout.desktopLayout.length &&
    layout.desktopLayout[preferIndex] === null
  ) {
    return preferIndex
  }
  let idx = layout.desktopLayout.findIndex((slot) => slot === null)
  if (idx >= 0) return idx
  if (layout.desktopLayout.length < DESKTOP_LAYOUT_SLOT_COUNT) {
    idx = layout.desktopLayout.length
    layout.desktopLayout.push(null)
    layout.slots.push({ col: -1, row: -1 })
    return idx
  }
  // 挤出最后一个有图标的槽到溢出
  for (let i = layout.desktopLayout.length - 1; i >= 0; i -= 1) {
    const kicked = layout.desktopLayout[i]
    if (!kicked) continue
    layout.desktopLayout[i] = null
    const used = new Set(layout.overflowPlacements.map((p) => cellKey(p)))
    for (const cell of listAllPageCells()) {
      if (used.has(cellKey(cell))) continue
      layout.overflowPlacements.push({ id: kicked, col: cell.col, row: cell.row })
      break
    }
    return i
  }
  return 0
}

/**
 * 多选成组落点：以主图标落点为锚，companions 按相对偏移平移；
 * 冲突 / 出界 / 组件占用则就近空格。Dock 落点仍走单图标逻辑。
 */
function previewMultiIconDrop(
  base: IconLayoutSnapshot,
  primaryId: AppSlot['id'],
  primarySource: DragSource,
  companionIds: AppSlot['id'][],
  target: DropTarget,
  profileAnchor: ProfileAnchor,
  blockedDesktop: Array<{ col: number; row: number }>,
  blockedOverflow: Array<{ col: number; row: number }>,
): IconLayoutSnapshot {
  if (!companionIds.length || target.zone === 'dock') {
    return previewIconDrop(base, primaryId, primarySource, target)
  }

  const layout = cloneIconLayout(base)
  const groupIds = [primaryId, ...companionIds.filter((id) => id !== primaryId)]
  const origins = new Map<AppSlot['id'], IconCellPos>()
  for (const id of groupIds) {
    const pos = findIconCellPos(layout, id)
    if (pos) origins.set(id, pos)
  }
  const primaryOrig = origins.get(primaryId)
  if (!primaryOrig) {
    return previewIconDrop(base, primaryId, primarySource, target)
  }

  for (const id of groupIds) removeIconById(layout, id)

  const targetZone = target.zone
  const anchor = { col: target.col, row: target.row }
  const blockedSet = new Set(
    (targetZone === 'desktop' ? blockedDesktop : blockedOverflow).map((c) => cellKey(c)),
  )
  const freeCells =
    targetZone === 'desktop'
      ? listAllDesktopCells(profileAnchor).filter((c) => !blockedSet.has(cellKey(c)))
      : listAllPageCells().filter((c) => !blockedSet.has(cellKey(c)))

  const used = new Set<string>()
  // 保留场上非本组图标占用
  for (let i = 0; i < layout.desktopLayout.length; i += 1) {
    const id = layout.desktopLayout[i]
    const s = layout.slots[i]
    if (!id || !s || s.col < 1 || s.row < 1) continue
    if (targetZone === 'desktop') used.add(cellKey(s))
  }
  for (const p of layout.overflowPlacements) {
    if (targetZone === 'overflow') used.add(cellKey(p))
  }
  for (const c of blockedSet) used.add(c)

  const assigned: Array<{ id: AppSlot['id']; col: number; row: number; preferSlot?: number }> =
    []

  for (const id of groupIds) {
    const orig = origins.get(id)
    const desired =
      id === primaryId || !orig
        ? { ...anchor }
        : {
            col: anchor.col + (orig.col - primaryOrig.col),
            row: anchor.row + (orig.row - primaryOrig.row),
          }
    let cell: GridPoint | null = null
    const desiredKey = cellKey(desired)
    const onFree = freeCells.some((c) => c.col === desired.col && c.row === desired.row)
    if (onFree && !used.has(desiredKey)) {
      cell = desired
    } else {
      cell = nearestFreeCell(desired, freeCells, used)
    }
    if (!cell) continue
    used.add(cellKey(cell))
    assigned.push({
      id,
      col: cell.col,
      row: cell.row,
      preferSlot: orig?.zone === 'desktop' ? orig.index : undefined,
    })
  }

  // 目标格上若仍有非本组桌面图标（防御），踢到溢出
  if (targetZone === 'desktop') {
    for (const a of assigned) {
      const hit = findSlotIndexAtCell(layout.slots, layout.desktopLayout, {
        col: a.col,
        row: a.row,
      })
      if (hit < 0) continue
      const displaced = layout.desktopLayout[hit]
      if (!displaced || groupIds.includes(displaced)) continue
      layout.desktopLayout[hit] = null
      const ovUsed = new Set(layout.overflowPlacements.map((p) => cellKey(p)))
      for (const cell of listAllPageCells()) {
        if (ovUsed.has(cellKey(cell)) || blockedOverflow.some((b) => cellKey(b) === cellKey(cell))) {
          continue
        }
        layout.overflowPlacements.push({ id: displaced, col: cell.col, row: cell.row })
        break
      }
    }
    for (const a of assigned) {
      const slotIndex = claimDesktopSlotIndex(layout, a.preferSlot)
      layout.desktopLayout[slotIndex] = a.id
      layout.slots[slotIndex] = { col: a.col, row: a.row }
    }
  } else {
    // 溢出页：踢走同格旧图标
    for (const a of assigned) {
      const hit = layout.overflowPlacements.findIndex(
        (p) => p.col === a.col && p.row === a.row && !groupIds.includes(p.id),
      )
      if (hit >= 0) {
        const displaced = layout.overflowPlacements[hit]!
        layout.overflowPlacements.splice(hit, 1)
        const ovUsed = new Set(layout.overflowPlacements.map((p) => cellKey(p)))
        for (const cell of listAllPageCells()) {
          if (ovUsed.has(cellKey(cell)) || blockedSet.has(cellKey(cell))) continue
          if (cell.col === a.col && cell.row === a.row) continue
          layout.overflowPlacements.push({
            id: displaced.id,
            col: cell.col,
            row: cell.row,
          })
          ovUsed.add(cellKey(cell))
          break
        }
      }
      layout.overflowPlacements.push({ id: a.id, col: a.col, row: a.row })
    }
  }

  return {
    dockIds: layout.dockIds.filter((id) => id !== ('__empty__' as AppSlot['id'])),
    desktopLayout: layout.desktopLayout,
    slots: layout.slots,
    overflowPlacements: layout.overflowPlacements,
  }
}

/**
 * 把「出桌面 / 重复格 / 被组件占用」的图标槽挪到空位；
 * 没有空位时移出网格（col/row = -1），绝不两图标共一格。
 */
function relocateIconSlotsAfterWidgets(
  profileAnchor: ProfileAnchor,
  slots: GridPoint[],
  blockedCells?: Array<{ col: number; row: number }>,
): GridPoint[] {
  const n = DESKTOP_LAYOUT_SLOT_COUNT
  const allCells = listAllDesktopCells(profileAnchor)
  const desktopKeySet = new Set(allCells.map(cellKey))
  const blocked = new Set((blockedCells ?? []).map((c) => cellKey(c)))

  const out = slots.slice(0, n).map((s) => ({ col: s.col, row: s.row }))
  while (out.length < n) {
    out.push({ col: 1, row: 1 })
  }
  const initialPos = out.map((s) => ({ col: s.col, row: s.row }))

  const occ = new Set<string>()
  const needReassign: number[] = []

  for (let i = 0; i < n; i += 1) {
    const s = out[i]!
    const k = cellKey(s)
    const onDesktop =
      s.col >= 1 &&
      s.row >= 1 &&
      desktopKeySet.has(k) &&
      !blocked.has(k)
    const dup = occ.has(k)
    if (onDesktop && !dup) {
      occ.add(k)
    } else {
      needReassign.push(i)
    }
  }

  if (needReassign.length === 0) {
    return out
  }

  needReassign.sort((ia, ib) => {
    const a = initialPos[ia]!
    const b = initialPos[ib]!
    if (a.row !== b.row) return a.row - b.row
    return a.col - b.col
  })

  for (const i of needReassign) {
    const orig = initialPos[i]!
    const candidates = allCells.filter((c) => {
      const k = cellKey(c)
      return !occ.has(k) && !blocked.has(k)
    })
    if (!candidates.length) {
      out[i] = { col: -1, row: -1 }
      continue
    }
    candidates.sort((a, b) => {
      const da = Math.abs(a.col - orig.col) + Math.abs(a.row - orig.row)
      const db = Math.abs(b.col - orig.col) + Math.abs(b.row - orig.row)
      if (da !== db) return da - db
      if (a.row !== b.row) return a.row - b.row
      return a.col - b.col
    })
    const picked = candidates[0]!
    out[i] = picked
    occ.add(cellKey(picked))
  }

  return out
}

/** 默认 8 图标占桌面区最上方空位（紧挨名片外侧） */
function defaultSlotOrigins(profileAnchor: ProfileAnchor): GridPoint[] {
  return packIconSlotsUp(
    profileAnchor,
    Array.from({ length: DESKTOP_LAYOUT_SLOT_COUNT }, () => ({ col: 1, row: 1 })),
  )
}

function padIconSlotOrigins(profileAnchor: ProfileAnchor, slots: GridPoint[] | undefined): GridPoint[] {
  const full = defaultSlotOrigins(profileAnchor)
  if (!Array.isArray(slots) || slots.length === 0) return full
  const out = slots.slice(0, DESKTOP_LAYOUT_SLOT_COUNT).map((s, i) =>
    s && typeof s.col === 'number' && typeof s.row === 'number' ? { col: s.col, row: s.row } : full[i]!,
  )
  while (out.length < DESKTOP_LAYOUT_SLOT_COUNT) {
    out.push(full[out.length]!)
  }
  return out
}

function buildLiveHomeLayout(
  profileAnchor: ProfileAnchor,
  slots: GridPoint[],
): HomeWidgetLayout {
  return {
    profile: getProfileGridArea(profileAnchor),
    desktopSlots: slots.slice(0, DESKTOP_LAYOUT_SLOT_COUNT),
  }
}

function migrateStorageToFreeHome(): {
  profileAnchor: ProfileAnchor
  slots: GridPoint[]
  overflowPlacements: OverflowIconPlacement[]
} {
  try {
    const raw = JSON.parse(window.localStorage.getItem(HOME_WIDGET_LAYOUT_STORAGE_KEY) || '{}') as {
      v?: number
      profileAnchor?: unknown
      music?: GridPoint
      wheel?: GridPoint
      slots?: GridPoint[]
      overflowIconIds?: unknown
      overflowPlacements?: unknown
    }
    const anchor = clampProfileAnchor(raw.profileAnchor)
    const overflowIdsFromIds = Array.isArray(raw.overflowIconIds)
      ? raw.overflowIconIds.filter((id): id is AppSlot['id'] => typeof id === 'string' && !!id)
      : []
    const prevPlacements: OverflowIconPlacement[] = Array.isArray(raw.overflowPlacements)
      ? raw.overflowPlacements
          .map((p) => {
            if (!p || typeof p !== 'object') return null
            const row = p as { id?: unknown; col?: unknown; row?: unknown }
            if (typeof row.id !== 'string' || typeof row.col !== 'number' || typeof row.row !== 'number') {
              return null
            }
            return { id: row.id as AppSlot['id'], col: row.col, row: row.row }
          })
          .filter((p): p is OverflowIconPlacement => !!p)
      : []
    const overflowIds =
      overflowIdsFromIds.length > 0
        ? overflowIdsFromIds
        : prevPlacements.map((p) => p.id)
    const overflowPlacements = reconcileOverflowPlacements(overflowIds, prevPlacements, [])
    let slots: GridPoint[]
    let upgraded = false
    if (Array.isArray(raw.slots)) {
      const padded = padIconSlotOrigins(anchor, raw.slots as GridPoint[])
      if (raw.v === FREE_HOME_LAYOUT_VERSION) {
        slots = relocateIconSlotsAfterWidgets(anchor, padded)
      } else {
        slots = relocateIconSlotsAfterWidgets(anchor, packIconSlotsUp(anchor, padded))
        upgraded = true
      }
    } else {
      slots = relocateIconSlotsAfterWidgets(
        anchor,
        packIconSlotsUp(anchor, defaultSlotOrigins(anchor)),
      )
      upgraded = true
    }
    if (upgraded || raw.v !== FREE_HOME_LAYOUT_VERSION) {
      try {
        window.localStorage.setItem(
          HOME_WIDGET_LAYOUT_STORAGE_KEY,
          JSON.stringify({
            v: FREE_HOME_LAYOUT_VERSION,
            profileAnchor: anchor,
            slots,
            overflowIconIds: overflowPlacements.map((p) => p.id),
            overflowPlacements,
          }),
        )
      } catch {
        /* ignore */
      }
    }
    return { profileAnchor: anchor, slots, overflowPlacements }
  } catch {
    const anchor: ProfileAnchor = 0
    const slots = relocateIconSlotsAfterWidgets(anchor, defaultSlotOrigins(anchor))
    return {
      profileAnchor: anchor,
      slots,
      overflowPlacements: [],
    }
  }
}

const DOCK_COUNT = 4
/** 与组件库同一套：每页 4×7，间隙 10px */
const DESKTOP_GRID_COLUMNS = GALLERY_GRID_COLS
const DESKTOP_GRID_ROWS = GALLERY_GRID_ROWS
const DESKTOP_GRID_GAP_PX = GALLERY_GRID_GAP
const DOCK_GAP_PX = 8
/** 主屏总页：0 账号中心(固定) / 1 主屏 / 2 组件 / 3 工具 */
const HOME_ACCOUNT_PAGE = 0
const HOME_MAIN_PAGE = 1
const HOME_GALLERY_PAGE = 2
const HOME_TOOLS_PAGE = 3
const HOME_PAGE_COUNT = 4

/** 主屏页码 → 组件库 page（账号页无组件） */
function galleryPageFromHome(homePage: number): number {
  return Math.max(0, Math.min(2, homePage - HOME_MAIN_PAGE))
}

/** 拖拽幽灵位置：不落弹簧动画，避免图标跟不上手指 */
const DRAG_GHOST_TRANSITION = {
  left: { duration: 0 },
  top: { duration: 0 },
  width: { duration: 0 },
  height: { duration: 0 },
  opacity: { duration: 0.1 },
  scale: { duration: 0.12 },
} as const

/** 拖起位置：槽位下标（图标数据仍按槽位存） */
type DragSource =
  | { zone: 'desktop'; index: number }
  | { zone: 'dock'; index: number }
  | { zone: 'overflow'; index: number }

/** 落点：桌面 / 组件页溢出区按 4×7 格子，Dock 按槽位 */
type DropTarget =
  | { zone: 'desktop'; col: number; row: number }
  | { zone: 'overflow'; col: number; row: number }
  | { zone: 'dock'; index: number }

/** 指针 → 主屏 1-based 格点（整页 4×7） */
function pointerToHomeCell(
  point: { x: number; y: number },
  gridRect: DOMRect,
): GridPoint | null {
  const localX = point.x - gridRect.left
  const localY = point.y - gridRect.top
  if (localX < 0 || localY < 0 || localX > gridRect.width || localY > gridRect.height) {
    return null
  }
  const colW =
    (gridRect.width - DESKTOP_GRID_GAP_PX * (DESKTOP_GRID_COLUMNS - 1)) /
    DESKTOP_GRID_COLUMNS
  const rowH =
    (gridRect.height - DESKTOP_GRID_GAP_PX * (DESKTOP_GRID_ROWS - 1)) /
    DESKTOP_GRID_ROWS
  if (colW <= 0 || rowH <= 0) return null
  const col = Math.min(
    DESKTOP_GRID_COLUMNS,
    Math.max(1, Math.round(localX / (colW + DESKTOP_GRID_GAP_PX) - 0.5) + 1),
  )
  const row = Math.min(
    DESKTOP_GRID_ROWS,
    Math.max(1, Math.round(localY / (rowH + DESKTOP_GRID_GAP_PX) - 0.5) + 1),
  )
  return { col, row }
}

function isDesktopIconCell(
  cell: GridPoint,
  profileAnchor: ProfileAnchor,
  blocked: Array<{ col: number; row: number }>,
): boolean {
  const desktop = new Set(listAllDesktopCells(profileAnchor).map(cellKey))
  if (!desktop.has(cellKey(cell))) return false
  const blockedSet = new Set(blocked.map((c) => cellKey(c)))
  return !blockedSet.has(cellKey(cell))
}

function findSlotIndexAtCell(
  slots: GridPoint[],
  layout: Array<AppSlot['id'] | null>,
  cell: GridPoint,
  ignoreSlotIndex?: number,
): number {
  for (let i = 0; i < slots.length; i += 1) {
    if (typeof ignoreSlotIndex === 'number' && i === ignoreSlotIndex) continue
    const s = slots[i]
    if (!s || !layout[i]) continue
    if (s.col === cell.col && s.row === cell.row) return i
  }
  return -1
}

type SortableDesktopTileProps = {
  app: AppSlot
  slotIndex: number
  slot: { col: number; row: number }
  compact: boolean
  isEditMode: boolean
  isActiveDrag: boolean
  isLongPressPrimed: boolean
  isSelected?: boolean
  isCompanionGhosted?: boolean
  onOpenApp: (id: AppSlot['id']) => void
  onEnterEditMode: (id: AppSlot['id']) => void
  onToggleSelect?: (id: AppSlot['id']) => void
  registerNode: (id: AppSlot['id'], node: HTMLDivElement | null) => void
  onPointerDragStart: (id: AppSlot['id'], event: React.PointerEvent<HTMLElement>) => void
}

function SortableDesktopTile({
  app,
  slot,
  compact,
  isEditMode,
  isActiveDrag,
  isLongPressPrimed,
  isSelected = false,
  isCompanionGhosted = false,
  onOpenApp,
  onEnterEditMode,
  onToggleSelect,
  registerNode,
  onPointerDragStart,
}: SortableDesktopTileProps) {
  const longPressHandlers = useLongPress({
    delay: 500,
    moveTolerance: 10,
    onLongPress: () => onEnterEditMode(app.id),
  })
  const editGestureRef = useRef<{
    pointerId: number
    x: number
    y: number
    dragged: boolean
  } | null>(null)

  return (
    <motion.div
      ref={(node) => registerNode(app.id, node)}
      layout={false}
      style={{
        gridColumn: `${slot.col} / ${slot.col + 1}`,
        gridRow: `${slot.row} / ${slot.row + 1}`,
        zIndex: isActiveDrag ? 55 : isEditMode ? 30 : 14,
        opacity: isCompanionGhosted ? 0.38 : 1,
      }}
      animate={{ y: 0, rotate: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div className="h-full w-full touch-none">
        <DesktopAppTile
          app={app}
          onOpen={onOpenApp}
          className="h-full w-full"
          compact={compact}
          isEditMode={isEditMode}
          isActiveDrag={isActiveDrag}
          isLongPressPrimed={isLongPressPrimed}
          isGhosted={isActiveDrag}
          isSelected={isSelected}
          pointerHandlers={
            isEditMode
              ? {
                  onPointerDown: (event) => {
                    editGestureRef.current = {
                      pointerId: event.pointerId,
                      x: event.clientX,
                      y: event.clientY,
                      dragged: false,
                    }
                    try {
                      event.currentTarget.setPointerCapture(event.pointerId)
                    } catch {
                      /* ignore */
                    }
                  },
                  onPointerMove: (event) => {
                    const g = editGestureRef.current
                    if (!g || g.pointerId !== event.pointerId || g.dragged) return
                    if (Math.hypot(event.clientX - g.x, event.clientY - g.y) < 10) return
                    g.dragged = true
                    onPointerDragStart(app.id, event)
                  },
                  onPointerUp: (event) => {
                    const g = editGestureRef.current
                    editGestureRef.current = null
                    if (!g || g.pointerId !== event.pointerId) return
                    try {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                    } catch {
                      /* ignore */
                    }
                    if (!g.dragged) onToggleSelect?.(app.id)
                  },
                  onPointerCancel: (event) => {
                    const g = editGestureRef.current
                    editGestureRef.current = null
                    if (g?.pointerId === event.pointerId) {
                      try {
                        event.currentTarget.releasePointerCapture(event.pointerId)
                      } catch {
                        /* ignore */
                      }
                    }
                  },
                }
              : longPressHandlers
          }
        />
      </div>
    </motion.div>
  )
}

type ActiveDragState = {
  id: AppSlot['id']
  source: DragSource
  companionIds: AppSlot['id'][]
  pointerId: number
  width: number
  height: number
  offsetX: number
  offsetY: number
  x: number
  y: number
}

type ActiveWidgetDragState = {
  widget: 'profile'
  pointerId: number
  width: number
  height: number
  offsetX: number
  offsetY: number
  x: number
  y: number
}

function readInitialFreeHomeLayout(): {
  profileAnchor: ProfileAnchor
  slots: GridPoint[]
  overflowPlacements: OverflowIconPlacement[]
} {
  if (typeof window === 'undefined') {
    return {
      profileAnchor: 0,
      slots: defaultSlotOrigins(0),
      overflowPlacements: [],
    }
  }
  return migrateStorageToFreeHome()
}

export function HomeScreen({ onOpenApp, onOpenUserAccount }: Props) {
  const { state, reorderApps, setDesktopLayout } = useCustomization()
  const { state: galleryState, reflowProfileReserve } = useWidgetGallery()
  const { apps, ui, theme } = state
  const wechatUnread = useWeChatHomeUnreadBadge()
  const appMap = new Map(apps.map((app) => [app.id, app] as const))
  const initialFree = readInitialFreeHomeLayout()
  const [profileAnchorState, setProfileAnchorState] = useState<ProfileAnchor>(initialFree.profileAnchor)
  const [slotOriginsState, setSlotOriginsState] = useState<GridPoint[]>(initialFree.slots)
  /** 主屏挤不下的图标，显示在下一页（组件页），可自由拖格 */
  const [overflowPlacements, setOverflowPlacements] = useState<OverflowIconPlacement[]>(
    () => initialFree.overflowPlacements,
  )
  const overflowPlacementsRef = useRef(overflowPlacements)
  overflowPlacementsRef.current = overflowPlacements
  const overflowIconIds = useMemo(
    () => overflowPlacements.map((p) => p.id),
    [overflowPlacements],
  )
  const overflowIconIdsRef = useRef(overflowIconIds)
  overflowIconIdsRef.current = overflowIconIds
  const initialDesktopLayout = useMemo(() => {
    const overflowSet = new Set(initialFree.overflowPlacements.map((p) => p.id))
    return Array.from({ length: DESKTOP_LAYOUT_SLOT_COUNT }, (_, index) => {
      const id = state.desktopLayout[index] ?? null
      if (!id || overflowSet.has(id)) return null
      return id
    })
    // 仅挂载时用；避免每次 render 重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIconIds, setSelectedIconIds] = useState<AppSlot['id'][]>([])
  const selectedIconIdsRef = useRef(selectedIconIds)
  selectedIconIdsRef.current = selectedIconIds
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null)
  const activeDragRef = useRef<ActiveDragState | null>(null)
  activeDragRef.current = activeDrag
  const [activeWidgetDrag, setActiveWidgetDrag] = useState<ActiveWidgetDragState | null>(null)
  const [hoverSlotIndex, setHoverSlotIndex] = useState<number | null>(null)
  /** 落在空白格时的高亮（1-based） */
  const [hoverCell, setHoverCell] = useState<GridPoint | null>(null)
  const [hoverDockIndex, setHoverDockIndex] = useState<number | null>(null)
  const [primedAppId, setPrimedAppId] = useState<AppSlot['id'] | null>(null)
  const [primedStaticWidget, setPrimedStaticWidget] = useState<'profile' | null>(null)
  const [dockIdsState, setDockIdsState] = useState<AppSlot['id'][]>(() => apps.slice(0, DOCK_COUNT).map((app) => app.id))
  const [desktopLayoutState, setDesktopLayoutState] = useState<Array<AppSlot['id'] | null>>(
    () => initialDesktopLayout,
  )
  /** 默认落在主屏（名片页），左侧为固定账号中心 */
  const [homePage, setHomePage] = useState(HOME_MAIN_PAGE)
  const homePageRef = useRef(homePage)
  homePageRef.current = homePage
  const pagerViewportRef = useRef<HTMLDivElement | null>(null)
  /** 落点高亮在哪一页网格 */
  const [hoverDropZone, setHoverDropZone] = useState<'desktop' | 'overflow' | null>(null)
  const [galleryDraggingId, setGalleryDraggingId] = useState<string | null>(null)
  const homePageSwipeRef = useRef<{ x: number; y: number; active: boolean } | null>(null)
  const galleryDraggingIdRef = useRef<string | null>(null)
  galleryDraggingIdRef.current = galleryDraggingId

  /** 主屏组件占用格 → 图标填剩余空格；挤不下的排到下一页 */
  useEffect(() => {
    if (activeDrag || activeWidgetDrag) return
    const blocked = widgetOccupiedHomeCells(galleryState.placements, 0)
    const packed = packIconsAroundWidgets(
      profileAnchorState,
      desktopLayoutRef.current,
      overflowIconIdsRef.current,
      blocked,
      slotOriginsRef.current,
    )
    const blockedGallery = widgetOccupiedHomeCells(galleryState.placements, 1)
    const nextOverflow = reconcileOverflowPlacements(
      packed.overflowIds,
      overflowPlacementsRef.current,
      blockedGallery,
    )
    const slotsSame =
      packed.slots.length === slotOriginsRef.current.length &&
      packed.slots.every(
        (s, i) =>
          s.col === slotOriginsRef.current[i]?.col &&
          s.row === slotOriginsRef.current[i]?.row,
      )
    const layoutSame =
      packed.desktopLayout.length === desktopLayoutRef.current.length &&
      packed.desktopLayout.every((id, i) => id === desktopLayoutRef.current[i])
    const overflowSame =
      nextOverflow.length === overflowPlacementsRef.current.length &&
      nextOverflow.every(
        (p, i) =>
          p.id === overflowPlacementsRef.current[i]?.id &&
          p.col === overflowPlacementsRef.current[i]?.col &&
          p.row === overflowPlacementsRef.current[i]?.row,
      )
    if (slotsSame && layoutSame && overflowSame) return

    setSlotOriginsState(packed.slots)
    slotOriginsRef.current = packed.slots
    setDesktopLayoutState(packed.desktopLayout)
    desktopLayoutRef.current = packed.desktopLayout
    setDesktopLayout(packed.desktopLayout)
    setOverflowPlacements(nextOverflow)
    overflowPlacementsRef.current = nextOverflow
    overflowIconIdsRef.current = nextOverflow.map((p) => p.id)
    try {
      window.localStorage.setItem(
        HOME_WIDGET_LAYOUT_STORAGE_KEY,
        JSON.stringify({
          v: FREE_HOME_LAYOUT_VERSION,
          profileAnchor: profileAnchorState,
          slots: packed.slots,
          overflowIconIds: nextOverflow.map((p) => p.id),
          overflowPlacements: nextOverflow,
        }),
      )
    } catch {
      /* ignore */
    }
  }, [activeDrag, activeWidgetDrag, galleryState.placements, profileAnchorState, setDesktopLayout])

  const blankLongPressTimerRef = useRef<number | null>(null)
  const blankLongPressOriginRef = useRef<{ x: number; y: number } | null>(null)
  const editBlankTapRef = useRef<{ x: number; y: number } | null>(null)
  const dockIdsRef = useRef<AppSlot['id'][]>(apps.slice(0, DOCK_COUNT).map((app) => app.id))
  const desktopLayoutRef = useRef<Array<AppSlot['id'] | null>>(initialDesktopLayout)
  const tileNodeMapRef = useRef(new Map<AppSlot['id'], HTMLDivElement | null>())
  const profileNodeRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const galleryGridRef = useRef<HTMLDivElement | null>(null)
  const dockNavRef = useRef<HTMLElement | null>(null)
  const dragBaseRef = useRef<{
    dockIds: AppSlot['id'][]
    desktopLayout: Array<AppSlot['id'] | null>
    slots: GridPoint[]
    overflowPlacements: OverflowIconPlacement[]
  } | null>(null)
  const slotOriginsRef = useRef<GridPoint[]>(initialFree.slots)
  slotOriginsRef.current = slotOriginsState
  /** 静态组件拖拽开始时的布局快照（名片松手时用，避免与 ref 帧不同步） */
  const staticWidgetDragStartRef = useRef<{
    profileAnchor: ProfileAnchor
    slots: GridPoint[]
  } | null>(null)
  const compactDesktop = !ui.fullScreen || ui.showDeviceFrame
  const hasWallpaper = !!theme.wallpaperUrl?.trim()
  const contentSafeTop = ui.fullScreen && !ui.showStatusBar ? 'env(safe-area-inset-top, 0px)' : '0px'
  const widgetLayout = useMemo(
    () => buildLiveHomeLayout(profileAnchorState, slotOriginsState),
    [profileAnchorState, slotOriginsState],
  )
  const desktopSlots = widgetLayout.desktopSlots
  const widgetBlockedHomeKeys = useMemo(() => {
    return new Set(
      widgetOccupiedHomeCells(galleryState.placements, 0).map((c) => cellKey(c)),
    )
  }, [galleryState.placements])

  /** 组件页：溢出图标落在组件未占用的 4×7 空格，与组件同层网格、不挤占高度 */
  const galleryOverflowIcons = overflowPlacements

  const widgetBlockedGalleryKeys = useMemo(() => {
    return new Set(
      widgetOccupiedHomeCells(galleryState.placements, 1).map((c) => cellKey(c)),
    )
  }, [galleryState.placements])

  const homeLayoutRef = useRef({
    profileAnchor: profileAnchorState,
    slots: slotOriginsState,
  })
  homeLayoutRef.current = {
    profileAnchor: profileAnchorState,
    slots: slotOriginsState,
  }

  useEffect(() => {
    if (activeDrag || activeWidgetDrag) return
    const page2Set = new Set<string>(DESKTOP_PAGE2_APP_IDS)
    const overflowSet = new Set(overflowIconIdsRef.current)
    const nextDock = apps.slice(0, DOCK_COUNT).map((app) => app.id)
    const allowed = new Set(
      apps.slice(DOCK_COUNT).map((app) => app.id).filter((id) => !page2Set.has(id)),
    )
    const raw = desktopLayoutRef.current
    // 注意：槽位里的 null 是「故意空着 / 已溢到下一页」，不能用 ?? 回退到 state 旧值
    const next = Array.from({ length: DESKTOP_LAYOUT_SLOT_COUNT }, (_, index) => {
      const id = index < raw.length ? raw[index] ?? null : state.desktopLayout[index] ?? null
      if (!id || !allowed.has(id) || overflowSet.has(id)) return null
      return id
    })
    for (const app of apps.slice(DOCK_COUNT)) {
      if (page2Set.has(app.id)) continue
      if (overflowSet.has(app.id)) continue
      if (next.includes(app.id)) continue
      const emptyIndex = next.findIndex((slot) => slot === null)
      if (emptyIndex < 0) break
      next[emptyIndex] = app.id
    }
    dockIdsRef.current = nextDock
    desktopLayoutRef.current = next
    setDockIdsState((prev) =>
      prev.length === nextDock.length && prev.every((id, i) => id === nextDock[i])
        ? prev
        : nextDock,
    )
    setDesktopLayoutState((prev) =>
      prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next,
    )
    // 与 customization 对齐，避免卸载重挂载后旧 desktopLayout 把溢出图标吸回主屏
    const stateSame =
      state.desktopLayout.length === next.length &&
      state.desktopLayout.every((id, i) => id === next[i])
    if (!stateSame) setDesktopLayout(next)
  }, [activeDrag, activeWidgetDrag, apps, desktopSlots, state.desktopLayout, overflowIconIds, setDesktopLayout])

  const handleEnterEditMode = useCallback((id: AppSlot['id']) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }
    window.getSelection()?.removeAllRanges()
    setPrimedAppId(id)
    setIsEditMode(true)
    setActiveDrag(null)
    setActiveWidgetDrag(null)
    setHoverSlotIndex(null)
    setHoverCell(null)
    setHoverDockIndex(null)
    window.setTimeout(() => {
      setPrimedAppId((current) => (current === id ? null : current))
    }, 280)
  }, [])

  const enterEditModeFromBlank = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }
    window.getSelection()?.removeAllRanges()
    homePageSwipeRef.current = null
    setIsEditMode(true)
    setActiveDrag(null)
    setActiveWidgetDrag(null)
    setHoverSlotIndex(null)
    setHoverCell(null)
    setHoverDockIndex(null)
  }, [])

  const clearBlankLongPress = useCallback(() => {
    if (blankLongPressTimerRef.current != null) {
      window.clearTimeout(blankLongPressTimerRef.current)
      blankLongPressTimerRef.current = null
    }
    blankLongPressOriginRef.current = null
  }, [])

  const isHomeBlankTarget = useCallback((target: HTMLElement | null) => {
    if (!target) return true
    if (target.closest('[data-home-account-page="true"]')) return false
    if (target.closest('[data-desktop-tile="true"]')) return false
    if (target.closest('[data-desktop-static="true"]')) return false
    if (target.closest('[data-desktop-gallery-widget="true"]')) return false
    if (target.closest('[data-widget-add-ui="true"]')) return false
    if (target.closest('[data-widget-editing="true"]')) return false
    if (target.closest('[data-dock-root="true"]')) return false
    if (target.closest('[data-page-dots="true"]')) return false
    return true
  }, [])

  /**
   * 禁止左右翻页的目标：编辑面板、组件内显式交互控件、图标/名片。
   * 不要整块拦截 data-desktop-gallery-widget，也不要拦普通 button——
   * 否则大面积封面/正文一点就卡住翻页。
   */
  const shouldBlockHomeSwipe = useCallback((target: HTMLElement | null) => {
    if (!target) return false
    if (target.closest('[data-widget-editing="true"]')) return true
    if (target.closest('[data-widget-add-ui="true"]')) return true
    if (target.closest('[data-desktop-tile="true"]')) return true
    if (target.closest('[data-desktop-static="true"]')) return true
    if (target.closest('input, textarea, select, [role="slider"]')) return true
    return false
  }, [])

  const persistFreeHomeLayout = useCallback(
    (next: {
      profileAnchor: ProfileAnchor
      slots: GridPoint[]
      overflowPlacements?: OverflowIconPlacement[]
    }) => {
      const overflowPrev = next.overflowPlacements ?? overflowPlacementsRef.current
      const overflowIds = overflowPrev.map((p) => p.id)
      try {
        window.localStorage.setItem(
          HOME_WIDGET_LAYOUT_STORAGE_KEY,
          JSON.stringify({
            v: FREE_HOME_LAYOUT_VERSION,
            profileAnchor: next.profileAnchor,
            slots: next.slots,
            overflowIconIds: overflowIds,
            overflowPlacements: overflowPrev,
          }),
        )
      } catch {
        /* ignore */
      }
      const placements = reflowProfileReserve(next.profileAnchor)
      const blocked = widgetOccupiedHomeCells(placements, 0)
      const packed = packIconsAroundWidgets(
        next.profileAnchor,
        desktopLayoutRef.current,
        overflowIds,
        blocked,
        next.slots,
      )
      const blockedGallery = widgetOccupiedHomeCells(placements, 1)
      const nextOverflow = reconcileOverflowPlacements(
        packed.overflowIds,
        overflowPrev,
        blockedGallery,
      )
      setProfileAnchorState(next.profileAnchor)
      setSlotOriginsState(packed.slots)
      slotOriginsRef.current = packed.slots
      setDesktopLayoutState(packed.desktopLayout)
      desktopLayoutRef.current = packed.desktopLayout
      setDesktopLayout(packed.desktopLayout)
      setOverflowPlacements(nextOverflow)
      overflowPlacementsRef.current = nextOverflow
      overflowIconIdsRef.current = nextOverflow.map((p) => p.id)
      try {
        window.localStorage.setItem(
          HOME_WIDGET_LAYOUT_STORAGE_KEY,
          JSON.stringify({
            v: FREE_HOME_LAYOUT_VERSION,
            profileAnchor: next.profileAnchor,
            slots: packed.slots,
            overflowIconIds: nextOverflow.map((p) => p.id),
            overflowPlacements: nextOverflow,
          }),
        )
      } catch {
        // ignore storage failures
      }
    },
    [reflowProfileReserve, setDesktopLayout],
  )

  const handleWidgetEdgePageFlip = useCallback((dir: -1 | 1) => {
    const page = homePageRef.current
    const next = page + dir
    // 组件可在主屏 / 组件页 / 工具页之间移动，不进账号页
    if (next < HOME_MAIN_PAGE || next > HOME_TOOLS_PAGE) return false
    homePageRef.current = next
    setHomePage(next)
    return true
  }, [])

  const handleEnterStaticWidgetEditMode = useCallback((widget: 'profile') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }
    setPrimedStaticWidget(widget)
    setIsEditMode(true)
    setActiveDrag(null)
    setActiveWidgetDrag(null)
    setHoverSlotIndex(null)
    setHoverCell(null)
    setHoverDockIndex(null)
    window.setTimeout(() => {
      setPrimedStaticWidget((current) => (current === widget ? null : current))
    }, 280)
  }, [])

  const resetWidgetLayout = useCallback(() => {
    const anchor: ProfileAnchor = 0
    const slots = relocateIconSlotsAfterWidgets(anchor, defaultSlotOrigins(anchor))
    setProfileAnchorState(anchor)
    setSlotOriginsState(slots)
    setOverflowPlacements([])
    overflowPlacementsRef.current = []
    overflowIconIdsRef.current = []
    setSelectedIconIds([])
    selectedIconIdsRef.current = []
    setActiveWidgetDrag(null)
    setPrimedStaticWidget(null)
    try {
      window.localStorage.setItem(
        HOME_WIDGET_LAYOUT_STORAGE_KEY,
        JSON.stringify({
          v: FREE_HOME_LAYOUT_VERSION,
          profileAnchor: anchor,
          slots,
          overflowIconIds: [],
          overflowPlacements: [],
        }),
      )
    } catch {
      // ignore storage failures
    }
  }, [])

  const handleAppOpen = useCallback((id: AppSlot['id']) => {
    if (isEditMode) return
    onOpenApp(id)
  }, [isEditMode, onOpenApp])

  const profileLongPressHandlers = useLongPress({
    delay: 500,
    moveTolerance: 10,
    onLongPress: (event) => {
      handleEnterStaticWidgetEditMode('profile')
      handleStaticWidgetPointerDragStart('profile', event)
    },
  })

  const exitEditMode = useCallback(() => {
    reorderApps([
      ...dockIdsRef.current,
      ...desktopLayoutRef.current.filter((id): id is AppSlot['id'] => !!id),
      ...overflowPlacementsRef.current.map((p) => p.id),
    ])
    setDesktopLayout(desktopLayoutRef.current)
    setIsEditMode(false)
    setSelectedIconIds([])
    selectedIconIdsRef.current = []
    setActiveDrag(null)
    setActiveWidgetDrag(null)
    setHoverSlotIndex(null)
    setHoverCell(null)
    setHoverDockIndex(null)
    setHoverDropZone(null)
    setPrimedAppId(null)
    setPrimedStaticWidget(null)
  }, [reorderApps, setDesktopLayout])

  const toggleIconSelect = useCallback((id: AppSlot['id']) => {
    setSelectedIconIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      selectedIconIdsRef.current = next
      return next
    })
  }, [])

  const clearIconSelection = useCallback(() => {
    selectedIconIdsRef.current = []
    setSelectedIconIds([])
  }, [])

  const registerTileNode = useCallback((id: AppSlot['id'], node: HTMLDivElement | null) => {
    tileNodeMapRef.current.set(id, node)
  }, [])

  const getDockCenter = useCallback((slotIndex: number) => {
    const nav = dockNavRef.current
    if (!nav) return null
    const rect = nav.getBoundingClientRect()
    const colWidth = (rect.width - DOCK_GAP_PX * (DOCK_COUNT - 1)) / DOCK_COUNT
    return {
      x: rect.left + slotIndex * (colWidth + DOCK_GAP_PX) + colWidth / 2,
      y: rect.top + rect.height / 2,
    }
  }, [])

  /** 按拖影顶边对齐到最近一行（0..PROFILE_ROW_MAX） */
  const resolveNearestProfileAnchor = useCallback(
    (ghostTopY: number): ProfileAnchor => {
      const grid = gridRef.current
      if (!grid) return profileAnchorState
      const rect = grid.getBoundingClientRect()
      const rowHeight =
        (rect.height - DESKTOP_GRID_GAP_PX * (DESKTOP_GRID_ROWS - 1)) /
        DESKTOP_GRID_ROWS
      if (rowHeight <= 0) return profileAnchorState
      const localTop = ghostTopY - rect.top
      const rowFloat = localTop / (rowHeight + DESKTOP_GRID_GAP_PX)
      return clampProfileAnchor(Math.round(rowFloat))
    },
    [profileAnchorState],
  )

  /** 解析落点：按当前可见页命中主屏或组件页；Dock 任意页可落 */
  const resolveDropTarget = useCallback(
    (point: { x: number; y: number }, _source: DragSource): DropTarget | null => {
      const nav = dockNavRef.current
      if (nav) {
        const dockRect = nav.getBoundingClientRect()
        const inDockBand =
          point.y >= dockRect.top - 32 &&
          point.y <= dockRect.bottom + 32 &&
          point.x >= dockRect.left - 24 &&
          point.x <= dockRect.right + 24
        if (inDockBand) {
          let nearestIndex = 0
          let nearestDistance = Number.POSITIVE_INFINITY
          for (let i = 0; i < DOCK_COUNT; i += 1) {
            const center = getDockCenter(i)
            if (!center) continue
            const distance = Math.hypot(point.x - center.x, point.y - center.y)
            if (distance < nearestDistance) {
              nearestDistance = distance
              nearestIndex = i
            }
          }
          return { zone: 'dock', index: nearestIndex }
        }
      }

      const page = homePageRef.current

      if (page === HOME_GALLERY_PAGE) {
        const grid = galleryGridRef.current
        if (!grid) return null
        const cell = pointerToHomeCell(point, grid.getBoundingClientRect())
        if (!cell) return null
        if (widgetBlockedGalleryKeys.has(cellKey(cell))) return null
        return { zone: 'overflow', col: cell.col, row: cell.row }
      }

      if (page === HOME_MAIN_PAGE) {
        const grid = gridRef.current
        if (!grid) return null
        const cell = pointerToHomeCell(point, grid.getBoundingClientRect())
        if (!cell) return null
        const blocked = widgetOccupiedHomeCells(galleryState.placements, 0)
        if (!isDesktopIconCell(cell, profileAnchorState, blocked)) return null
        return { zone: 'desktop', col: cell.col, row: cell.row }
      }

      return null
    },
    [galleryState.placements, getDockCenter, profileAnchorState, widgetBlockedGalleryKeys],
  )

  const applyPreview = useCallback((id: AppSlot['id'], source: DragSource, target: DropTarget) => {
    const base = dragBaseRef.current
    if (!base) return
    const companions = activeDragRef.current?.companionIds ?? []

    const next = previewMultiIconDrop(
      base,
      id,
      source,
      companions,
      target,
      profileAnchorState,
      widgetOccupiedHomeCells(galleryState.placements, 0),
      widgetOccupiedHomeCells(galleryState.placements, 1),
    )
    dockIdsRef.current = next.dockIds
    desktopLayoutRef.current = next.desktopLayout
    slotOriginsRef.current = next.slots
    overflowPlacementsRef.current = next.overflowPlacements
    overflowIconIdsRef.current = next.overflowPlacements.map((p) => p.id)

    setDockIdsState(next.dockIds)
    setDesktopLayoutState(next.desktopLayout)
    setSlotOriginsState(next.slots)
    setOverflowPlacements(next.overflowPlacements)

    setHoverDockIndex(target.zone === 'dock' ? target.index : null)
    if (target.zone === 'desktop') {
      const hit = findSlotIndexAtCell(next.slots, next.desktopLayout, target)
      setHoverSlotIndex(hit >= 0 ? hit : null)
      setHoverCell(hit >= 0 ? null : { col: target.col, row: target.row })
      setHoverDropZone('desktop')
    } else if (target.zone === 'overflow') {
      const group = new Set([id, ...companions])
      const occupied = base.overflowPlacements.some(
        (p) => !group.has(p.id) && p.col === target.col && p.row === target.row,
      )
      setHoverSlotIndex(null)
      setHoverCell(occupied ? null : { col: target.col, row: target.row })
      setHoverDropZone('overflow')
    } else {
      setHoverSlotIndex(null)
      setHoverCell(null)
      setHoverDropZone(null)
    }
  }, [galleryState.placements, profileAnchorState])

  const commitIconDragLayout = useCallback(() => {
    const committedDesktop = [...desktopLayoutRef.current]
    const committedSlots = slotOriginsRef.current.map((s) => ({ col: s.col, row: s.row }))
    const committedOverflow = overflowPlacementsRef.current.map((p) => ({ ...p }))
    const committedDock = [...dockIdsRef.current]

    dockIdsRef.current = committedDock
    desktopLayoutRef.current = committedDesktop
    slotOriginsRef.current = committedSlots
    overflowPlacementsRef.current = committedOverflow
    overflowIconIdsRef.current = committedOverflow.map((p) => p.id)

    setDockIdsState(committedDock)
    setDesktopLayoutState(committedDesktop)
    setSlotOriginsState(committedSlots)
    setOverflowPlacements(committedOverflow)
    setDesktopLayout(committedDesktop)
    reorderApps([
      ...committedDock,
      ...committedDesktop.filter((id): id is AppSlot['id'] => !!id),
      ...committedOverflow.map((p) => p.id),
    ])

    try {
      window.localStorage.setItem(
        HOME_WIDGET_LAYOUT_STORAGE_KEY,
        JSON.stringify({
          v: FREE_HOME_LAYOUT_VERSION,
          profileAnchor: profileAnchorState,
          slots: committedSlots,
          overflowIconIds: committedOverflow.map((p) => p.id),
          overflowPlacements: committedOverflow,
        }),
      )
    } catch {
      /* ignore */
    }
  }, [profileAnchorState, reorderApps, setDesktopLayout])

  const handlePointerDragStart = useCallback(
    (id: AppSlot['id'], source: DragSource, event: React.PointerEvent<HTMLElement>) => {
      // Dock 不参与多选成组
      const selected = selectedIconIdsRef.current
      let companionIds: AppSlot['id'][] = []
      if (source.zone !== 'dock' && selected.includes(id)) {
        companionIds = selected.filter((x) => x !== id)
      } else {
        selectedIconIdsRef.current = []
        setSelectedIconIds([])
      }

      const tileNode = tileNodeMapRef.current.get(id)
      if (!tileNode) return
      const rect = tileNode.getBoundingClientRect()
      event.preventDefault()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
      dragBaseRef.current = {
        dockIds: [...dockIdsRef.current],
        desktopLayout: [...desktopLayoutRef.current],
        slots: slotOriginsRef.current.map((s) => ({ col: s.col, row: s.row })),
        overflowPlacements: overflowPlacementsRef.current.map((p) => ({ ...p })),
      }
      setActiveDrag({
        id,
        source,
        companionIds,
        pointerId: event.pointerId,
        width: rect.width,
        height: rect.height,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        x: rect.left,
        y: rect.top,
      })
    },
    [],
  )

  const handleStaticWidgetPointerDragStart = useCallback(
    (widget: 'profile', event: React.PointerEvent<HTMLElement | HTMLButtonElement>) => {
      const node = profileNodeRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      staticWidgetDragStartRef.current = {
        profileAnchor: profileAnchorState,
        slots: slotOriginsState,
      }
      setActiveWidgetDrag({
        widget,
        pointerId: event.pointerId,
        width: rect.width,
        height: rect.height,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        x: rect.left,
        y: rect.top,
      })
    },
    [profileAnchorState, slotOriginsState],
  )

  useEffect(() => {
    if (!activeDrag) return

    const dragPointerId = activeDrag.pointerId
    const dragId = activeDrag.id
    const dragSource = activeDrag.source

    let committedOnce = false
    /** 贴边停留满 0.5 秒再翻页 */
    const EDGE_HOLD_MS = 500
    let edgeSide: 'left' | 'right' | null = null
    let edgeSince = 0

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }

    const flipWhileDragging = (dir: -1 | 1) => {
      const page = homePageRef.current
      const next = page + dir
      // 拖图标跨页：主屏 ↔ 组件页（不进账号页）
      if (dir > 0 && page >= HOME_GALLERY_PAGE) return false
      if (dir < 0 && page <= HOME_MAIN_PAGE) return false
      if (next < HOME_MAIN_PAGE || next > HOME_GALLERY_PAGE) return false
      homePageRef.current = next
      setHomePage(next)
      setHoverCell(null)
      setHoverSlotIndex(null)
      setHoverDropZone(null)
      return true
    }

    const tryFlipWhileDragging = (clientX: number) => {
      const viewport =
        pagerViewportRef.current ??
        (typeof document !== 'undefined'
          ? (document.querySelector(
              '[data-home-pager-viewport="true"]',
            ) as HTMLDivElement | null)
          : null)
      if (!viewport) return
      const rect = viewport.getBoundingClientRect()
      const zone = Math.max(56, rect.width * 0.22)
      const nearLeft = clientX <= rect.left + zone
      const nearRight = clientX >= rect.right - zone
      const side: 'left' | 'right' | null = nearLeft ? 'left' : nearRight ? 'right' : null
      if (side !== edgeSide) {
        edgeSide = side
        edgeSince = side ? Date.now() : 0
        return
      }
      if (!side || Date.now() - edgeSince < EDGE_HOLD_MS) return
      const flipped = side === 'right' ? flipWhileDragging(1) : flipWhileDragging(-1)
      if (flipped) {
        // 翻页后重新计时，避免连跳
        edgeSince = Date.now()
      }
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerId) return
      const drag = activeDragRef.current
      if (!drag || drag.id !== dragId) return
      const nextX = event.clientX - drag.offsetX
      const nextY = event.clientY - drag.offsetY
      setActiveDrag((prev) => (prev ? { ...prev, x: nextX, y: nextY } : prev))
      tryFlipWhileDragging(event.clientX)
      const target = resolveDropTarget({ x: event.clientX, y: event.clientY }, dragSource)
      if (target) applyPreview(dragId, dragSource, target)
    }

    const finish = (event: PointerEvent) => {
      if (committedOnce) return
      if (event.pointerId !== dragPointerId) return
      committedOnce = true
      cleanup()
      dragBaseRef.current = null
      commitIconDragLayout()
      setActiveDrag(null)
      setHoverSlotIndex(null)
      setHoverCell(null)
      setHoverDockIndex(null)
      setHoverDropZone(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      cleanup()
    }
    // 只在拖拽开始/切换时挂监听；坐标更新不得重置贴边计时
  }, [activeDrag?.id, activeDrag?.pointerId, applyPreview, commitIconDragLayout, resolveDropTarget])

  useEffect(() => {
    if (!activeWidgetDrag) return

    let finishedOnce = false
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== activeWidgetDrag.pointerId) return
      const nextX = event.clientX - activeWidgetDrag.offsetX
      const nextY = event.clientY - activeWidgetDrag.offsetY
      setActiveWidgetDrag((prev) => (prev ? { ...prev, x: nextX, y: nextY } : prev))
    }

    const finish = (event: PointerEvent) => {
      if (finishedOnce) return
      if (event.pointerId !== activeWidgetDrag.pointerId) return
      finishedOnce = true
      cleanup()

      const ref = homeLayoutRef.current
      if (activeWidgetDrag.widget === 'profile') {
        const start = staticWidgetDragStartRef.current
        staticWidgetDragStartRef.current = null
        const finalAnchor = resolveNearestProfileAnchor(
          event.clientY - activeWidgetDrag.offsetY,
        )
        if (start) {
          // 图标避让交给 persist 内 relocate；不再只做顶↔底整块平移
          persistFreeHomeLayout({
            profileAnchor: finalAnchor,
            slots: start.slots,
          })
        } else {
          persistFreeHomeLayout({
            profileAnchor: finalAnchor,
            slots: ref.slots,
          })
        }
      }
      staticWidgetDragStartRef.current = null
      setActiveWidgetDrag(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      cleanup()
    }
  }, [
    activeWidgetDrag,
    persistFreeHomeLayout,
    resolveNearestProfileAnchor,
  ])

  useEffect(() => {
    const onReset = () => resetWidgetLayout()
    window.addEventListener(RESET_HOME_WIDGET_LAYOUT_EVENT, onReset)
    return () => window.removeEventListener(RESET_HOME_WIDGET_LAYOUT_EVENT, onReset)
  }, [resetWidgetLayout])

  useEffect(() => {
    if (homePage !== HOME_ACCOUNT_PAGE) return
    if (!onOpenUserAccount) return
    onOpenUserAccount()
    setHomePage(HOME_MAIN_PAGE)
  }, [homePage, onOpenUserAccount])

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden select-none"
      style={{
        backgroundColor: hasWallpaper ? 'transparent' : 'var(--phone-bg)',
        backgroundImage: theme.wallpaperUrl
          ? `url(${resolvePublicImageUrl(theme.wallpaperUrl)})`
          : 'none',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: theme.wallpaperFit === 'contain' ? 'contain' : 'cover',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <AnimatePresence>
        {isEditMode ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[1]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(2px) brightness(0.95)',
            }}
          />
        ) : null}
      </AnimatePresence>

      {ui.showStatusBar ? <StatusBar /> : null}

      <div
        className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-hidden pb-0 select-none"
        style={{
          paddingTop: isEditMode ? 0 : `calc(${contentSafeTop} + 0.25rem)`,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement | null
          clearBlankLongPress()
          editBlankTapRef.current = null

          // 非编辑态：空白处长按进编辑；若手指明显移动则取消，交给翻页
          if (!isEditMode && !activeDrag && !activeWidgetDrag && isHomeBlankTarget(target)) {
            blankLongPressOriginRef.current = { x: event.clientX, y: event.clientY }
            blankLongPressTimerRef.current = window.setTimeout(() => {
              blankLongPressTimerRef.current = null
              blankLongPressOriginRef.current = null
              enterEditModeFromBlank()
            }, 480)
          }

          // 编辑态：空白按下先记点，松手且未滑动再退出（避免挡住翻页）
          if (isEditMode && !activeDrag && !activeWidgetDrag && isHomeBlankTarget(target)) {
            editBlankTapRef.current = { x: event.clientX, y: event.clientY }
          }

          // 非拖拽时可追踪翻页（组件拖拽改用贴边停留 1 秒翻页）
          if (
            !activeDrag &&
            !activeWidgetDrag &&
            !galleryDraggingIdRef.current &&
            !shouldBlockHomeSwipe(target)
          ) {
            homePageSwipeRef.current = { x: event.clientX, y: event.clientY, active: true }
          } else {
            homePageSwipeRef.current = null
          }
        }}
        onPointerMove={(event) => {
          const origin = blankLongPressOriginRef.current
          if (origin && blankLongPressTimerRef.current != null) {
            const dx = event.clientX - origin.x
            const dy = event.clientY - origin.y
            // 滑动超过阈值：取消长按，保留翻页
            if (Math.hypot(dx, dy) > 12) clearBlankLongPress()
          }
          const tap = editBlankTapRef.current
          if (tap) {
            const dx = event.clientX - tap.x
            const dy = event.clientY - tap.y
            if (Math.hypot(dx, dy) > 12) editBlankTapRef.current = null
          }
        }}
        onPointerUp={(event) => {
          clearBlankLongPress()

          const swipe = homePageSwipeRef.current
          homePageSwipeRef.current = null
          if (
            swipe?.active &&
            !activeDrag &&
            !activeWidgetDrag &&
            !galleryDraggingIdRef.current
          ) {
            const dx = event.clientX - swipe.x
            const dy = event.clientY - swipe.y
            if (Math.abs(dx) >= 48 && Math.abs(dx) >= Math.abs(dy) * 1.2) {
              editBlankTapRef.current = null
              if (dx < 0 && homePage < HOME_PAGE_COUNT - 1) setHomePage((p) => p + 1)
              // 编辑态不滑进账号固定页
              if (dx > 0 && homePage > (isEditMode ? HOME_MAIN_PAGE : 0)) {
                setHomePage((p) => p - 1)
              }
              return
            }
          }
          // 编辑态点空白（非滑动）：有多选先清空，否则退出编辑
          if (isEditMode && editBlankTapRef.current && !activeDrag && !activeWidgetDrag && !galleryDraggingIdRef.current) {
            editBlankTapRef.current = null
            if (selectedIconIdsRef.current.length > 0) {
              clearIconSelection()
              return
            }
            exitEditMode()
            return
          }
          editBlankTapRef.current = null
        }}
        onPointerCancel={() => {
          clearBlankLongPress()
          editBlankTapRef.current = null
          homePageSwipeRef.current = null
        }}
      >
        <WidgetEditAddUi
          open={isEditMode && homePage !== HOME_ACCOUNT_PAGE}
          topInset={
            ui.showStatusBar
              ? '0px'
              : 'env(safe-area-inset-top, 0px)'
          }
          targetPage={galleryPageFromHome(homePage)}
          onDone={exitEditMode}
        />
        {isEditMode && selectedIconIds.length > 1 ? (
          <div className="pointer-events-none absolute bottom-[88px] left-0 right-0 z-[12] flex justify-center px-4">
            <p className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white/92 backdrop-blur-sm">
              已选 {selectedIconIds.length} 个 · 拖任一图标整组移动
            </p>
          </div>
        ) : null}
        <div
          ref={pagerViewportRef}
          data-home-pager-viewport="true"
          className="relative min-h-0 flex-1 overflow-hidden"
        >
          <motion.div
            className="flex h-full"
            style={{ width: '400%' }}
            animate={{ x: `${-(homePage * 100) / 4}%` }}
            transition={
              activeDrag || galleryDraggingId
                ? { duration: 0 }
                : { type: 'spring', stiffness: 420, damping: 38 }
            }
          >
            {/* 第 0 页：账号中心手势位（进入后跳转全屏路由） */}
            <div className="relative flex h-full w-1/4 min-w-0 flex-col overflow-hidden">
              {homePage === HOME_ACCOUNT_PAGE || Math.abs(homePage - HOME_ACCOUNT_PAGE) <= 1 ? (
                <HomeAccountCenterPage />
              ) : null}
            </div>

            {/* 第 1 页：名片 + 图标 + 4×7 组件层 */}
            <div className="relative flex h-full w-1/4 min-w-0 items-stretch justify-center px-3">
              {/* 图标网格与组件层共用同一外框，避免 absolute 叠层错位导致「悬浮盖住图标」 */}
              <div className="relative h-full w-full max-w-[360px]">
                <div
                  ref={gridRef}
                  className="grid h-full w-full items-stretch pb-5"
                  style={{
                    gridTemplateColumns: `repeat(${DESKTOP_GRID_COLUMNS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${DESKTOP_GRID_ROWS}, minmax(0, 1fr))`,
                    gap: DESKTOP_GRID_GAP_PX,
                  }}
                >
                {(() => {
                  const profileArea = widgetLayout.profile
                  return (
                    <div
                      key={`profile-active-${profileAnchorState}`}
                      className="relative min-h-0"
                      style={{
                        gridColumn: `${profileArea.colStart} / ${profileArea.colEnd}`,
                        gridRow: `${profileArea.rowStart} / ${profileArea.rowEnd}`,
                      }}
                    >
                      <motion.div
                        ref={profileNodeRef}
                        layout
                        className="h-full w-full touch-none select-none"
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          touchAction: 'none',
                          opacity: activeWidgetDrag?.widget === 'profile' ? 0.04 : 1,
                        }}
                        animate={{
                          y: 0,
                          rotate: 0,
                          scale: primedStaticWidget === 'profile' ? 1.02 : 1,
                        }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        onContextMenu={(event) => event.preventDefault()}
                        onPointerDown={isEditMode ? (event) => handleStaticWidgetPointerDragStart('profile', event) : profileLongPressHandlers.onPointerDown}
                        onPointerMove={!isEditMode ? profileLongPressHandlers.onPointerMove : undefined}
                        onPointerUp={!isEditMode ? profileLongPressHandlers.onPointerUp : undefined}
                        onPointerCancel={!isEditMode ? profileLongPressHandlers.onPointerCancel : undefined}
                        onPointerLeave={!isEditMode ? profileLongPressHandlers.onPointerLeave : undefined}
                      >
                        <PersonalCard interactive={!isEditMode} />
                      </motion.div>
                    </div>
                  )
                })()}

                {/* 空白格落点高亮（不在 8 个槽位上时） */}
                {isEditMode && hoverDropZone === 'desktop' && hoverCell ? (
                  <div
                    className="pointer-events-none relative"
                    style={{
                      gridColumn: `${hoverCell.col} / ${hoverCell.col + 1}`,
                      gridRow: `${hoverCell.row} / ${hoverCell.row + 1}`,
                    }}
                  >
                    <div className="absolute inset-1 rounded-[22px] border border-[#D4AF37]/70 bg-white/24 shadow-[0_10px_24px_rgba(212,175,55,0.12)]" />
                  </div>
                ) : null}

                {desktopSlots.map((slot, slotIndex) => {
                  const appId = desktopLayoutState[slotIndex]
                  const app = appId ? appMap.get(appId) ?? null : null
                  const isHighlighted = isEditMode && hoverSlotIndex === slotIndex
                  const onGrid = slot.col >= 1 && slot.row >= 1
                  const coveredByWidget =
                    !onGrid || widgetBlockedHomeKeys.has(cellKey(slot))
                  if (!onGrid) {
                    return null
                  }
                  return (
                    <div
                      key={`slot-${slotIndex}`}
                      className="relative"
                      style={{
                        gridColumn: `${slot.col} / ${slot.col + 1}`,
                        gridRow: `${slot.row} / ${slot.row + 1}`,
                      }}
                    >
                      <AnimatePresence>
                        {isHighlighted && !coveredByWidget ? (
                          <motion.div
                            className="pointer-events-none absolute inset-1 rounded-[22px] border border-[#D4AF37]/70 bg-white/24 shadow-[0_10px_24px_rgba(212,175,55,0.12)]"
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                          />
                        ) : null}
                      </AnimatePresence>
                      {app && !coveredByWidget ? (
                        <SortableDesktopTile
                          key={app.id}
                          app={app}
                          slotIndex={slotIndex}
                          slot={slot}
                          compact={compactDesktop}
                          isEditMode={isEditMode}
                          isActiveDrag={activeDrag?.id === app.id}
                          isLongPressPrimed={primedAppId === app.id}
                          isSelected={selectedIconIds.includes(app.id)}
                          isCompanionGhosted={
                            !!activeDrag &&
                            activeDrag.id !== app.id &&
                            activeDrag.companionIds.includes(app.id)
                          }
                          onOpenApp={handleAppOpen}
                          onEnterEditMode={handleEnterEditMode}
                          onToggleSelect={toggleIconSelect}
                          registerNode={registerTileNode}
                          onPointerDragStart={(id, event) => handlePointerDragStart(id, { zone: 'desktop', index: slotIndex }, event)}
                        />
                      ) : null}
                    </div>
                  )
                })}
                </div>

                {homePage === HOME_MAIN_PAGE ||
                Math.abs(homePage - HOME_MAIN_PAGE) <= 1 ||
                galleryDraggingId ? (
                  <div className="pointer-events-none absolute inset-0 z-[6] pb-5">
                    <HomeWidgetGalleryPage
                      page={0}
                      activeHomePage={galleryPageFromHome(homePage)}
                      overlay
                      isEditMode={isEditMode}
                      onEnterEditMode={() => {
                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                          navigator.vibrate(12)
                        }
                        setIsEditMode(true)
                      }}
                      onExitEditMode={exitEditMode}
                      onDragEdgePageFlip={handleWidgetEdgePageFlip}
                      onDragActiveChange={(active, id) => {
                        setGalleryDraggingId(active ? id : null)
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* 第 2 页：与主屏同高的 4×7；溢出图标占空格，组件层满高叠加（不缩水） */}
            <div className="relative flex h-full w-1/4 min-w-0 items-stretch justify-center px-3">
              <div className="relative h-full w-full max-w-[360px]">
                <div
                  ref={galleryGridRef}
                  className="grid h-full w-full items-stretch pb-5"
                  style={{
                    gridTemplateColumns: `repeat(${DESKTOP_GRID_COLUMNS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${DESKTOP_GRID_ROWS}, minmax(0, 1fr))`,
                    gap: DESKTOP_GRID_GAP_PX,
                  }}
                >
                  {isEditMode && hoverDropZone === 'overflow' && hoverCell ? (
                    <div
                      className="pointer-events-none relative"
                      style={{
                        gridColumn: `${hoverCell.col} / ${hoverCell.col + 1}`,
                        gridRow: `${hoverCell.row} / ${hoverCell.row + 1}`,
                      }}
                    >
                      <div className="absolute inset-1 rounded-[22px] border border-[#D4AF37]/70 bg-white/24 shadow-[0_10px_24px_rgba(212,175,55,0.12)]" />
                    </div>
                  ) : null}

                  {galleryOverflowIcons.map((item, overflowIndex) => {
                    const app = appMap.get(item.id) ?? null
                    if (!app) return null
                    const coveredByWidget = widgetBlockedGalleryKeys.has(cellKey(item))
                    return (
                      <div
                        key={`gallery-overflow-${app.id}`}
                        className="relative min-h-0"
                        style={{
                          gridColumn: `${item.col} / ${item.col + 1}`,
                          gridRow: `${item.row} / ${item.row + 1}`,
                          zIndex: activeDrag?.id === app.id ? 55 : isEditMode ? 30 : 14,
                          opacity: coveredByWidget ? 0 : 1,
                          pointerEvents: coveredByWidget ? 'none' : undefined,
                        }}
                      >
                        <SortableDesktopTile
                          app={app}
                          slotIndex={overflowIndex}
                          slot={{ col: item.col, row: item.row }}
                          compact={compactDesktop}
                          isEditMode={isEditMode}
                          isActiveDrag={activeDrag?.id === app.id}
                          isLongPressPrimed={primedAppId === app.id}
                          isSelected={selectedIconIds.includes(app.id)}
                          isCompanionGhosted={
                            !!activeDrag &&
                            activeDrag.id !== app.id &&
                            activeDrag.companionIds.includes(app.id)
                          }
                          onOpenApp={handleAppOpen}
                          onEnterEditMode={handleEnterEditMode}
                          onToggleSelect={toggleIconSelect}
                          registerNode={registerTileNode}
                          onPointerDragStart={(id, event) =>
                            handlePointerDragStart(id, { zone: 'overflow', index: overflowIndex }, event)
                          }
                        />
                      </div>
                    )
                  })}
                </div>

                {homePage === HOME_GALLERY_PAGE ||
                Math.abs(homePage - HOME_GALLERY_PAGE) <= 1 ||
                galleryDraggingId ? (
                  <div className="pointer-events-none absolute inset-0 z-[6] pb-5">
                    <HomeWidgetGalleryPage
                      page={1}
                      activeHomePage={galleryPageFromHome(homePage)}
                      overlay
                      isEditMode={isEditMode}
                      onEnterEditMode={() => {
                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                          navigator.vibrate(12)
                        }
                        setIsEditMode(true)
                      }}
                      onExitEditMode={exitEditMode}
                      onDragEdgePageFlip={handleWidgetEdgePageFlip}
                      onDragActiveChange={(active, id) => {
                        setGalleryDraggingId(active ? id : null)
                      }}
                    />
                  </div>
                ) : (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
                    <p className="text-center text-[12px] text-white/40">左右滑动切换页面</p>
                  </div>
                )}
              </div>
            </div>

            {/* 第 3 页：工具图标 + 4×7 组件层 */}
            <div className="relative flex h-full w-1/4 min-w-0 flex-col px-3 pb-5 pt-2">
              <div className="mb-3 px-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
                  Creator
                </p>
                <p className="text-[13px] font-semibold text-white/90">工具页</p>
              </div>
              <div
                className="grid max-w-[360px] grid-cols-4 gap-x-2.5 gap-y-3 self-center"
                style={{ width: '100%' }}
              >
                {(state.desktopLayoutPage2 ?? []).map((appId, slotIndex) => {
                  const app = appId ? appMap.get(appId) ?? null : null
                  if (!app) {
                    return <div key={`page2-empty-${slotIndex}`} className="aspect-square" />
                  }
                  return (
                    <DesktopAppTile
                      key={app.id}
                      app={app}
                      onOpen={handleAppOpen}
                      compact={compactDesktop}
                      isEditMode={isEditMode}
                    />
                  )
                })}
              </div>

              {homePage === HOME_TOOLS_PAGE ||
              Math.abs(homePage - HOME_TOOLS_PAGE) <= 1 ||
              galleryDraggingId ? (
                <div className="pointer-events-none absolute inset-0 z-[6]">
                  <HomeWidgetGalleryPage
                    page={2}
                    activeHomePage={galleryPageFromHome(homePage)}
                    overlay
                    isEditMode={isEditMode}
                    onEnterEditMode={() => {
                      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        navigator.vibrate(12)
                      }
                      setIsEditMode(true)
                    }}
                    onExitEditMode={exitEditMode}
                    onDragEdgePageFlip={handleWidgetEdgePageFlip}
                    onDragActiveChange={(active, id) => {
                      setGalleryDraggingId(active ? id : null)
                    }}
                  />
                </div>
              ) : null}
            </div>
          </motion.div>

        <AnimatePresence>
          {activeDrag ? (
            <motion.div
              className="pointer-events-none fixed z-[60]"
              initial={false}
              animate={{
                opacity: 1,
                scale: 1.08,
                width: activeDrag.width,
                height: activeDrag.height,
                left: activeDrag.x,
                top: activeDrag.y,
              }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={DRAG_GHOST_TRANSITION}
            >
              <DesktopAppTile
                app={appMap.get(activeDrag.id) ?? apps[0]!}
                onOpen={handleAppOpen}
                compact={compactDesktop}
                isEditMode
                isActiveDrag
                className="h-full w-full"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {activeWidgetDrag ? (
            <motion.div
              className="pointer-events-none fixed z-[61]"
              initial={false}
              animate={{
                opacity: 1,
                scale: 1.04,
                width: activeWidgetDrag.width,
                height: activeWidgetDrag.height,
                left: activeWidgetDrag.x,
                top: activeWidgetDrag.y,
              }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={DRAG_GHOST_TRANSITION}
            >
              {activeWidgetDrag.widget === 'profile' ? (
                <PersonalCard interactive={false} />
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
        </div>

        <div
          data-page-dots="true"
          className="flex shrink-0 items-center justify-center gap-1.5 pb-1.5 pt-0.5"
        >
          {[
            { page: HOME_ACCOUNT_PAGE, label: '账号中心' },
            { page: HOME_MAIN_PAGE, label: '主屏' },
            { page: HOME_GALLERY_PAGE, label: '组件页' },
            { page: HOME_TOOLS_PAGE, label: '工具页' },
          ].map(({ page, label }) => (
            <button
              key={page}
              type="button"
              aria-label={label}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: homePage === page ? 14 : 6,
                background: homePage === page ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.38)',
              }}
              onClick={() => setHomePage(page)}
            />
          ))}
        </div>
      </div>

      <Dock
        apps={dockIdsState.map((id) => appMap.get(id) ?? null)}
        onOpen={handleAppOpen}
        compact={compactDesktop}
        wechatBadgeCount={wechatUnread}
        isEditMode={isEditMode}
        onRequestEditMode={handleEnterEditMode}
        activeDragId={activeDrag?.id ?? null}
        hoverIndex={hoverDockIndex}
        registerNode={registerTileNode}
        dockNavRef={dockNavRef}
        onPointerDragStart={(id, event) => {
          const dockIndex = dockIdsRef.current.findIndex((dockId) => dockId === id)
          if (dockIndex < 0) return
          handlePointerDragStart(id, { zone: 'dock', index: dockIndex }, event)
        }}
      />
    </div>
  )
}
