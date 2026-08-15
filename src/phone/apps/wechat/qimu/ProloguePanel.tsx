import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Pressable } from '../../../components/Pressable'
import { qimuInk } from './theme'

const CLOSE_COOLDOWN_SEC = 15

type Props = {
  open: boolean
  fileCode: string
  theme: string
  /** 完整开篇正文（可含换行） */
  body: string
  onDismiss: () => void
}

/** 入幕开篇背景：全屏可滚动；关闭需冷却 15 秒 */
export function ProloguePanel({ open, fileCode, theme, body, onDismiss }: Props) {
  const [remain, setRemain] = useState(CLOSE_COOLDOWN_SEC)

  useEffect(() => {
    if (!open) return
    setRemain(CLOSE_COOLDOWN_SEC)
    const timer = window.setInterval(() => {
      setRemain((r) => {
        if (r <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [open, fileCode])

  const canClose = remain <= 0

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-[130] flex flex-col overflow-hidden"
          style={{ background: '#0f0f10' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 30% 20%, #8a8a8a 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, #555 0%, transparent 45%)',
              filter: 'grayscale(1) blur(28px)',
            }}
            aria-hidden
          />

          <header
            className="relative z-10 shrink-0 border-b px-5 pb-3"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              paddingTop: 'max(14px, calc(env(safe-area-inset-top, 0px) + 8px))',
            }}
          >
            <p
              className="text-[10px] tracking-[0.2em] text-white/45"
              style={{ fontFamily: qimuInk.mono }}
            >
              PROLOGUE · 开篇前提
            </p>
            <p
              className="mt-1 text-[11px] tracking-[0.08em] text-white/55"
              style={{ fontFamily: qimuInk.mono }}
            >
              {fileCode}
            </p>
            <h1
              className="mt-1.5 text-[20px] font-semibold leading-snug text-white"
              style={{ fontFamily: qimuInk.display }}
            >
              {theme}
            </h1>
            <p className="mt-2 text-[11.5px] leading-relaxed text-white/40">
              请先阅读背景。关闭按钮将在冷却结束后解锁，避免错过前提。
            </p>
          </header>

          <div
            className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25"
          >
            <article
              className="whitespace-pre-line text-[15px] leading-[1.85] text-[#e8e4dc]"
              style={{ fontFamily: qimuInk.display }}
            >
              {body}
            </article>
            <div className="h-8" />
          </div>

          <div
            className="relative z-10 shrink-0 border-t px-4 pt-3"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
              background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 40%)',
            }}
          >
            {!canClose ? (
              <div className="mb-2.5">
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/45">
                  <span>阅读冷却</span>
                  <span style={{ fontFamily: qimuInk.mono }}>{remain}s</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #c9a84c, #e8d5a0)',
                      width: `${((CLOSE_COOLDOWN_SEC - remain) / CLOSE_COOLDOWN_SEC) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            <Pressable
              type="button"
              disabled={!canClose}
              onClick={onDismiss}
              className="w-full rounded-full py-3.5 text-center text-[14px] font-semibold disabled:opacity-45"
              style={{
                background: canClose
                  ? 'linear-gradient(180deg, #f5f0e6 0%, #e8dcc8 100%)'
                  : 'rgba(255,255,255,0.12)',
                color: canClose ? qimuInk.title : 'rgba(255,255,255,0.55)',
              }}
            >
              {canClose ? '我已读完 · 进入幕中' : `请先阅读（${remain}s）`}
            </Pressable>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
