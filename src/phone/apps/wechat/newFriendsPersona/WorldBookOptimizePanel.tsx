import { Sparkles, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { ApiConfig } from '../../api/types'
import type { WorldBookUserInsertContext } from '../charUserPlaceholders'
import type { Character, PlayerIdentity, WorldBook } from './types'
import { optimizeWorldBooksWithAi } from './worldBookOptimizeAi'

export function WorldBookOptimizePanel({
  apiConfig,
  character,
  forPlayerIdentity = false,
  worldBackgroundPrompt = '',
  identityContext = null,
  linkedNpcsContext = '',
  userInsertContext = null,
  onApplyWorldBooks,
}: {
  apiConfig: ApiConfig | null
  character: Character
  forPlayerIdentity?: boolean
  worldBackgroundPrompt?: string
  identityContext?: PlayerIdentity | null
  linkedNpcsContext?: string
  userInsertContext?: WorldBookUserInsertContext | null
  onApplyWorldBooks: (next: WorldBook[], summary: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [requirement, setRequirement] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSummary, setLastSummary] = useState<string | null>(null)

  const canUseAi = !!apiConfig?.apiUrl && !!apiConfig?.apiKey && !!apiConfig?.modelId
  const userName =
    userInsertContext?.displayName?.trim() || identityContext?.name?.trim() || '玩家'

  const runOptimize = useCallback(() => {
    const req = requirement.trim()
    if (!req || busy) return
    if (!canUseAi || !apiConfig) {
      setError('请先配置可用的 AI API（地址 / Key / 模型）')
      return
    }
    setBusy(true)
    setError(null)
    setLastSummary(null)
    void (async () => {
      try {
        const result = await optimizeWorldBooksWithAi({
          character,
          apiConfig,
          userRequirement: req,
          forPlayerIdentity,
          identityContext: identityContext ?? undefined,
          worldBackgroundPrompt: worldBackgroundPrompt.trim() || undefined,
          linkedNpcsContext: linkedNpcsContext.trim() || undefined,
          userInsertContext,
        })
        onApplyWorldBooks(result.worldBooks, result.summary)
        setLastSummary(result.summary)
      } catch (e) {
        setError(e instanceof Error ? e.message : '优化失败，请稍后重试')
      } finally {
        setBusy(false)
      }
    })()
  }, [
    apiConfig,
    busy,
    canUseAi,
    character,
    forPlayerIdentity,
    identityContext,
    linkedNpcsContext,
    onApplyWorldBooks,
    requirement,
    userInsertContext,
    worldBackgroundPrompt,
  ])

  return (
    <div className="mx-4 mb-3 flex flex-col items-end gap-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-stone-200/90 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-stone-600 shadow-sm transition active:scale-[0.98] hover:bg-stone-50 hover:text-stone-800"
          title="AI 优化世界书"
        >
          <Sparkles className="size-3 shrink-0" strokeWidth={2} />
          AI 优化
        </button>
      ) : (
        <div className="w-full rounded-2xl border border-stone-200/90 bg-white/95 p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-stone-800">
              <Sparkles className="size-3.5 shrink-0 text-stone-500" strokeWidth={2} />
              AI 优化世界书
            </div>
            <button
              type="button"
              onClick={() => {
                if (busy) return
                setOpen(false)
              }}
              className="rounded-full p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              aria-label="收起"
              disabled={busy}
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          </div>

          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            disabled={busy}
            rows={3}
            placeholder={
              forPlayerIdentity
                ? '写下你的要求，例如：润色兴趣爱好、补一条作息……'
                : `写下你的要求，例如：性格更冷一点；补与「${userName}」的相处边界……`
            }
            className="mt-2 w-full resize-y rounded-xl border border-stone-200/90 bg-stone-50/80 px-3 py-2 text-[12px] leading-relaxed text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-300 focus:bg-white disabled:opacity-60"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || !requirement.trim() || !canUseAi}
              onClick={runOptimize}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: '#6B6862' }}
            >
              <Sparkles className="size-3 shrink-0" strokeWidth={2} />
              {busy ? '优化中…' : '开始优化'}
            </button>
            {!canUseAi ? (
              <span className="text-[10px] text-amber-700/90">需先配置聊天 API</span>
            ) : (
              <span className="text-[10px] text-stone-400">写入当前稿，记得保存</span>
            )}
          </div>

          {error ? (
            <p className="mt-2 rounded-lg border border-rose-200/80 bg-rose-50/90 px-2.5 py-1.5 text-[11px] leading-relaxed text-rose-800">
              {error}
            </p>
          ) : null}
          {lastSummary ? (
            <p className="mt-2 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1.5 text-[11px] leading-relaxed text-emerald-900">
              {lastSummary}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
