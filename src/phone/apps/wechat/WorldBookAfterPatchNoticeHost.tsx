import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import {
  WORLD_BOOK_AFTER_PATCH_UPDATED_EVENT,
  type WorldBookAfterChangedEntry,
  type WorldBookAfterPatchUpdatedEventDetail,
} from './newFriendsPersona/worldBookAfterPatch'

/** 水墨杂志 · 与世界书页同色板 */
const PAGE = '#EDEBE7'
const CARD = '#F8F7F4'
const INK = '#1E2024'
const FOIL = '#5A6574'
const MUTED = '#6A6E76'
const LINE = '#D2D0CB'
const PAPER = '#F4F0E8'
const MAX_ENTRIES = 5

/**
 * 全局挂载：模型回传尾声延展覆盖并成功写库后弹出说明。
 * 视觉对齐世界书「水墨杂志」；展示条目原先 → 现在完整正文。
 */
export function WorldBookAfterPatchNoticeHost() {
  const [open, setOpen] = useState(false)
  const [patchCount, setPatchCount] = useState(1)
  const [entries, setEntries] = useState<WorldBookAfterChangedEntry[]>([])

  const dismiss = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    const onUpdated = (ev: Event) => {
      const ce = ev as CustomEvent<WorldBookAfterPatchUpdatedEventDetail>
      // 重新回复回滚不属于「更新成就」，不弹杂志窗
      if (ce.detail?.source === 'retry_revert') return
      const raw = ce.detail?.appliedPatchCount
      const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1
      const list = Array.isArray(ce.detail?.changedEntries)
        ? ce.detail!.changedEntries!
            .map((e) => ({
              bookName: String(e?.bookName ?? '').trim() || '世界书',
              itemName: String(e?.itemName ?? '').trim() || '尾声条目',
              previousPreview: String(e?.previousPreview ?? '').trim() || '（空）',
              currentPreview: String(e?.currentPreview ?? '').trim() || '（空）',
            }))
            .filter((e) => e.itemName)
        : []
      setPatchCount(Math.max(n, list.length || 1))
      setEntries(list.slice(0, MAX_ENTRIES))
      setOpen(true)
    }
    window.addEventListener(WORLD_BOOK_AFTER_PATCH_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener(WORLD_BOOK_AFTER_PATCH_UPDATED_EVENT, onUpdated)
    }
  }, [])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1250] flex items-center justify-center px-5"
          style={{ background: 'rgba(18, 20, 24, 0.58)', backdropFilter: 'blur(2px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="wb-after-patch-notice-title"
          aria-describedby="wb-after-patch-notice-desc"
        >
          <motion.div
            className="relative w-full max-w-[min(320px,92vw)] overflow-hidden"
            style={{
              background: CARD,
              border: `1.25px solid ${LINE}`,
              borderRadius: 16,
              boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
            }}
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 flex w-[22px] items-center justify-center"
              style={{ background: INK }}
            >
              <span
                className="font-mono text-[9px] font-bold tracking-[0.18em]"
                style={{
                  color: CARD,
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                EPILOGUE
              </span>
            </div>

            <div className="pl-[22px]">
              <div className="p-4 pb-3">
                <div
                  className="relative overflow-hidden rounded-[12px] border px-4 pb-4 pt-3.5"
                  style={{
                    background: PAGE,
                    borderColor: LINE,
                    maxHeight: 'min(72vh, 560px)',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <div
                    aria-hidden
                    className="absolute right-3.5 top-3.5 flex h-[26px] w-[18px] overflow-hidden border"
                    style={{ background: INK, borderColor: INK, borderRadius: 2 }}
                  >
                    <span className="ml-auto block h-full w-[5px]" style={{ background: PAPER }} />
                  </div>

                  <p
                    className="font-mono text-[9px] font-medium uppercase tracking-[0.16em]"
                    style={{ color: FOIL }}
                  >
                    02 LORE · AFTER PATCH
                  </p>
                  <div className="mt-2.5 h-px w-full" style={{ background: LINE }} />

                  <p
                    id="wb-after-patch-notice-title"
                    className="mt-3 font-serif text-[19px] font-semibold tracking-tight"
                    style={{ color: INK }}
                  >
                    尾声延展已更新
                  </p>

                  <span
                    className="mt-2.5 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: INK, color: CARD }}
                  >
                    写入 {patchCount} 条
                  </span>

                  <p
                    id="wb-after-patch-notice-desc"
                    className="mt-3 text-[12.5px] font-light leading-relaxed"
                    style={{ color: MUTED }}
                  >
                    {entries.length
                      ? '下列「尾声延展」条目正文已覆盖写入：'
                      : '模型提交了世界书覆盖，「尾声延展」条目已写入人设。'}
                  </p>

                  {entries.length ? (
                    <div className="mt-3 flex flex-col gap-2">
                      {entries.map((e, i) => (
                        <div
                          key={`${e.bookName}-${e.itemName}-${i}`}
                          className="overflow-hidden rounded-[10px] border"
                          style={{ background: CARD, borderColor: LINE }}
                        >
                          <div
                            className="px-2.5 py-1.5"
                            style={{ borderBottom: `1px solid ${LINE}` }}
                          >
                            <p className="font-serif text-[12px] font-semibold" style={{ color: INK }}>
                              {e.itemName}
                            </p>
                            <p
                              className="mt-0.5 font-mono text-[8px] tracking-[0.12em]"
                              style={{ color: FOIL }}
                            >
                              {e.bookName}
                            </p>
                          </div>
                          <div className="px-2.5 py-1.5" style={{ borderBottom: `1px solid ${LINE}` }}>
                            <p
                              className="mb-0.5 font-mono text-[8px] tracking-[0.14em]"
                              style={{ color: '#9AA0A8' }}
                            >
                              原先
                            </p>
                            <p
                              className="whitespace-pre-wrap break-words text-[11px] leading-snug"
                              style={{ color: MUTED }}
                            >
                              {e.previousPreview}
                            </p>
                          </div>
                          <div className="px-2.5 py-1.5" style={{ background: 'rgba(30,32,36,0.04)' }}>
                            <p
                              className="mb-0.5 font-mono text-[8px] tracking-[0.14em]"
                              style={{ color: FOIL }}
                            >
                              现在
                            </p>
                            <p
                              className="whitespace-pre-wrap break-words text-[11px] font-medium leading-snug"
                              style={{ color: INK }}
                            >
                              {e.currentPreview}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-3 text-[11px] leading-relaxed" style={{ color: '#9AA0A8' }}>
                    也可在
                    <span className="font-medium" style={{ color: INK }}>
                      人设 · 世界书
                    </span>
                    中翻开编辑。
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4">
                <button
                  type="button"
                  className="w-full py-3 text-[14px] font-semibold transition-opacity hover:opacity-90 active:scale-[0.99]"
                  style={{
                    background: INK,
                    color: CARD,
                    borderRadius: 999,
                  }}
                  onClick={dismiss}
                >
                  知道了
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
