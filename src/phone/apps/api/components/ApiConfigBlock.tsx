import { Check, Eye, EyeOff, ExternalLink, Search, X } from 'lucide-react'
import { splitApiModelDisplay } from '../apiModelDisplay'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { InlineDropdown } from '../../wechat/newFriendsPersona/InlineDropdown'
import { CommitOnReleaseRangeInput } from '../../wechat/chatSettings/CommitOnReleaseRangeInput'
import { normalizeApiWebsiteHref, openApiWebsiteUrl } from '../apiWebsiteUrl'
import { apiTheme } from '../theme'
import { fetchModels, testConnectionSim } from '../apiSim'
import {
  createDefaultApiModelUserMeta,
  formatApiModelBillingLabel,
  hasConcreteApiModelBilling,
} from '../apiModelUserMeta'
import { formatModelPricingLabel } from '../modelPricingUtils'
import type { ApiConfig } from '../types'
import { ApiModelIdView } from './ApiModelIdView'
import { ApiModelUserMetaEditor } from './ApiModelUserMetaEditor'
import { ApiSamplingParamHelpButton, type ApiSamplingHelpKey } from './ApiSamplingParamHelp'
import { TextField } from './TextField'

function formatSamplingDisplay(n: number, digits: number): string {
  if (digits <= 0) return String(Math.round(n))
  const fixed = n.toFixed(digits)
  return fixed.replace(/\.?0+$/, '')
}

/** 可选参数滑杆：未定制时显示预览默认值；拖动即写入；可一键恢复默认（不传） */
function SamplingSliderField({
  label,
  helpKey,
  hint,
  value,
  min,
  max,
  step,
  digits,
  defaultPreview,
  minLabel,
  maxLabel,
  onCommit,
}: {
  label: string
  helpKey: ApiSamplingHelpKey
  hint?: string
  value: number | undefined
  min: number
  max: number
  step: number
  /** 展示小数位；0 为整数 */
  digits: number
  /** 未定制时滑杆停靠的预览位置（不写进配置） */
  defaultPreview: number
  minLabel: string
  maxLabel: string
  onCommit: (next: number | undefined) => void
}) {
  const customized = typeof value === 'number' && Number.isFinite(value)
  const committed = customized
    ? Math.min(max, Math.max(min, value))
    : Math.min(max, Math.max(min, defaultPreview))
  const [uiValue, setUiValue] = useState(committed)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setUiValue(committed)
  }, [committed])

  const showValue = dragging || customized

  return (
    <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-[12px]" style={{ color: apiTheme.subText }}>
          <span className="min-w-0 font-medium" style={{ color: apiTheme.text }}>
            {label}
          </span>
          <ApiSamplingParamHelpButton helpKey={helpKey} />
        </span>
        {customized && !dragging ? (
          <button
            type="button"
            onClick={() => onCommit(undefined)}
            className="shrink-0 text-[11px]"
            style={{ color: '#576b95' }}
          >
            恢复默认
          </button>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold tabular-nums" style={{ color: apiTheme.text }}>
          {showValue ? formatSamplingDisplay(uiValue, digits) : '系统默认'}
        </span>
        {hint ? (
          <span className="text-[10px] leading-relaxed" style={{ color: apiTheme.subText }}>
            {hint}
          </span>
        ) : null}
      </div>
      <CommitOnReleaseRangeInput
        min={min}
        max={max}
        step={step}
        value={committed}
        onDraftChange={setUiValue}
        onDragStateChange={setDragging}
        onCommit={(n) => onCommit(n)}
        className="mt-2 w-full accent-black"
        aria-label={label}
      />
      <div className="mt-1 flex justify-between text-[10px]" style={{ color: apiTheme.subText }}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

function patchSampling(
  config: ApiConfig,
  patch: Partial<
    Pick<
      ApiConfig,
      'temperature' | 'topP' | 'maxTokens' | 'frequencyPenalty' | 'presencePenalty' | 'streamEnabled'
    >
  >,
): ApiConfig {
  const next: ApiConfig = { ...config, ...patch }
  for (const key of [
    'temperature',
    'topP',
    'maxTokens',
    'frequencyPenalty',
    'presencePenalty',
  ] as const) {
    if (key in patch && patch[key] === undefined) delete next[key]
  }
  if ('streamEnabled' in patch && !patch.streamEnabled) delete next.streamEnabled
  return next
}

type MainSectionTab = 'connect' | 'model' | 'params'

const MAIN_SECTION_TABS: { id: MainSectionTab; label: string }[] = [
  { id: 'connect', label: '连接' },
  { id: 'model', label: '模型' },
  { id: 'params', label: '参数' },
]

export function ApiConfigBlock({
  title,
  config,
  onChange,
  showTest = true,
  showWebsiteUrl = false,
  mode = 'full',
  /** 嵌在其它卡片内时去掉外层卡片边距，避免双层套卡 */
  embedded = false,
  /** 主接口完整模式：用子 Tab 拆开连接 / 模型 / 参数（默认开） */
  sectionTabs = true,
  footer,
}: {
  title: string
  config: ApiConfig
  onChange: (next: ApiConfig) => void
  showTest?: boolean
  /** 主接口：可填服务商控制台/文档网址，并一键打开 */
  showWebsiteUrl?: boolean
  mode?: 'full' | 'asr'
  embedded?: boolean
  sectionTabs?: boolean
  footer?: ReactNode
}) {
  const [keyVisible, setKeyVisible] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const [modelOpen, setModelOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [sectionTab, setSectionTab] = useState<MainSectionTab>('connect')
  const modelSearchRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, ok = true) => {
    const text = String(msg ?? '').trim()
    if (!text) return
    setToast({ text, ok })
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!config.modelList.length) setModelOpen(false)
  }, [config.modelList.length])

  useEffect(() => {
    if (!modelOpen) {
      setModelSearch('')
      return
    }
    const timer = window.setTimeout(() => modelSearchRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [modelOpen])

  const filteredModelList = useMemo(() => {
    const q = modelSearch.trim().toLowerCase()
    if (!q) return config.modelList
    return config.modelList.filter((m) => m.toLowerCase().includes(q))
  }, [config.modelList, modelSearch])

  const canPullModels = useMemo(() => !!config.apiUrl.trim() && !!config.apiKey.trim(), [config.apiKey, config.apiUrl])

  const pullModels = async () => {
    if (!canPullModels) {
      showToast('请先填写 API URL 与 API Key', false)
      return
    }
    setModelLoading(true)
    const res = await fetchModels(config)
    setModelLoading(false)
    if (!res.ok) {
      showToast(res.error || '模型拉取失败', false)
      return
    }
    const next = {
      ...config,
      modelList: res.models,
      modelPricingById: res.modelPricingById,
      modelId: config.modelId || res.models[0] || '',
    }
    onChange(next)
    const pricedCount = Object.keys(res.modelPricingById).length
    showToast(
      pricedCount > 0
        ? `模型拉取成功（${pricedCount} 个含费率）`
        : '模型拉取成功（接口未返回费率，可在服务商官网查看）',
      true,
    )
  }

  const testConn = async () => {
    setTestLoading(true)
    const res = await testConnectionSim(config)
    setTestLoading(false)
    if (!res.ok) {
      const next = { ...config, lastTest: { ok: false, message: res.error, at: Date.now() } }
      onChange(next)
      showToast(res.error || '连接失败', false)
      return
    }
    const next = { ...config, lastTest: { ok: true, message: '连接成功', at: Date.now() } }
    onChange(next)
    showToast('连接成功', true)
  }

  const asrMode = mode === 'asr'

  const selectedModelId = (config.modelId || '').trim()
  const selectedModelPricingLabel = formatModelPricingLabel(
    selectedModelId ? config.modelPricingById?.[selectedModelId] : undefined,
  )
  const selectedUserMeta = selectedModelId ? config.modelUserMetaById?.[selectedModelId] : undefined
  const selectedUserBillingLabel = formatApiModelBillingLabel(selectedUserMeta)
  const selectedHasUserBilling = hasConcreteApiModelBilling(selectedUserMeta)

  const customizedSampling = [
    typeof config.temperature === 'number' ? '温度' : null,
    typeof config.topP === 'number' ? 'Top P' : null,
    typeof config.maxTokens === 'number' ? 'Token' : null,
    typeof config.frequencyPenalty === 'number' ? '频率' : null,
    typeof config.presencePenalty === 'number' ? '存在' : null,
    config.streamEnabled ? '流式' : null,
    config.visionInput === 'on' || config.visionInput === 'off' ? '识图' : null,
  ].filter(Boolean) as string[]

  const useSectionTabs = sectionTabs && !asrMode
  const showConnect = !useSectionTabs || sectionTab === 'connect'
  const showModel = !asrMode && (!useSectionTabs || sectionTab === 'model')
  const showParams = !asrMode && (!useSectionTabs || sectionTab === 'params')

  const connectHint = config.lastTest
    ? config.lastTest.ok
      ? '已测通'
      : '测试失败'
    : config.apiUrl.trim() && config.apiKey.trim()
      ? '待测试'
      : '未填写'
  const modelHint = selectedModelId ? '已选' : config.modelList.length ? '待选' : '未拉取'
  const paramsHint = customizedSampling.length ? `已调 ${customizedSampling.length}` : '默认'

  const connectSection = (
    <section className="space-y-3">
      {!useSectionTabs ? (
        <p className="text-[11px] font-semibold tracking-wide" style={{ color: apiTheme.subText }}>
          连接
        </p>
      ) : null}
      {!asrMode ? (
        <TextField
          label="API URL"
          value={config.apiUrl}
          onChange={(v) => onChange({ ...config, apiUrl: v })}
          placeholder="https://api.example.com/v1"
        />
      ) : null}

      {showWebsiteUrl && !asrMode ? (
        <TextField
          label="API 网站（可选）"
          value={config.websiteUrl ?? ''}
          onChange={(v) => onChange({ ...config, websiteUrl: v })}
          placeholder="控制台 / 文档网址"
          right={
            <button
              type="button"
              className="rounded-lg p-1.5 transition-all duration-200 ease-out hover:opacity-80 disabled:opacity-40"
              disabled={!normalizeApiWebsiteHref(config.websiteUrl ?? '')}
              onClick={() => {
                if (!openApiWebsiteUrl(config.websiteUrl ?? '')) {
                  showToast('请填写有效的 http(s) 网址', false)
                }
              }}
              style={{ color: apiTheme.accent }}
              aria-label="打开 API 网站"
              title="打开网站"
            >
              <ExternalLink className="size-4" />
            </button>
          }
        />
      ) : null}

      <TextField
        label="API Key"
        value={config.apiKey}
        onChange={(v) => onChange({ ...config, apiKey: v })}
        placeholder="sk-..."
        type={keyVisible ? 'text' : 'password'}
        right={
          <button
            type="button"
            className="rounded-lg p-1.5 transition-all duration-200 ease-out hover:opacity-80"
            onClick={() => setKeyVisible((v) => !v)}
            style={{ color: apiTheme.subText }}
            aria-label={keyVisible ? '隐藏 Key' : '显示 Key'}
          >
            {keyVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />

      {showTest ? (
        <button
          type="button"
          onClick={() => void testConn()}
          disabled={testLoading}
          className="w-full rounded-xl px-4 py-2.5 text-[13px] font-medium text-white transition-all duration-200 ease-out disabled:opacity-60"
          style={{ background: apiTheme.accent }}
        >
          {testLoading ? '测试中…' : '测试连接'}
        </button>
      ) : null}

      {useSectionTabs ? (
        <button
          type="button"
          onClick={() => setSectionTab('model')}
          className="w-full rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ease-out"
          style={{
            color: apiTheme.accent,
            background: apiTheme.bg,
            border: `1px solid ${apiTheme.border}`,
          }}
        >
          下一步：选择模型
        </button>
      ) : null}
    </section>
  )

  const selectedModelTitle = selectedModelId
    ? splitApiModelDisplay(selectedModelId).title || selectedModelId
    : ''
  const selectedRateLines = selectedModelId
    ? [
        `接口费率：${selectedModelPricingLabel}${
          selectedModelPricingLabel === '价格未知'
            ? '（部分中转不返回定价，以控制台为准）'
            : '（每百万 token）'
        }`,
        selectedHasUserBilling ? `我的费率：${selectedUserBillingLabel}` : '',
      ].filter(Boolean)
    : []

  const modelSection = (
    <section>
      <p
        className="mb-2 font-medium uppercase"
        style={{ fontSize: 11, color: apiTheme.sectionLabel, letterSpacing: '0.08em' }}
      >
        模型来源
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void pullModels()}
          disabled={!canPullModels || modelLoading}
          className="rounded-xl px-3 py-3 text-[14px] font-semibold transition-all duration-200 ease-out disabled:opacity-50"
          style={{ background: apiTheme.accent, color: apiTheme.onAccent }}
          title="向 API 重新请求最新的可用模型列表"
        >
          {modelLoading ? '拉取中…' : '拉取模型'}
        </button>
        <div className="min-w-0">
          <InlineDropdown
            label="选择模型"
            valueText={
              !config.modelList.length
                ? '更换模型'
                : selectedModelId
                  ? '更换模型'
                  : '选择模型'
            }
            open={modelOpen}
            disabled={!config.modelList.length}
            onToggle={() => setModelOpen((v) => !v)}
          >
            <div
              className="sticky top-0 z-[1] border-b bg-white px-3 py-2.5"
              style={{ borderColor: '#f0f0f0' }}
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                  style={{ color: apiTheme.subText }}
                />
                <input
                  ref={modelSearchRef}
                  type="search"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="搜索模型名称…"
                  className="w-full rounded-xl py-2.5 pl-9 pr-3 text-[13px] outline-none"
                  style={{
                    border: `1px solid ${apiTheme.border}`,
                    background: apiTheme.accentSoft,
                    color: apiTheme.text,
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              {modelSearch.trim() ? (
                <p className="mt-1.5 text-[11px]" style={{ color: apiTheme.subText }}>
                  匹配 {filteredModelList.length} / {config.modelList.length} 个模型
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 px-3 py-2">
              {filteredModelList.length ? (
                filteredModelList.map((m) => {
                  const active = m === config.modelId
                  const priceLabel = formatModelPricingLabel(config.modelPricingById?.[m])
                  const userMeta = config.modelUserMetaById?.[m]
                  return (
                    <button
                      key={m}
                      type="button"
                      className="w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ease-out"
                      style={{
                        borderColor: apiTheme.border,
                        background: active ? apiTheme.accent : apiTheme.card,
                      }}
                      onClick={() => {
                        onChange({ ...config, modelId: m })
                        setModelOpen(false)
                      }}
                    >
                      <ApiModelIdView
                        modelId={m}
                        modelMeta={userMeta}
                        tone={active ? 'onDark' : 'default'}
                        showFullId={false}
                        compact
                      />
                      {!hasConcreteApiModelBilling(userMeta) &&
                      !(userMeta?.tags || []).length &&
                      priceLabel ? (
                        <span
                          className="mt-1 block text-[10px] leading-snug"
                          style={{
                            color: active ? 'rgba(255,255,255,0.75)' : apiTheme.subText,
                          }}
                        >
                          {priceLabel}
                        </span>
                      ) : null}
                    </button>
                  )
                })
              ) : (
                <p className="py-8 text-center text-[13px]" style={{ color: apiTheme.subText }}>
                  没有匹配的模型
                </p>
              )}
            </div>
          </InlineDropdown>
        </div>
      </div>
      {!config.modelList.length ? (
        <p className="mt-1.5 text-[11px]" style={{ color: apiTheme.muted }}>
          先「拉取模型」刷新列表，再点「更换模型」选择
        </p>
      ) : null}

      <p
        className="mb-2 mt-4 font-medium uppercase"
        style={{ fontSize: 11, color: apiTheme.sectionLabel, letterSpacing: '0.08em' }}
      >
        当前模型
      </p>
      <div
        style={{
          background: apiTheme.card,
          borderRadius: 14,
          padding: '12px 14px',
          border: `1px solid ${apiTheme.borderSoft}`,
        }}
      >
        {selectedModelId ? (
          <>
            <p className="break-all text-[14px] font-semibold" style={{ color: apiTheme.text }}>
              {selectedModelTitle}
            </p>
            {selectedRateLines.map((line) => (
              <p
                key={line}
                className="whitespace-pre-wrap break-words leading-relaxed"
                style={{ fontSize: 11, color: apiTheme.muted, marginTop: 4 }}
              >
                {line}
              </p>
            ))}
          </>
        ) : (
          <p className="text-[13px]" style={{ color: apiTheme.subText }}>
            {config.modelList.length ? '请选择一个模型' : '请先拉取模型列表'}
          </p>
        )}
      </div>

      {selectedModelId ? (
        <ApiModelUserMetaEditor
          modelId={selectedModelId}
          value={selectedUserMeta}
          onChange={(next) => {
            const id = selectedModelId
            const empty = createDefaultApiModelUserMeta()
            const isEmpty =
              next.billingMode === empty.billingMode &&
              (next.currency || 'CNY') === 'CNY' &&
              next.inputPrice == null &&
              next.outputPrice == null &&
              next.perCallPrice == null &&
              !(next.remark || '').trim() &&
              !(next.tags || []).length
            const map = { ...(config.modelUserMetaById || {}) }
            if (isEmpty) delete map[id]
            else map[id] = next
            onChange({ ...config, modelUserMetaById: map })
          }}
        />
      ) : null}

      {useSectionTabs ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSectionTab('connect')}
            className="rounded-xl px-3 py-2.5 text-[13px] font-medium"
            style={{
              color: apiTheme.accent,
              background: apiTheme.accentSoft,
              border: `1px solid ${apiTheme.borderStrong}`,
            }}
          >
            上一步
          </button>
          <button
            type="button"
            onClick={() => setSectionTab('params')}
            className="rounded-xl px-3 py-2.5 text-[13px] font-medium"
            style={{ background: apiTheme.accent, color: apiTheme.onAccent }}
          >
            下一步：参数
          </button>
        </div>
      ) : null}
    </section>
  )

  const paramsSection = (
    <section className="space-y-3">
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold" style={{ color: apiTheme.text }}>
              输出参数
            </p>
            <ApiSamplingParamHelpButton helpKey="section" />
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: apiTheme.subText }}>
            {customizedSampling.length
              ? `已调：${customizedSampling.join(' · ')}`
              : '未调为系统默认（最大 Token 12800）。调过的项会覆盖聊天 / 约会等请求上限。'}
          </p>
        </div>
      </div>
      <div className="space-y-2.5">
        <SamplingSliderField
          label="温度"
          helpKey="temperature"
          hint="推荐 0.7～0.9"
          value={config.temperature}
          min={0}
          max={2}
          step={0.05}
          digits={2}
          defaultPreview={0.7}
          minLabel="0 更稳"
          maxLabel="2 更发散"
          onCommit={(n) => onChange(patchSampling(config, { temperature: n }))}
        />
        <SamplingSliderField
          label="Top P"
          helpKey="topP"
          hint="多数可不调"
          value={config.topP}
          min={0}
          max={1}
          step={0.01}
          digits={2}
          defaultPreview={1}
          minLabel="0 更窄"
          maxLabel="1 更广"
          onCommit={(n) => onChange(patchSampling(config, { topP: n }))}
        />
        <SamplingSliderField
          label="最大 Token"
          helpKey="maxTokens"
          hint="滑杆最高 128000"
          value={config.maxTokens}
          min={256}
          max={128000}
          step={256}
          digits={0}
          defaultPreview={12800}
          minLabel="256 短"
          maxLabel="128k 长"
          onCommit={(n) =>
            onChange(patchSampling(config, { maxTokens: n != null ? Math.floor(n) : undefined }))
          }
        />
        <SamplingSliderField
          label="频率惩罚"
          helpKey="frequencyPenalty"
          hint="推荐 0～0.3"
          value={config.frequencyPenalty}
          min={-2}
          max={2}
          step={0.05}
          digits={2}
          defaultPreview={0}
          minLabel="-2"
          maxLabel="2 少重复"
          onCommit={(n) => onChange(patchSampling(config, { frequencyPenalty: n }))}
        />
        <SamplingSliderField
          label="存在惩罚"
          helpKey="presencePenalty"
          hint="推荐 0～0.3"
          value={config.presencePenalty}
          min={-2}
          max={2}
          step={0.05}
          digits={2}
          defaultPreview={0}
          minLabel="-2"
          maxLabel="2 换话题"
          onCommit={(n) => onChange(patchSampling(config, { presencePenalty: n }))}
        />
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-black/5">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-black"
          checked={config.streamEnabled === true}
          onChange={(e) =>
            onChange(patchSampling(config, { streamEnabled: e.target.checked ? true : undefined }))
          }
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[13px] font-medium" style={{ color: apiTheme.text }}>
            流式输出（SSE）
            <ApiSamplingParamHelpButton helpKey="stream" />
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed" style={{ color: apiTheme.subText }}>
            默认关；仅当中转要求 stream 时再开。
          </span>
        </span>
      </div>
      <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-black/5">
        <p className="text-[13px] font-medium" style={{ color: apiTheme.text }}>
          聊天识图（带图请求）
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: apiTheme.subText }}>
          不支持识图的模型若强行带上头像/背景/记忆配图，容易 400。默认自动判断并跳过。
        </p>
        <div className="mt-2.5 flex gap-1.5">
          {(
            [
              { id: undefined, label: '自动' },
              { id: 'on' as const, label: '强制开' },
              { id: 'off' as const, label: '关闭' },
            ] as const
          ).map((opt) => {
            const active =
              opt.id === undefined
                ? config.visionInput !== 'on' && config.visionInput !== 'off'
                : config.visionInput === opt.id
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  const next: ApiConfig = { ...config }
                  if (opt.id === undefined) delete next.visionInput
                  else next.visionInput = opt.id
                  onChange(next)
                }}
                className="flex-1 rounded-lg px-2 py-2 text-[12px] font-medium transition-colors"
                style={{
                  background: active ? apiTheme.accent : apiTheme.tabIdle,
                  color: active ? apiTheme.onAccent : apiTheme.text,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
      {useSectionTabs ? (
        <button
          type="button"
          onClick={() => setSectionTab('model')}
          className="w-full rounded-xl px-4 py-2.5 text-[13px] font-medium"
          style={{
            color: apiTheme.subText,
            background: apiTheme.bg,
            border: `1px solid ${apiTheme.border}`,
          }}
        >
          返回模型
        </button>
      ) : null}
    </section>
  )

  return (
    <div
      className={embedded ? 'mt-1' : 'mx-4 mt-3 rounded-2xl bg-white p-4'}
      style={embedded ? undefined : { boxShadow: apiTheme.shadow }}
    >
      {title.trim() ? (
        <p className="text-[15px] font-semibold" style={{ color: apiTheme.text }}>
          {title}
        </p>
      ) : null}
      <div className={`space-y-3 ${title.trim() ? 'mt-3' : ''}`}>
        {useSectionTabs ? (
          <div
            className="flex items-stretch"
            style={{
              background: apiTheme.card,
              borderRadius: 14,
              padding: '10px 6px',
              border: `1px solid ${apiTheme.hairline}`,
            }}
          >
            {MAIN_SECTION_TABS.map((tab, index) => {
              const currentIndex = MAIN_SECTION_TABS.findIndex((t) => t.id === sectionTab)
              const status: 'done' | 'current' | 'todo' =
                index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo'
              const hint =
                tab.id === 'connect' ? connectHint : tab.id === 'model' ? modelHint : paramsHint
              const subtitle = status === 'current' ? '当前' : hint
              const titleColor = status === 'todo' ? apiTheme.muted : apiTheme.text
              const subColor =
                status === 'todo' ? apiTheme.muted : status === 'current' ? apiTheme.text : apiTheme.subText
              return (
                <div key={tab.id} className="flex min-w-0 flex-1 items-stretch">
                  {index > 0 ? (
                    <div
                      className="mx-0.5 w-px shrink-0 self-stretch"
                      style={{ background: apiTheme.borderSoft }}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSectionTab(tab.id)}
                    className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 py-0.5 text-center"
                  >
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: status === 'current' ? 600 : 500,
                        color: titleColor,
                      }}
                    >
                      {tab.label}
                    </span>
                    <span className="mt-0.5 truncate" style={{ fontSize: 10, color: subColor }}>
                      {subtitle}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        ) : null}

        {showConnect ? connectSection : null}
        {showModel ? modelSection : null}
        {showParams ? paramsSection : null}

        {asrMode ? (
          <div
            className="rounded-xl px-4 py-3 text-[13px]"
            style={{
              border: `1px solid ${apiTheme.border}`,
              background: apiTheme.card,
              color: apiTheme.subText,
            }}
          >
            识别模型固定为 `FunAudioLLM/SenseVoiceSmall`，无需手动选择。
          </div>
        ) : null}

        {footer ? <div>{footer}</div> : null}
      </div>
      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {toast ? (
                <motion.div
                  key={toast.text}
                  className="pointer-events-none fixed inset-0 z-[1200] flex items-center justify-center px-5"
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.99 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <div
                    className="flex max-w-[min(20rem,100%)] items-center gap-2.5 rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-[0_8px_28px_rgba(28,25,23,0.08)] backdrop-blur-md"
                    style={{
                      background: toast.ok ? 'rgba(240,253,244,0.94)' : 'rgba(255,247,247,0.94)',
                      color: toast.ok ? '#166534' : '#9f1239',
                      border: toast.ok
                        ? '1px solid rgba(187,247,208,0.95)'
                        : '1px solid rgba(254,205,211,0.9)',
                    }}
                  >
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: toast.ok ? 'rgba(34,197,94,0.16)' : 'rgba(244,63,94,0.14)',
                      }}
                      aria-hidden
                    >
                      {toast.ok ? (
                        <Check className="size-3.5" strokeWidth={2.6} style={{ color: '#16a34a' }} />
                      ) : (
                        <X className="size-3.5" strokeWidth={2.6} style={{ color: '#e11d48' }} />
                      )}
                    </span>
                    <span className="min-w-0 text-left">{toast.text}</span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  )
}

