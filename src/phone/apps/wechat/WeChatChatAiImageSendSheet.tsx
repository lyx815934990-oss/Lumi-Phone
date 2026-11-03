/**
 * 聊天「AI 生图再发送」：输入提示词 → 生成预览 → 确认后发送。
 */
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Pressable } from '../../components/Pressable'
import { useCustomization } from '../../CustomizationContext'
import { generateMomentsImage } from '../../../components/moments/momentsImageGen'
import { isMomentsImageGenConfigured } from '../../../components/moments/momentsImageGenAvailability'
import { loadResolvedImageGenSettings } from '../api/loadResolvedImageGenSettings'
import { imageGenDataUrlToPayload } from './wechatCharacterImageGen'
import type { WeChatChatImagePayload } from './WeChatChatPhotoPickerSheet'

type Props = {
  open: boolean
  onClose: () => void
  onToast: (msg: string) => void
  onSend: (payload: WeChatChatImagePayload) => void | Promise<void>
}

export function WeChatChatAiImageSendSheet({ open, onClose, onToast, onSend }: Props) {
  const { state } = useCustomization()
  const disableTransitions = state.ui.disablePageTransitions
  const [prompt, setPrompt] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const reset = useCallback(() => {
    setPrompt('')
    setPreviewUrl(null)
    setGenerating(false)
    setSending(false)
    setError('')
  }, [])

  useEffect(() => {
    if (open) return
    reset()
  }, [open, reset])

  const handleGenerate = async () => {
    const trimmed = prompt.trim()
    if (!trimmed || generating || sending) return
    setGenerating(true)
    setError('')
    try {
      const settings = await loadResolvedImageGenSettings()
      if (!isMomentsImageGenConfigured(settings)) {
        setError('请先在 API 设置中配置生图引擎')
        onToast('请先在 API 设置中配置生图引擎')
        return
      }
      const dataUrl = await generateMomentsImage({
        prompt: trimmed,
        settings,
        promptContext: 'moments',
      })
      setPreviewUrl(dataUrl)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '生图失败，请稍后重试'
      setError(msg)
      onToast(msg)
    } finally {
      setGenerating(false)
    }
  }

  const handleSend = async () => {
    if (!previewUrl || generating || sending) return
    setSending(true)
    setError('')
    try {
      const payload = imageGenDataUrlToPayload(previewUrl)
      await onSend(payload)
      reset()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '发送失败，请重试'
      setError(msg)
      onToast(msg)
    } finally {
      setSending(false)
    }
  }

  const busy = generating || sending
  const canGenerate = Boolean(prompt.trim()) && !busy
  const canSend = Boolean(previewUrl) && !busy

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={disableTransitions ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={disableTransitions ? { opacity: 1 } : { opacity: 0 }}
          transition={disableTransitions ? { duration: 0 } : undefined}
          className="absolute inset-0 z-[256] flex flex-col justify-end bg-black/35"
        >
          <Pressable type="button" className="min-h-0 flex-1" onClick={() => !busy && onClose()}>
            <span className="sr-only">关闭</span>
          </Pressable>
          <motion.div
            initial={disableTransitions ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={disableTransitions ? { y: 0 } : { y: '100%' }}
            transition={disableTransitions ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-[90dvh] overflow-hidden rounded-t-[20px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
          >
            <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3">
              <button
                type="button"
                className="text-[16px] text-[#576b95] disabled:opacity-35"
                disabled={busy}
                onClick={onClose}
              >
                取消
              </button>
              <p className="text-[16px] font-medium text-[#111827]">AI 生图</p>
              <button
                type="button"
                disabled={!canSend}
                className="text-[16px] font-medium text-[#576b95] disabled:opacity-35"
                onClick={() => void handleSend()}
              >
                {sending ? '发送中…' : '发送'}
              </button>
            </div>

            <div className="max-h-[72dvh] overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-3">
              <label className="block">
                <span className="text-[13px] text-[#6b7280]">生图提示词</span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={busy}
                  placeholder="描述你想生成的画面（中英文均可）&#10;例如：夜晚的便利店门口，暖黄灯光，一只橘猫蹲在台阶上"
                  rows={4}
                  className="mt-1.5 w-full resize-y rounded-[12px] border border-[#e5e7eb] bg-[#fafafa] px-3 py-2.5 text-[14px] leading-relaxed text-[#111827] outline-none placeholder:text-[#9ca3af] disabled:opacity-60"
                  autoFocus
                />
              </label>

              <div className="mt-3 flex gap-2">
                <Pressable
                  type="button"
                  disabled={!canGenerate}
                  onClick={() => void handleGenerate()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-[#f5f5f5] py-2.5 text-[15px] font-medium text-[#111827] disabled:opacity-40"
                >
                  {generating ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-[#576b95]" aria-hidden />
                      生成中…
                    </>
                  ) : previewUrl ? (
                    '重新生成'
                  ) : (
                    '生成预览'
                  )}
                </Pressable>
                {previewUrl ? (
                  <Pressable
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPreviewUrl(null)
                      setError('')
                    }}
                    className="inline-flex items-center justify-center rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-[#6b7280] disabled:opacity-40"
                    aria-label="清除预览"
                  >
                    <X className="size-4" aria-hidden />
                  </Pressable>
                ) : null}
              </div>

              {error ? <p className="mt-2 text-[12px] leading-relaxed text-[#ef4444]">{error}</p> : null}

              <div className="mt-4 overflow-hidden rounded-[12px] border border-[#eee] bg-[#f5f5f5]">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="生图预览"
                    className="mx-auto max-h-[42dvh] w-full object-contain"
                  />
                ) : (
                  <div className="flex h-[200px] flex-col items-center justify-center gap-2 px-6 text-center text-[13px] text-[#9ca3af]">
                    <Sparkles className="size-6 opacity-50" aria-hidden />
                    <p>生成后在此预览；确认满意再点右上角「发送」</p>
                    <p className="text-[11px]">发送后不会自动触发对方回复</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
