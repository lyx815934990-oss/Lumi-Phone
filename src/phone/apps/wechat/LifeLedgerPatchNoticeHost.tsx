import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import {
  LIFE_LEDGER_PATCH_UPDATED_EVENT,
  type LifeLedgerChangedItem,
  type LifeLedgerPatchUpdatedEventDetail,
} from './lifeMutable/lifeLedgerPatch'

/** 锐利漫画杂志 · 与人生账本页同色板 */
const BG = '#F3ECDD'
const CARD = '#FAFAF8'
const INK = '#2E271C'
const MIST = '#9C8D6C'
const STAMP = '#C9574F'
const FANGSONG =
  '"FangSong", "仿宋", "STFangsong", "FangSong_GB2312", "Songti SC", "Noto Serif SC", "SimSun", serif'
const MAX_ITEMS = 8

function clipText(raw: string, max = 80): string {
  const t = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return '（空）'
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/**
 * 全局挂载：主回复同请求更新，或「按记忆对齐」成功写库后弹出说明。
 * 视觉对齐人生账本页；展示字段原先 → 现在的具体数值。
 */
export function LifeLedgerPatchNoticeHost() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<LifeLedgerChangedItem[]>([])
  const [hiddenExtra, setHiddenExtra] = useState(0)
  const [source, setSource] = useState<'model_inline' | 'align'>('model_inline')

  const dismiss = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    const onUpdated = (ev: Event) => {
      const ce = ev as CustomEvent<LifeLedgerPatchUpdatedEventDetail>
      const rawItems = ce.detail?.changedItems
      const fromItems: LifeLedgerChangedItem[] = Array.isArray(rawItems)
        ? rawItems
            .map((x) => ({
              label: String(x?.label ?? '').trim(),
              previousText: clipText(String(x?.previousText ?? '')),
              currentText: clipText(String(x?.currentText ?? '')),
            }))
            .filter((x) => x.label)
        : []
      // 兼容旧事件：仅有字段名时也展示，值为「有更新」
      const labels = Array.isArray(ce.detail?.changedLabels)
        ? ce.detail!.changedLabels!.map((x) => String(x ?? '').trim()).filter(Boolean)
        : []
      const list =
        fromItems.length > 0
          ? fromItems
          : labels.map((label) => ({
              label,
              previousText: '（未记录）',
              currentText: '有更新',
            }))
      const n = ce.detail?.appliedPatchCount
      if (ce.detail?.source !== 'align' && !list.length && !(typeof n === 'number' && n > 0)) {
        return
      }
      setItems(list.slice(0, MAX_ITEMS))
      setHiddenExtra(Math.max(0, list.length - MAX_ITEMS))
      setSource(ce.detail?.source === 'align' ? 'align' : 'model_inline')
      setOpen(true)
    }
    window.addEventListener(LIFE_LEDGER_PATCH_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener(LIFE_LEDGER_PATCH_UPDATED_EVENT, onUpdated)
    }
  }, [])

  const isAlign = source === 'align'
  const stampText = isAlign ? 'ALIGNED' : 'UPDATED'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1250] flex items-center justify-center px-5"
          style={{ background: 'rgba(28, 22, 16, 0.55)', backdropFilter: 'blur(2px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="life-ledger-patch-notice-title"
          aria-describedby="life-ledger-patch-notice-desc"
        >
          <motion.div
            className="relative w-full max-w-[min(320px,92vw)] overflow-hidden p-3.5"
            style={{
              background: BG,
              border: `2px solid ${INK}`,
              borderRadius: 10,
              boxShadow: '0 18px 44px rgba(0,0,0,0.2)',
            }}
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div
              className="relative overflow-hidden px-3.5 pb-3.5 pt-3"
              style={{
                background: CARD,
                border: `1.5px solid ${INK}`,
                borderRadius: 8,
                maxHeight: 'min(62vh, 420px)',
                overflowY: 'auto',
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: MIST }}
                >
                  LIFE DOSSIER
                </p>
                <p
                  className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: MIST }}
                >
                  {isAlign ? 'ALIGN' : 'AUTO UPDATE'}
                </p>
              </div>

              <div className="mt-2.5" style={{ borderTop: `2px solid ${INK}` }} />
              <div className="mt-0.5" style={{ borderTop: `0.75px solid ${INK}` }} />

              <div
                aria-hidden
                className="pointer-events-none absolute right-3 top-12 flex h-8 w-[68px] items-center justify-center border-2"
                style={{
                  borderColor: STAMP,
                  borderRadius: 4,
                  transform: 'rotate(-12deg)',
                  opacity: 0.92,
                }}
              >
                <span
                  className="font-mono text-[10px] font-bold tracking-[0.08em]"
                  style={{ color: STAMP }}
                >
                  {stampText}
                </span>
              </div>

              <p
                id="life-ledger-patch-notice-title"
                className="mt-3.5 text-[18px] font-bold tracking-tight"
                style={{ color: INK, fontFamily: FANGSONG }}
              >
                {isAlign ? '按记忆对齐完成' : '人生账本已更新'}
              </p>

              <p
                id="life-ledger-patch-notice-desc"
                className="mt-2.5 text-[12.5px] leading-relaxed"
                style={{ color: MIST, fontFamily: FANGSONG }}
              >
                {isAlign ? (
                  items.length ? (
                    <>已按近端记忆对齐，变更如下：</>
                  ) : (
                    <>
                      对齐已完成：当前账本与近端证据一致，无需改写。可在本页
                      <span className="font-semibold" style={{ color: INK }}>
                        人生账本
                      </span>
                      继续查看。
                    </>
                  )
                ) : (
                  <>模型已写入下列登记变更（原先 → 现在）：</>
                )}
              </p>

              {items.length ? (
                <div className="mt-3 flex flex-col gap-2">
                  {items.map((it, i) => (
                    <div
                      key={`${it.label}-${i}`}
                      className="overflow-hidden"
                      style={{
                        background: BG,
                        border: `1.5px solid ${INK}`,
                        borderRadius: 6,
                      }}
                    >
                      <div
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5"
                        style={{ borderBottom: '1px solid rgba(46,39,28,0.18)' }}
                      >
                        <p className="text-[11px] font-bold" style={{ color: STAMP }}>
                          {it.label}
                        </p>
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 shrink-0"
                          style={{ background: STAMP }}
                        />
                      </div>
                      <div className="px-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(46,39,28,0.12)' }}>
                        <p
                          className="mb-0.5 font-mono text-[8px] tracking-[0.14em]"
                          style={{ color: MIST }}
                        >
                          原先
                        </p>
                        <p
                          className="break-words text-[11px] leading-snug"
                          style={{ color: MIST, fontFamily: FANGSONG }}
                        >
                          {it.previousText}
                        </p>
                      </div>
                      <div className="px-2.5 py-1.5" style={{ background: 'rgba(201,87,79,0.06)' }}>
                        <p
                          className="mb-0.5 font-mono text-[8px] tracking-[0.14em]"
                          style={{ color: STAMP }}
                        >
                          现在
                        </p>
                        <p
                          className="break-words text-[11px] font-semibold leading-snug"
                          style={{ color: INK, fontFamily: FANGSONG }}
                        >
                          {it.currentText}
                        </p>
                      </div>
                    </div>
                  ))}
                  {hiddenExtra > 0 ? (
                    <p className="text-[10px]" style={{ color: MIST }}>
                      另有 {hiddenExtra} 项，请在账本页查看
                    </p>
                  ) : null}
                </div>
              ) : null}

              {(items.length > 0 || !isAlign) && (
                <>
                  <div
                    className="mt-3.5"
                    style={{ borderTop: '1px solid rgba(46,39,28,0.18)' }}
                  />
                  <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: MIST }}>
                    可在资料卡或人设里的
                    <span className="font-semibold" style={{ color: INK }}>
                      人生账本
                    </span>
                    查看完整登记。
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              className="mt-3 w-full py-2.5 text-[14px] font-bold transition-opacity hover:opacity-90 active:scale-[0.99]"
              style={{
                background: INK,
                color: BG,
                borderRadius: 8,
              }}
              onClick={dismiss}
            >
              知道了
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
