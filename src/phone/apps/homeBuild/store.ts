import { create } from 'zustand'
import { cancelAutoFloorSync } from './autoFloorScheduler'
import { createDefaultHomeDraft, clampPlanGridSize, PLAN_GRID_DEFAULT, PLAN_GRID_MAX, PLAN_GRID_STEP, uid } from './defaults'
import { mergeFloorTileMaterials, filterFloorTilesOutsideRect, hasFloorTilesInRect } from './floorTileMaterials'
import { mergeWallSegmentMaterials, type WallSegmentSelection, filterWallSegmentsOutsideRect, hasWallSegmentsInRect } from './wallSegmentMaterials'
import { sanitizeHomeDraft } from './sanitizeDraft'
import { floorPlanCenter, rotatePoint, wallsForRect, wallsMatchingRect } from './floorPlanGeometry'
import { ceilingHolesFromFloorBelow, clampWallHeight, tileInCeilingHole, wallHeightOf } from './scene3dUtils'
import { setOcPickingActive, resetOcPickWorld } from './ocPickInput'
import type {
  CeilingHole,
  DoorWindowOpening,
  FloorLevel,
  GizmoMode,
  HomeBuildDraft,
  HomeBuildMode,
  OcPlacement,
  OutdoorTimeOfDay,
  OutdoorWeather,
  OutdoorScenery,
  FloorPlanTool,
  PlacedFurniture,
  RoomType,
  RoomZone,
  Vec2,
  WallSegment,
} from './types'

const LS_PREFIX = 'lumi.homeBuild.v1.'

function lsKey(characterId: string): string {
  return `${LS_PREFIX}${characterId}`
}

function loadDraft(characterId: string): HomeBuildDraft {
  try {
    const raw = localStorage.getItem(lsKey(characterId))
    if (!raw) return sanitizeHomeDraft(createDefaultHomeDraft(characterId))
    if (raw.length > 512_000) {
      console.warn('[homeBuild] draft too large, reset', characterId)
      return sanitizeHomeDraft(createDefaultHomeDraft(characterId))
    }
    const parsed = JSON.parse(raw) as HomeBuildDraft
    if (parsed?.format !== 'lumi-home-build-draft' || parsed.characterId !== characterId) {
      return sanitizeHomeDraft(createDefaultHomeDraft(characterId))
    }
    return sanitizeHomeDraft(parsed)
  } catch {
    return sanitizeHomeDraft(createDefaultHomeDraft(characterId))
  }
}

function persistDraft(draft: HomeBuildDraft): void {
  try {
    localStorage.setItem(lsKey(draft.characterId), JSON.stringify({ ...draft, updatedAt: Date.now() }))
  } catch {
    /* quota */
  }
}

type HistoryFrame = Pick<HomeBuildDraft, 'floors' | 'furniture'>

type State = {
  characterId: string
  draft: HomeBuildDraft
  mode: HomeBuildMode
  floorTool: FloorPlanTool
  gizmoMode: GizmoMode
  selectedRoomId: string | null
  selectedWallId: string | null
  selectedFurnitureId: string | null
  pendingCatalogId: string | null
  catalogOpen: boolean
  materialOpen: boolean
  materialTarget: 'floor' | 'wall'
  selectedFloorTiles: Vec2[]
  selectedWallSegments: WallSegmentSelection[]
  undoStack: HistoryFrame[]
  redoStack: HistoryFrame[]
  floorTransition: boolean
  snapEnabled: boolean
  outdoorEnvOpen: boolean
  /** TransformControls 拖动中，禁用 OrbitControls */
  gizmoDragging: boolean
  /** 拎起 OC 放置中 */
  ocPicking: boolean
  setCharacter: (characterId: string) => void
  setMode: (mode: HomeBuildMode) => void
  setFloorTool: (tool: FloorPlanTool) => void
  setGizmoMode: (mode: GizmoMode) => void
  setGizmoDragging: (dragging: boolean) => void
  setActiveFloor: (floorId: string) => void
  addFloor: () => void
  /** 调整当前楼层墙高（米） */
  setActiveFloorWallHeight: (height: number) => void
  selectRoom: (roomId: string | null) => void
  selectWall: (wallId: string | null) => void
  selectFurniture: (id: string | null) => void
  setPendingCatalog: (id: string | null) => void
  setCatalogOpen: (open: boolean) => void
  setMaterialOpen: (open: boolean) => void
  setMaterialTarget: (t: 'floor' | 'wall') => void
  setSelectedFloorTiles: (tiles: Vec2[]) => void
  clearFloorTileSelection: () => void
  setSelectedWallSegments: (segments: WallSegmentSelection[]) => void
  clearWallSegmentSelection: () => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
  save: () => void
  resetDraft: () => void
  addWall: (wall: WallSegment) => void
  addWallsForRect: (rect: RoomZone['rect']) => void
  demolishWalls: (wallIds: string[]) => void
  demolishInRect: (rect: RoomZone['rect']) => void
  addRoom: (rect: RoomZone['rect'], type: RoomType, name: string, withWalls?: boolean) => void
  addCeilingHole: (rect: CeilingHole['rect']) => void
  addOpening: (opening: Omit<DoorWindowOpening, 'id'>) => void
  rotateFloorPlan: (direction: 'cw' | 'ccw') => void
  flipFloorPlan: (axis: 'x' | 'z') => void
  applyRoomMaterial: (roomId: string, materialId: string, kind: 'floor' | 'wall') => void
  applyFloorTileMaterial: (materialId: string) => void
  applyWallSegmentMaterial: (materialId: string) => void
  placeFurniture: (item: Omit<PlacedFurniture, 'id'>) => void
  updateFurniture: (id: string, patch: Partial<PlacedFurniture>) => void
  duplicateFurniture: (id: string) => void
  deleteFurniture: (id: string) => void
  toggleFurnitureLock: (id: string) => void
  setFloorTransition: (v: boolean) => void
  setOutdoorEnvOpen: (open: boolean) => void
  setOutdoorEnvironment: (patch: {
    time?: OutdoorTimeOfDay
    weather?: OutdoorWeather
    scenery?: OutdoorScenery
    sunAzimuthDay?: number
    sunAzimuthDusk?: number
    rainSize?: number
    rainThunder?: boolean
  }) => void
  /** 扩建户型可建造网格 */
  expandPlanGrid: () => boolean
  setOcPicking: (active: boolean) => void
  setOcPlacement: (placement: OcPlacement) => void
}

function activeFloor(draft: HomeBuildDraft) {
  return draft.floors.find((f) => f.id === draft.activeFloorId) ?? draft.floors[0]!
}

function patchActiveFloor(
  draft: HomeBuildDraft,
  patcher: (floor: FloorLevel) => FloorLevel,
): FloorLevel[] {
  return draft.floors.map((f) => {
    if (f.id !== draft.activeFloorId) return f
    return patcher(f)
  })
}

function commitFloorPatch(
  set: (p: Partial<State>) => void,
  get: () => State,
  patcher: (floor: FloorLevel) => FloorLevel,
): void {
  const { draft } = get()
  const floors = patchActiveFloor(draft, patcher)
  set({ draft: { ...draft, floors, updatedAt: Date.now() } })
}

export const useHomeBuildStore = create<State>((set, get) => ({
  characterId: '',
  draft: createDefaultHomeDraft(''),
  mode: 'floorplan',
  floorTool: 'wall',
  gizmoMode: 'move',
  selectedRoomId: null,
  selectedWallId: null,
  selectedFurnitureId: null,
  pendingCatalogId: null,
  catalogOpen: false,
  materialOpen: false,
  materialTarget: 'floor',
  selectedFloorTiles: [],
  selectedWallSegments: [],
  undoStack: [],
  redoStack: [],
  floorTransition: false,
  snapEnabled: true,
  outdoorEnvOpen: false,
  gizmoDragging: false,
  ocPicking: false,

  setCharacter: (characterId) => {
    const id = characterId?.trim()
    if (!id) return

    cancelAutoFloorSync()
    const loaded = loadDraft(id)
    set({
      characterId: id,
      draft: loaded,
      mode: 'floorplan',
      undoStack: [],
      redoStack: [],
      selectedRoomId: null,
      selectedWallId: null,
      selectedFurnitureId: null,
      pendingCatalogId: null,
      materialOpen: false,
      selectedFloorTiles: [],
      selectedWallSegments: [],
      outdoorEnvOpen: false,
      catalogOpen: false,
      ocPicking: false,
    })
    setOcPickingActive(false)
    resetOcPickWorld()
  },

  setMode: (mode) => {
    setOcPickingActive(false)
    resetOcPickWorld()
    set({
      mode,
      ocPicking: false,
      pendingCatalogId: mode === 'ghost' ? get().pendingCatalogId : null,
      catalogOpen: mode === 'ghost' ? get().catalogOpen : false,
      gizmoDragging: false,
      selectedFurnitureId: mode === 'floorplan' ? null : get().selectedFurnitureId,
    })
  },
  setFloorTool: (tool) => set({ floorTool: tool }),
  setGizmoMode: (mode) => set({ gizmoMode: mode }),
  setGizmoDragging: (dragging) => set({ gizmoDragging: dragging }),

  setActiveFloor: (floorId) => {
    const { draft } = get()
    if (draft.activeFloorId === floorId) return
    set({ floorTransition: true })
    set({
      draft: { ...draft, activeFloorId: floorId },
      selectedRoomId: null,
    })
    window.setTimeout(() => set({ floorTransition: false }), 150)
  },

  addFloor: () => {
    const { draft, pushHistory } = get()
    pushHistory()
    const prev = activeFloor(draft)
    const label = `${draft.floors.length + 1}F`
    const newFloor = {
      id: uid('floor'),
      label,
      walls: prev.walls.map((w) => ({ ...w, id: uid('wall') })),
      rooms: [],
      openings: [],
      ceilingHoles: [],
      floorTileMaterials: [],
      wallSegmentMaterials: [],
      wallHeight: wallHeightOf(prev),
    }
    set({
      draft: {
        ...draft,
        floors: [...draft.floors, newFloor],
        activeFloorId: newFloor.id,
      },
    })
  },

  setActiveFloorWallHeight: (height) => {
    const { draft } = get()
    const next = clampWallHeight(height)
    const floor = activeFloor(draft)
    const cur = wallHeightOf(floor)
    if (Math.abs(cur - next) < 0.001) return
    const activeIdx = draft.floors.findIndex((f) => f.id === draft.activeFloorId)
    const floors = draft.floors.map((f) =>
      f.id === draft.activeFloorId ? { ...f, wallHeight: next } : f,
    )
    // 下层变高/变矮时，抬升或降低其上方家具，避免悬空/埋进楼板
    const oldCeiling =
      floors.slice(0, Math.max(0, activeIdx)).reduce((y, f) => y + wallHeightOf(f), 0) + cur
    const delta = next - cur
    const furniture =
      activeIdx < 0 || Math.abs(delta) < 0.001
        ? draft.furniture
        : draft.furniture.map((item) => {
            if (item.position.y < oldCeiling - 0.15) return item
            return {
              ...item,
              position: { ...item.position, y: item.position.y + delta },
            }
          })
    set({
      draft: {
        ...draft,
        floors,
        furniture,
        updatedAt: Date.now(),
      },
    })
  },

  selectRoom: (roomId) => set({ selectedRoomId: roomId, selectedWallId: null }),
  selectWall: (wallId) => set({ selectedWallId: wallId, selectedRoomId: null }),
  selectFurniture: (id) => set({ selectedFurnitureId: id }),
  setPendingCatalog: (id) => set({ pendingCatalogId: id, catalogOpen: false }),
  setCatalogOpen: (open) => set({ catalogOpen: open }),
  setMaterialOpen: (open) => set({ materialOpen: open }),
  setMaterialTarget: (t) => set({ materialTarget: t }),
  setSelectedFloorTiles: (tiles) => set({ selectedFloorTiles: tiles }),
  clearFloorTileSelection: () => set({ selectedFloorTiles: [] }),
  setSelectedWallSegments: (segments) => set({ selectedWallSegments: segments }),
  clearWallSegmentSelection: () => set({ selectedWallSegments: [] }),

  pushHistory: () => {
    const { draft, undoStack } = get()
    const frame: HistoryFrame = {
      floors: structuredClone(draft.floors),
      furniture: structuredClone(draft.furniture),
    }
    set({ undoStack: [...undoStack.slice(-40), frame], redoStack: [] })
  },

  undo: () => {
    const { undoStack, redoStack, draft } = get()
    if (!undoStack.length) return
    const prev = undoStack[undoStack.length - 1]!
    const current: HistoryFrame = {
      floors: structuredClone(draft.floors),
      furniture: structuredClone(draft.furniture),
    }
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
      draft: { ...draft, ...prev },
    })
  },

  redo: () => {
    const { redoStack, undoStack, draft } = get()
    if (!redoStack.length) return
    const next = redoStack[redoStack.length - 1]!
    const current: HistoryFrame = {
      floors: structuredClone(draft.floors),
      furniture: structuredClone(draft.furniture),
    }
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, current],
      draft: { ...draft, ...next },
    })
  },

  save: () => {
    const { draft } = get()
    const snapshot = { ...draft, updatedAt: Date.now() }
    window.setTimeout(() => persistDraft(snapshot), 0)
  },

  resetDraft: () => {
    const { characterId } = get()
    const id = characterId?.trim()
    if (!id) return
    cancelAutoFloorSync()
    try {
      localStorage.removeItem(lsKey(id))
    } catch {
      /* ignore */
    }
    set({
      draft: sanitizeHomeDraft(createDefaultHomeDraft(id)),
      mode: 'floorplan',
      undoStack: [],
      redoStack: [],
      selectedRoomId: null,
      selectedWallId: null,
      selectedFurnitureId: null,
      materialOpen: false,
      selectedFloorTiles: [],
      selectedWallSegments: [],
      outdoorEnvOpen: false,
      catalogOpen: false,
    })
  },

  addWall: (wall) => {
    const { pushHistory } = get()
    pushHistory()
    commitFloorPatch(set, get, (f) => ({ ...f, walls: [...f.walls, wall] }))
  },

  addWallsForRect: (rect) => {
    const { pushHistory } = get()
    pushHistory()
    const newWalls = wallsForRect(rect).map((w) => ({ ...w, id: uid('wall') }))
    commitFloorPatch(set, get, (f) => ({ ...f, walls: [...f.walls, ...newWalls] }))
  },

  demolishWalls: (wallIds) => {
    if (!wallIds.length) return
    const { pushHistory } = get()
    pushHistory()
    const idSet = new Set(wallIds)
    commitFloorPatch(set, get, (f) => ({
      ...f,
      walls: f.walls.filter((w) => !idSet.has(w.id)),
      openings: f.openings.filter((o) => !idSet.has(o.wallId)),
    }))
    set({ selectedWallId: null })
  },

  demolishInRect: (rect) => {
    const { draft, pushHistory } = get()
    const floor = activeFloor(draft)
    const wallIds = wallsMatchingRect(floor.walls, rect)
    const inRect = (cx: number, cz: number) =>
      cx >= rect.x && cx <= rect.x + rect.w && cz >= rect.z && cz <= rect.z + rect.h
    const hasManualRooms = floor.rooms.some(
      (r) => !r.autoGenerated && inRect(r.rect.x + r.rect.w / 2, r.rect.z + r.rect.h / 2),
    )
    const hasHoles = floor.ceilingHoles.some((h) =>
      inRect(h.rect.x + h.rect.w / 2, h.rect.z + h.rect.h / 2),
    )
    const hasFloorTiles = hasFloorTilesInRect(floor.floorTileMaterials, rect)
    const hasWallPaint = hasWallSegmentsInRect(floor.wallSegmentMaterials, floor.walls, rect)
    if (!wallIds.length && !hasManualRooms && !hasHoles && !hasFloorTiles && !hasWallPaint) return
    pushHistory()
    const idSet = new Set(wallIds)
    commitFloorPatch(set, get, (f) => ({
      ...f,
      walls: f.walls.filter((w) => !idSet.has(w.id)),
      openings: f.openings.filter((o) => !idSet.has(o.wallId)),
      rooms: f.rooms.filter(
        (r) => r.autoGenerated || !inRect(r.rect.x + r.rect.w / 2, r.rect.z + r.rect.h / 2),
      ),
      ceilingHoles: f.ceilingHoles.filter(
        (h) => !inRect(h.rect.x + h.rect.w / 2, h.rect.z + h.rect.h / 2),
      ),
      floorTileMaterials: filterFloorTilesOutsideRect(f.floorTileMaterials, rect),
      wallSegmentMaterials: filterWallSegmentsOutsideRect(f.wallSegmentMaterials, f.walls, rect),
    }))
    set({ selectedRoomId: null, selectedWallId: null, selectedFloorTiles: [], selectedWallSegments: [] })
  },

  addRoom: (rect, type, name, withWalls = true) => {
    const { draft, pushHistory } = get()
    pushHistory()
    const room: RoomZone = {
      id: uid('room'),
      name,
      type,
      rect,
      autoGenerated: false,
      floorMaterialId: 'floor-wood-oak',
      wallMaterialId: 'wall-white',
    }
    const floors = patchActiveFloor(draft, (f) => {
      const walls = withWalls
        ? [...f.walls, ...wallsForRect(rect).map((w) => ({ ...w, id: uid('wall') }))]
        : f.walls
      return { ...f, rooms: [...f.rooms.filter((r) => !r.autoGenerated), room], walls }
    })
    set({ draft: { ...draft, floors, updatedAt: Date.now() }, selectedRoomId: room.id })
  },

  addOpening: (opening) => {
    const { pushHistory } = get()
    pushHistory()
    const placed: DoorWindowOpening = { ...opening, id: uid('open') }
    commitFloorPatch(set, get, (f) => ({
      ...f,
      openings: [...f.openings, placed],
    }))
    set({ selectedWallId: opening.wallId })
  },

  rotateFloorPlan: (direction) => {
    const { draft, pushHistory } = get()
    const floor = activeFloor(draft)
    const center = floorPlanCenter(floor)
    const rad = direction === 'cw' ? -Math.PI / 2 : Math.PI / 2
    pushHistory()
    const mapPt = (p: Vec2) => rotatePoint(p, center, rad)
    const floors = draft.floors.map((f) => {
      if (f.id !== draft.activeFloorId) return f
      const manualRooms = f.rooms.filter((r) => !r.autoGenerated)
      const rotated = {
        ...f,
        walls: f.walls.map((w) => ({
          ...w,
          a: mapPt(w.a),
          b: mapPt(w.b),
        })),
        rooms: manualRooms.map((r) => {
          const corners = [
            mapPt({ x: r.rect.x, z: r.rect.z }),
            mapPt({ x: r.rect.x + r.rect.w, z: r.rect.z }),
            mapPt({ x: r.rect.x + r.rect.w, z: r.rect.z + r.rect.h }),
            mapPt({ x: r.rect.x, z: r.rect.z + r.rect.h }),
          ]
          const xs = corners.map((c) => c.x)
          const zs = corners.map((c) => c.z)
          const minX = Math.min(...xs)
          const maxX = Math.max(...xs)
          const minZ = Math.min(...zs)
          const maxZ = Math.max(...zs)
          return {
            ...r,
            rect: { x: minX, z: minZ, w: maxX - minX, h: maxZ - minZ },
            tiles: undefined,
          }
        }),
        ceilingHoles: f.ceilingHoles.map((h) => {
          const corners = [
            mapPt({ x: h.rect.x, z: h.rect.z }),
            mapPt({ x: h.rect.x + h.rect.w, z: h.rect.z }),
            mapPt({ x: h.rect.x + h.rect.w, z: h.rect.z + h.rect.h }),
            mapPt({ x: h.rect.x, z: h.rect.z + h.rect.h }),
          ]
          const xs = corners.map((c) => c.x)
          const zs = corners.map((c) => c.z)
          const minX = Math.min(...xs)
          const maxX = Math.max(...xs)
          const minZ = Math.min(...zs)
          const maxZ = Math.max(...zs)
          return { ...h, rect: { x: minX, z: minZ, w: maxX - minX, h: maxZ - minZ } }
        }),
      }
      return rotated
    })
    set({ draft: { ...draft, floors, updatedAt: Date.now() } })
  },

  flipFloorPlan: (axis) => {
    const { draft, pushHistory } = get()
    const floor = activeFloor(draft)
    const center = floorPlanCenter(floor)
    pushHistory()
    const mapPt = (p: Vec2): Vec2 =>
      axis === 'x'
        ? { x: 2 * center.x - p.x, z: p.z }
        : { x: p.x, z: 2 * center.z - p.z }
    const floors = draft.floors.map((f) => {
      if (f.id !== draft.activeFloorId) return f
      const manualRooms = f.rooms.filter((r) => !r.autoGenerated)
      const flipped = {
        ...f,
        walls: f.walls.map((w) => ({
          ...w,
          a: mapPt(w.a),
          b: mapPt(w.b),
        })),
        rooms: manualRooms.map((r) => ({
          ...r,
          rect:
            axis === 'x'
              ? {
                  x: 2 * center.x - r.rect.x - r.rect.w,
                  z: r.rect.z,
                  w: r.rect.w,
                  h: r.rect.h,
                }
              : {
                  x: r.rect.x,
                  z: 2 * center.z - r.rect.z - r.rect.h,
                  w: r.rect.w,
                  h: r.rect.h,
                },
          tiles: undefined,
        })),
        ceilingHoles: f.ceilingHoles.map((h) => ({
          ...h,
          rect:
            axis === 'x'
              ? {
                  x: 2 * center.x - h.rect.x - h.rect.w,
                  z: h.rect.z,
                  w: h.rect.w,
                  h: h.rect.h,
                }
              : {
                  x: h.rect.x,
                  z: 2 * center.z - h.rect.z - h.rect.h,
                  w: h.rect.w,
                  h: h.rect.h,
                },
        })),
      }
      return flipped
    })
    set({ draft: { ...draft, floors, updatedAt: Date.now() } })
  },

  addCeilingHole: (rect) => {
    const { draft, pushHistory } = get()
    pushHistory()
    const floorNum = Number.parseInt(activeFloor(draft).label, 10) || draft.floors.length
    const hole: CeilingHole = {
      id: uid('hole'),
      rect,
      label: `通往${floorNum + 1}F`,
    }
    const activeIdx = draft.floors.findIndex((f) => f.id === draft.activeFloorId)
    const floors = draft.floors.map((f, i) => {
      if (f.id === draft.activeFloorId) {
        return { ...f, ceilingHoles: [...f.ceilingHoles, hole] }
      }
      if (i === activeIdx + 1) {
        return {
          ...f,
          floorTileMaterials: filterFloorTilesOutsideRect(f.floorTileMaterials, rect),
        }
      }
      return f
    })
    set({ draft: { ...draft, floors } })
  },

  applyRoomMaterial: (roomId, materialId, kind) => {
    const { draft, pushHistory } = get()
    pushHistory()
    const floors = draft.floors.map((f) => {
      if (f.id !== draft.activeFloorId) return f
      return {
        ...f,
        rooms: f.rooms.map((r) =>
          r.id === roomId
            ? {
                ...r,
                ...(kind === 'floor' ? { floorMaterialId: materialId } : { wallMaterialId: materialId }),
              }
            : r,
        ),
      }
    })
    set({ draft: { ...draft, floors, updatedAt: Date.now() } })
  },

  applyFloorTileMaterial: (materialId) => {
    const { draft, pushHistory, selectedFloorTiles } = get()
    const holesBelow = ceilingHolesFromFloorBelow(draft, draft.activeFloorId)
    const paintable = selectedFloorTiles.filter((c) => !tileInCeilingHole(c.x, c.z, holesBelow))
    if (!paintable.length) return
    pushHistory()
    const floors = draft.floors.map((f) => {
      if (f.id !== draft.activeFloorId) return f
      return {
        ...f,
        floorTileMaterials: mergeFloorTileMaterials(f.floorTileMaterials, paintable, materialId),
      }
    })
    set({
      draft: { ...draft, floors, updatedAt: Date.now() },
      materialOpen: false,
      selectedFloorTiles: [],
    })
  },

  applyWallSegmentMaterial: (materialId) => {
    const { draft, pushHistory, selectedWallSegments } = get()
    if (!selectedWallSegments.length) return
    pushHistory()
    const floors = draft.floors.map((f) => {
      if (f.id !== draft.activeFloorId) return f
      return {
        ...f,
        wallSegmentMaterials: mergeWallSegmentMaterials(
          f.wallSegmentMaterials,
          selectedWallSegments,
          materialId,
        ),
      }
    })
    set({
      draft: { ...draft, floors, updatedAt: Date.now() },
      materialOpen: false,
      selectedWallSegments: [],
    })
  },

  placeFurniture: (item) => {
    const { draft, pushHistory } = get()
    pushHistory()
    const placed: PlacedFurniture = {
      ...item,
      id: uid('furn'),
      floorId: item.floorId ?? draft.activeFloorId,
    }
    set({
      draft: { ...draft, furniture: [...draft.furniture, placed] },
      selectedFurnitureId: placed.id,
      pendingCatalogId: null,
    })
  },

  updateFurniture: (id, patch) => {
    const { draft } = get()
    set({
      draft: {
        ...draft,
        furniture: draft.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      },
    })
  },

  duplicateFurniture: (id) => {
    const { draft, pushHistory } = get()
    const src = draft.furniture.find((f) => f.id === id)
    if (!src) return
    pushHistory()
    const copy: PlacedFurniture = {
      ...structuredClone(src),
      id: uid('furn'),
      floorId: src.floorId ?? draft.activeFloorId,
      position: { ...src.position, x: src.position.x + 0.5, z: src.position.z + 0.5 },
    }
    set({
      draft: { ...draft, furniture: [...draft.furniture, copy] },
      selectedFurnitureId: copy.id,
    })
  },

  deleteFurniture: (id) => {
    const { draft, pushHistory } = get()
    pushHistory()
    set({
      draft: { ...draft, furniture: draft.furniture.filter((f) => f.id !== id) },
      selectedFurnitureId: null,
    })
  },

  toggleFurnitureLock: (id) => {
    const { draft } = get()
    set({
      draft: {
        ...draft,
        furniture: draft.furniture.map((f) => (f.id === id ? { ...f, locked: !f.locked } : f)),
      },
    })
  },

  setFloorTransition: (v) => set({ floorTransition: v }),

  setOutdoorEnvOpen: (open) => set({ outdoorEnvOpen: open }),

  setOutdoorEnvironment: (patch) => {
    const { draft } = get()
    const rainSize =
      patch.rainSize !== undefined
        ? Math.max(1, Math.min(5, Math.round(patch.rainSize)))
        : draft.outdoorRainSize
    set({
      draft: {
        ...draft,
        outdoorTime: patch.time ?? draft.outdoorTime ?? 'day',
        outdoorWeather: patch.weather ?? draft.outdoorWeather ?? 'clear',
        outdoorScenery: patch.scenery ?? draft.outdoorScenery ?? 'none',
        outdoorSunAzimuthDay:
          patch.sunAzimuthDay !== undefined ? patch.sunAzimuthDay : draft.outdoorSunAzimuthDay,
        outdoorSunAzimuthDusk:
          patch.sunAzimuthDusk !== undefined ? patch.sunAzimuthDusk : draft.outdoorSunAzimuthDusk,
        outdoorRainSize: rainSize,
        outdoorRainThunder:
          patch.rainThunder !== undefined ? patch.rainThunder : draft.outdoorRainThunder,
        updatedAt: Date.now(),
      },
    })
  },

  expandPlanGrid: () => {
    const { draft } = get()
    const cur = clampPlanGridSize(draft.planGridSize ?? PLAN_GRID_DEFAULT)
    if (cur >= PLAN_GRID_MAX) return false
    const next = clampPlanGridSize(cur + PLAN_GRID_STEP)
    set({
      draft: {
        ...draft,
        planGridSize: next,
        updatedAt: Date.now(),
      },
    })
    return true
  },

  setOcPicking: (active) => {
    setOcPickingActive(active)
    if (!active) resetOcPickWorld()
    set({ ocPicking: active, pendingCatalogId: active ? null : get().pendingCatalogId })
  },

  setOcPlacement: (placement) => {
    const { draft, pushHistory } = get()
    pushHistory()
    set({
      draft: {
        ...draft,
        ocPlacement: placement,
        updatedAt: Date.now(),
      },
    })
  },
}))

export { activeFloor }

export function snapPoint(p: Vec2, grid = 1): Vec2 {
  return {
    x: Math.round(p.x / grid) * grid,
    z: Math.round(p.z / grid) * grid,
  }
}
