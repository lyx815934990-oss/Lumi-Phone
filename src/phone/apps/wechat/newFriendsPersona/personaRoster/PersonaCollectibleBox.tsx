import { useRef } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import type { Character, PlayerIdentity } from '../types'
import {
  formatIdentityBindingDisplay,
  metaGender,
  metaMbti,
  metaZodiac,
  PERSONA_SERIF,
  resolvePersonaWechatAvatarSrc,
} from './personaRosterDisplay'
import { boundMainCharId } from './personaRosterTypes'

export type BoxDrawPhase = 'idle' | 'opening' | 'rising' | 'fly' | 'ready'

const PEEK_Y = '-12px'
const DRAWN_Y = 'translateY(-75%)'

const BOX = {
  soft: '#F0E9DF',
  tab: '#C4B09A',
  foil: '#C9B896',
  elevated: '#FFFFFF',
  surface: '#FBFAF8',
  ink: '#2A2622',
  muted: '#8A8178',
  faint: '#B5ADA4',
  line: '#D9D2C8',
  lineSoft: '#E8E2DA',
} as const

function BoxAvatar({
  character,
  size,
  editable,
  onUpload,
}: {
  character: Character
  size: number
  editable?: boolean
  onUpload?: () => void
}) {
  const src = resolvePersonaWechatAvatarSrc(character)
  const name = character.name?.trim() || '未'
  const body = src ? (
    <img src={src} alt="" className="size-full object-cover" draggable={false} />
  ) : (
    <div
      className="flex size-full items-center justify-center font-semibold text-white"
      style={{ background: BOX.tab, fontSize: size * 0.38 }}
    >
      {name.slice(0, 1)}
    </div>
  )

  if (!editable || !onUpload) {
    return (
      <div className="shrink-0 overflow-hidden" style={{ width: size, height: size, borderRadius: 10 }}>
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="relative shrink-0 overflow-hidden active:opacity-90"
      style={{ width: size, height: size, borderRadius: 10 }}
      title="更换微信头像"
      aria-label="更换微信头像"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onUpload()
      }}
    >
      {body}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 py-0.5 text-center text-[9px] text-white"
        style={{ background: 'rgba(42,38,34,0.72)' }}
      >
        更换
      </span>
    </button>
  )
}

export type PersonaBoxCardKind = 'solo' | 'ensemble'

export function PersonaCardKindBadge({
  cardKind,
  compact,
}: {
  cardKind: PersonaBoxCardKind
  compact?: boolean
}) {
  const ensemble = cardKind === 'ensemble'
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold tracking-[0.06em] ${
        compact ? 'px-1.5 py-px text-[8px]' : 'px-2 py-0.5 text-[10px]'
      }`}
      style={
        ensemble
          ? { background: BOX.ink, color: '#F7F1E8' }
          : { background: '#EDE6DC', color: BOX.tab, border: `1px solid ${BOX.foil}` }
      }
    >
      {ensemble ? '多人卡' : '单人卡'}
    </span>
  )
}

export function PersonaBoxCardFace({
  character,
  variant,
  identityList,
  identityNameById,
  mainNameById,
  boxNo,
  compact,
  cardKind = 'solo',
}: {
  character: Character
  variant: 'main' | 'npc'
  identityList: PlayerIdentity[]
  identityNameById: Record<string, string>
  mainNameById: Record<string, string>
  boxNo: string
  compact?: boolean
  cardKind?: PersonaBoxCardKind
}) {
  const name = character.name?.trim() || '未命名'
  const src = resolvePersonaWechatAvatarSrc(character)
  const identityLine = formatIdentityBindingDisplay(
    character,
    character.playerIdentityId,
    identityList,
    identityNameById,
  )
  const rootId = boundMainCharId(character)
  const mainName = rootId ? mainNameById[rootId]?.trim() || '未命名主角' : ''
  const pad = compact ? 'px-2 py-1.5' : 'px-3.5 py-3'
  const nameSize = compact ? 'text-[13px]' : 'text-[18px]'

  return (
    <div
      className="absolute inset-0 box-border"
      style={{
        borderRadius: compact ? 10 : 14,
        border: `2px solid ${BOX.foil}`,
        background: BOX.elevated,
        padding: compact ? 2 : 3,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden"
        style={{
          borderRadius: compact ? 8 : 11,
          border: `1px solid ${BOX.lineSoft}`,
          background: BOX.surface,
        }}
      >
        <div className="h-[3px] shrink-0" style={{ background: BOX.foil, opacity: 0.45 }} />
        <div className={`flex min-h-0 flex-1 flex-col ${pad}`}>
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono text-[8px] tracking-[0.1em]"
              style={{ color: BOX.tab }}
            >
              ARCHIVE · {boxNo}
            </span>
            <span className="flex-1" />
            <PersonaCardKindBadge cardKind={cardKind} compact />
          </div>
          <div
            className="mt-1.5 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg"
            style={{
              border: `1px solid ${BOX.line}`,
              background: BOX.soft,
              minHeight: compact ? 52 : 100,
            }}
          >
            {src ? (
              <img src={src} alt="" className="size-full object-cover" draggable={false} />
            ) : (
              <div
                className="flex aspect-square w-[72%] items-center justify-center rounded-[10px] font-bold text-white"
                style={{ background: BOX.tab, fontSize: compact ? 20 : 32 }}
              >
                {name.slice(0, 1)}
              </div>
            )}
          </div>
          <p
            className={`mt-1.5 truncate font-semibold ${nameSize}`}
            style={{ color: BOX.ink, fontFamily: PERSONA_SERIF }}
          >
            {name}
          </p>
          <p className="truncate text-[10px]" style={{ color: BOX.muted }}>
            {character.identity?.trim() || (variant === 'main' ? '主角' : 'NPC')}
            {variant === 'npc' && mainName ? ` · ${mainName}` : ''}
          </p>
          {!compact ? (
            <div
              className="mt-2 space-y-1 border-t pt-2 text-[11px]"
              style={{ borderColor: BOX.lineSoft, color: BOX.faint }}
            >
              <p>
                {metaGender(character)} · {metaMbti(character)} · {metaZodiac(character)}
              </p>
              <p className="truncate" style={{ color: BOX.muted }}>
                绑定 · {identityLine}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function PersonaCollectibleBox({
  character,
  variant,
  boxNo,
  phase,
  isActive,
  dimmed,
  identityList,
  identityNameById,
  mainNameById,
  onDraw,
  onUploadAvatar,
  onDelete,
  onGenerateContacts,
  packLabel,
  cardKind = 'solo',
  boxKey,
}: {
  character: Character
  variant: 'main' | 'npc'
  boxNo: string
  phase: BoxDrawPhase
  isActive: boolean
  dimmed: boolean
  identityList: PlayerIdentity[]
  identityNameById: Record<string, string>
  mainNameById: Record<string, string>
  onDraw: (boxEl: HTMLElement) => void
  onUploadAvatar: () => void
  onDelete: () => void
  onGenerateContacts?: () => void
  packLabel?: string
  cardKind?: PersonaBoxCardKind
  /** DOM 键；多人卡用 pack id，避免与封面角色 id 冲突 */
  boxKey?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const emptied = isActive && phase === 'ready'
  const risingOut = isActive && (phase === 'rising' || phase === 'fly')
  const busy = isActive && phase !== 'idle' && phase !== 'ready'
  const showCard = !emptied
  const key = boxKey?.trim() || character.id

  let cardTransform = `translateY(${PEEK_Y})`
  let cardOpacity = 1
  if (phase === 'rising' || phase === 'fly') cardTransform = DRAWN_Y
  if (phase === 'fly') cardOpacity = 0

  const name = character.name?.trim() || '未命名'
  const role =
    cardKind === 'ensemble'
      ? packLabel?.trim() || character.identity?.trim() || '多人演出'
      : character.identity?.trim() || (variant === 'main' ? '主角' : 'NPC')

  return (
    <div
      ref={rootRef}
      data-box-root={key}
      className="relative transition-opacity duration-250"
      style={{
        zIndex: risingOut || busy ? 8 : 1,
        opacity: dimmed ? 0.38 : 1,
      }}
    >
      <div
        data-box-chamber={key}
        className="relative min-h-[168px] overflow-visible rounded-[14px] p-2"
        style={{
          border: `1px solid ${BOX.line}`,
          background: BOX.soft,
        }}
      >
        {showCard ? (
          <div
            className="pointer-events-none absolute left-[14%] right-[14%] top-2 z-[1] aspect-[5/7]"
            style={{
              transform: cardTransform,
              opacity: cardOpacity,
              transition:
                phase === 'fly'
                  ? 'opacity 0.4s ease'
                  : phase === 'rising'
                    ? 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)'
                    : 'none',
            }}
          >
            <PersonaBoxCardFace
              character={character}
              variant={variant}
              identityList={identityList}
              identityNameById={identityNameById}
              mainNameById={mainNameById}
              boxNo={boxNo}
              compact
              cardKind={cardKind}
            />
          </div>
        ) : null}

        <div
          data-box-seal={key}
          className="relative z-[2] min-h-[156px] overflow-hidden rounded-xl"
          style={{ border: `1px solid ${BOX.line}`, background: BOX.elevated }}
        >
          <div className="h-2.5 border-b-2" style={{ background: BOX.tab, borderColor: BOX.foil }} />
          <div
            className="flex min-h-[140px] flex-col items-center justify-center gap-2 px-2 py-3"
            style={{ background: BOX.elevated }}
          >
            <div className="absolute left-2 top-3.5 z-[5]">
              <PersonaCardKindBadge cardKind={cardKind} compact />
            </div>
            <div className="relative z-[4]">
              <BoxAvatar
                character={character}
                size={52}
                editable={!busy && cardKind === 'solo'}
                onUpload={cardKind === 'solo' ? onUploadAvatar : undefined}
              />
            </div>
            <p
              className="text-center text-[15px] font-bold"
              style={{ color: BOX.ink, fontFamily: PERSONA_SERIF }}
            >
              {name}
            </p>
            <p className="text-center text-[11px]" style={{ color: BOX.muted }}>
              {role}
            </p>
            <p
              className="font-mono text-[10px] tracking-[0.12em]"
              style={{ color: BOX.faint }}
            >
              {emptied ? `BOX ${boxNo} · DRAWN` : `BOX ${boxNo}`}
            </p>
            {!emptied && !busy ? (
              <p className="text-[10px]" style={{ color: BOX.faint }}>
                {cardKind === 'ensemble' ? '点空白抽出 · 进入演出卡' : '点空白抽出 · 点头像换图'}
              </p>
            ) : null}
            {busy ? (
              <p className="text-[11px]" style={{ color: BOX.faint }}>
                抽出中…
              </p>
            ) : null}
          </div>
        </div>

        {!emptied && !busy ? (
          <button
            type="button"
            className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent"
            aria-label={`抽出 ${name}`}
            onClick={() => {
              const el =
                (rootRef.current?.querySelector('[data-box-chamber]') as HTMLElement | null) ||
                rootRef.current
              if (el) onDraw(el)
            }}
          />
        ) : null}

        {!busy ? (
          <div className="absolute right-2 top-2 z-[5] flex items-center gap-1">
            {variant === 'main' && cardKind === 'solo' && onGenerateContacts ? (
              <button
                type="button"
                className="rounded-full bg-white/95 p-1.5 text-[#374151] shadow-sm active:scale-95"
                aria-label="生成微信通讯录联系人"
                title="生成通讯录联系人"
                onClick={(e) => {
                  e.stopPropagation()
                  onGenerateContacts()
                }}
              >
                <UserPlus className="size-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full bg-white/95 p-1.5 text-[#EF4444] shadow-sm active:scale-95"
              aria-label={cardKind === 'ensemble' ? '删除多人卡' : '删除角色'}
              title={cardKind === 'ensemble' ? '删除多人卡' : '删除角色'}
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { BOX as PERSONA_BOX_COLORS }
