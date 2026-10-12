/** 飘浮光点：低调氛围装饰，多颗错开 delay */
export function CoupleFloatParticles({
  count = 4,
  delays = [0, 1.4, 2, 2.7],
  bottoms = [10, 18, 6, 22],
  lefts = [18, 35, 52, 78],
  sizes = [5, 4, 6, 4],
}: {
  count?: number
  delays?: number[]
  bottoms?: number[]
  lefts?: number[]
  sizes?: number[]
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="cs-float-particle"
          style={{
            width: sizes[i] ?? 5,
            height: sizes[i] ?? 5,
            bottom: bottoms[i] ?? 12,
            left: `${lefts[i] ?? 20}%`,
            animationDelay: `${delays[i] ?? i * 0.8}s`,
            animationDuration: `${3.6 + (i % 3) * 0.3}s`,
          }}
          aria-hidden
        />
      ))}
    </>
  )
}

export function CoupleBondRingsIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9.2" cy="12" r="4.5" stroke="#D9A9A0" strokeWidth={1.35} />
      <circle cx="14.8" cy="12" r="4.5" stroke="#D9A9A0" strokeWidth={1.35} />
    </svg>
  )
}

/** 双人头像之间的仪式感羁绊线：描边流动 + 中心结印 */
export function CoupleBondThread({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`cs-bond-thread ${className}`.trim()}
      viewBox="0 0 64 40"
      width={64}
      height={40}
      fill="none"
      aria-hidden
    >
      <path
        className="cs-bond-thread__guide"
        d="M3 20 C16 20 20 11 32 20 C44 29 48 20 61 20"
      />
      <path
        className="cs-bond-thread__flow"
        d="M3 20 C16 20 20 11 32 20 C44 29 48 20 61 20"
      />
      <path
        className="cs-bond-thread__flow cs-bond-thread__flow--soft"
        d="M5 22 C17 22 21 14 32 22 C43 30 47 22 59 22"
      />
      <g className="cs-bond-thread__seal">
        <path d="M32 25.8 C32 25.8 24.6 20.6 24.6 16.4 C24.6 14.1 26.3 12.6 28.4 12.6 C30 12.6 31.2 13.5 32 14.8 C32.8 13.5 34 12.6 35.6 12.6 C37.7 12.6 39.4 14.1 39.4 16.4 C39.4 20.6 32 25.8 32 25.8 Z" />
      </g>
    </svg>
  )
}
