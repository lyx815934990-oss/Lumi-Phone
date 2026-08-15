import { useMemo } from 'react'
import { Pressable } from '../../../../../components/Pressable'
import { WebPageThumb } from '../components/WebPageThumb'
import type { HistoryGroup, SharedPageRecord } from '../types'

const GROUP_LABEL: Record<HistoryGroup, string> = {
  today: '今天',
  yesterday: '昨天',
  earlier: '更早',
}

export function SharedRecordsScreen({
  items,
  characterName,
  onOpen,
}: {
  items: SharedPageRecord[]
  characterName?: string
  onOpen: (item: SharedPageRecord) => void
}) {
  const groups = useMemo(() => {
    const order: HistoryGroup[] = ['today', 'yesterday', 'earlier']
    return order
      .map((g) => ({ group: g, rows: items.filter((i) => i.group === g) }))
      .filter((g) => g.rows.length)
  }, [items])

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-2">
        <div className="text-[17px] font-medium text-[var(--br-ink)]">分享网页记录</div>
        <div className="mt-1 text-[12px] text-[var(--br-mist)]">
          {characterName ? `${characterName} 发出过的链接痕迹` : '角色发出过的链接痕迹'}
        </div>
      </div>

      <div className="browser-scroll flex-1 overflow-y-auto pb-28">
        {groups.map(({ group, rows }) => (
          <div key={group}>
            <div className="sticky top-0 z-[1] bg-[var(--br-paper)]/95 px-4 py-2 backdrop-blur-sm">
              <div className="browser-mono text-[12px] text-[var(--br-mist)]">{GROUP_LABEL[group]}</div>
            </div>
            <div className="browser-trace">
              {rows.map((item, idx) => (
                <div key={item.id}>
                  {idx > 0 ? <div className="ml-7 h-px bg-[var(--br-hairline)]" /> : null}
                  <Pressable
                    type="button"
                    className="relative flex w-full items-start gap-3 py-3.5 pr-4 text-left"
                    onClick={() => onOpen(item)}
                  >
                    <span className="browser-trace-dot browser-trace-dot--solid top-[22px]" aria-hidden />
                    <WebPageThumb
                      className="mt-0.5 h-12 w-[72px] shrink-0 !rounded-[8px]"
                      compact
                      title={item.title}
                      seed={item.id}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] text-[var(--br-ink)]">{item.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[var(--br-mist)]">
                        <span>{item.channel}</span>
                        <span className="browser-mono">{item.timeLabel}</span>
                      </div>
                      {item.caption ? (
                        <div className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-[var(--br-ink)]/80">
                          “{item.caption}”
                        </div>
                      ) : null}
                      <div className="browser-mono mt-1 truncate text-[11px] text-[var(--br-mist)]">{item.host}</div>
                    </div>
                  </Pressable>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!items.length ? (
          <div className="px-4 pt-16 text-center text-[13px] text-[var(--br-mist)]">还没有分享网页的痕迹</div>
        ) : null}
      </div>
    </div>
  )
}
