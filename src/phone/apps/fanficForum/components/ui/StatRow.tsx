import { FORUM } from '../../forumTheme'

export function StatRow({
  items,
  className = '',
}: {
  items: Array<{ value: number | string; label: string }>
  className?: string
}) {
  return (
    <div className={`flex items-end gap-5 ${className}`}>
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-1">
          <span
            className="font-semibold tabular-nums"
            style={{ fontSize: 15, color: FORUM.text, lineHeight: 1 }}
          >
            {it.value}
          </span>
          <span style={{ fontSize: FORUM.font.meta, color: FORUM.textMuted, lineHeight: 1 }}>
            {it.label}
          </span>
        </div>
      ))}
    </div>
  )
}
