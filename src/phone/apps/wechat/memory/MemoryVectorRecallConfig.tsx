import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { BUILTIN_SILICONFLOW_PROXY_HINT } from '../../api/builtinSiliconflow'
import { MemoryEngineSoftSwitch } from './MemoryEngineSoftSwitch'
import { DEFAULT_MEMORY_EMBEDDING_MODEL } from './memoryEmbeddingApi'

function EngineCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-[24px] bg-white px-5 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
      {title ? <h3 className="text-[16px] font-semibold tracking-tight text-gray-900">{title}</h3> : null}
      <div className={title ? 'mt-4 space-y-4' : 'space-y-4'}>{children}</div>
    </div>
  )
}

export function MemoryVectorRecallConfig({
  vectorRecallEnabled,
  onToggleVectorRecall,
  useBuiltinKey,
  apiUrl,
  hasSavedKey,
  onToggleBuiltinKey,
  onCommitUrl,
  onCommitKey,
}: {
  vectorRecallEnabled: boolean
  onToggleVectorRecall: () => void
  useBuiltinKey: boolean
  apiUrl: string
  hasSavedKey: boolean
  onToggleBuiltinKey: () => void
  onCommitUrl: (url: string) => void
  onCommitKey: (key: string) => void
}) {
  const [urlDraft, setUrlDraft] = useState(apiUrl)
  const [keyDraft, setKeyDraft] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)

  useEffect(() => {
    setUrlDraft(apiUrl)
  }, [apiUrl])

  return (
    <div className="space-y-4">
      <EngineCard title="语义向量召回">
        <div data-memory-coach="vector-recall" className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-gray-900">开启语义召回</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              关掉后只靠关键词等方式找记忆；开着才能按「意思相近」多捞几条。
            </p>
          </div>
          <MemoryEngineSoftSwitch on={vectorRecallEnabled} onToggle={onToggleVectorRecall} />
        </div>

        <div data-memory-coach="extra-api" className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-gray-900">使用内置 Key</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{BUILTIN_SILICONFLOW_PROXY_HINT}</p>
          </div>
          <MemoryEngineSoftSwitch
            on={useBuiltinKey}
            onToggle={onToggleBuiltinKey}
            aria-label="使用内置 Key"
          />
        </div>

        {useBuiltinKey ? (
          <p className="text-[11px] leading-relaxed text-amber-800/80">
            当前走内置 Key，模型是 {DEFAULT_MEMORY_EMBEDDING_MODEL}。没开代理时向量召回会失败。
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-[12px] text-gray-500">接口地址</span>
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onBlur={() => onCommitUrl(urlDraft.trim())}
                placeholder="https://api.siliconflow.cn/v1"
                className="mt-1 w-full rounded-2xl bg-gray-50 px-4 py-3 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-gray-500">密钥</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type={keyVisible ? 'text' : 'password'}
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onBlur={() => {
                    const next = keyDraft.trim()
                    if (!next) return
                    onCommitKey(next)
                    setKeyDraft('')
                  }}
                  placeholder={hasSavedKey ? '已保存，输入新内容可覆盖' : 'API Key'}
                  className="min-w-0 flex-1 rounded-2xl bg-gray-50 px-4 py-3 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-500"
                  onClick={() => setKeyVisible((v) => !v)}
                  aria-label={keyVisible ? '隐藏密钥' : '显示密钥'}
                >
                  {keyVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
            <p className="text-[11px] leading-relaxed text-gray-500">
              模型固定为 {DEFAULT_MEMORY_EMBEDDING_MODEL}。直连硅基流动时填它的地址和你自己的 Key 即可。
            </p>
          </div>
        )}

        {!vectorRecallEnabled ? (
          <p className="text-[11px] leading-relaxed text-gray-400">
            已关闭：不再按意思找记忆，只保留关键词和「始终注入」那类。
          </p>
        ) : null}
      </EngineCard>
    </div>
  )
}
