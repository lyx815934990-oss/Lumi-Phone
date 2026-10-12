import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { Pressable } from '../../../../components/Pressable'
import {
  WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  WECHAT_CHAT_LANGUAGE_OPTIONS,
  type WeChatChatLanguageCode,
} from '../../wechatChatLanguage'

const CEREMONY_LINES = [
  '正在解析近期记忆...',
  '正在同步情绪脉络...',
  '正在比对已删除片段...',
  '正在重建私密备忘录...',
]

export type NotesGenerateSubmitParams = {
  count: number
  bias: string
  generateLanguage: WeChatChatLanguageCode
  syncTranslation: boolean
  translationLanguage: WeChatChatLanguageCode
}

export function AIGenerateModal({
  open,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (params: NotesGenerateSubmitParams) => void
}) {
  const [countInput, setCountInput] = useState('2')
  const [bias, setBias] = useState('吃醋、日常细节、隐藏情绪')
  const [generateLanguage, setGenerateLanguage] = useState<WeChatChatLanguageCode>(
    WECHAT_CHAT_DEFAULT_REPLY_LANGUAGE,
  )
  const [syncTranslation, setSyncTranslation] = useState(false)
  const [translationLanguage, setTranslationLanguage] = useState<WeChatChatLanguageCode>('en')
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    if (!busy) return
    const id = window.setInterval(() => {
      setLineIndex((v) => (v + 1) % CEREMONY_LINES.length)
    }, 900)
    return () => window.clearInterval(id)
  }, [busy])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1420] flex items-end bg-black/22 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose()
          }}
        >
          {busy ? (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-[320px] rounded-2xl border border-black/10 bg-white/86 p-5 backdrop-blur-md">
                <div className="text-center text-[12px] tracking-[0.14em] text-gray-500">记忆同步中</div>
                <motion.div
                  className="mt-4 h-px w-full bg-black"
                  animate={{ opacity: [0.2, 1, 0.2], scaleX: [0.94, 1, 0.94] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  key={lineIndex}
                  className="mt-4 h-5 text-center font-mono text-[12px] text-gray-700"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  {CEREMONY_LINES[lineIndex]}
                </motion.div>
              </div>
            </motion.div>
          ) : null}

          {!busy ? (
            <motion.div
              className="relative max-h-[min(88vh,720px)] w-full overflow-y-auto rounded-[20px] border border-gray-200 bg-white/86 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <div className="text-[16px] text-gray-800">AI 生成备忘录</div>
              <div className="mt-3 text-[12px] text-gray-400">生成条数（1-10）</div>
              <input
                type="number"
                min={1}
                max={10}
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none"
              />
              <div className="mt-3 text-[12px] text-gray-400">内容偏向</div>
              <textarea
                rows={3}
                value={bias}
                onChange={(e) => setBias(e.target.value)}
                className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none"
              />

              <div className="mt-3 space-y-2 rounded-[14px] border border-gray-200 bg-white px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[11px] text-gray-400">生成语言</div>
                  <div className="text-[10px] text-gray-300">标题 / 正文 / 转写</div>
                </div>
                <select
                  value={generateLanguage}
                  onChange={(e) => setGenerateLanguage(e.target.value as WeChatChatLanguageCode)}
                  className="w-full rounded-[12px] border border-gray-200 bg-[#fafbfc] px-3 py-2 text-[13px] text-gray-800 outline-none"
                >
                  {WECHAT_CHAT_LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}（{opt.native}）
                    </option>
                  ))}
                </select>

                <label className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f5f6f8] px-3 py-2 text-[12px] text-gray-800">
                  <span className="min-w-0">
                    <span className="block">自带翻译</span>
                    <span className="mt-0.5 block text-[10px] text-gray-400">
                      原文用上方语言；勾选后附整篇译文（详情页点「翻译」全屏查看）
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={syncTranslation}
                    onChange={(e) => {
                      const on = e.target.checked
                      setSyncTranslation(on)
                      if (on && translationLanguage === generateLanguage) {
                        setTranslationLanguage(generateLanguage === 'zh-CN' ? 'en' : 'zh-CN')
                      }
                    }}
                  />
                </label>
                {syncTranslation ? (
                  <div>
                    <div className="mb-1 text-[11px] text-gray-400">译文语言</div>
                    <select
                      value={translationLanguage}
                      onChange={(e) =>
                        setTranslationLanguage(e.target.value as WeChatChatLanguageCode)
                      }
                      className="w-full rounded-[12px] border border-gray-200 bg-[#fafbfc] px-3 py-2 text-[13px] text-gray-800 outline-none"
                    >
                      {WECHAT_CHAT_LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.label}（{opt.native}）
                        </option>
                      ))}
                    </select>
                    {translationLanguage === generateLanguage ? (
                      <div className="mt-1.5 text-[10px] leading-[1.4] text-amber-700">
                        译文语言与生成语言相同，将不会写入翻译行；请另选目标语言。
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {error ? <div className="mt-2 text-[12px] text-red-500">{error}</div> : null}
              <Pressable
                type="button"
                className="mt-4 h-11 w-full rounded-xl bg-black text-[14px] text-white active:scale-[0.99]"
                onClick={() => {
                  const parsed = Number(countInput)
                  const count = Number.isFinite(parsed) ? Math.min(10, Math.max(1, Math.round(parsed))) : 1
                  onSubmit({
                    count,
                    bias,
                    generateLanguage,
                    syncTranslation,
                    translationLanguage,
                  })
                }}
              >
                开始生成
              </Pressable>
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
