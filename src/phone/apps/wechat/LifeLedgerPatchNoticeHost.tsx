import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import {
  LIFE_LEDGER_PATCH_UPDATED_EVENT,
  type LifeLedgerPatchUpdatedEventDetail,
} from './lifeMutable/lifeLedgerPatch'

/**
 * 全局挂载：主回复同请求更新，或「按记忆对齐」成功写库后弹出说明。
 * 持久展示直至用户点击「知道了」。
 */
export function LifeLedgerPatchNoticeHost() {
  const [open, setOpen] = useState(false)
  const [labels, setLabels] = useState<string[]>([])
  const [source, setSource] = useState<'model_inline' | 'align'>('model_inline')

  const dismiss = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    const onUpdated = (ev: Event) => {
      const ce = ev as CustomEvent<LifeLedgerPatchUpdatedEventDetail>
      const raw = ce.detail?.changedLabels
      const list = Array.isArray(raw)
        ? raw.map((x) => String(x ?? '').trim()).filter(Boolean)
        : []
      const n = ce.detail?.appliedPatchCount
      // 对齐成功也可能无字段变更（已一致），仍提示
      if (ce.detail?.source !== 'align' && !list.length && !(typeof n === 'number' && n > 0)) {
        return
      }
      setLabels(list)
      setSource(ce.detail?.source === 'align' ? 'align' : 'model_inline')
      setOpen(true)
    }
    window.addEventListener(LIFE_LEDGER_PATCH_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener(LIFE_LEDGER_PATCH_UPDATED_EVENT, onUpdated)
    }
  }, [])

  const labelText = labels.length ? labels.join('、') : '当前事实'
  const isAlign = source === 'align'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/35 px-5 backdrop-blur-[2px]"
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
            className="relative w-full max-w-[min(340px,92vw)] rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <p
              id="life-ledger-patch-notice-title"
              className="text-[17px] font-semibold tracking-tight text-stone-900"
            >
              {isAlign ? '按记忆对齐完成' : '人生账本已更新'}
            </p>
            <p
              id="life-ledger-patch-notice-desc"
              className="mt-2 text-[14px] leading-relaxed text-stone-600"
            >
              {isAlign ? (
                labels.length ? (
                  <>
                    已按近端记忆对齐并写入：
                    <span className="font-medium text-stone-800">{labelText}</span>
                    。可在本页
                    <span className="font-medium text-stone-800">人生账本</span>
                    查看最新登记。
                  </>
                ) : (
                  <>
                    对齐已完成：当前账本与近端证据一致，无需改写。可在本页
                    <span className="font-medium text-stone-800">人生账本</span>
                    继续查看。
                  </>
                )
              ) : (
                <>
                  模型在本轮回复中判断了账本变化，已写入：
                  <span className="font-medium text-stone-800">{labelText}</span>
                  。可在资料卡或人设里的
                  <span className="font-medium text-stone-800">人生账本</span>
                  查看最新登记。
                </>
              )}
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-stone-500">请点下方按钮关闭本提示。</p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-stone-900 py-3 text-[15px] font-medium text-white transition-colors hover:bg-stone-800 active:scale-[0.99]"
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
