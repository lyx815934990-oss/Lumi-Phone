import { Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { ApiConfig } from '../../api/types'
import type { Character, PlayerIdentity, WorldBook } from './types'
import { optimizeWorldBooksWithAi } from './worldBookOptimizeAi'

export function WorldBookOptimizePanel({
  apiConfig,
  character,
  forPlayerIdentity = false,
  worldBackgroundPrompt = '',
  identityContext = null,
  linkedNpcsContext = '',
  onApplyWorldBooks,
}: {
  apiConfig: ApiConfig | null
  character: Character
  forPlayerIdentity?: boolean
  worldBackgroundPrompt?: string
  identityContext?: PlayerIdentity | null
  linkedNpcsContext?: string
  onApplyWorldBooks: (next: WorldBook[], summary: string) => void
}) {
  const [requirement, setRequirement] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSummary, setLastSummary] = useState<string | null>(null)

  const canUseAi = !!apiConfig?.apiUrl && !!apiConfig?.apiKey && !!apiConfig?.modelId

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
    worldBackgroundPrompt,
  ])

  return (
    <div className="mx-4 mb-4 rounded-[22px] border border-stone-200/90 bg-white/95 p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white">
          <Sparkles className="size-3.5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-stone-400">AI Optimize</p>
          <h3 className="mt-0.5 text-[15px] font-semibold tracking-tight text-stone-900">AI 优化世界书</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            写下你的要求，模型会对照当前世界书智能修饰、补充或调整条目。未明确要求删除时不会乱删，通常在已有内容上润色或新增。
          </p>
        </div>
      </div>

      <textarea
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        disabled={busy}
        rows={4}
        placeholder={
          forPlayerIdentity
            ? '例：把「兴趣爱好」写得更生活化；补一条关于作息的设定；语气再松一点……'
            : '例：把性格写得更冷一点；补一条与 {{user}} 的相处边界；润色「口语习惯」但不要改关系定位……'
        }
        className="mt-3 w-full resize-y rounded-2xl border border-stone-200/90 bg-stone-50/80 px-3.5 py-3 text-[13px] leading-relaxed text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-300 focus:bg-white disabled:opacity-60"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !requirement.trim() || !canUseAi}
          onClick={runOptimize}
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-[13px] font-medium text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="size-3.5 shrink-0" strokeWidth={2} />
          {busy ? '优化中…' : '开始优化'}
        </button>
        {!canUseAi ? (
          <span className="text-[11px] text-amber-700/90">需先配置聊天 API</span>
        ) : (
          <span className="text-[11px] text-stone-400">结果写入当前编辑稿，记得点保存落库</span>
        )}
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-[12px] leading-relaxed text-rose-800">
          {error}
        </p>
      ) : null}
      {lastSummary ? (
        <p className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-[12px] leading-relaxed text-emerald-900">
          {lastSummary}
        </p>
      ) : null}
    </div>
  )
}
