import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ImageCropperModal } from '../../../../components/ImageCropperModal'
import { compressAvatarDataUrl, MAX_AVATAR_DATA_URL_LEN } from '../../avatarCompress'
import { applyProfileImageUrlChange } from '../../wechatCharacterProfileImageHistory'
import { personaDb } from '../idb'
import { personaPackPremiseLabel } from '../personaPack'
import type { Character, PersonaPack, PlayerIdentity } from '../types'
import type { WechatAccountsBundle } from '../../wechatAccountTypes'
import {
  PersonaCollectibleBox,
  type BoxDrawPhase,
  type PersonaBoxCardKind,
} from './PersonaCollectibleBox'
import { PersonaBoxCenterStage } from './PersonaBoxCenterStage'

function padBoxNo(index: number): string {
  return String(index + 1).padStart(2, '0')
}

type RosterBoxItem =
  | { key: string; cardKind: 'solo'; character: Character; updatedAt: number }
  | {
      key: string
      cardKind: 'ensemble'
      pack: PersonaPack
      character: Character
      updatedAt: number
    }

function emptyPackDisplayCharacter(pack: PersonaPack): Character {
  const title = pack.title.trim() || '未命名多人卡'
  return {
    id: `__pack_face__${pack.id}`,
    createdAt: pack.createdAt,
    updatedAt: pack.updatedAt,
    name: title,
    gender: 'other',
    age: null,
    birthdayMD: '',
    zodiac: '',
    identity: personaPackPremiseLabel(pack.premiseKind),
    worldBooks: [],
  }
}

function packDisplayCharacter(pack: PersonaPack, cover: Character | undefined): Character {
  const face = cover ?? emptyPackDisplayCharacter(pack)
  return {
    ...face,
    name: pack.title.trim() || face.name?.trim() || '未命名多人卡',
    identity: `${personaPackPremiseLabel(pack.premiseKind)} · 可攻略 ${pack.memberIds.length}`,
  }
}

export function PersonaList({
  variant,
  characters,
  loading,
  identityList,
  identityNameById,
  mainNameById,
  mainById: _mainById,
  accountsBundle: _accountsBundle,
  onOpen,
  onDelete,
  onGenerateContacts,
  onCharactersChanged,
  onCardStageActiveChange,
  emptyTitle,
  emptyHint,
  packLabelByCharacterId,
  ensemblePacks,
  packCoverByPackId,
  onOpenPack,
  onDeletePack,
}: {
  variant: 'main' | 'npc'
  characters: Character[]
  loading: boolean
  identityList: PlayerIdentity[]
  identityNameById: Record<string, string>
  mainNameById: Record<string, string>
  mainById?: Record<string, Character>
  accountsBundle: WechatAccountsBundle | null
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onGenerateContacts?: (rootId: string) => void
  /** 头像保存后刷新名册 */
  onCharactersChanged?: () => void
  /** 3D 角色卡居中展示中（用于隐藏名册底部新建/导入按钮） */
  onCardStageActiveChange?: (active: boolean) => void
  emptyTitle: string
  emptyHint: string
  packLabelByCharacterId?: Record<string, string>
  /** 主要角色 Tab：多人卡与单人卡同一文件袋网格 */
  ensemblePacks?: PersonaPack[]
  packCoverByPackId?: Record<string, Character>
  onOpenPack?: (packId: string) => void
  onDeletePack?: (packId: string) => void
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [phase, setPhase] = useState<BoxDrawPhase>('idle')
  const [rotX, setRotX] = useState(0)
  const [rotY, setRotY] = useState(0)
  const [fadeIn, setFadeIn] = useState(false)
  const [flyTick, setFlyTick] = useState(0)
  const [cropSrc, setCropSrc] = useState('')
  const [cropTargetId, setCropTargetId] = useState<string | null>(null)
  const timersRef = useRef<number[]>([])

  const items = useMemo((): RosterBoxItem[] => {
    const solo: RosterBoxItem[] = characters.map((c) => ({
      key: `solo:${c.id}`,
      cardKind: 'solo',
      character: c,
      updatedAt: c.updatedAt || 0,
    }))
    if (variant !== 'main') return solo
    const packs = ensemblePacks ?? []
    const ensemble: RosterBoxItem[] = packs.map((pack) => ({
      key: `pack:${pack.id}`,
      cardKind: 'ensemble',
      pack,
      character: packDisplayCharacter(pack, packCoverByPackId?.[pack.id]),
      updatedAt: pack.updatedAt || 0,
    }))
    return [...solo, ...ensemble].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [characters, ensemblePacks, packCoverByPackId, variant])

  const clearTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
  }

  useEffect(() => () => clearTimers(), [])

  // 切换 Tab / 列表变化时收回
  useEffect(() => {
    clearTimers()
    setOpenKey(null)
    setPhase('idle')
    setFadeIn(false)
    setRotX(0)
    setRotY(0)
  }, [variant])

  const opened = items.find((it) => it.key === openKey) ?? null
  const openedIndex = opened ? items.findIndex((it) => it.key === opened.key) : -1
  const drawing = phase !== 'idle'

  useEffect(() => {
    onCardStageActiveChange?.(drawing)
    return () => onCardStageActiveChange?.(false)
  }, [drawing, onCardStageActiveChange])

  const closeDraw = () => {
    clearTimers()
    setFadeIn(false)
    setPhase('idle')
    setOpenKey(null)
    setRotX(0)
    setRotY(0)
  }

  const startDraw = (key: string) => {
    if (phase !== 'idle' && phase !== 'ready') return
    clearTimers()
    setFadeIn(false)
    setRotX(0)
    setRotY(0)
    setOpenKey(key)
    setPhase('opening')
    const t1 = window.setTimeout(() => setPhase('rising'), 40)
    const t2 = window.setTimeout(() => {
      setPhase('fly')
      setFlyTick((n) => n + 1)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setFadeIn(true))
      })
    }, 980)
    const t3 = window.setTimeout(() => {
      setPhase('ready')
      setRotX(-8)
      setRotY(14)
    }, 1480)
    timersRef.current = [t1, t2, t3]
  }

  const beginAvatarPick = (id: string) => {
    setCropTargetId(id)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file || !file.type.startsWith('image/')) {
        setCropTargetId(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const next = typeof reader.result === 'string' ? reader.result : ''
        if (next) setCropSrc(next)
        else setCropTargetId(null)
      }
      reader.onerror = () => setCropTargetId(null)
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const saveAvatar = async (dataUrl: string) => {
    const id = cropTargetId?.trim()
    if (!id) return
    const nextUrl = await compressAvatarDataUrl(dataUrl, MAX_AVATAR_DATA_URL_LEN)
    if (nextUrl.length > MAX_AVATAR_DATA_URL_LEN) {
      window.alert('图片过大，请选择较小的图片。')
      return
    }
    const ch = await personaDb.getCharacter(id)
    if (!ch) {
      window.alert('角色不存在或已删除')
      return
    }
    const patched = applyProfileImageUrlChange(ch, 'avatar', nextUrl)
    await personaDb.upsertCharacter(patched)
    setCropSrc('')
    setCropTargetId(null)
    onCharactersChanged?.()
  }

  if (loading && !items.length) {
    return (
      <p className="py-12 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF]">
        LOADING ARCHIVE…
      </p>
    )
  }

  if (!items.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
        <p className="text-[16px] font-medium text-[#111827]" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          {emptyTitle}
        </p>
        <p className="mt-3 text-[13px] font-light leading-relaxed text-[#9CA3AF]">{emptyHint}</p>
      </div>
    )
  }

  return (
    <>
      <motion.div
        key={variant}
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence initial={false}>
          {items.map((it, index) => {
            const cardKind: PersonaBoxCardKind = it.cardKind
            const packLabel =
              it.cardKind === 'ensemble'
                ? `${personaPackPremiseLabel(it.pack.premiseKind)} · ${it.pack.memberIds.length + it.pack.npcIds.length} 人`
                : packLabelByCharacterId?.[it.character.id]
            return (
              <motion.div
                key={it.key}
                layout
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.22 } }}
                transition={{ layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
              >
                <PersonaCollectibleBox
                  character={it.character}
                  variant={variant}
                  boxNo={padBoxNo(index)}
                  phase={openKey === it.key ? phase : 'idle'}
                  isActive={openKey === it.key}
                  dimmed={drawing && openKey !== it.key}
                  identityList={identityList}
                  identityNameById={identityNameById}
                  mainNameById={mainNameById}
                  onDraw={() => startDraw(it.key)}
                  onUploadAvatar={() => {
                    if (it.cardKind !== 'solo') return
                    beginAvatarPick(it.character.id)
                  }}
                  onDelete={() => {
                    if (it.cardKind === 'ensemble') onDeletePack?.(it.pack.id)
                    else onDelete(it.character.id)
                  }}
                  onGenerateContacts={
                    it.cardKind === 'solo' && onGenerateContacts
                      ? () => onGenerateContacts(it.character.id)
                      : undefined
                  }
                  packLabel={packLabel}
                  cardKind={cardKind}
                  boxKey={it.key}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-[#9CA3AF]">
        盒面为微信头像与名字；点空白抽出角色卡。单人卡可点头像换图，多人卡抽出后进入演出卡总览。
      </p>

      {opened && (phase === 'fly' || phase === 'ready') ? (
        <PersonaBoxCenterStage
          key={flyTick}
          character={opened.character}
          variant={variant}
          boxNo={padBoxNo(Math.max(0, openedIndex))}
          phase={phase}
          fadeIn={fadeIn}
          rotX={rotX}
          rotY={rotY}
          setRotX={setRotX}
          setRotY={setRotY}
          identityList={identityList}
          identityNameById={identityNameById}
          mainNameById={mainNameById}
          cardKind={opened.cardKind}
          onClose={closeDraw}
          onUploadAvatar={() => {
            if (opened.cardKind !== 'solo') return
            beginAvatarPick(opened.character.id)
          }}
          onResetAngle={() => {
            setRotX(-8)
            setRotY(14)
          }}
          onEdit={() => {
            if (opened.cardKind === 'ensemble') {
              const packId = opened.pack.id
              closeDraw()
              onOpenPack?.(packId)
              return
            }
            const id = opened.character.id
            closeDraw()
            onOpen(id)
          }}
        />
      ) : null}

      {cropSrc ? (
        <div className="fixed inset-0 z-[1200]">
          <ImageCropperModal
            open
            imageSrc={cropSrc}
            title="裁剪微信头像"
            aspect={1}
            maxSide={1080}
            objectFit="horizontal-cover"
            onCancel={() => {
              setCropSrc('')
              setCropTargetId(null)
            }}
            onConfirm={async (dataUrl) => {
              await saveAvatar(dataUrl)
            }}
          />
        </div>
      ) : null}
    </>
  )
}
