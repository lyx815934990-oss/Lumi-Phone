import { useMemo, useRef, useState } from 'react'
import { Pressable } from '../../../../../components/Pressable'
import { GeometricAvatar, displayCallTitle } from '../components/GeometricAvatar'
import type { PhoneContact } from '../types'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

function initialOf(c: PhoneContact): string {
  const p = String(c.pinyinInitial || '').trim().toUpperCase()
  if (/^[A-Z]$/.test(p)) return p
  return '#'
}

export function ContactsListScreen({
  contacts,
  query,
  onOpenContact,
}: {
  contacts: PhoneContact[]
  query: string
  onOpenContact: (c: PhoneContact) => void
}) {
  const [active, setActive] = useState('A')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => {
      const hay = `${c.remarkName} ${c.displayName || ''} ${c.phoneNumber}`.toLowerCase()
      return hay.includes(q)
    })
  }, [contacts, query])

  const grouped = useMemo(() => {
    const map = new Map<string, PhoneContact[]>()
    for (const letter of LETTERS) map.set(letter, [])
    for (const c of filtered) {
      const key = initialOf(c)
      const bucket = map.get(key) || map.get('#')!
      bucket.push(c)
    }
    return LETTERS.map((letter) => ({ letter, rows: map.get(letter) || [] })).filter((g) => g.rows.length)
  }, [filtered])

  const jump = (letter: string) => {
    setActive(letter)
    sectionRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative h-full">
      <div className="phone-scroll h-full overflow-y-auto pb-28">
        {grouped.map(({ letter, rows }) => (
          <div
            key={letter}
            ref={(node) => {
              sectionRefs.current[letter] = node
            }}
          >
            <div className="phone-sticky-letter">{letter}</div>
            {rows.map((c, idx) => (
              <div key={c.id}>
                {idx > 0 ? <div className="ml-[72px] h-px bg-[var(--ph-line)]" /> : null}
                <Pressable
                  type="button"
                  className="flex h-[56px] w-full items-center gap-3 px-4 pr-8 text-left"
                  onClick={() => onOpenContact(c)}
                >
                  <GeometricAvatar contact={c} size={40} blocked={c.isBlocked} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-[var(--ph-ink)]">
                      {displayCallTitle(c.remarkName, c.displayName)}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--ph-mist)]">{c.phoneNumber}</div>
                  </div>
                </Pressable>
              </div>
            ))}
          </div>
        ))}
        {!grouped.length ? (
          <div className="px-4 pt-16 text-center text-[13px] text-[var(--ph-mist)]">暂无联系人</div>
        ) : null}
      </div>

      <div className="phone-index-rail" aria-label="字母索引">
        {LETTERS.map((letter) => (
          <button
            key={letter}
            type="button"
            data-active={active === letter ? 'true' : 'false'}
            onClick={() => jump(letter)}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  )
}
