import { AnimatePresence, motion } from 'framer-motion'
import { MonitorSmartphone } from 'lucide-react'

import { Pressable } from '../../../components/Pressable'

export function ScreenShareConfirmSheet({
  open,
  peerName,
  starting,
  onClose,
  onConfirm,
}: {
  open: boolean
  peerName: string
  starting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const name = peerName.trim() || '对方'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="ss-confirm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[270] flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(6px)' }}
          onMouseDown={(e) => {
            if (starting) return
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-t-[18px] bg-white px-4 pb-[max(14px,env(safe-area-inset-bottom,0px))] pt-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f2f7]">
              <MonitorSmartphone size={24} className="text-[#07c160]" strokeWidth={1.85} />
            </div>
            <h2 className="text-center text-[17px] font-semibold text-[#111]">和{name}一起刷</h2>
            <p className="mt-2 text-center text-[13px] leading-relaxed text-[#666]">
              将分享你的屏幕画面。对方会周期性看到抽帧并用气泡接话。
              <br />
              需 Android Chrome / 桌面浏览器；iOS 暂不支持。
            </p>

            <Pressable
              type="button"
              disabled={starting}
              onClick={onConfirm}
              className="mt-5 flex w-full items-center justify-center rounded-[14px] bg-[#07c160] py-3.5 text-[16px] font-medium text-white active:opacity-90 disabled:opacity-55"
            >
              {starting ? '正在开启…' : '开始一起刷'}
            </Pressable>
            <Pressable
              type="button"
              disabled={starting}
              onClick={onClose}
              className="mt-2 flex w-full items-center justify-center rounded-[14px] border border-[#ededed] bg-white py-3.5 text-[16px] font-medium text-[#1c1c1e] active:bg-[#f5f5f7] disabled:opacity-55"
            >
              取消
            </Pressable>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
