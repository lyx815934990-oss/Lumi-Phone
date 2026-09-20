import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Pressable } from '../../../components/Pressable'
import { fetchEmbeddingModels } from '../../api/apiSim'
import type { ApiConfig } from '../../api/types'
import { BUILTIN_SILICONFLOW_PROXY_HINT } from '../../api/builtinSiliconflow'
import { InlineDropdown } from '../newFriendsPersona/InlineDropdown'
import { personaDb } from '../newFriendsPersona/idb'
import { MemoryEngineSoftSwitch } from './MemoryEngineSoftSwitch'
import { DEFAULT_MEMORY_EMBEDDING_MODEL } from './memoryEmbeddingApi'
import { MemoryModelIdText } from './MemoryModelIdText'

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
  modelId,
  onToggleBuiltinKey,
  onCommitUrl,
  onCommitKey,
  onCommitModel,
}: {
  vectorRecallEnabled: boolean
  onToggleVectorRecall: () => void
  useBuiltinKey: boolean
  apiUrl: string
  hasSavedKey: boolean
  modelId: string
  onToggleBuiltinKey: () => void
  onCommitUrl: (url: string) => void
  onCommitKey: (key: string) => void
  onCommitModel: (modelId: string) => void
}) {
  const [urlDraft, setUrlDraft] = useState(apiUrl)
  const [keyDraft, setKeyDraft] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [modelDraft, setModelDraft] = useState(modelId)
  const [modelList, setModelList] = useState<string[]>(() =>
    modelId.trim() ? [modelId.trim()] : [],
  )
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsPullMsg, setModelsPullMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setUrlDraft(apiUrl)
  }, [apiUrl])

  useEffect(() => {
    const id = modelId.trim()
    setModelDraft(id)
    if (id) {
      setModelList((prev) => (prev.includes(id) ? prev : [id, ...prev]))
    }
  }, [modelId])

  const pullEmbeddingModels = async () => {
    setModelsPullMsg(null)
    setModelsLoading(true)
    try {
      const url = urlDraft.trim()
      if (!url) {
        setModelsPullMsg({ ok: false, text: '请先填写接口地址，再拉取嵌入模型。' })
        return
      }
      if (!/^https?:\/\//i.test(url)) {
        setModelsPullMsg({ ok: false, text: '接口地址格式不正确（需以 http/https 开头）。' })
        return
      }
      const settings = await personaDb.getMemorySettings()
      const key = keyDraft.trim() || settings.memoryEmbeddingApiKey?.trim() || ''
      if (!key) {
        setModelsPullMsg({
          ok: false,
          text: hasSavedKey
            ? '请重新输入密钥后再拉取（已保存密钥不会回显）。'
            : '请先填写密钥，再拉取嵌入模型。',
        })
        return
      }
      onCommitUrl(url)
      if (keyDraft.trim()) {
        onCommitKey(keyDraft.trim())
        setKeyDraft('')
      }
      const cfg: ApiConfig = { apiUrl: url, apiKey: key, modelId: '', modelList: [] }
      // 仅过滤 embedding；不会混入聊天 / 生图模型
      const res = await fetchEmbeddingModels(cfg)
      if (!res.ok) {
        setModelsPullMsg({ ok: false, text: res.error })
        return
      }
      const picked = Array.from(new Set(res.models)).sort((a, b) => a.localeCompare(b))
      setModelList(picked)
      const preferred = modelDraft.trim() || modelId.trim()
      let nextId = preferred && picked.includes(preferred) ? preferred : ''
      if (!nextId && picked.length) nextId = picked[0] || ''
      if (nextId) {
        setModelDraft(nextId)
        onCommitModel(nextId)
      }
      setModelsPullMsg({
        ok: true,
        text: picked.length
          ? `已拉取 ${picked.length} 个嵌入模型（已排除对话 / 生图等无关模型）`
          : '接口有响应，但未识别到嵌入模型。请确认该地址提供 embeddings。',
      })
    } finally {
      setModelsLoading(false)
    }
  }

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

            <div className="space-y-2 pt-1">
              <p className="text-[12px] text-gray-500">嵌入模型</p>
              <Pressable
                type="button"
                disabled={modelsLoading}
                onClick={() => void pullEmbeddingModels()}
                className="w-full rounded-full bg-gray-100 px-4 py-2.5 text-[13px] font-medium text-gray-900 transition-colors hover:bg-gray-200/80 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {modelsLoading ? '正在拉取嵌入模型…' : '拉取嵌入模型'}
              </Pressable>
              {modelsPullMsg ? (
                <p
                  className={`text-[11px] leading-relaxed ${
                    modelsPullMsg.ok ? 'text-gray-600' : 'text-red-800/70'
                  }`}
                  role="status"
                >
                  {modelsPullMsg.text}
                </p>
              ) : (
                <p className="text-[11px] leading-relaxed text-gray-500">
                  填好地址与密钥后拉取；只会列出 embedding 模型，不含对话 / 生图。
                </p>
              )}
              <InlineDropdown
                label="选择嵌入模型"
                valueText={
                  modelDraft.trim() ? (
                    <MemoryModelIdText text={modelDraft.trim()} />
                  ) : modelList.length ? (
                    <MemoryModelIdText text={modelList[0] || '请选一个'} />
                  ) : (
                    '请先拉取嵌入模型'
                  )
                }
                open={modelDropdownOpen}
                disabled={!modelList.length}
                onToggle={() => setModelDropdownOpen((v) => !v)}
              >
                <div className="flex flex-col gap-2 px-3 py-2">
                  {modelList.map((m) => {
                    const active = m === (modelDraft.trim() || modelList[0] || '')
                    return (
                      <button
                        key={m}
                        type="button"
                        className={`w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                          active
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setModelDraft(m)
                          setModelDropdownOpen(false)
                          onCommitModel(m)
                        }}
                      >
                        <MemoryModelIdText text={m} className="break-all" />
                      </button>
                    )
                  })}
                </div>
              </InlineDropdown>
              {!modelDraft.trim() ? (
                <p className="text-[11px] leading-relaxed text-gray-400">
                  未选择时默认使用 {DEFAULT_MEMORY_EMBEDDING_MODEL}。
                </p>
              ) : null}
            </div>
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
