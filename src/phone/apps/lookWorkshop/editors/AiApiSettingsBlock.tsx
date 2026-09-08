import { Eye, EyeOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchModels } from '../../api/apiSim'
import type { ApiConfig } from '../../api/types'
import type { LookWorkshopAiApiSettings, LookWorkshopAiApiSource } from '../aiApiSettings'

type Props = {
  settings: LookWorkshopAiApiSettings
  onChange: (next: LookWorkshopAiApiSettings) => void
  /** 主接口是否已配置好 */
  mainReady: boolean
  /** 副接口（chatCard）是否已配置好 */
  subReady: boolean
  mainHint?: string
  subHint?: string
}

const SOURCES: { id: LookWorkshopAiApiSource; label: string; desc: string }[] = [
  { id: 'main', label: '主接口', desc: '使用当前 API 预设的主接口' },
  { id: 'sub', label: '副接口', desc: '使用「聊天记录卡片」副接口（需在 API 设置中启用）' },
  { id: 'custom', label: '自定义', desc: '为本助手单独填写 URL / Key 并拉取模型' },
]

export function AiApiSettingsBlock({
  settings,
  onChange,
  mainReady,
  subReady,
  mainHint,
  subHint,
}: Props) {
  const [open, setOpen] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const custom = settings.custom
  const canPull = useMemo(
    () => !!custom.apiUrl.trim() && !!custom.apiKey.trim(),
    [custom.apiKey, custom.apiUrl],
  )

  const setSource = (source: LookWorkshopAiApiSource) => {
    onChange({ ...settings, source })
    setMsg(null)
  }

  const patchCustom = (patch: Partial<ApiConfig>) => {
    onChange({ ...settings, custom: { ...settings.custom, ...patch } })
  }

  const pull = async () => {
    setMsg(null)
    setPulling(true)
    const res = await fetchModels(custom)
    setPulling(false)
    if (!res.ok) {
      setMsg({ ok: false, text: res.error })
      return
    }
    patchCustom({
      modelList: res.models,
      modelPricingById: res.modelPricingById,
      modelId: custom.modelId.trim() || res.models[0] || '',
    })
    setMsg({ ok: true, text: `已拉取 ${res.models.length} 个模型` })
  }

  const sourceStatus =
    settings.source === 'main'
      ? mainReady
        ? '主接口可用'
        : mainHint || '主接口未配置完整（URL / Key / 模型）'
      : settings.source === 'sub'
        ? subReady
          ? '副接口可用'
          : subHint || '副接口未启用或未配置完整'
        : custom.apiUrl && custom.apiKey && custom.modelId
          ? `自定义 · ${custom.modelId}`
          : '请填写自定义 URL / Key 并选择模型'

  return (
    <div className="rounded-[12px] border border-black/6 bg-white/80">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-neutral-800">助手 API 设置</p>
          <p className="mt-0.5 truncate text-[10px] text-neutral-400">{sourceStatus}</p>
        </div>
        <span className={`text-[11px] text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open ? (
        <div className="space-y-2.5 border-t border-black/5 px-2.5 py-2.5">
          <div className="space-y-1.5" role="radiogroup" aria-label="助手 API 来源">
            {SOURCES.map((s) => {
              const checked = settings.source === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setSource(s.id)}
                  className={`flex w-full items-start gap-2.5 rounded-[12px] border px-2.5 py-2 text-left transition-[background,border-color,box-shadow] duration-200 ${
                    checked
                      ? 'border-black/12 bg-[#f3f3f3] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]'
                      : 'border-black/[0.06] bg-white/90 hover:bg-[#fafafa]'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                      checked ? 'border-[#191919]/70 bg-white' : 'border-black/15 bg-white'
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`h-[7px] w-[7px] rounded-full transition-opacity duration-200 ${
                        checked ? 'bg-[#191919]/85 opacity-100' : 'opacity-0'
                      }`}
                    />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[11px] font-medium tracking-wide ${
                        checked ? 'text-[#191919]' : 'text-neutral-600'
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-neutral-400">
                      {s.desc}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {settings.source === 'custom' ? (
            <div className="space-y-2 rounded-[10px] border border-black/6 bg-[#fafafa] p-2.5">
              <label className="block">
                <span className="text-[10px] text-neutral-500">API URL</span>
                <input
                  className="lw-input mt-1 w-full"
                  value={custom.apiUrl}
                  placeholder="https://api.example.com/v1"
                  onChange={(e) => patchCustom({ apiUrl: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-neutral-500">API Key</span>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    className="lw-input min-w-0 flex-1"
                    type={keyVisible ? 'text' : 'password'}
                    value={custom.apiKey}
                    placeholder="sk-..."
                    onChange={(e) => patchCustom({ apiKey: e.target.value })}
                  />
                  <button
                    type="button"
                    className="lw-btn-ghost !px-2 !py-1.5"
                    onClick={() => setKeyVisible((v) => !v)}
                    aria-label={keyVisible ? '隐藏 Key' : '显示 Key'}
                  >
                    {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </label>
              <button
                type="button"
                className="lw-btn w-full !py-2"
                disabled={!canPull || pulling}
                onClick={() => void pull()}
              >
                {pulling ? '拉取中…' : '拉取模型'}
              </button>
              <label className="block">
                <span className="text-[10px] text-neutral-500">模型</span>
                <select
                  className="lw-input mt-1 w-full"
                  value={custom.modelId}
                  disabled={!custom.modelList.length}
                  onChange={(e) => patchCustom({ modelId: e.target.value })}
                >
                  {!custom.modelList.length ? (
                    <option value="">请先拉取模型</option>
                  ) : (
                    custom.modelList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))
                  )}
                </select>
              </label>
              {msg ? (
                <p className={`text-[10px] ${msg.ok ? 'text-neutral-600' : 'text-red-600/80'}`}>
                  {msg.text}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
