import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import {
  OBS_NOTES_UPDATED_EVENT,
  type ObservationNotesUpdatedEventDetail,
} from './observationNotes/obsNotesPatch'

/**
 * 全局挂载：模型在主回复同请求中更新私藏侧写并成功写库后弹出说明。
 * 持久展示直至用户点击「知道了」。
 */
export function ObservationNotesPatchNoticeHost() {
  const [open, setOpen] = useState(false)
  const [labels, setLabels] = useState<string[]>([])

  const dismiss = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    const onUpdated = (ev: Event) => {
      const ce = ev as CustomEvent<ObservationNotesUpdatedEventDetail>
      const raw = ce.detail?.changedLabels
      const list = Array.isArray(raw)
        ? raw.map((x) => String(x ?? '').trim()).filter(Boolean)
        : []
      // 无字段名时仍提示（兼容旧事件）
      const n = ce.detail?.diffCount
      if (!list.length && !(typeof n === 'number' && n > 0)) return
      setLabels(list)
      setOpen(true)
    }
    window.addEventListener(OBS_NOTES_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener(OBS_NOTES_UPDATED_EVENT, onUpdated)
    }
  }, [])

  const labelText = labels.length
    ? labels.join('、')
    : '侧写条目'

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
          aria-labelledby="obs-notes-patch-notice-title"
          aria-describedby="obs-notes-patch-notice-desc"
        >
          <motion.div
            className="relative w-full max-w-[min(340px,92vw)] rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <p
              id="obs-notes-patch-notice-title"
              className="text-[17px] font-semibold tracking-tight text-stone-900"
            >
              私藏侧写已更新
            </p>
            <p
              id="obs-notes-patch-notice-desc"
              className="mt-2 text-[14px] leading-relaxed text-stone-600"
            >
              模型在本轮回复中整理了侧写，已写入：
              <span className="font-medium text-stone-800">{labelText}</span>
              。可在联系人资料或「私藏侧写」档案里查看最新内容。
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
