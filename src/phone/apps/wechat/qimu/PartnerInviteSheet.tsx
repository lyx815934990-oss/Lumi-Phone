import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Pressable } from '../../../components/Pressable'
import type { WeChatPersonaContact } from '../../../types'
import { qimuInk } from './theme'
import type { CurtainCastAssignment, CurtainCastSlot, CurtainQuest } from './types'

type Step = 'user-seat' | 'partner-seat' | 'contact'

type Props = {
  open: boolean
  quest: CurtainQuest | null
  contacts: WeChatPersonaContact[]
  loadingId: string | null
  onClose: () => void
  onInvite: (contact: WeChatPersonaContact, castAssignment?: CurtainCastAssignment) => void
}

function SeatList({
  seats,
  selectedId,
  disabledIds,
  onPick,
  hint,
}: {
  seats: CurtainCastSlot[]
  selectedId: string | null
  disabledIds: Set<string>
  onPick: (id: string) => void
  hint: string
}) {
  return (
    <div className="px-3 pb-2">
      <p className="mb-2 px-1 text-[11.5px]" style={{ color: qimuInk.mute }}>
        {hint}
      </p>
      <ul className="space-y-1.5">
        {seats.map((seat) => {
          const disabled = disabledIds.has(seat.id)
          const active = selectedId === seat.id
          return (
            <li key={seat.id}>
              <Pressable
                type="button"
                disabled={disabled}
                onClick={() => onPick(seat.id)}
                className="w-full rounded-[14px] border px-3.5 py-3 text-left active:opacity-90 disabled:opacity-40"
                style={{
                  borderColor: active ? 'rgba(0,0,0,0.22)' : qimuInk.line,
                  background: active ? '#fff' : qimuInk.surface,
                  boxShadow: active ? '0 1px 10px rgba(0,0,0,0.04)' : 'none',
                }}
              >
                <p className="text-[14px] font-semibold" style={{ color: qimuInk.title }}>
                  {seat.title}
                </p>
                <p className="mt-1 text-[12px] leading-[1.55]" style={{ color: qimuInk.body }}>
                  {seat.brief}
                </p>
              </Pressable>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function PartnerInviteSheet({
  open,
  quest,
  contacts,
  loadingId,
  onClose,
  onInvite,
}: Props) {
  const cast = quest?.cast
  const hasCast = (cast?.length ?? 0) >= 3
  const [step, setStep] = useState<Step>(hasCast ? 'user-seat' : 'contact')
  const [userSlotId, setUserSlotId] = useState<string | null>(null)
  const [partnerSlotId, setPartnerSlotId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setUserSlotId(null)
    setPartnerSlotId(null)
    setStep((quest?.cast?.length ?? 0) >= 3 ? 'user-seat' : 'contact')
  }, [open, quest?.id, quest?.cast?.length])

  const assignment = useMemo((): CurtainCastAssignment | undefined => {
    if (!hasCast || !cast || !userSlotId || !partnerSlotId) return undefined
    return {
      userSlotId,
      partnerSlotId,
      npcSlotIds: cast.filter((s) => s.id !== userSlotId && s.id !== partnerSlotId).map((s) => s.id),
    }
  }, [cast, hasCast, partnerSlotId, userSlotId])

  const npcPreview = useMemo(() => {
    if (!cast || !assignment) return []
    return assignment.npcSlotIds
      .map((id) => cast.find((s) => s.id === id)?.title)
      .filter(Boolean) as string[]
  }, [assignment, cast])

  const stepLabel =
    step === 'user-seat' ? '选你的席位' : step === 'partner-seat' ? '选同行者席位' : '邀请同行者'

  return (
    <AnimatePresence>
      {open && quest ? (
        <motion.div
          className="absolute inset-0 z-30 flex items-end justify-center"
          style={{ background: qimuInk.scrim }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="flex max-h-[82%] w-full max-w-[420px] flex-col overflow-hidden rounded-t-[22px]"
            style={{
              background: qimuInk.glass,
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: `1px solid ${qimuInk.line}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-3 px-5 pb-3 pt-4"
              style={{ borderBottom: `1px solid ${qimuInk.line}` }}
            >
              <div className="min-w-0">
                <p
                  className="text-[11px] tracking-[0.12em]"
                  style={{ color: qimuInk.mute, fontFamily: qimuInk.mono }}
                >
                  同幕邀请 · {stepLabel}
                </p>
                <p
                  className="mt-1 text-[16px] font-semibold"
                  style={{ color: qimuInk.title, fontFamily: qimuInk.display }}
                >
                  {quest.theme}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed" style={{ color: qimuInk.body }}>
                  {hasCast
                    ? `${cast!.length} 席任选其二；其余自动化为校园 NPC。`
                    : '从通讯录选一位同行者，发出同幕连结。'}
                </p>
              </div>
              <Pressable
                type="button"
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: qimuInk.iconBg, color: qimuInk.body }}
                aria-label="关闭"
              >
                <X className="size-4" strokeWidth={1.75} />
              </Pressable>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {step === 'user-seat' && cast ? (
                <SeatList
                  seats={cast}
                  selectedId={userSlotId}
                  disabledIds={new Set()}
                  hint="先选你要披上的身份"
                  onPick={(id) => {
                    setUserSlotId(id)
                    if (partnerSlotId === id) setPartnerSlotId(null)
                    setStep('partner-seat')
                  }}
                />
              ) : null}

              {step === 'partner-seat' && cast ? (
                <>
                  <SeatList
                    seats={cast}
                    selectedId={partnerSlotId}
                    disabledIds={new Set(userSlotId ? [userSlotId] : [])}
                    hint={`你已选「${cast.find((s) => s.id === userSlotId)?.title ?? ''}」· 再选同行者的席位`}
                    onPick={(id) => {
                      setPartnerSlotId(id)
                      setStep('contact')
                    }}
                  />
                  <div className="px-4 pb-2">
                    <Pressable
                      type="button"
                      onClick={() => setStep('user-seat')}
                      className="text-[12px]"
                      style={{ color: qimuInk.mute }}
                    >
                      返回重选自己的席位
                    </Pressable>
                  </div>
                </>
              ) : null}

              {step === 'contact' ? (
                <>
                  {hasCast && npcPreview.length > 0 ? (
                    <div className="mx-3 mb-2 rounded-[12px] px-3 py-2.5" style={{ background: qimuInk.surface }}>
                      <p className="text-[11px] tracking-wide" style={{ color: qimuInk.mute }}>
                        将化为 NPC
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: qimuInk.body }}>
                        {npcPreview.join(' · ')}
                      </p>
                      <Pressable
                        type="button"
                        onClick={() => setStep('partner-seat')}
                        className="mt-2 text-[12px]"
                        style={{ color: qimuInk.mute }}
                      >
                        返回改选席位
                      </Pressable>
                    </div>
                  ) : null}
                  <ul className="px-3">
                    {contacts.length === 0 ? (
                      <li className="px-3 py-8 text-center text-[13px]" style={{ color: qimuInk.mute }}>
                        通讯录暂无可用角色
                      </li>
                    ) : (
                      contacts.map((c) => {
                        const busy = loadingId === c.characterId
                        const partnerTitle =
                          (hasCast && cast
                            ? cast.find((s) => s.id === partnerSlotId)?.title
                            : quest.roles.charRole) ?? quest.roles.charRole
                        const canStart = !hasCast || (!!userSlotId && !!partnerSlotId)
                        return (
                          <li key={c.id}>
                            <Pressable
                              type="button"
                              disabled={!!loadingId || !canStart}
                              onClick={() => onInvite(c, assignment)}
                              className="mb-1 flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left active:bg-black/[0.03] disabled:opacity-55"
                            >
                              <span
                                className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-medium"
                                style={{ background: qimuInk.iconBg, color: qimuInk.title }}
                              >
                                {c.avatarUrl ? (
                                  <img src={c.avatarUrl} alt="" className="size-full object-cover" />
                                ) : (
                                  (c.remarkName || '?').slice(0, 1)
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className="block truncate text-[14.5px] font-medium"
                                  style={{ color: qimuInk.title }}
                                >
                                  {c.remarkName || '未命名'}
                                </span>
                                <span className="mt-0.5 block text-[11.5px]" style={{ color: qimuInk.mute }}>
                                  {busy ? '正在入幕…' : `将以「${partnerTitle}」同台`}
                                </span>
                              </span>
                            </Pressable>
                          </li>
                        )
                      })
                    )}
                  </ul>
                </>
              ) : null}
            </div>
            <div className="h-[max(12px,env(safe-area-inset-bottom))]" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
