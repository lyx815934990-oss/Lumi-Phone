import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

const spring = { type: 'spring' as const, stiffness: 380, damping: 32 }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  title?: string
  subtitle?: string
  /** 标题行右侧、关闭按钮左侧（如「场控说明」） */
  headerTrailing?: ReactNode
  /** Portal 到 body 后需自带主题变量，否则 --sr-* 失效 */
  themeStyle?: CSSProperties
}

/** 半屏 Bottom Sheet · 无遮罩，实色面板，标题含安全区与关闭 */
export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  subtitle,
  headerTrailing,
  themeStyle,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[250] pointer-events-auto"
                style={{ background: 'transparent' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="story-rpg-root fixed inset-x-0 bottom-0 z-[251] flex max-h-[min(82dvh,720px)] flex-col overflow-hidden rounded-t-[24px] border border-[var(--sr-border,#2a2a2e)] shadow-[0_-12px_40px_rgba(0,0,0,0.22)]"
                style={{
                  ...themeStyle,
                  background: 'var(--sr-panel-elevated, #1c1c1e)',
                  color: 'var(--sr-text, #f2f2f2)',
                  /* 顶部安全区：刘海 / 状态栏；底部：Home Indicator */
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={spring}
              >
                <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[var(--sr-border,#3a3a40)]" />
                {title ? (
                  <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--sr-border,#2a2a2e)] px-4 pb-3 pt-3">
                    <div className="min-w-0 flex-1 pt-0.5">
                      <Dialog.Title className="font-[family-name:var(--sr-font-serif)] text-[16px] font-semibold tracking-wide text-[var(--sr-text,#f2f2f2)]">
                        {title}
                      </Dialog.Title>
                      {subtitle ? (
                        <p className="mt-0.5 text-[11px] text-[var(--sr-text-muted,#9a9a9a)]">{subtitle}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                      {headerTrailing}
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          aria-label="关闭"
                          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--sr-border)] bg-[var(--sr-panel)] text-[var(--sr-text-muted)] transition hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-text)]"
                        >
                          <X className="size-4" strokeWidth={1.75} />
                        </button>
                      </Dialog.Close>
                    </div>
                  </div>
                ) : (
                  <Dialog.Title className="sr-only">面板</Dialog.Title>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}
