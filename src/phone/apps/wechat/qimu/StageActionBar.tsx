import { AnimatePresence, motion } from 'framer-motion'
import { Clock3, History, MapPin, UserRound, Users } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Pressable } from '../../../components/Pressable'
import { resolveQuestLocations } from './locations'
import { useCurtainStore } from './store'
import { qimuInk } from './theme'

type SheetKind = 'location' | 'companion' | 'status' | null

function ActionChip({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Pressable
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-[4.55rem] shrink-0 flex-col items-center gap-1 rounded-[10px] px-1 py-2 active:opacity-80 disabled:opacity-40"
      style={{
        background: active ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.55)',
        border: `1px solid ${active ? 'rgba(0,0,0,0.16)' : qimuInk.line}`,
      }}
    >
      <span style={{ color: qimuInk.title }}>{icon}</span>
      <span className="text-[10px] font-medium leading-tight" style={{ color: qimuInk.body }}>
        {label}
      </span>
    </Pressable>
  )
}

function SheetShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.42)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="flex max-h-[78%] w-full max-w-[420px] flex-col overflow-hidden rounded-t-[18px]"
        style={{
          background: qimuInk.glass,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: `1px solid ${qimuInk.line}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
          <div className="min-w-0">
            <p
              className="text-[11px] tracking-[0.12em]"
              style={{ color: qimuInk.mute, fontFamily: qimuInk.mono }}
            >
              STAGE ACTION
            </p>
            <p
              className="mt-1 text-[16px] font-semibold"
              style={{ color: qimuInk.title, fontFamily: qimuInk.display }}
            >
              {title}
            </p>
            {subtitle ? (
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: qimuInk.body }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <Pressable
            type="button"
            onClick={onClose}
            className="rounded-full px-2.5 py-1 text-[12px]"
            style={{ background: qimuInk.iconBg, color: qimuInk.body }}
          >
            关闭
          </Pressable>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(14px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

type Props = {
  disabled?: boolean
  isWing?: boolean
  /** 打开全屏 VN 回放（由舞台根节点渲染） */
  onOpenReplay?: () => void
}

/** 输入框上方：推进时间 / 地点 / 结伴 / 状态 / 回放 */
export function StageActionBar({ disabled, isWing, onOpenReplay }: Props) {
  const dive = useCurtainStore((s) => s.dive)
  const advanceTime = useCurtainStore((s) => s.advanceTime)
  const goToLocation = useCurtainStore((s) => s.goToLocation)
  const setCompanions = useCurtainStore((s) => s.setCompanions)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [draftCompanions, setDraftCompanions] = useState<string[]>([])

  const locations = useMemo(
    () => (dive ? resolveQuestLocations(dive.quest) : []),
    [dive],
  )

  if (!dive) return null

  const currentLoc =
    locations.find((l) => l.id === dive.currentLocationId)?.name ?? '未选定地点'
  const companionTitles = dive.companionSlotIds
    .map((id) => dive.actorStatuses.find((a) => a.slotId === id)?.title)
    .filter(Boolean) as string[]

  const openCompanion = () => {
    setDraftCompanions([...dive.companionSlotIds])
    setSheet('companion')
  }

  const periodLabel = (p?: string) => {
    if (p === 'day') return '白天'
    if (p === 'dusk') return '黄昏'
    if (p === 'night') return '夜晚'
    return '全天'
  }

  return (
    <>
      <div
        className="mb-2 rounded-[12px] border px-2 py-2"
        style={{
          background: isWing ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
          borderColor: isWing ? 'rgba(255,255,255,0.1)' : qimuInk.line,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
          <p
            className="truncate text-[10.5px]"
            style={{ color: isWing ? 'rgba(255,255,255,0.45)' : qimuInk.mute }}
          >
            现地 · {currentLoc}
          </p>
          <p
            className="shrink-0 truncate text-[10.5px]"
            style={{ color: isWing ? 'rgba(255,255,255,0.45)' : qimuInk.mute }}
          >
            结伴 · {companionTitles.length ? companionTitles.join('、') : '独自'}
          </p>
        </div>
        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ActionChip
            disabled={disabled}
            icon={<Clock3 className="size-3.5" strokeWidth={1.75} />}
            label="推进时间"
            onClick={() => advanceTime()}
          />
          <ActionChip
            disabled={disabled}
            active={sheet === 'location'}
            icon={<MapPin className="size-3.5" strokeWidth={1.75} />}
            label="前往地点"
            onClick={() => setSheet('location')}
          />
          <ActionChip
            disabled={disabled}
            active={sheet === 'companion'}
            icon={<Users className="size-3.5" strokeWidth={1.75} />}
            label="选择结伴"
            onClick={openCompanion}
          />
          <ActionChip
            disabled={disabled}
            active={sheet === 'status'}
            icon={<UserRound className="size-3.5" strokeWidth={1.75} />}
            label="角色状态"
            onClick={() => setSheet('status')}
          />
          <ActionChip
            disabled={disabled}
            icon={<History className="size-3.5" strokeWidth={1.75} />}
            label="历史"
            onClick={() => onOpenReplay?.()}
          />
        </div>
      </div>

      <AnimatePresence>
        {sheet === 'location' ? (
          <SheetShell
            title="选择前往地点"
            subtitle="选定后旁白会记录移动；幕前对白将贴合现地。"
            onClose={() => setSheet(null)}
          >
            <ul className="space-y-1.5 pb-2">
              {locations.map((l) => {
                const active = dive.currentLocationId === l.id
                return (
                  <li key={l.id}>
                    <Pressable
                      type="button"
                      onClick={() => {
                        goToLocation(l.id)
                        setSheet(null)
                      }}
                      className="w-full rounded-[12px] border px-3.5 py-3 text-left active:opacity-90"
                      style={{
                        borderColor: active ? 'rgba(0,0,0,0.22)' : qimuInk.line,
                        background: active ? 'rgba(0,0,0,0.04)' : '#fff',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13.5px] font-medium" style={{ color: qimuInk.title }}>
                          {l.name}
                        </p>
                        <span className="text-[10.5px]" style={{ color: qimuInk.mute }}>
                          {periodLabel(l.period)}
                        </span>
                      </div>
                      {l.brief ? (
                        <p className="mt-1 text-[11.5px]" style={{ color: qimuInk.body }}>
                          {l.brief}
                        </p>
                      ) : null}
                    </Pressable>
                  </li>
                )
              })}
            </ul>
          </SheetShell>
        ) : null}

        {sheet === 'companion' ? (
          <SheetShell
            title="选择结伴"
            subtitle="可多选同行者与场上 NPC；不选则独自行动。"
            onClose={() => setSheet(null)}
          >
            <ul className="space-y-1.5 pb-2">
              {dive.actorStatuses.map((a) => {
                const on = draftCompanions.includes(a.slotId)
                return (
                  <li key={a.slotId}>
                    <Pressable
                      type="button"
                      onClick={() => {
                        setDraftCompanions((prev) =>
                          prev.includes(a.slotId)
                            ? prev.filter((id) => id !== a.slotId)
                            : [...prev, a.slotId],
                        )
                      }}
                      className="w-full rounded-[12px] border px-3.5 py-3 text-left active:opacity-90"
                      style={{
                        borderColor: on ? 'rgba(0,0,0,0.22)' : qimuInk.line,
                        background: on ? 'rgba(0,0,0,0.04)' : '#fff',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13.5px] font-medium" style={{ color: qimuInk.title }}>
                          {a.title}
                        </p>
                        <span className="text-[10.5px]" style={{ color: qimuInk.mute }}>
                          {a.kind === 'partner' ? '同行者' : 'NPC'}
                          {on ? ' · 已选' : ''}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px]" style={{ color: qimuInk.body }}>
                        {a.whereabouts} · {a.status}
                      </p>
                    </Pressable>
                  </li>
                )
              })}
            </ul>
            <Pressable
              type="button"
              onClick={() => {
                setCompanions(draftCompanions)
                setSheet(null)
              }}
              className="mb-2 w-full rounded-full py-3 text-center text-[13.5px] font-semibold"
              style={{ background: qimuInk.title, color: '#f7f7f7' }}
            >
              确认结伴
            </Pressable>
          </SheetShell>
        ) : null}

        {sheet === 'status' ? (
          <SheetShell
            title="其他角色状态"
            subtitle="推进时间后状态与行踪会刷新。"
            onClose={() => setSheet(null)}
          >
            <ul className="space-y-1.5 pb-2">
              {dive.actorStatuses.map((a) => (
                <li
                  key={a.slotId}
                  className="rounded-[12px] border px-3.5 py-3"
                  style={{ borderColor: qimuInk.line, background: '#fff' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-medium" style={{ color: qimuInk.title }}>
                      {a.title}
                    </p>
                    <span className="text-[10.5px]" style={{ color: qimuInk.mute }}>
                      {a.kind === 'partner' ? '同行者' : 'NPC'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: qimuInk.body }}>
                    行踪 · {a.whereabouts}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: qimuInk.body }}>
                    状态 · {a.status}
                  </p>
                </li>
              ))}
              {!dive.actorStatuses.length ? (
                <p className="px-2 py-6 text-center text-[12px]" style={{ color: qimuInk.mute }}>
                  本笺暂无其他席位状态
                </p>
              ) : null}
            </ul>
          </SheetShell>
        ) : null}
      </AnimatePresence>
    </>
  )
}
