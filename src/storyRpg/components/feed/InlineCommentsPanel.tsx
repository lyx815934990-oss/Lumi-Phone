import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import type { StoryComment } from '../../types'

type Props = {
  comments: StoryComment[]
  /** inline：章内穿插样式（左色条 + 头像行）；panel：折叠区列表 */
  variant?: 'inline' | 'panel'
}

function formatLikes(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

function CommentRows({ comments, compact }: { comments: StoryComment[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'flex flex-col gap-2.5' : 'divide-y divide-[var(--sr-border)]'}>
      {comments.map((c, i) => (
        <motion.li
          key={c.id}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.18), duration: 0.22 }}
          className={
            compact
              ? 'flex gap-2.5'
              : 'flex gap-3 py-3.5 first:pt-3 last:pb-3.5'
          }
        >
          <span
            className={
              compact
                ? 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium leading-none text-white'
                : 'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-[var(--sr-gold)]/[0.12] font-[family-name:var(--sr-font-serif)] text-[12px] font-medium leading-none text-[var(--sr-gold)]'
            }
            style={compact ? { background: `hsl(${c.avatarHue} 42% 42%)` } : undefined}
            aria-hidden
          >
            {c.nick.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            {!compact ? (
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-[12px] font-medium tracking-wide text-[var(--sr-text)]">
                    {c.nick}
                  </span>
                  {c.highlight ? (
                    <span className="shrink-0 text-[9px] tracking-[0.18em] text-[var(--sr-gold)]">
                      高光
                    </span>
                  ) : null}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums tracking-wider text-[var(--sr-text-faint)]">
                  <Heart className="size-3 opacity-75" strokeWidth={1.75} aria-hidden />
                  {formatLikes(c.likes)}
                </span>
              </div>
            ) : null}
            <p
              className={
                compact
                  ? 'font-[family-name:var(--sr-font-serif)] text-[12.5px] leading-[1.65] text-[var(--sr-text-soft)]'
                  : 'mt-1.5 font-[family-name:var(--sr-font-serif)] text-[13px] leading-[1.7] text-[var(--sr-text-soft)]'
              }
            >
              {compact ? (
                <>
                  <span className="font-medium text-[var(--sr-text)]">{c.nick}</span>
                  <span className="text-[var(--sr-text-faint)]">：</span>
                </>
              ) : null}
              {c.text}
            </p>
          </div>
        </motion.li>
      ))}
    </ul>
  )
}

/** 小说章评式评论区：细线分隔、单字刊头；inline 为正文穿插条 */
export function InlineCommentsPanel({ comments, variant = 'panel' }: Props) {
  if (!comments.length) {
    return (
      <p className="py-4 text-center text-[11px] tracking-[0.12em] text-[var(--sr-text-faint)]">
        暂无批注
      </p>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="my-3 overflow-hidden rounded-lg border border-[var(--sr-border)] bg-[var(--sr-panel-elevated)]/80">
        <div className="flex">
          <span
            className="w-[3px] shrink-0 bg-[var(--sr-gold)]/70"
            aria-hidden
          />
          <div className="min-w-0 flex-1 px-3 py-2.5">
            <CommentRows comments={comments} compact />
          </div>
        </div>
      </div>
    )
  }

  return <CommentRows comments={comments} />
}
