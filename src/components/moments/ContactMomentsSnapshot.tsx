import { ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Pressable } from '../../phone/components/Pressable'

import { MomentBodyText } from './ArchiveTimelineDateColumn'
import {
  pickContactMomentSnapshots,
  type ContactMomentSnapshotCell,
} from './contactMomentsSnapshotUtils'
import { loadUserMoments } from './momentsFeedStorage'
import type { MomentContactRef } from './newMomentTypes'
import { useResolvedMomentImages } from './resolveMomentImageSrc'

type ContactMomentsSnapshotProps = {
  characterId: string
  accountId?: string | null
  momentContacts?: MomentContactRef[]
  blockedCharacterIds?: Set<string>
  onOpenArchive: () => void
}

const EMPTY_MOMENT_CONTACTS: MomentContactRef[] = []
const EMPTY_BLOCKED = new Set<string>()

function SnapshotImageCell({ src }: { src: string }) {
  const resolved = useResolvedMomentImages([src])
  const displaySrc = resolved[0]?.trim() ?? ''

  return (
    <div
      className="relative size-[58px] shrink-0 overflow-hidden rounded-[14px]"
      style={{
        background: 'rgba(16,16,18,0.04)',
        boxShadow: 'inset 0 0 0 1px rgba(16,16,18,0.04)',
      }}
    >
      {displaySrc ? (
        <img src={displaySrc} alt="" className="size-full object-cover" />
      ) : (
        <div className="size-full" style={{ background: 'rgba(16,16,18,0.05)' }} />
      )}
    </div>
  )
}

function SnapshotCell({ cell }: { cell: ContactMomentSnapshotCell }) {
  if (cell.kind === 'image') {
    return <SnapshotImageCell src={cell.src} />
  }

  return (
    <div
      className="flex size-[58px] shrink-0 items-center justify-center rounded-[14px] px-1.5"
      style={{ background: 'rgba(16,16,18,0.035)' }}
    >
      <MomentBodyText
        text={cell.preview}
        className="line-clamp-2 text-center text-[10px] leading-relaxed text-[#6B6B70]"
      />
    </div>
  )
}

function cellsFingerprint(cells: ContactMomentSnapshotCell[]): string {
  return cells.map((c) => (c.kind === 'image' ? `i:${c.id}:${c.src}` : `t:${c.id}:${c.preview}`)).join('|')
}

export function ContactMomentsSnapshot({
  characterId,
  accountId,
  momentContacts = EMPTY_MOMENT_CONTACTS,
  blockedCharacterIds = EMPTY_BLOCKED,
  onOpenArchive,
}: ContactMomentsSnapshotProps) {
  const [cells, setCells] = useState<ContactMomentSnapshotCell[]>([])
  /** 仅首次拉取显示占位，避免 storage 事件反复把板块打回骨架导致跳动 */
  const [initialLoading, setInitialLoading] = useState(true)
  const hasLoadedOnceRef = useRef(false)
  const momentContactsRef = useRef(momentContacts)
  const blockedRef = useRef(blockedCharacterIds)
  momentContactsRef.current = momentContacts
  blockedRef.current = blockedCharacterIds

  const refresh = useCallback(async () => {
    const showSkeleton = !hasLoadedOnceRef.current
    if (showSkeleton) setInitialLoading(true)
    try {
      const all = await loadUserMoments(accountId)
      const next = pickContactMomentSnapshots(
        all,
        characterId,
        momentContactsRef.current,
        blockedRef.current,
      )
      setCells((prev) => (cellsFingerprint(prev) === cellsFingerprint(next) ? prev : next))
    } catch {
      setCells((prev) => (prev.length === 0 ? prev : []))
    } finally {
      hasLoadedOnceRef.current = true
      setInitialLoading(false)
    }
  }, [accountId, characterId])

  useEffect(() => {
    void refresh()
    let timer: number | null = null
    const onStorage = () => {
      // wechat-storage-changed 很密：合并成一次静默刷新，避免板块闪烁
      if (timer != null) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = null
        void refresh()
      }, 280)
    }
    window.addEventListener('wechat-storage-changed', onStorage)
    return () => {
      if (timer != null) window.clearTimeout(timer)
      window.removeEventListener('wechat-storage-changed', onStorage)
    }
  }, [refresh])

  return (
    <Pressable
      type="button"
      onClick={onOpenArchive}
      className="w-full px-4 py-4 text-left transition-colors active:bg-black/[0.02]"
    >
      <div className="flex items-center gap-3.5">
        <div className="shrink-0">
          <p className="text-[14px] font-medium text-[#101012]">朋友圈</p>
          <p className="mt-0.5 text-[9px] font-medium tracking-[0.18em] text-[#8B8B8F]">MOMENTS</p>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex min-h-[58px] min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {initialLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="size-[58px] shrink-0 rounded-[14px]"
                  style={{ background: 'rgba(16,16,18,0.05)' }}
                />
              ))
            ) : cells.length ? (
              cells.map((cell) => <SnapshotCell key={cell.id} cell={cell} />)
            ) : (
              <p className="text-[12px] text-[#8B8B8F]">暂无可见动态</p>
            )}
          </div>
          <ChevronRight className="size-4 shrink-0 text-[#C4C4C6]" strokeWidth={1.5} aria-hidden />
        </div>
      </div>
    </Pressable>
  )
}
