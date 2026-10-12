import { ChevronLeft, Heart, Send } from 'lucide-react'

import type { WeChatPersonaContact } from '../../../types'
import './coupleSpaceTheme.css'

const UNLOCK_STEPS = [
  {
    title: '选择想邀请的好友',
    desc: '点下方按钮，打开邀请面板',
  },
  {
    title: '点「邀请」直接送出邀约卡',
    desc: '会跳进对方私聊并自动发出',
  },
  {
    title: '等待对方回应',
    desc: 'Ta 会按当下的关系，给你答案',
  },
] as const

/** 极简线稿花藤角标 20×20 */
function VineCorner({ mirror }: { mirror?: boolean }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M3.2 16.8C3.2 10.5 8.2 6.8 12.5 5.2"
        stroke="#EAC7BC"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path
        d="M3.5 12.2c2.2-.3 3.8-1.6 4.6-3.2"
        stroke="#EAC7BC"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path
        d="M11.2 5.6c.55-.95 1.7-1.55 2.85-1.35"
        stroke="#EAC7BC"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <circle cx="14.6" cy="4.15" r="1.05" stroke="#EAC7BC" strokeWidth={1.2} />
      <path
        d="M7.4 9.6c.15-1.1.85-2 1.75-2.45"
        stroke="#EAC7BC"
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.85}
      />
    </svg>
  )
}

/** 相连双环 · 羁绊 */
function BondRingsIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9.2" cy="12" r="4.6" stroke="#D9A9A0" strokeWidth={1.35} />
      <circle cx="14.8" cy="12" r="4.6" stroke="#D9A9A0" strokeWidth={1.35} />
    </svg>
  )
}

export function CoupleSpaceEmptyState({
  onBack,
  boundContacts = [],
  onEnterBound,
  onInviteClick,
}: {
  onBack: () => void
  boundContacts?: WeChatPersonaContact[]
  onEnterBound?: (characterId: string) => void
  onInviteClick?: () => void
}) {
  return (
    <div className="couple-space-empty-shell">
      <header className="couple-space-empty-nav">
        <button
          type="button"
          onClick={onBack}
          className="flex min-w-0 flex-1 items-center gap-[10px] text-left active:opacity-80"
          aria-label="返回"
        >
          <ChevronLeft className="h-[19px] w-[19px] shrink-0 text-[#4A3A35]" strokeWidth={1.75} />
          <span className="min-w-0">
            <span className="block text-[16px] font-semibold leading-tight text-[#4A3A35]">
              情侣空间
            </span>
            <span className="mt-px block text-[11px] leading-tight text-[#B99A8E]">尚未绑定</span>
          </span>
        </button>
        <Heart
          className="h-[18px] w-[18px] shrink-0 text-[#D9A9A0]"
          strokeWidth={1.5}
          fill="none"
          aria-hidden
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="couple-space-empty-hero">
          <span className="couple-space-vine couple-space-vine--tl" aria-hidden>
            <VineCorner />
          </span>
          <span className="couple-space-vine couple-space-vine--tr" aria-hidden>
            <VineCorner mirror />
          </span>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FBEFEA]">
            <BondRingsIcon />
          </div>
          <h2 className="couple-space-title mt-4 text-center text-[17px] font-semibold text-[#4A3A35]">
            还没有情侣空间
          </h2>
          <p className="mt-2 px-1.5 text-center text-[12.5px] leading-[1.7] text-[#B99A8E]">
            邀请对方，一起解锁属于你们的小天地
          </p>
        </div>

        <div className="mx-[22px] mt-[26px]">
          <p className="mb-[14px] text-[11px] font-medium tracking-[0.12em] text-[#C9A99C]">
            如何解锁 · HOW TO UNLOCK
          </p>
          <ol className="m-0 list-none p-0">
            {UNLOCK_STEPS.map((step, index) => {
              const isLast = index === UNLOCK_STEPS.length - 1
              return (
                <li
                  key={step.title}
                  className={`flex gap-3 ${isLast ? '' : 'mb-5'}`}
                >
                  <div className="relative flex w-[26px] shrink-0 flex-col items-center">
                    <span className="relative z-[1] flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#F7E2DB] text-[11px] font-semibold text-[#B87A6A]">
                      {index + 1}
                    </span>
                    {!isLast ? (
                      <span
                        className="absolute top-[26px] bottom-[-20px] w-px bg-[#F0DDD4]"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13.5px] font-medium leading-snug text-[#4A3A35]">
                      {step.title}
                    </p>
                    <p className="mt-[3px] text-[12px] leading-snug text-[#B99A8E]">{step.desc}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="mx-[22px] mt-[22px]">
          <button type="button" onClick={onInviteClick} className="couple-space-empty-cta">
            <Send className="h-[15px] w-[15px]" strokeWidth={1.75} aria-hidden />
            <span>选择好友发送邀请</span>
          </button>
        </div>

        {boundContacts.length > 0 ? (
          <div className="mx-[22px] mt-5 space-y-2">
            <p className="text-[11px] tracking-[0.12em] text-[#C9A99C]">已绑定</p>
            {boundContacts.map((c) => {
              const cid = c.characterId?.trim() || c.id
              const label = c.remarkName?.trim() || '对方'
              return (
                <button
                  key={cid}
                  type="button"
                  className="flex w-full items-center justify-between rounded-[14px] bg-white px-3.5 py-2.5 text-[13px] text-[#4A3A35] shadow-[0_2px_10px_rgba(196,140,120,0.08)] active:opacity-90"
                  onClick={() => onEnterBound?.(cid)}
                >
                  <span>{label}</span>
                  <span className="text-[11px] text-[#D99C90]">进入</span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
