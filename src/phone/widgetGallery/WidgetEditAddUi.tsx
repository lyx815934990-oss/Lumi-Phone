import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DecoText } from './DecoText'
import { useWidgetGallery } from './WidgetGalleryContext'
import { WidgetKindPreview } from './WidgetKindPreview'
import {
  ADDABLE_WIDGET_KINDS,
  MULTI_INSTANCE_WIDGET_KINDS,
  PLATINUM,
  WIDGET_META,
} from './storage'
import type { GalleryWidgetKind } from './types'

type Props = {
  open: boolean
  /** 标题栏顶部安全区（状态栏下方为 0；无状态栏时用 safe-area-inset-top） */
  topInset?: string
  /** 添加到哪一页（0/1/2） */
  targetPage?: number
  onDone?: () => void
  /** 添加成功后回调（例如跳到组件页） */
  onAdded?: (kind: GalleryWidgetKind) => void
}

/**
 * 桌面编辑态标题栏：安全区 +「完成」+ 右上角加号与组件选择面板。
 */
export function WidgetEditAddUi({
  open,
  topInset = '0px',
  targetPage = 0,
  onDone,
  onAdded,
}: Props) {
  const { addWidget, availableToAdd, kindsEnabled } = useWidgetGallery()
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!open) setPickerOpen(false)
  }, [open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          data-widget-add-ui="true"
          className="relative z-[80] shrink-0"
          style={{
            paddingTop: `max(6px, ${topInset})`,
          }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1">
            <button
              type="button"
              className="rounded-full border border-white/45 bg-white/45 px-3.5 py-1.5 text-[13px] font-medium text-[#2c2c2e] shadow-sm backdrop-blur-xl"
              onClick={(e) => {
                e.stopPropagation()
                setPickerOpen(false)
                onDone?.()
              }}
            >
              完成
            </button>

            <p className="min-w-0 flex-1 truncate text-center text-[12px] text-white/70">
              编辑桌面
            </p>

            <motion.button
              type="button"
              aria-label="添加桌面组件"
              aria-expanded={pickerOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/55 bg-white/55 text-[#2c2c2e] shadow-[0_10px_28px_rgba(28,28,30,0.16)] backdrop-blur-xl"
              onClick={(e) => {
                e.stopPropagation()
                setPickerOpen((v) => !v)
              }}
            >
              <motion.span
                animate={{ rotate: pickerOpen ? 45 : 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                className="flex"
              >
                <Plus size={20} strokeWidth={2.2} />
              </motion.span>
            </motion.button>
          </div>

          <AnimatePresence>
            {pickerOpen ? (
              <>
                <motion.button
                  type="button"
                  aria-label="关闭添加面板"
                  className="fixed inset-0 z-[81] cursor-default bg-black/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPickerOpen(false)
                  }}
                />
                <motion.div
                  role="dialog"
                  aria-label="可添加的桌面组件"
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute right-3 top-full z-[82] mt-1 w-[min(300px,calc(100%-1.5rem))] overflow-hidden rounded-[22px] border border-white/55 bg-white/78 shadow-[0_18px_40px_rgba(28,28,30,0.18)] backdrop-blur-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-black/5 px-3.5 py-2.5">
                    <div>
                      <DecoText preset="stars" className="text-[10px] text-[#2c2c2e]/70">
                        Add Widget
                      </DecoText>
                      <p className="mt-0.5 text-[12px] font-medium text-[#2c2c2e]">
                        悬浮组件库
                      </p>
                    </div>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-[#2c2c2e]/70"
                      aria-label="关闭"
                      onClick={() => setPickerOpen(false)}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <ul className="max-h-[min(58vh,420px)] space-y-1.5 overflow-y-auto p-2.5">
                    {ADDABLE_WIDGET_KINDS.length === 0 ? (
                      <li className="px-2.5 py-6 text-center text-[12px] text-[#2c2c2e]/45">
                        暂无可用组件
                      </li>
                    ) : null}
                    {ADDABLE_WIDGET_KINDS.map((kind) => {
                      const meta = WIDGET_META[kind]
                      const multi = MULTI_INSTANCE_WIDGET_KINDS.includes(kind)
                      const already = kindsEnabled[kind]
                      const canAdd = availableToAdd.includes(kind)
                      return (
                        <li key={kind}>
                          <button
                            type="button"
                            disabled={!canAdd}
                            className="flex w-full items-center gap-2.5 rounded-[16px] px-2 py-2 text-left transition enabled:hover:bg-white/70 disabled:opacity-45"
                            onClick={() => {
                              if (!canAdd) return
                              const ok = addWidget(kind, targetPage)
                              if (ok) {
                                onAdded?.(kind)
                                setPickerOpen(false)
                              }
                            }}
                          >
                            <WidgetKindPreview kind={kind} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-[#2c2c2e]">
                                {meta.title}
                              </span>
                              <span
                                className="mt-0.5 block truncate text-[10px]"
                                style={{ color: PLATINUM.muted }}
                              >
                                {multi
                                  ? already
                                    ? '可再添加一枚'
                                    : meta.subtitle
                                  : already
                                    ? '已在桌面上'
                                    : meta.subtitle}
                              </span>
                              <span
                                className="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px]"
                                style={{
                                  background:
                                    !multi && already
                                      ? 'rgba(0,0,0,0.06)'
                                      : 'rgba(44,44,46,0.9)',
                                  color: !multi && already ? 'rgba(0,0,0,0.45)' : '#fff',
                                }}
                              >
                                {!multi && already ? '已添加' : '添加'}
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
