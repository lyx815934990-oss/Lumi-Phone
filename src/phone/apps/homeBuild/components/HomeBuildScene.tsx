import { useMemo } from 'react'
import { Grid } from '@react-three/drei'
import { DoubleSide } from 'three'
import { openingWorldPoint, wallAngle, wallLength } from '../floorPlanGeometry'
import { buildFloorTileMap, materialIdForFloorCell } from '../floorTileMaterials'
import { materialIdForWallSegment } from '../wallSegmentMaterials'
import {
  computeWallPieces,
  doorHeightForWall,
  floorBaseY,
  isPoolFloorMaterial,
  surfaceColor,
  surfaceRoughness,
  surfaceMetalness,
  tileInCeilingHole,
  wallHeightOf,
} from '../scene3dUtils'
import type { SurfaceLightingContext } from '../scene3dUtils'
import { FLOOR_TILE_SIZE, roomFloorTiles } from '../roomFloorRender'
import { resolveOutdoorEnvironment } from '../outdoorEnvironment'
import type { CeilingHole, DoorWindowOpening, FloorLevel, HomeBuildDraft, HomeBuildMode, WallSegment } from '../types'
import { OutdoorWeatherEffects } from './OutdoorWeatherEffects'
import { OutdoorSkyDecor } from './OutdoorSkyDecor'
import { OutdoorSceneryBackdrop } from './OutdoorSceneryBackdrop'
import { OutdoorSceneLighting } from './OutdoorSceneLighting'
import { FurnitureLayer } from './FurnitureLayer'

const POOL_RIM_COLOR = '#9aa0a8'
const CEILING_HOLE_FILL = '#ff9a2e'
const CEILING_HOLE_EDGE = '#ffd27a'

type Props = {
  draft: HomeBuildDraft
  mode: HomeBuildMode
}

/** 天花板开洞区域高亮（格子填充 + 外框） */
function CeilingHoleHighlight({
  rect,
  y,
}: {
  rect: { x: number; z: number; w: number; h: number }
  y: number
}) {
  const cells: { gx: number; gz: number }[] = []
  const x0 = Math.floor(rect.x)
  const z0 = Math.floor(rect.z)
  const x1 = Math.ceil(rect.x + rect.w)
  const z1 = Math.ceil(rect.z + rect.h)
  for (let gx = x0; gx < x1; gx++) {
    for (let gz = z0; gz < z1; gz++) {
      if (tileInCeilingHole(gx, gz, [{ id: 'h', rect, label: '' }])) {
        cells.push({ gx, gz })
      }
    }
  }

  const cx = rect.x + rect.w / 2
  const cz = rect.z + rect.h / 2
  const edgeY = y + 0.01
  const t = 0.06

  return (
    <group>
      {cells.map(({ gx, gz }) => (
        <mesh
          key={`hole-cell-${gx}-${gz}`}
          position={[gx + FLOOR_TILE_SIZE / 2, y, gz + FLOOR_TILE_SIZE / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => null}
        >
          <planeGeometry args={[FLOOR_TILE_SIZE * 0.92, FLOOR_TILE_SIZE * 0.92]} />
          <meshBasicMaterial
            color={CEILING_HOLE_FILL}
            transparent
            opacity={0.55}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      ))}

      {/* 外框 */}
      <mesh position={[cx, edgeY, rect.z]} raycast={() => null}>
        <boxGeometry args={[rect.w + t, t, t]} />
        <meshBasicMaterial color={CEILING_HOLE_EDGE} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh position={[cx, edgeY, rect.z + rect.h]} raycast={() => null}>
        <boxGeometry args={[rect.w + t, t, t]} />
        <meshBasicMaterial color={CEILING_HOLE_EDGE} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh position={[rect.x, edgeY, cz]} raycast={() => null}>
        <boxGeometry args={[t, t, rect.h + t]} />
        <meshBasicMaterial color={CEILING_HOLE_EDGE} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh position={[rect.x + rect.w, edgeY, cz]} raycast={() => null}>
        <boxGeometry args={[t, t, rect.h + t]} />
        <meshBasicMaterial color={CEILING_HOLE_EDGE} transparent opacity={0.95} depthWrite={false} />
      </mesh>

      {/* 中心标签底板，便于辨认 */}
      <mesh position={[cx, y + 0.02, cz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[Math.min(1.2, rect.w * 0.7), Math.min(0.45, rect.h * 0.5)]} />
        <meshBasicMaterial color="#ffb84d" transparent opacity={0.85} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  )
}

function WallBox({
  piece,
  thickness,
  color,
  roughness,
  metalness,
  opacity,
  depthWrite = true,
}: {
  piece: ReturnType<typeof computeWallPieces>[number]
  thickness: number
  color: string
  roughness: number
  metalness: number
  opacity: number
  depthWrite?: boolean
}) {
  const len = Math.hypot(piece.bx - piece.ax, piece.bz - piece.az)
  if (len < 0.02) return null
  const midX = (piece.ax + piece.bx) / 2
  const midZ = (piece.az + piece.bz) / 2
  const height = piece.yMax - piece.yMin
  const midY = (piece.yMin + piece.yMax) / 2
  const angle = Math.atan2(piece.bz - piece.az, piece.bx - piece.ax)

  return (
    <mesh castShadow receiveShadow position={[midX, midY, midZ]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[len, height, thickness]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={depthWrite}
        side={DoubleSide}
      />
    </mesh>
  )
}

function FloorTileVisual({
  tileKey,
  gx,
  gz,
  floorY,
  matId,
  floorOpacity,
  lighting,
}: {
  tileKey: string
  gx: number
  gz: number
  floorY: number
  matId: string | undefined
  floorOpacity: number
  lighting: SurfaceLightingContext
}) {
  const cx = gx + FLOOR_TILE_SIZE / 2
  const cz = gz + FLOOR_TILE_SIZE / 2
  const isPool = isPoolFloorMaterial(matId)
  const color = surfaceColor(matId, 'floor', lighting)
  const roughness = surfaceRoughness(matId, 'floor', lighting)
  const metalness = surfaceMetalness(matId, 'floor', lighting)

  if (isPool) {
    return (
      <group key={tileKey}>
        <mesh receiveShadow position={[cx, floorY + 0.018, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[FLOOR_TILE_SIZE, FLOOR_TILE_SIZE]} />
          <meshStandardMaterial color={POOL_RIM_COLOR} roughness={0.88} metalness={0} />
        </mesh>
        <mesh receiveShadow position={[cx, floorY + 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[FLOOR_TILE_SIZE * 0.86, FLOOR_TILE_SIZE * 0.86]} />
          <meshStandardMaterial
            color={color}
            roughness={roughness}
            metalness={metalness}
            transparent
            opacity={0.9 * floorOpacity}
            depthWrite={false}
          />
        </mesh>
      </group>
    )
  }

  return (
    <mesh
      key={tileKey}
      receiveShadow
      position={[cx, floorY + 0.02, cz]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[FLOOR_TILE_SIZE, FLOOR_TILE_SIZE]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={floorOpacity < 1}
        opacity={floorOpacity}
      />
    </mesh>
  )
}

function OpeningVisual({
  wall,
  opening,
  floorY,
  wallHeight,
}: {
  wall: WallSegment
  opening: DoorWindowOpening
  floorY: number
  wallHeight: number
}) {
  const center = openingWorldPoint(wall, opening.t)
  const angle = wallAngle(wall)
  const isDoor = opening.kind === 'door'
  const doorH = doorHeightForWall(wallHeight)
  const winH = Math.min(0.9, wallHeight * 0.35)
  const winCenterY = Math.min(1.45, wallHeight * 0.52)

  if (isDoor) {
    return (
      <group position={[center.x, floorY + doorH / 2, center.z]} rotation={[0, -angle + Math.PI / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[opening.width * 0.92, doorH, 0.06]} />
          <meshStandardMaterial color="#c8b090" roughness={0.75} />
        </mesh>
        <mesh castShadow position={[opening.width * 0.42, 0, 0.04]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#8a7a68" metalness={0.4} roughness={0.35} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={[center.x, floorY + winCenterY, center.z]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[opening.width, winH, 0.04]} />
        <meshStandardMaterial color="#9ec8e8" transparent opacity={0.55} roughness={0.1} metalness={0.1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0, -0.02]}>
        <boxGeometry args={[opening.width + 0.12, winH + 0.06, 0.03]} />
        <meshStandardMaterial color="#f0eeea" roughness={0.9} />
      </mesh>
    </group>
  )
}

function FloorLevelMeshes({
  floor,
  floorY,
  isActive,
  mode,
  lighting,
  holesFromBelow,
}: {
  floor: FloorLevel
  floorY: number
  isActive: boolean
  mode: HomeBuildMode
  lighting: SurfaceLightingContext
  holesFromBelow: CeilingHole[]
}) {
  const isWalk = mode === 'walk'
  const soloFloor = mode === 'ghost' || mode === 'avatar'
  // 摆放 / 人物：只看当前层
  if (soloFloor && !isActive) return null

  const wallH = wallHeightOf(floor)
  // 摆放独层时墙体更实，便于对准；漫游全实；非当前层半透
  const wallOpacity = isWalk
    ? 1
    : soloFloor
      ? 0.88
      : isActive
        ? 1
        : 0.28
  const floorOpacity = isWalk ? 1 : isActive ? 1 : 0.35
  const showCeiling = isWalk || (soloFloor && isActive)
  const wallSeamOpts = useMemo(
    () => (isWalk ? { horizontalOverlap: 0.12, verticalOverlap: 0.025 } : undefined),
    [isWalk],
  )

  const tileMap = useMemo(() => buildFloorTileMap(floor), [floor.floorTileMaterials])

  const wallPieces = useMemo(() => {
    const pieces: {
      piece: ReturnType<typeof computeWallPieces>[number]
      thickness: number
      color: string
      roughness: number
      metalness: number
    }[] = []
    for (const wall of floor.walls) {
      const segments = computeWallPieces(wall, floor.openings, floorY, wallSeamOpts, wallH)
      for (const piece of segments) {
        const len = wallLength(wall)
        const t0 = len > 0.01 ? Math.hypot(piece.ax - wall.a.x, piece.az - wall.a.z) / len : 0
        const t1 = len > 0.01 ? Math.hypot(piece.bx - wall.a.x, piece.bz - wall.a.z) / len : 1
        const matId =
          materialIdForWallSegment(wall, t0, t1, floor.wallSegmentMaterials, floor.rooms) ?? 'wall-white'
        pieces.push({
          piece,
          thickness: wall.thickness,
          color: surfaceColor(matId, 'wall', lighting),
          roughness: surfaceRoughness(matId, 'wall', lighting),
          metalness: surfaceMetalness(matId, 'wall', lighting),
        })
      }
    }
    return pieces
  }, [floor.walls, floor.openings, floor.wallSegmentMaterials, floor.rooms, floorY, wallH, wallSeamOpts, lighting])

  return (
    <group>
      {floor.rooms.map((room) => {
        const tiles = roomFloorTiles(room)
        return tiles.map((t, tileIndex) => {
          if (tileInCeilingHole(t.x, t.z, holesFromBelow)) return null
          const matId = materialIdForFloorCell(t.x, t.z, tileMap, floor.rooms) ?? room.floorMaterialId
          return (
            <FloorTileVisual
              key={`${room.id}-floor-${tileIndex}`}
              tileKey={`${room.id}-floor-${tileIndex}`}
              gx={t.x}
              gz={t.z}
              floorY={floorY}
              matId={matId}
              floorOpacity={floorOpacity}
              lighting={lighting}
            />
          )
        })
      })}

      {(floor.floorTileMaterials ?? []).map((tm) => {
        const cx = tm.x + 0.5
        const cz = tm.z + 0.5
        const inRoom = floor.rooms.some((r) => {
          const { x, z, w, h } = r.rect
          return cx >= x && cx <= x + w && cz >= z && cz <= z + h
        })
        if (inRoom) return null
        if (tileInCeilingHole(tm.x, tm.z, holesFromBelow)) return null
        return (
          <FloorTileVisual
            key={`outdoor-${tm.x}-${tm.z}`}
            tileKey={`outdoor-${tm.x}-${tm.z}`}
            gx={tm.x}
            gz={tm.z}
            floorY={floorY}
            matId={tm.materialId}
            floorOpacity={floorOpacity}
            lighting={lighting}
          />
        )
      })}

      {wallPieces.map((w, i) => (
        <WallBox
          key={`${floor.id}-w-${i}`}
          piece={w.piece}
          thickness={w.thickness}
          color={w.color}
          roughness={w.roughness}
          metalness={w.metalness}
          opacity={wallOpacity}
        />
      ))}

      {floor.openings.map((op) => {
        const wall = floor.walls.find((w) => w.id === op.wallId)
        if (!wall) return null
        return <OpeningVisual key={op.id} wall={wall} opening={op} floorY={floorY} wallHeight={wallH} />
      })}

      {showCeiling
        ? floor.rooms.map((room) => {
            const tiles = roomFloorTiles(room)
            const ceilingOpaque = mode === 'walk'
            const ceilingOpacity = ceilingOpaque ? 1 : 0.38
            return tiles.map((t, tileIndex) => {
              if (tileInCeilingHole(t.x, t.z, floor.ceilingHoles)) return null
              return (
                <mesh
                  castShadow
                  receiveShadow
                  key={`${room.id}-ceil-${tileIndex}`}
                  position={[t.x + FLOOR_TILE_SIZE / 2, floorY + wallH - 0.02, t.z + FLOOR_TILE_SIZE / 2]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <planeGeometry args={[FLOOR_TILE_SIZE, FLOOR_TILE_SIZE]} />
                  <meshStandardMaterial
                    color={surfaceColor(room.wallMaterialId, 'ceiling', lighting)}
                    roughness={surfaceRoughness(room.wallMaterialId, 'ceiling', lighting)}
                    metalness={surfaceMetalness(room.wallMaterialId, 'ceiling', lighting)}
                    transparent={!ceilingOpaque}
                    opacity={ceilingOpacity}
                    depthWrite={ceilingOpaque}
                    side={DoubleSide}
                  />
                </mesh>
              )
            })
          })
        : null}

      {/* 开洞格子高亮：摆放模式显眼提示挑空位置 */}
      {mode === 'ghost' && isActive
        ? floor.ceilingHoles.map((hole) => (
            <CeilingHoleHighlight
              key={`hole-${hole.id}`}
              rect={hole.rect}
              y={floorY + wallH - 0.03}
            />
          ))
        : null}
    </group>
  )
}

export function HomeBuildScene({ draft, mode }: Props) {
  const env = resolveOutdoorEnvironment(
    draft.outdoorTime ?? 'day',
    draft.outdoorWeather ?? 'clear',
    {
      day: draft.outdoorSunAzimuthDay,
      dusk: draft.outdoorSunAzimuthDusk,
    },
  )
  const scenery = draft.outdoorScenery ?? 'none'

  const nightMode = env.time === 'night'
  const surfaceLighting: SurfaceLightingContext = {
    allowSpecular: env.allowSpecular,
    nightMode,
    timeOfDay: env.time,
    surfaceTint: env.surfaceTint,
    surfaceDim: env.surfaceDim,
  }

  return (
    <>
      <color attach="background" args={[env.background]} />
      <fog attach="fog" args={[env.fogColor, env.fogNear, env.fogFar]} />
      <OutdoorSceneLighting env={env} />

      <OutdoorSceneryBackdrop scenery={scenery} />
      <OutdoorSkyDecor env={env} />
      <OutdoorWeatherEffects weather={env.weather} draft={draft} />

      <Grid
        args={[24, 24]}
        cellSize={1}
        cellThickness={0.4}
        sectionSize={4}
        sectionThickness={0.8}
        fadeDistance={28}
        fadeStrength={1.2}
        position={[4, -0.01, 3]}
        cellColor={env.gridCell}
        sectionColor={env.gridSection}
      />

      {draft.floors.map((floor, floorIndex) => {
        const floorY = floorBaseY(draft, floor.id)
        const isActive = floor.id === draft.activeFloorId
        const holesFromBelow = floorIndex > 0 ? draft.floors[floorIndex - 1]!.ceilingHoles : []
        return (
          <FloorLevelMeshes
            key={floor.id}
            floor={floor}
            floorY={floorY}
            isActive={isActive}
            mode={mode}
            lighting={surfaceLighting}
            holesFromBelow={holesFromBelow}
          />
        )
      })}

      <FurnitureLayer mode={mode} />
    </>
  )
}
