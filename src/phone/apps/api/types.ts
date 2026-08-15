import type { MomentsImageGenSettings } from '../../../components/moments/useMomentsSettingsStore'

export type SubApiType = 'xinyu' | 'chatCard' | 'danmaku' | 'voiceAsr' | 'translation'

/** 气泡/缺译/同步翻译所用服务商 */
export type TranslationProviderId =
  | 'openai'
  | 'deepl'
  | 'google'
  | 'azure'
  | 'baidu'
  | 'youdao'
  | 'tencent'

/** 拉取模型列表时附带的费率（按百万 token 或平台原始单位解析） */
export type ApiModelPricing = {
  inputPerMillion?: number | null
  outputPerMillion?: number | null
  cachedInputPerMillion?: number | null
  currency?: 'CNY' | 'USD'
  unit?: 'per_million_tokens' | 'per_image' | 'unknown'
  rawLabel?: string
}

export type ApiConfig = {
  apiUrl: string
  apiKey: string
  modelId: string
  /** 已拉取的模型列表（用于下拉选择） */
  modelList: string[]
  /** 与 modelList 对应的费率（拉取模型时写入；部分平台 /models 不返回则为空） */
  modelPricingById?: Record<string, ApiModelPricing>
  /** 最近一次测试连接结果（用于首页显示连接状态） */
  lastTest?: { ok: boolean; message: string; at: number }
  /**
   * 采样温度 0～2；未设置则沿用各功能内部默认（多为 0.7）。
   * 填写后优先于单次调用硬编码温度。
   */
  temperature?: number
  /** nucleus sampling 0～1；未设置则不传 top_p */
  topP?: number
  /** 单次补全最大 token；未设置则用系统默认 12800（调用方 options 仍可覆盖） */
  maxTokens?: number
  /** frequency_penalty -2～2 */
  frequencyPenalty?: number
  /** presence_penalty -2～2 */
  presencePenalty?: number
  /**
   * OpenAI 兼容 chat/completions 是否请求 SSE 流式。
   * 开启后客户端仍会拼成完整回复再展示（非逐字打字机）；部分仅支持 stream 的网关可开。
   * Gemini 原生 generateContent 忽略此项。
   */
  streamEnabled?: boolean
}

/** 聊天/摘要 API 最小字段（无 modelList，dating/摘要 fallback 常用） */
export type ApiConfigCore = Pick<ApiConfig, 'apiUrl' | 'apiKey' | 'modelId'>

export type SubApiConfig = {
  enabled: boolean
  useMainApi: boolean
  apiConfig: ApiConfig
  /** 仅 translation：服务商 */
  translationProvider?: TranslationProviderId
  /** DeepL Free / Pro 端点 */
  deeplPlan?: 'free' | 'pro'
  /** Azure Translator 区域，如 eastasia */
  azureRegion?: string
  /** 腾讯云地域，如 ap-guangzhou */
  tencentRegion?: string
  /** 百度 APP ID / 有道应用ID / 腾讯 SecretId */
  translationAppId?: string
}

export type ApiPreset = {
  id: string
  name: string
  description?: string
  main: ApiConfig
  sub: Record<SubApiType, SubApiConfig>
  /** 文生图 API（朋友圈配图、聊天室角色发图） */
  imageGen: MomentsImageGenSettings
  createdAt: number
  updatedAt: number
}

export type LinkPreviewSettings = {
  /** 是否启用链接预览（用户发 https 时注入摘要） */
  enabled: boolean
  /** @deprecated 固定为极数本源正文提取地址，仅作存储兼容 */
  apiBase: string
  /** ApiZero API Key（可选；不填走匿名免费额度，填写后配额更高） */
  apiKey: string
  /** 抖音 / 小红书 / B 站等链接走 ApiZero 视频元数据解析 */
  videoParseEnabled: boolean
  /** @deprecated 已由 videoParseEnabled 替代，读取时自动迁移 */
  allowLowTrustHosts?: boolean
  lastTest?: { ok: boolean; message: string; at: number }
}

export type ApiStore = {
  presets: ApiPreset[]
  currentPresetId: string
  linkPreview: LinkPreviewSettings
}
