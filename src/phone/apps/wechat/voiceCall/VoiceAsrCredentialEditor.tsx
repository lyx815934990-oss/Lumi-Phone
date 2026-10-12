import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BUILTIN_SILICONFLOW_PROXY_HINT } from '../../api/builtinSiliconflow'
import { apiTheme } from '../../api/theme'
import { VOICE_ASR_CUSTOM_URL_PLACEHOLDER, editableVoiceAsrUrl } from './voiceAsrSettings'

export function VoiceAsrCredentialEditor({
  useBuiltin,
  apiUrl,
  hasSavedKey,
  onUseBuiltinChange,
  onCommitUrl,
  onCommitKey,
}: {
  useBuiltin: boolean
  apiUrl: string
  hasSavedKey: boolean
  onUseBuiltinChange: (next: boolean) => void
  onCommitUrl: (url: string) => void
  onCommitKey: (key: string) => void
}) {
  const [urlDraft, setUrlDraft] = useState(() => editableVoiceAsrUrl(apiUrl))
  const [keyDraft, setKeyDraft] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)

  useEffect(() => {
    setUrlDraft(editableVoiceAsrUrl(apiUrl))
  }, [apiUrl])

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium" style={{ color: apiTheme.text }}>
            使用内置 Key
          </p>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: apiTheme.subText }}>
            {BUILTIN_SILICONFLOW_PROXY_HINT}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={useBuiltin}
          aria-label="使用内置 Key"
          onClick={() => onUseBuiltinChange(!useBuiltin)}
          className="relative mt-0.5 h-8 w-[52px] shrink-0 rounded-full transition-colors"
          style={{ background: useBuiltin ? apiTheme.accent : apiTheme.borderStrong }}
        >
          <span
            className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left]"
            style={{ left: useBuiltin ? 26 : 4 }}
          />
        </button>
      </div>

      {useBuiltin ? (
        <p className="text-[12px] leading-relaxed" style={{ color: apiTheme.sectionLabel }}>
          当前走内置 Key。模型固定为 FunAudioLLM/SenseVoiceSmall。没开代理时会连不上。
        </p>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[12px]" style={{ color: apiTheme.subText }}>
              接口地址
            </span>
            <input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onBlur={() => onCommitUrl(urlDraft.trim())}
              placeholder={VOICE_ASR_CUSTOM_URL_PLACEHOLDER}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-[14px] outline-none"
              style={{
                border: `1px solid ${apiTheme.border}`,
                background: apiTheme.card,
                color: apiTheme.text,
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>
          <label className="block">
            <span className="text-[12px]" style={{ color: apiTheme.subText }}>
              密钥
            </span>
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
                placeholder={hasSavedKey ? '已保存，输入新内容可覆盖' : 'sk-...'}
                className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-[14px] outline-none"
                style={{
                  border: `1px solid ${apiTheme.border}`,
                  background: apiTheme.card,
                  color: apiTheme.text,
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ color: apiTheme.subText }}
                onClick={() => setKeyVisible((v) => !v)}
                aria-label={keyVisible ? '隐藏密钥' : '显示密钥'}
              >
                {keyVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>
          <p className="text-[12px] leading-relaxed" style={{ color: apiTheme.subText }}>
            模型固定为 FunAudioLLM/SenseVoiceSmall。这里和 API 设置、通话页改的是同一份配置。
          </p>
        </div>
      )}
    </div>
  )
}
