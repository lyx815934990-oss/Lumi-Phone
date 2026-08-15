import { ChevronRight, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { ListenNumericText } from '../../../../components/discoverListen/ListenNum'
import type { MemoryCharacterRosterItem, MemorySceneTag } from './memoryArchiveTypes'
import {
  ARCHIVE_COVER_FALLBACK_BG,
  ARCHIVE_MAG_STAT,
  ARCHIVE_ROSTER_ROW,
  ARCHIVE_SOFT_CHIP,
} from './memoryArchiveTheme'
import {
  ARCHIVE_SOURCE_OFFLINE_LABEL,
  ARCHIVE_SOURCE_ONLINE_LABEL,
} from './memoryArchiveSourceLabels'
import { memorySceneFilterLabel } from './memorySceneChipStyles'
import type { MemoryUnifiedRosterItem } from './memoryUnifiedSummaryArchive'

const ROSTER_TAG_PRIORITY: MemorySceneTag[] = ['日记', '私聊', '群聊', '微博', '朋友圈', '遇见', '线下', '关联线下']

function pickRosterSceneTags(tags: MemorySceneTag[], max = 2): MemorySceneTag[] {
  const set = new Set(tags)
  const ordered = ROSTER_TAG_PRIORITY.filter((t) => set.has(t))
  if (ordered.length >= max) return ordered.slice(0, max)
  for (const t of tags) {
    if (!ordered.includes(t) && ordered.length < max) ordered.push(t)
  }
  return ordered
}

export function MemoryCharacterRoster({
  items,
  loading,
  searchQuery,
  onSelect,
  subtitleForCount,
  monochromeSceneTags = false,
  plainNumericBadge = false,
  showArchiveSourceLabels = false,
  firstItemCoachTarget = 'roster',
}: {
  items: (MemoryCharacterRosterItem | MemoryUnifiedRosterItem)[]
  loading: boolean
  searchQuery: string
  onSelect: (charId: string) => void
  /** 列表副标题；默认「共 N 条记忆」 */
  subtitleForCount?: (count: number) => string
  /** 第一项的高亮引导 id；默认 roster */
  firstItemCoachTarget?: string
  /** 为 true 时场景标签用柔和灰阶，不显示彩色 chip（封面风统一为半透明白字） */
  monochromeSceneTags?: boolean
  /** 为 true 时角标数字用系统默认字体；默认走全局衬线数字（ListenNumericText） */
  plainNumericBadge?: boolean
  /** 为 true 时在卡片上展示「线上总结 / 线下摘要」来源标签 */
  showArchiveSourceLabels?: boolean
}) {
  void monochromeSceneTags

  if (loading) {
    return (
      <div className="flex min-h-[36vh] flex-col items-center justify-center gap-3 px-5 py-16">
        <div className="h-7 w-7 animate-pulse rounded-full bg-black/[0.08]" />
        <p className="text-[12px] text-[#8A8A8E]">加载角色列表…</p>
      </div>
    )
  }

  if (!items.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-sm px-6 py-20 text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <Users className="size-6 text-[#D0D0D4]" strokeWidth={1.25} />
        </div>
        <p className="text-[15px] font-semibold text-[#111]">
          {searchQuery.trim() ? '无匹配角色' : '暂无角色记忆'}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8A8A8E]">
          {searchQuery.trim()
            ? '试试换个检索词，或切换上方查看账号。'
            : '自动总结或手动刻录后，会按角色出现在这里。'}
        </p>
      </motion.div>
    )
  }

  return (
    <ul className="mx-auto flex w-full max-w-xl flex-col gap-2.5 px-4 pb-10 pt-1">
      {items.map((item, i) => {
        const isGroup = item.charId.startsWith('__group__')
        const displayTags = pickRosterSceneTags(item.sceneTags)
        const extraTagCount = Math.max(0, item.sceneTags.length - displayTags.length)
        const unified = showArchiveSourceLabels ? (item as MemoryUnifiedRosterItem) : null
        const onlineCount = unified?.onlineMemoryCount ?? 0
        const offlineCount = unified?.offlineRowCount ?? 0
        const countLabel =
          subtitleForCount?.(item.memoryCount) ??
          (showArchiveSourceLabels ? `共 ${item.memoryCount} 条记录` : `共 ${item.memoryCount} 条记忆`)

        return (
          <motion.li
            key={item.charId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.16), duration: 0.24 }}
          >
            <button
              type="button"
              data-memory-coach={i === 0 ? firstItemCoachTarget : undefined}
              onClick={() => onSelect(item.charId)}
              className={ARCHIVE_ROSTER_ROW}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px]">
                {item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: ARCHIVE_COVER_FALLBACK_BG }}
                  >
                    {isGroup ? (
                      <Users className="size-5 text-white/40" strokeWidth={1.25} aria-hidden />
                    ) : (
                      <span className="text-[15px] font-semibold tracking-tight text-white/70">
                        {item.displayName.slice(0, 2)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-[#111]">
                    {item.displayName}
                  </p>
                  <span className="shrink-0 rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#555]">
                    {plainNumericBadge ? (
                      String(item.memoryCount)
                    ) : (
                      <ListenNumericText text={String(item.memoryCount)} />
                    )}
                  </span>
                </div>

                {item.wechatRemarkName ? (
                  <p className="mt-0.5 truncate text-[12px] text-[#8A8A8E]">备注 {item.wechatRemarkName}</p>
                ) : (
                  <p className="mt-0.5 truncate text-[12px] text-[#8A8A8E]">
                    {plainNumericBadge ? countLabel : <ListenNumericText text={countLabel} />}
                  </p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {showArchiveSourceLabels && onlineCount > 0 ? (
                    <span className={ARCHIVE_SOFT_CHIP}>
                      {ARCHIVE_SOURCE_ONLINE_LABEL} {onlineCount}
                    </span>
                  ) : null}
                  {showArchiveSourceLabels && offlineCount > 0 ? (
                    <span className={ARCHIVE_SOFT_CHIP}>
                      {ARCHIVE_SOURCE_OFFLINE_LABEL} {offlineCount}
                    </span>
                  ) : null}
                  {displayTags.map((tag) => (
                    <span key={tag} className={ARCHIVE_SOFT_CHIP}>
                      {memorySceneFilterLabel(tag)}
                    </span>
                  ))}
                  {extraTagCount > 0 ? (
                    <span className={ARCHIVE_SOFT_CHIP}>+{extraTagCount}</span>
                  ) : null}
                </div>
              </div>

              <ChevronRight className="size-4 shrink-0 text-[#C8C8CC]" strokeWidth={1.6} aria-hidden />
            </button>
          </motion.li>
        )
      })}
      <li className="pt-2 text-center">
        <p className={ARCHIVE_MAG_STAT}>
          <ListenNumericText text={`${items.length} 位角色`} />
        </p>
      </li>
    </ul>
  )
}
