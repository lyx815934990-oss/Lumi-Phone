import type { SleepNightRecord } from '../types'

export function SleepSummaryCard({
  night,
  characterName,
}: {
  night: SleepNightRecord
  characterName?: string
}) {
  const initial = (characterName?.trim()?.[0] || '眠').toUpperCase()

  return (
    <div className="sleep-card px-4 py-5">
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--sleep-chip-border)] bg-[var(--sleep-chip)] text-[12px] tracking-[0.08em] text-[var(--sleep-accent)]"
          aria-hidden
        >
          {initial}
        </div>
        <div>
          <div className="text-[12px] tracking-[0.16em] text-[var(--sleep-muted)]">睡眠小结</div>
          <div className="text-[11px] text-[var(--sleep-muted-2)]">
            {characterName ? `${characterName} 的夜话` : '私密记录'}
          </div>
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-[var(--sleep-text)]">{night.summary}</p>
    </div>
  )
}
