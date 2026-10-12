import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'

import { useCoupleSpaceStore } from './useCoupleSpaceStore'
import './coupleSpaceTheme.css'

export function CoupleNicknameEditor({
  characterId,
  charName,
  userName,
  onBack,
}: {
  characterId: string
  charName: string
  userName: string
  onBack: () => void
}) {
  const room = useCoupleSpaceStore((s) => s.getRoom(characterId) ?? s.ensureRoom(characterId))
  const setNicknames = useCoupleSpaceStore((s) => s.setNicknames)
  const [mine, setMine] = useState(room?.nicknames.userToChar ?? '')
  const [theirs, setTheirs] = useState(room?.nicknames.charToUser ?? '')

  return (
    <div className="couple-space-root">
      <header className="couple-space-header">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5"
          aria-label="返回"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="couple-space-title text-[16px]">专属称呼卡</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <div className="couple-space-paper couple-space-lace-frame mt-2 rounded-2xl px-4 py-5">
          <label className="block text-[11px] text-[color:var(--cs-ink-muted)]">
            {userName} 叫 {charName}
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-[color:var(--cs-gold-soft)] bg-white/70 px-3 py-2.5 text-[14px] outline-none"
            value={mine}
            maxLength={16}
            placeholder="例如：宝贝、阿宁…"
            onChange={(e) => setMine(e.target.value)}
          />
          <label className="mt-4 block text-[11px] text-[color:var(--cs-ink-muted)]">
            {charName} 叫 {userName}
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-[color:var(--cs-gold-soft)] bg-white/70 px-3 py-2.5 text-[14px] outline-none"
            value={theirs}
            maxLength={16}
            placeholder="对方留下的称呼"
            onChange={(e) => setTheirs(e.target.value)}
          />
          <button
            type="button"
            className="mt-5 w-full rounded-full py-2.5 text-[13px] text-white"
            style={{
              background: 'linear-gradient(135deg, #d4a5ad 0%, #b89bc8 100%)',
            }}
            onClick={() => {
              setNicknames(characterId, { userToChar: mine, charToUser: theirs })
              onBack()
            }}
          >
            保存称呼卡
          </button>
        </div>
      </div>
    </div>
  )
}
