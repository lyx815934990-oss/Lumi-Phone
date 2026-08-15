export function HighlightText({
  text,
  query,
  className = '',
}: {
  text: string
  query: string
  className?: string
}) {
  const q = query.trim()
  if (!q) return <span className={className}>{text}</span>
  const parts: Array<{ t: string; hit: boolean }> = []
  let rest = text
  const lowerQ = q.toLowerCase()
  while (rest.length) {
    const idx = rest.toLowerCase().indexOf(lowerQ)
    if (idx < 0) {
      parts.push({ t: rest, hit: false })
      break
    }
    if (idx > 0) parts.push({ t: rest.slice(0, idx), hit: false })
    parts.push({ t: rest.slice(idx, idx + q.length), hit: true })
    rest = rest.slice(idx + q.length)
  }
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.hit ? (
          <span key={i} className="browser-hl">
            {p.t}
          </span>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </span>
  )
}
