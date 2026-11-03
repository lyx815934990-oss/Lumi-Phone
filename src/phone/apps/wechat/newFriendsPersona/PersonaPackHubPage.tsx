import { ArrowLeft, Check, ChevronRight, Pencil, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { emitWeChatStorageChanged, personaDb } from './idb'
import { personaPackPremiseLabel } from './personaPack'
import {
  INK_CARD,
  INK_FOIL,
  INK_INK,
  INK_KICKER,
  INK_LEAD,
  INK_LINE,
  INK_MUTED,
  INK_PAGE,
  INK_SECTION,
} from './personaEditor/personaEditorTabs'
import type { Character, PersonaPack } from './types'

function InkPlate({
  num,
  en,
  zh,
  lead,
  right,
  children,
}: {
  num: string
  en: string
  zh: string
  lead?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className={`${INK_SECTION} overflow-hidden`}>
      <header
        className="flex items-start justify-between gap-3 border-b px-4 py-3.5"
        style={{ borderColor: INK_LINE, background: INK_INK, color: INK_CARD }}
      >
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-semibold tracking-[0.18em] text-[#9AA0A8]">
            {num} · {en}
          </p>
          <h2 className="mt-1 font-serif text-[17px] font-semibold tracking-tight">{zh}</h2>
          {lead ? <p className="mt-1 text-[11px] font-light leading-relaxed text-[#B8BDC6]">{lead}</p> : null}
        </div>
        {right}
      </header>
      <div className="px-3 py-3">{children}</div>
    </section>
  )
}

function InkField({
  labelEn,
  labelZh,
  children,
}: {
  labelEn: string
  labelZh: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em]" style={{ color: INK_FOIL }}>
          {labelEn}
        </span>
        <span className="text-[11px]" style={{ color: INK_MUTED }}>
          {labelZh}
        </span>
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

const fieldClass =
  'w-full rounded-[12px] border bg-[#FFFEFC] px-3 py-2.5 text-[14px] outline-none transition focus:border-[#5A6574]'
const fieldStyle = { borderColor: INK_LINE, color: INK_INK } as const

function MemberCard({
  ch,
  seatLabel,
  seatEn,
  onOpen,
}: {
  ch: Character
  seatLabel: string
  seatEn: string
  onOpen: () => void
}) {
  const name = ch.name?.trim() || '未命名'
  const avatar = resolveCharacterAvatarUrl(ch)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-[14px] border px-3 py-3 text-left transition active:scale-[0.99]"
      style={{ borderColor: INK_LINE, background: '#FFFEFC' }}
    >
      <div
        className="size-12 shrink-0 overflow-hidden rounded-[12px] border"
        style={{ borderColor: INK_INK, background: '#D8D4CE' }}
      >
        {avatar ? (
          <img src={avatar} alt="" className="size-full object-cover" />
        ) : (
          <div
            className="flex size-full items-center justify-center font-serif text-[16px] font-semibold"
            style={{ background: INK_INK, color: INK_CARD }}
          >
            {name.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-serif text-[15px] font-semibold" style={{ color: INK_INK }}>
            {name}
          </p>
          <span
            className="shrink-0 rounded-full px-1.5 py-px font-mono text-[8px] font-bold tracking-[0.08em]"
            style={{ background: INK_INK, color: INK_CARD }}
          >
            {seatEn}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px]" style={{ color: INK_MUTED }}>
          {seatLabel}
          {ch.identity?.trim() ? ` · ${ch.identity.trim()}` : ''}
          {ch.mbti?.trim() ? ` · ${ch.mbti.trim()}` : ''}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0" style={{ color: INK_FOIL }} />
    </button>
  )
}

function AvatarStack({ characters }: { characters: Character[] }) {
  const faces = characters.slice(0, 4)
  if (!faces.length) {
    return (
      <div
        className="flex size-[72px] items-center justify-center rounded-[16px] border font-serif text-[22px] font-semibold"
        style={{ borderColor: INK_INK, background: INK_INK, color: INK_CARD }}
      >
        多
      </div>
    )
  }
  return (
    <div className="relative size-[72px] shrink-0">
      {faces.map((ch, i) => {
        const src = resolveCharacterAvatarUrl(ch)
        const name = ch.name?.trim() || '未'
        return (
          <div
            key={ch.id}
            className="absolute overflow-hidden rounded-[12px] border-2"
            style={{
              borderColor: INK_CARD,
              background: '#D8D4CE',
              width: 40,
              height: 40,
              left: i * 10,
              top: i * 8,
              zIndex: faces.length - i,
              boxShadow: '0 4px 10px rgba(30,32,36,0.18)',
            }}
          >
            {src ? (
              <img src={src} alt="" className="size-full object-cover" />
            ) : (
              <div
                className="flex size-full items-center justify-center text-[13px] font-semibold"
                style={{ background: INK_INK, color: INK_CARD }}
              >
                {name.slice(0, 1)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function PersonaPackHubPage({
  packId,
  onBack,
  onOpenCharacter,
  onDeleted,
}: {
  packId: string
  onBack: () => void
  onOpenCharacter: (characterId: string) => void
  onDeleted: (removedCharacterIds: string[]) => void
}) {
  const [pack, setPack] = useState<PersonaPack | null>(null)
  const [romance, setRomance] = useState<Character[]>([])
  const [npcs, setNpcs] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [premise, setPremise] = useState('')
  const [sharedRules, setSharedRules] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [metaEditing, setMetaEditing] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const row = await personaDb.getPersonaPack(packId)
      setPack(row)
      if (!row) {
        setRomance([])
        setNpcs([])
        return
      }
      setTitle(row.title)
      setPremise(row.premise)
      setSharedRules(row.sharedRules)
      setDirty(false)
      setMetaEditing(false)
      const members: Character[] = []
      for (const id of row.memberIds) {
        const ch = await personaDb.getCharacter(id)
        if (ch) members.push(ch)
      }
      const npcRows: Character[] = []
      for (const id of row.npcIds) {
        const ch = await personaDb.getCharacter(id)
        if (ch) npcRows.push(ch)
      }
      setRomance(members)
      setNpcs(npcRows)
    } finally {
      setLoading(false)
    }
  }, [packId])

  useEffect(() => {
    void reload()
  }, [reload])

  const kindLabel = useMemo(
    () => personaPackPremiseLabel(pack?.premiseKind),
    [pack?.premiseKind],
  )

  const castAll = useMemo(() => [...romance, ...npcs], [romance, npcs])

  const saveMeta = async (exitEdit = false) => {
    if (!pack) return
    if (!dirty) {
      if (exitEdit) setMetaEditing(false)
      return
    }
    setSaving(true)
    try {
      const next: PersonaPack = {
        ...pack,
        title: title.trim() || kindLabel,
        premise: premise.trim(),
        sharedRules: sharedRules.trim(),
        updatedAt: Date.now(),
      }
      await personaDb.putPersonaPack(next)
      setPack(next)
      setTitle(next.title)
      setPremise(next.premise)
      setSharedRules(next.sharedRules)
      setDirty(false)
      if (exitEdit) setMetaEditing(false)
      emitWeChatStorageChanged()
    } finally {
      setSaving(false)
    }
  }

  const cancelMetaEdit = () => {
    if (!pack) {
      setMetaEditing(false)
      return
    }
    setTitle(pack.title)
    setPremise(pack.premise)
    setSharedRules(pack.sharedRules)
    setDirty(false)
    setMetaEditing(false)
  }

  const deletePack = async () => {
    if (!pack) return
    const ok = window.confirm(
      `确定删除整张「${pack.title || kindLabel}」？卡内 ${romance.length + npcs.length} 个角色人设也会一并删除。`,
    )
    if (!ok) return
    const removed = await personaDb.deletePersonaPackAndMembers(pack.id)
    emitWeChatStorageChanged()
    onDeleted(removed)
  }

  const goBack = () => {
    if (dirty) void saveMeta().finally(onBack)
    else onBack()
  }

  if (loading) {
    return (
      <div className="relative flex h-full items-center justify-center" style={{ background: INK_PAGE }}>
        <p className="font-mono text-[11px] tracking-[0.28em]" style={{ color: INK_FOIL }}>
          LOADING ARCHIVE…
        </p>
      </div>
    )
  }

  if (!pack) {
    return (
      <div className="relative flex h-full flex-col" style={{ background: INK_PAGE }}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
          <p className="font-serif text-[16px]" style={{ color: INK_INK }}>
            这张演出卡不存在或已删除
          </p>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-5 py-2.5 text-[13px] font-semibold"
            style={{ background: INK_INK, color: INK_CARD }}
          >
            返回名册
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden" style={{ background: INK_PAGE }}>
      <div
        className="sticky top-0 z-40 shrink-0"
        style={{ paddingTop: 'max(10px, env(safe-area-inset-top, 0px))', background: INK_PAGE }}
      >
        <div className="px-4 pb-2.5" style={{ background: INK_INK, color: INK_CARD }}>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl p-2 transition hover:bg-white/10"
              aria-label="返回"
            >
              <ArrowLeft className="size-5" style={{ color: INK_CARD }} />
            </button>
            <div className="min-w-0 flex-1 text-left">
              <p className="font-serif text-[10px] tracking-[0.26em] text-[#9AA0A8]">ENSEMBLE · PACK</p>
              <p className="truncate text-[14px] font-semibold text-[#F8F7F4]">
                {title.trim() || kindLabel}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void deletePack()}
                className="rounded-xl p-2 text-[#F0A8A8] transition hover:bg-white/10"
                aria-label="删除整张卡"
                title="删除整张卡"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-x-none px-3 pt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* 刊头封面 */}
        <article
          className="relative overflow-hidden rounded-[18px] border-[1.5px]"
          style={{ borderColor: INK_INK, background: INK_CARD }}
        >
          <div className="flex items-stretch gap-0">
            <div
              className="flex w-5 shrink-0 flex-col items-center justify-center gap-[2px] border-r py-4"
              style={{ borderColor: INK_INK, background: INK_PAGE }}
              aria-hidden
            >
              {Array.from({ length: 18 }, (_, i) => (
                <span
                  key={i}
                  className="w-[10px]"
                  style={{
                    height: i % 5 === 0 ? 2.5 : 1.2,
                    background: INK_INK,
                    opacity: i % 3 === 0 ? 0.9 : 0.35,
                  }}
                />
              ))}
            </div>
            <div className="min-w-0 flex-1 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={INK_KICKER}>ISSUE · 多人演出卡</p>
                  <h1 className="mt-2 font-serif text-[22px] font-semibold leading-tight tracking-tight" style={{ color: INK_INK }}>
                    {title.trim() || kindLabel}
                  </h1>
                  <p className={`${INK_LEAD} mt-2`}>
                    {kindLabel} · 可攻略 {romance.length} · NPC {npcs.length}
                  </p>
                  <p className="mt-2 max-w-prose text-[12px] font-light leading-relaxed" style={{ color: INK_MUTED }}>
                    卡内角色统一在此管理；微信仍是一人一会话。点成员进入完整人设编辑页。
                  </p>
                </div>
                <AvatarStack characters={castAll} />
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.08em]"
                  style={{ background: INK_INK, color: INK_CARD }}
                >
                  多人卡
                </span>
                <span
                  className="rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.08em]"
                  style={{ borderColor: INK_LINE, color: INK_FOIL }}
                >
                  {kindLabel}
                </span>
              </div>
            </div>
          </div>
        </article>

        <div className="mt-3 space-y-3">
          <InkPlate
            num="01"
            en="META"
            zh="演出设定"
            lead={
              metaEditing
                ? '编辑中：改完点「完成」写入档案。'
                : '标题、背景与共用规则落在整张卡上；点右上角编辑可改。'
            }
            right={
              metaEditing ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={cancelMetaEdit}
                    className="inline-flex items-center gap-1 rounded-full border border-[#8A909A] px-2.5 py-1 text-[11px] font-semibold text-[#F8F7F4] transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <X className="size-3" />
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveMeta(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#F8F7F4] px-2.5 py-1 text-[11px] font-semibold text-[#1E2024] transition hover:bg-white disabled:opacity-40"
                  >
                    <Check className="size-3" />
                    {saving ? '保存中' : '完成'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMetaEditing(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#8A909A] px-2.5 py-1 text-[11px] font-semibold text-[#F8F7F4] transition hover:bg-white/10"
                >
                  <Pencil className="size-3" />
                  编辑
                </button>
              )
            }
          >
            {metaEditing ? (
              <div className="space-y-3">
                <InkField labelEn="TITLE" labelZh="标题">
                  <input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setDirty(true)
                    }}
                    className={fieldClass}
                    style={fieldStyle}
                    placeholder={kindLabel}
                  />
                </InkField>
                <InkField labelEn="PREMISE" labelZh="背景">
                  <textarea
                    value={premise}
                    onChange={(e) => {
                      setPremise(e.target.value)
                      setDirty(true)
                    }}
                    rows={3}
                    className={`${fieldClass} resize-y leading-relaxed`}
                    style={fieldStyle}
                    placeholder="节目或岛上世界的一句话背景…"
                  />
                </InkField>
                <InkField labelEn="SHARED RULES" labelZh="共用规则">
                  <textarea
                    value={sharedRules}
                    onChange={(e) => {
                      setSharedRules(e.target.value)
                      setDirty(true)
                    }}
                    rows={3}
                    className={`${fieldClass} resize-y leading-relaxed`}
                    style={fieldStyle}
                    placeholder="淘汰、禁联系、岛规等全员共用约束…"
                  />
                </InkField>
              </div>
            ) : (
              <div className="space-y-4 px-1">
                <div>
                  <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em]" style={{ color: INK_FOIL }}>
                    TITLE · 标题
                  </p>
                  <p className="mt-1.5 font-serif text-[16px] font-semibold leading-snug" style={{ color: INK_INK }}>
                    {title.trim() || kindLabel}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em]" style={{ color: INK_FOIL }}>
                    PREMISE · 背景
                  </p>
                  <p
                    className="mt-1.5 whitespace-pre-wrap text-[13px] font-light leading-relaxed"
                    style={{ color: premise.trim() ? INK_INK : INK_MUTED }}
                  >
                    {premise.trim() || '暂未填写背景'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em]" style={{ color: INK_FOIL }}>
                    SHARED RULES · 共用规则
                  </p>
                  <p
                    className="mt-1.5 whitespace-pre-wrap text-[13px] font-light leading-relaxed"
                    style={{ color: sharedRules.trim() ? INK_INK : INK_MUTED }}
                  >
                    {sharedRules.trim() || '暂未填写共用规则'}
                  </p>
                </div>
              </div>
            )}
          </InkPlate>

          <InkPlate
            num="02"
            en="ROMANCE"
            zh="可攻略席"
            lead="点开进入单人同款人设编辑页（世界书、尾声、人脉）。"
            right={
              <span className="font-mono text-[18px] font-semibold tabular-nums text-[#9AA0A8]">
                {String(romance.length).padStart(2, '0')}
              </span>
            }
          >
            <div className="space-y-2">
              {romance.map((ch) => (
                <MemberCard
                  key={ch.id}
                  ch={ch}
                  seatLabel="可攻略"
                  seatEn="CAST"
                  onOpen={() => onOpenCharacter(ch.id)}
                />
              ))}
              {!romance.length ? (
                <p
                  className="rounded-[14px] border border-dashed px-3 py-8 text-center text-[12px]"
                  style={{ borderColor: INK_LINE, color: INK_MUTED }}
                >
                  暂无可攻略成员
                </p>
              ) : null}
            </div>
          </InkPlate>

          <InkPlate
            num="03"
            en="NPC"
            zh="节目组 / NPC"
            lead="默认不进通讯录；需要时再在人设里加入微信。"
            right={
              <span className="font-mono text-[18px] font-semibold tabular-nums text-[#9AA0A8]">
                {String(npcs.length).padStart(2, '0')}
              </span>
            }
          >
            <div className="space-y-2">
              {npcs.map((ch) => (
                <MemberCard
                  key={ch.id}
                  ch={ch}
                  seatLabel="NPC"
                  seatEn="NPC"
                  onOpen={() => onOpenCharacter(ch.id)}
                />
              ))}
              {!npcs.length ? (
                <p
                  className="rounded-[14px] border border-dashed px-3 py-8 text-center text-[12px]"
                  style={{ borderColor: INK_LINE, color: INK_MUTED }}
                >
                  暂无 NPC
                </p>
              ) : null}
            </div>
          </InkPlate>
        </div>

        <p className="mt-6 pb-2 text-center font-mono text-[10px] tracking-[0.18em]" style={{ color: INK_FOIL }}>
          ARCHIVE · DELETE PACK CLEARS ALL CAST
        </p>
      </div>
    </div>
  )
}
