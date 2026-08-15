import { ListenNumericText } from '../../../../components/discoverListen/ListenNum'
import {
  ARCHIVE_SOURCE_OFFLINE_LABEL,
  ARCHIVE_SOURCE_ONLINE_LABEL,
} from './memoryArchiveSourceLabels'

export type MemoryCharacterSourceTab = 'online' | 'offline'

export function MemoryCharacterSourceTabNav({
  value,
  onChange,
  onlineCount,
  offlineCount,
}: {
  value: MemoryCharacterSourceTab
  onChange: (tab: MemoryCharacterSourceTab) => void
  onlineCount: number
  offlineCount: number
}) {
  const tabs: ReadonlyArray<{ id: MemoryCharacterSourceTab; label: string; count: number }> = [
    { id: 'online', label: ARCHIVE_SOURCE_ONLINE_LABEL, count: onlineCount },
    { id: 'offline', label: ARCHIVE_SOURCE_OFFLINE_LABEL, count: offlineCount },
  ]

  return (
    <nav
      data-memory-coach="detail-source-tabs"
      className="grid w-full grid-cols-2 border-b border-black/[0.06]"
      role="tablist"
      aria-label="角色总结来源"
    >
      {tabs.map((tab) => {
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className="relative flex w-full flex-col items-center px-1 pb-2.5 pt-1 text-center"
          >
            <span
              className="block w-full truncate text-[13px] transition-colors"
              style={{
                color: active ? '#111' : '#8A8A8E',
                fontWeight: active ? 600 : 450,
              }}
            >
              {tab.label}
            </span>
            <span
              className="mt-0.5 block text-[10px] tabular-nums"
              style={{ color: active ? '#555' : '#B0B0B4' }}
            >
              <ListenNumericText text={`${tab.count} 条`} />
            </span>
            {active ? (
              <span
                className="absolute bottom-0 left-1/2 h-[2px] w-10 -translate-x-1/2 rounded-full bg-[#111]"
                aria-hidden
              />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
