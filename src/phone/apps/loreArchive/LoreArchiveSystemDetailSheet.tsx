import { Lock } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { LA, LA_FONT_CN, LA_FONT_EN, laEase } from './loreArchiveTheme'
import type { LoreArchiveBuiltinPresetMeta } from '../../worldbook/loreArchiveBuiltinPresets'

/** 涂黑卷宗条：纯灰阶，长短错落 */
const REDACT_ROWS: Array<{ w: string; deep?: boolean }> = [
  { w: '92%' },
  { w: '78%', deep: true },
  { w: '88%' },
  { w: '64%' },
  { w: '84%', deep: true },
  { w: '71%' },
  { w: '90%' },
  { w: '55%', deep: true },
]

type Props = {
  open: boolean
  preset: LoreArchiveBuiltinPresetMeta | null
  enabled: boolean
  onClose: () => void
  onToggle: (enabled: boolean) => void
}

export function LoreArchiveSystemDetailSheet({ open, preset, enabled, onClose, onToggle }: Props) {
  return (
    <AnimatePresence>
      {open && preset ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭"
            className="fixed inset-0 z-[40]"
            style={{ background: 'rgba(247, 246, 244, 0.72)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[41] mx-auto flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] border"
            style={{
              fontFamily: LA_FONT_CN,
              background: LA.card,
              borderColor: LA.hairline,
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.25, ease: laEase }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="la-system-detail-title"
          >
            <div className="flex shrink-0 flex-col items-center pt-3">
              <span
                className="h-1 w-10 rounded-full"
                style={{ background: LA.hairline }}
                aria-hidden
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="la-system-detail-title"
                  className="text-[18px] font-semibold"
                  style={{ color: LA.mist }}
                >
                  {preset.title}
                </h2>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[11px]"
                  style={{
                    borderColor: LA.hairline,
                    color: LA.mist,
                    fontFamily: LA_FONT_EN,
                    letterSpacing: '0.04em',
                  }}
                >
                  系统内置 · 不可编辑
                </span>
              </div>

              <p className="mt-3 text-[14px] leading-relaxed" style={{ color: LA.ink }}>
                本卷宗由系统封存。启用后将在匹配场景自动注入；正文内容不可查看或编辑。
              </p>

              <div
                className="relative mt-6 overflow-hidden rounded-2xl border px-4 py-5"
                style={{ borderColor: LA.hairline, background: LA.paper }}
              >
                <div className="space-y-2.5">
                  {REDACT_ROWS.map((row, i) => (
                    <div
                      key={i}
                      className="relative h-2.5 rounded-sm"
                      style={{
                        width: row.w,
                        background: LA.redact,
                      }}
                    >
                      {row.deep ? (
                        <span
                          className="absolute inset-y-0 left-[12%] w-[42%] rounded-sm"
                          style={{ background: LA.redactDeep }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6">
                  <Lock className="size-5" strokeWidth={1.5} style={{ color: LA.mist }} />
                  <p
                    className="mt-2 text-center text-[13px] leading-relaxed"
                    style={{ color: LA.mist }}
                  >
                    内容为系统机密，仅可选择启用或关闭
                  </p>
                </div>
              </div>
            </div>

            <div
              className="flex shrink-0 items-center justify-between gap-3 border-t px-5 py-4"
              style={{
                borderColor: LA.hairline,
                paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
              }}
            >
              <span className="text-[15px] font-medium" style={{ color: LA.ink }}>
                启用此世界书
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label="启用此世界书"
                onClick={() => onToggle(!enabled)}
                className="relative h-8 w-[52px] shrink-0 rounded-full"
                style={{
                  background: enabled ? LA.amber : LA.hairline,
                  transition: 'background 150ms ease',
                }}
              >
                <span
                  className="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow-sm"
                  style={{
                    left: enabled ? 'calc(100% - 1.75rem - 2px)' : '2px',
                    transition: 'left 150ms ease',
                  }}
                />
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
