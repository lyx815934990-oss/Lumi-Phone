import type { LangStudyBuddy } from './langStudyTypes'
import { LS } from './langStudyTheme'

type Props = {
  buddy: LangStudyBuddy | null
  line: string
  checkedIn: boolean
}

export function BuddyNudgeBanner({ buddy, line, checkedIn }: Props) {
  if (!buddy) return null

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border px-3 py-3"
      style={{
        borderColor: checkedIn ? LS.hairline : 'rgba(47,107,79,0.28)',
        background: checkedIn ? LS.card : LS.accentSoft,
      }}
    >
      <span
        className="mt-0.5 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-semibold"
        style={{ background: LS.soft, color: LS.accent }}
      >
        {buddy.avatarUrl ? (
          <img src={buddy.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          buddy.name.trim().slice(0, 1) || '?'
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: LS.mist }}>
          {checkedIn ? '搭子已放行' : 'App 内催更 · 非微信消息'}
        </p>
        <p className="mt-1 text-[14px] leading-snug" style={{ color: LS.ink }}>
          {checkedIn ? `${buddy.name}：今天达标了，先歇着。` : line}
        </p>
      </div>
    </div>
  )
}
