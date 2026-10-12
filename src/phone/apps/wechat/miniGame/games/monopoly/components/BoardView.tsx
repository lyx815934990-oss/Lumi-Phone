import { motion } from 'framer-motion'

import { RICHMAN_LAYOUT, SCENE_DECOR } from '../boardLayout'
import type {
  MonopolyColorGroup,
  MonopolyPlayerId,
  MonopolyTileDef,
  MonopolyZone,
} from '../monopolyTypes'
import { COLOR_GROUP_HEX, ZONE_LABEL } from '../monopolyTypes'

function posOf(tile: MonopolyTileDef): { x: number; y: number } {
  return RICHMAN_LAYOUT[tile.id] ?? { x: tile.x, y: tile.y }
}

function buildPathD(tiles: MonopolyTileDef[], zone: MonopolyZone): string {
  if (zone === 'main') {
    const byId = new Map(tiles.map((t) => [t.id, t]))
    const start = byId.get(0)
    if (!start) return ''
    let cur = start
    const pts = [posOf(cur)]
    for (let i = 0; i < 40; i++) {
      const next = byId.get(cur.nextId)
      if (!next || next.id === 0) {
        if (next?.id === 0) pts.push(posOf(next))
        break
      }
      if (next.zone !== 'main') break
      pts.push(posOf(next))
      cur = next
    }
    return smoothPath(pts)
  }
  const ordered = tiles.filter((t) => t.zone === zone).sort((a, b) => a.id - b.id)
  if (ordered.length < 2) return ''
  return smoothPath(ordered.map(posOf))
}

function gateConnector(tiles: MonopolyTileDef[]): string {
  const byId = new Map(tiles.map((t) => [t.id, t]))
  return tiles
    .filter((t) => t.kind === 'gate' && t.branchEntryId != null)
    .map((g) => {
      const entry = byId.get(g.branchEntryId!)
      if (!entry) return ''
      const a = posOf(g)
      const b = posOf(entry)
      return `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 4} ${b.x} ${b.y}`
    })
    .filter(Boolean)
    .join(' ')
}

/** 简易平滑折线 */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1]!
    const p1 = pts[i]!
    const mx = (p0.x + p1.x) / 2
    const my = (p0.y + p1.y) / 2
    d += ` Q ${p0.x} ${p0.y} ${mx} ${my}`
  }
  const last = pts[pts.length - 1]!
  d += ` T ${last.x} ${last.y}`
  return d
}

function tileFill(tile: MonopolyTileDef): string {
  switch (tile.kind) {
    case 'go':
      return '#F97316'
    case 'gate':
      return '#FBBF24'
    case 'branch_exit':
      return '#F59E0B'
    case 'item':
      return '#34D399'
    case 'event':
      return '#A78BFA'
    case 'tax':
      return '#FB7185'
    case 'jail':
      return '#94A3B8'
    case 'parking':
      return '#7DD3FC'
    case 'property':
      return tile.colorGroup ? COLOR_GROUP_HEX[tile.colorGroup as MonopolyColorGroup] : '#E7E5E4'
    default:
      return '#E7E5E4'
  }
}

function tileIcon(tile: MonopolyTileDef): string {
  switch (tile.kind) {
    case 'go':
      return '旗'
    case 'gate':
      return '入'
    case 'branch_exit':
      return '出'
    case 'item':
      return '道'
    case 'event':
      return '★'
    case 'tax':
      return '税'
    case 'jail':
      return '谈'
    case 'parking':
      return '歇'
    default:
      return ''
  }
}

function MiniBuilding({ color, houses }: { color: string; houses: number }) {
  const level = Math.min(5, Math.max(0, houses))
  const h = 16 + level * 3
  return (
    <div className="relative flex items-end justify-center" style={{ height: 28, width: 34 }}>
      <div
        className="relative rounded-[3px]"
        style={{
          width: 22,
          height: h,
          background: `linear-gradient(180deg, #FEF3C7 0%, #FDE68A 40%, #F59E0B 100%)`,
          boxShadow: '2px 3px 0 rgba(0,0,0,0.18)',
        }}
      >
        <div
          className="absolute -top-[7px] left-1/2 h-0 w-0 -translate-x-1/2"
          style={{
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderBottom: `10px solid ${color}`,
          }}
        />
        <div className="absolute left-1.5 top-1.5 h-2 w-2 rounded-[2px] bg-sky-300/90" />
        <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-[2px] bg-sky-300/90" />
      </div>
    </div>
  )
}

function Decor({
  kind,
  scale = 1,
}: {
  kind: (typeof SCENE_DECOR)[number]['kind']
  scale?: number
}) {
  if (kind === 'tree') {
    return (
      <div style={{ transform: `scale(${scale})` }} className="relative h-7 w-6">
        <div className="absolute bottom-0 left-1/2 h-2 w-1.5 -translate-x-1/2 rounded-sm bg-[#8B5E3C]" />
        <div className="absolute bottom-1.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-[#4ADE80] shadow-sm" />
        <div className="absolute bottom-3 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#22C55E]" />
      </div>
    )
  }
  if (kind === 'bush') {
    return (
      <div style={{ transform: `scale(${scale})` }} className="relative h-3 w-5">
        <div className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-[#86EFAC]" />
        <div className="absolute bottom-0 right-0 h-2.5 w-3 rounded-full bg-[#4ADE80]" />
      </div>
    )
  }
  if (kind === 'mushroom') {
    return (
      <div style={{ transform: `scale(${scale})` }} className="relative h-4 w-3">
        <div className="absolute bottom-0 left-1/2 h-2 w-1 -translate-x-1/2 rounded-sm bg-[#FEF3C7]" />
        <div className="absolute bottom-1 left-1/2 h-2.5 w-3 -translate-x-1/2 rounded-t-full bg-[#F87171]" />
      </div>
    )
  }
  if (kind === 'rock') {
    return (
      <div
        style={{ transform: `scale(${scale})` }}
        className="h-2.5 w-4 rounded-full bg-[#A8A29E] shadow-sm"
      />
    )
  }
  return (
    <div
      style={{ transform: `scale(${scale})` }}
      className="h-4 w-10 rounded-[40%] bg-[#7DD3FC]/70 shadow-inner"
    />
  )
}

function PathTile({
  tile,
  lit,
  owner,
  houses,
  hasPlayer,
  hasChar,
}: {
  tile: MonopolyTileDef
  lit: boolean
  owner?: MonopolyPlayerId | null
  houses: number
  hasPlayer: boolean
  hasChar: boolean
}) {
  const fill = tileFill(tile)
  const icon = tileIcon(tile)
  const isProp = tile.kind === 'property'
  const owned = !!owner
  const size = isProp ? 44 : 40

  return (
    <div className="relative flex flex-col items-center" style={{ width: size + 8 }}>
      {isProp && owned ? (
        <div className="mb-0.5">
          <MiniBuilding color={fill} houses={houses} />
        </div>
      ) : null}

      <div className="relative" style={{ width: size, height: size }}>
        {/* 底部厚度 */}
        <div
          className="absolute inset-0 rounded-[5px]"
          style={{
            transform: 'translate(2px, 3px)',
            background: 'rgba(40,60,40,0.32)',
          }}
        />
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[5px] border-2 ${
            lit ? 'border-white ring-2 ring-amber-300/90' : 'border-white/95'
          }`}
          style={{
            background: isProp
              ? `linear-gradient(160deg, #FFF7ED 0%, ${fill} 55%, ${fill} 100%)`
              : `linear-gradient(160deg, #FFFFFF 0%, ${fill} 58%, ${fill} 100%)`,
            boxShadow: lit
              ? '0 0 0 1px rgba(251,191,36,0.45), 0 4px 10px rgba(0,0,0,0.2)'
              : 'inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 6px rgba(0,0,0,0.16)',
          }}
        >
          {/* 地产色条 */}
          {isProp ? (
            <div
              className="absolute inset-x-0 top-0 h-[7px]"
              style={{ background: fill, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.12)' }}
            />
          ) : null}
          {icon ? (
            <span className="text-[13px] font-bold leading-none text-white drop-shadow-sm">{icon}</span>
          ) : isProp && !owned ? (
            <span className="mt-1 text-[11px] font-semibold text-white/95">售</span>
          ) : null}
        </div>

        {hasPlayer ? (
          <motion.div
            layoutId="mono-token-player"
            className="absolute -top-4 left-0 z-20"
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
          >
            <div className="flex flex-col items-center">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 shadow-md" />
              <div className="h-3.5 w-2.5 rounded-sm bg-emerald-600 shadow" />
            </div>
          </motion.div>
        ) : null}
        {hasChar ? (
          <motion.div
            layoutId="mono-token-char"
            className="absolute -top-4 right-0 z-20"
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
          >
            <div className="flex flex-col items-center">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-400 shadow-md" />
              <div className="h-3.5 w-2.5 rounded-sm bg-rose-600 shadow" />
            </div>
          </motion.div>
        ) : null}
      </div>

      <div
        className="mt-0.5 max-w-[52px] truncate rounded-[3px] bg-white/92 px-1 py-px text-center text-[10px] font-medium leading-tight text-stone-800 shadow-sm"
        style={{ fontFamily: 'var(--phone-font, "Noto Serif SC", serif)' }}
        title={tile.zone !== 'main' ? `${tile.name} · ${ZONE_LABEL[tile.zone]}` : tile.name}
      >
        {tile.name}
      </div>
    </div>
  )
}

export function BoardView({
  tiles,
  playerPos,
  charPos,
  owners,
  houses,
  highlightId,
  followTileId,
  /** 近景放大：绕焦点格缩放，避免 CSS 放大发糊 / 测量镜头推飞地图 */
  zoom = 2.2,
}: {
  tiles: MonopolyTileDef[]
  playerPos: number
  charPos: number
  owners: Record<number, MonopolyPlayerId | null | undefined>
  houses?: Record<number, number>
  highlightId?: number | null
  followTileId?: number
  zoom?: number
}) {
  const mainPath = buildPathD(tiles, 'main')
  const memoryPath = buildPathD(tiles, 'memory')
  const lifePath = buildPathD(tiles, 'life_path')
  const funcPath = buildPathD(tiles, 'func_yard')
  const connectors = gateConnector(tiles)
  const sorted = [...tiles].sort((a, b) => {
    const pa = posOf(a)
    const pb = posOf(b)
    return pa.x + pa.y * 1.35 - (pb.x + pb.y * 1.35)
  })

  const focusId = followTileId ?? playerPos
  const focusTile = tiles.find((t) => t.id === focusId) ?? tiles.find((t) => t.id === playerPos)
  const focus = focusTile ? posOf(focusTile) : { x: 50, y: 50 }

  return (
    <div className="relative mx-auto aspect-[6/5] w-full max-w-[min(96vw,460px)] overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 18%, #86EFAC 42%, #4ADE80 78%, #22C55E 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-[6%] h-[22%]"
        style={{
          background:
            'radial-gradient(ellipse 40% 80% at 20% 100%, #94A3B8 0%, transparent 70%), radial-gradient(ellipse 50% 90% at 75% 100%, #64748B 0%, transparent 72%)',
          opacity: 0.45,
        }}
      />

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ perspective: '1200px', perspectiveOrigin: '50% 45%' }}
      >
        {/*
          大尺寸世界（不用 scale，避免发糊）+ 把焦点格放到视口中心，
          等距旋转绕焦点进行，棋子保持居中。
        */}
        <div
          className="absolute will-change-[left,top]"
          style={{
            width: `${zoom * 100}%`,
            height: `${zoom * 100}%`,
            left: `${50 - focus.x * zoom}%`,
            top: `${46 - focus.y * zoom}%`,
            transition: 'left 0.38s cubic-bezier(0.22, 1, 0.36, 1), top 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            className="relative h-full w-full"
            style={{
              transform: 'rotateX(50deg) rotateZ(-26deg)',
              transformOrigin: `${focus.x}% ${focus.y}%`,
              transformStyle: 'preserve-3d',
              transition: 'transform-origin 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div
              className="absolute inset-[3%] rounded-[20%]"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 45%, #86EFAC 0%, #4ADE80 55%, #22C55E 100%)',
                boxShadow:
                  '0 24px 48px rgba(20,80,40,0.35), inset 0 2px 0 rgba(255,255,255,0.25)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-[3%] rounded-[20%] opacity-30"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 30%, #166534 1.2px, transparent 1.4px), radial-gradient(circle at 70% 60%, #166534 1px, transparent 1.2px), radial-gradient(circle at 40% 80%, #14532D 1px, transparent 1.2px)',
                backgroundSize: '22px 22px, 28px 28px, 20px 20px',
              }}
            />

            {SCENE_DECOR.map((d, i) => (
              <div
                key={i}
                className="pointer-events-none absolute"
                style={{
                  left: `${d.x}%`,
                  top: `${d.y}%`,
                  zIndex: Math.round(d.x + d.y),
                  transform: 'translate(-50%, -50%) translateZ(4px) rotateZ(26deg) rotateX(-50deg)',
                }}
              >
                <Decor kind={d.kind} scale={(d.scale ?? 1) * 1.45} />
              </div>
            ))}

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ transform: 'translateZ(1px)' }}
            >
              <path
                d={mainPath}
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={mainPath}
                fill="none"
                stroke="rgba(120,113,108,0.55)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={connectors}
                fill="none"
                stroke="rgba(251,191,36,0.75)"
                strokeWidth="1.6"
                strokeDasharray="2 1.5"
                strokeLinecap="round"
              />
              <path d={memoryPath} fill="none" stroke="rgba(250,204,21,0.65)" strokeWidth="2.1" strokeLinecap="round" />
              <path d={lifePath} fill="none" stroke="rgba(244,114,182,0.6)" strokeWidth="2.1" strokeLinecap="round" />
              <path d={funcPath} fill="none" stroke="rgba(45,212,191,0.6)" strokeWidth="2.1" strokeLinecap="round" />
            </svg>

            {sorted.map((tile) => {
              const p = posOf(tile)
              const depth = Math.round(p.x + p.y * 1.4)
              return (
                <div
                  key={tile.id}
                  className="absolute"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    zIndex: depth,
                    transform: 'translate(-50%, -50%) translateZ(8px) rotateZ(26deg) rotateX(-50deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <PathTile
                    tile={tile}
                    lit={highlightId === tile.id || followTileId === tile.id}
                    owner={owners[tile.id]}
                    houses={houses?.[tile.id] ?? 0}
                    hasPlayer={playerPos === tile.id}
                    hasChar={charPos === tile.id}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 55%, transparent 35%, rgba(20,60,30,0.2) 100%)',
        }}
      />
    </div>
  )
}
