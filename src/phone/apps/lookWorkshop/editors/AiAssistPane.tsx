import { useEffect, useMemo, useRef, useState } from 'react'
import { useApiSettings, useCurrentApiConfig } from '../../api/ApiSettingsContext'
import type { ApiConfig } from '../../api/types'
import { generateLookWorkshopTheme } from '../aiAssist'
import {
  isApiConfigReady,
  loadLookWorkshopAiApiSettings,
  saveLookWorkshopAiApiSettings,
  type LookWorkshopAiApiSettings,
} from '../aiApiSettings'
import { useLookWorkshopStore } from '../store'
import { AiApiSettingsBlock } from './AiApiSettingsBlock'

const STYLE_TAGS = ['治愈', '冷淡', '复古', '未来感', '可爱', '高级感'] as const

const LOADING_LINES = [
  '理解你的想法…',
  '正在为你调色…',
  '搭配配色与质感…',
  '正在打磨细节…',
]

type Props = {
  onApplied: (msg: string) => void
  onGoManualEdit: () => void
}

function resolveAssistApiConfig(
  settings: LookWorkshopAiApiSettings,
  main: ApiConfig | null,
  sub: ApiConfig | null,
): ApiConfig | null {
  if (settings.source === 'main') return main
  if (settings.source === 'sub') return sub
  return settings.custom
}

export function AiAssistPane({ onApplied, onGoManualEdit }: Props) {
  const mainApi = useCurrentApiConfig()
  const subApi = useCurrentApiConfig('chatCard')
  const { isSubApiEnabled } = useApiSettings()
  const subEnabled = isSubApiEnabled('chatCard')

  const draft = useLookWorkshopStore((s) => s.draft)
  const setDraft = useLookWorkshopStore((s) => s.setDraft)

  const [apiSettings, setApiSettings] = useState<LookWorkshopAiApiSettings>(() =>
    loadLookWorkshopAiApiSettings(),
  )
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingLine, setLoadingLine] = useState(LOADING_LINES[0]!)
  const [error, setError] = useState('')
  const [styleName, setStyleName] = useState('')
  const [designNote, setDesignNote] = useState('')
  const [applied, setApplied] = useState(false)
  const [refineMode, setRefineMode] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const lastPromptRef = useRef('')

  const mainReady = isApiConfigReady(mainApi)
  const subReady = subEnabled && isApiConfigReady(subApi)
  const resolvedApi = useMemo(
    () => resolveAssistApiConfig(apiSettings, mainApi, subApi),
    [apiSettings, mainApi, subApi],
  )
  const apiReady = isApiConfigReady(resolvedApi)

  useEffect(() => {
    if (!busy) return
    let i = 0
    setLoadingLine(LOADING_LINES[0]!)
    const t = window.setInterval(() => {
      i = (i + 1) % LOADING_LINES.length
      setLoadingLine(LOADING_LINES[i]!)
    }, 900)
    return () => window.clearInterval(t)
  }, [busy])

  const updateApiSettings = (next: LookWorkshopAiApiSettings) => {
    setApiSettings(next)
    saveLookWorkshopAiApiSettings(next)
  }

  const appendTag = (tag: string) => {
    setText((prev) => {
      const t = prev.trim()
      if (!t) return `想要${tag}的感觉`
      if (t.includes(tag)) return t
      return `${t}，带一点${tag}`
    })
  }

  const runGenerate = async (opts?: { refine?: boolean }) => {
    const prompt = text.trim()
    if (!prompt) {
      setError('先写一句话描述想要的风格吧')
      return
    }
    if (!apiReady || !resolvedApi) {
      setError('请先在上方「助手 API 设置」选好可用接口（主 / 副 / 自定义）')
      return
    }
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setBusy(true)
    setError('')
    setApplied(false)
    lastPromptRef.current = prompt
    try {
      const result = await generateLookWorkshopTheme({
        userText: prompt,
        currentDraft: opts?.refine || refineMode ? draft : null,
        apiConfig: resolvedApi,
        signal: ac.signal,
      })
      setDraft(result.draft)
      setStyleName(result.styleName)
      setDesignNote(result.designNote)
      setApplied(true)
      onApplied(`已生成「${result.styleName}」并应用到预览`)
    } catch (e) {
      if (ac.signal.aborted) return
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      if (!ac.signal.aborted) setBusy(false)
    }
  }

  return (
    <div className="lw-ai flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain px-2.5 pb-8 pt-2">
      <AiApiSettingsBlock
        settings={apiSettings}
        onChange={updateApiSettings}
        mainReady={mainReady}
        subReady={subReady}
        mainHint={mainReady ? undefined : '请到「API 设置」配置主接口 URL / Key / 模型'}
        subHint={
          !subEnabled
            ? '请到「API 设置 → 副接口 → 聊天记录卡片」启用副接口'
            : '副接口 URL / Key / 模型未配完整'
        }
      />

      <p className="mt-2.5 text-[11px] leading-relaxed text-neutral-500">
        用一句话描述氛围即可。一次生成完整皮肤，预览区会立刻刷新；满意后可导出气泡包。
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {STYLE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] text-neutral-600 transition-colors active:bg-neutral-900 active:text-white"
            onClick={() => appendTag(tag)}
            disabled={busy}
          >
            {tag}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
        rows={4}
        placeholder="试试：温柔的樱花庭院风 / 赛博朋克霓虹风 / 复古胶片日记风 / 暗夜森林，深绿配萤火虫黄高光，气泡要磨砂…"
        className="lw-input mt-2 w-full resize-none leading-relaxed"
      />

      <label className="mt-2 flex items-center gap-2 text-[10px] text-neutral-500">
        <input
          type="checkbox"
          checked={refineMode}
          onChange={(e) => setRefineMode(e.target.checked)}
          disabled={busy}
        />
        基于当前预览微调（不推倒重来）
      </label>

      <button
        type="button"
        className="lw-btn-primary lw-ai-gen mt-3 w-full py-2.5 text-[12px]"
        disabled={busy || !text.trim() || !apiReady}
        onClick={() => void runGenerate()}
      >
        {busy ? (
          <span className="lw-ai-breathe inline-flex items-center justify-center gap-2">
            <span className="lw-ai-dot" aria-hidden />
            {loadingLine}
          </span>
        ) : (
          '智能生成'
        )}
      </button>

      {error ? (
        <div className="mt-3 rounded-[12px] border border-black/8 bg-white/80 px-3 py-2.5">
          <p className="text-[11px] text-neutral-700">{error}</p>
          <button
            type="button"
            className="lw-btn mt-2 !px-2 !py-1"
            onClick={() => void runGenerate({ refine: refineMode })}
          >
            重试
          </button>
        </div>
      ) : null}

      {applied && !busy ? (
        <div className="mt-3 rounded-[14px] border border-black/6 bg-white/85 px-3 py-3 shadow-sm">
          <p className="text-[12px] font-semibold tracking-wide text-neutral-800">
            {styleName || '未命名风格'}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">
            {designNote || '已应用到预览区，可继续手调或导出。'}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              className="lw-btn-primary !px-2.5 !py-1.5"
              onClick={() => onApplied('当前皮肤已在预览中，可导出气泡包')}
            >
              应用为当前皮肤
            </button>
            <button
              type="button"
              className="lw-btn !px-2.5 !py-1.5"
              onClick={() => {
                setText(lastPromptRef.current || text)
                void runGenerate({ refine: false })
              }}
            >
              重新生成
            </button>
            <button type="button" className="lw-btn-ghost !px-2.5 !py-1.5" onClick={onGoManualEdit}>
              手动微调
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
