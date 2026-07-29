import { AnimatePresence, motion } from 'framer-motion'

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

/**
 * 气泡下方译文：交互对齐语音「转文字」
 * - 旁侧灰底「翻译」按钮切换展开
 * - 展开面板贴在气泡下方（同色、圆角衔接）
 */
export function MessageTranslationUnderBubble({
  open,
  text,
  isSelf,
  onToggle,
  bottomRadiusPx = 8,
}: {
  open: boolean
  text: string
  isSelf: boolean
  onToggle: () => void
  bottomRadiusPx?: number
}) {
  const trimmed = text.trim()
  if (!trimmed) return null
  const firstChar = trimmed.charAt(0)
  const restText = trimmed.slice(1)
  const panelClassName = isSelf
    ? 'border-[#7ed957] bg-[var(--wx-self-bubble-bg,#95EC69)] text-[#191919]'
    : 'border-[#ececec] bg-[var(--wx-other-bubble-bg,#ffffff)] text-[#191919]'

  return (
    <div className={`inline-flex max-w-full ${isSelf ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-start gap-1.5 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex min-w-0 flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                key="wx-translation-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING}
                className={`w-fit max-w-full overflow-hidden border ${panelClassName}`}
                style={{
                  borderWidth: 0.5,
                  borderRadius: bottomRadiusPx,
                }}
              >
                <div className="border-t border-dashed border-black/10 px-3 py-2.5 text-[13px] leading-[1.7] break-words">
                  {firstChar ? (
                    <span className="mr-[1px] text-[17px] leading-none text-[#191919]">{firstChar}</span>
                  ) : null}
                  <span>{restText}</span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="shrink-0 self-center rounded bg-[#E5E5E5] px-2 py-0.5 text-[12px] text-gray-600 active:opacity-70"
        >
          翻译
        </button>
      </div>
    </div>
  )
}
