import type { ApiConfig, SubApiConfig, TranslationProviderId } from './types'
import { createEmptyApiConfig } from './mock'
import { md5Hex } from './translationMd5'

export const TRANSLATION_PROVIDER_OPTIONS: Array<{
  id: TranslationProviderId
  label: string
  desc: string
}> = [
  { id: 'openai', label: 'OpenAI 兼容', desc: '用任意聊天模型翻译；可跟随主接口' },
  { id: 'deepl', label: 'DeepL', desc: '欧美语质量口碑好；填 Auth Key' },
  { id: 'google', label: 'Google 翻译', desc: '语种覆盖广；填 Cloud Translation API Key' },
  { id: 'azure', label: 'Azure 翻译', desc: '微软 Translator；填密钥 + 区域' },
  { id: 'baidu', label: '百度翻译', desc: '国内常用；填 APP ID + 密钥' },
  { id: 'youdao', label: '有道翻译', desc: '国内常用；填应用 ID + 应用密钥' },
  { id: 'tencent', label: '腾讯云翻译', desc: '国内常用；填 SecretId + SecretKey' },
]

export function isTranslationProviderId(raw: unknown): raw is TranslationProviderId {
  return TRANSLATION_PROVIDER_OPTIONS.some((o) => o.id === raw)
}

export function normalizeTranslationProviderId(raw: unknown): TranslationProviderId {
  return isTranslationProviderId(raw) ? raw : 'openai'
}

export type TranslationRuntime = {
  provider: TranslationProviderId
  /** OpenAI 兼容时的解析结果；其它服务商可为空 */
  openaiConfig: ApiConfig | null
  apiKey: string
  appId: string
  deeplPlan: 'free' | 'pro'
  azureRegion: string
  tencentRegion: string
}

export function resolveTranslationRuntime(params: {
  main: ApiConfig
  sub: SubApiConfig | null | undefined
}): TranslationRuntime | null {
  const sub = params.sub
  if (!sub || sub.enabled === false) return null
  const provider = normalizeTranslationProviderId(sub.translationProvider)
  const apiKey = String(sub.apiConfig?.apiKey ?? '').trim()
  const appId = String(sub.translationAppId ?? '').trim()
  const deeplPlan = sub.deeplPlan === 'pro' ? 'pro' : 'free'
  const azureRegion = String(sub.azureRegion ?? '').trim() || 'eastasia'
  const tencentRegion = String(sub.tencentRegion ?? '').trim() || 'ap-guangzhou'

  if (provider === 'openai') {
    // OpenAI 兼容：翻译副接口直接复用主接口凭证（无需「跟随主接口」开关）
    const cfg = params.main
    if (!cfg?.apiUrl?.trim() || !cfg?.apiKey?.trim() || !cfg?.modelId?.trim()) return null
    return {
      provider: 'openai',
      openaiConfig: cfg,
      apiKey: cfg.apiKey,
      appId: '',
      deeplPlan,
      azureRegion,
      tencentRegion,
    }
  }

  if (provider === 'deepl' || provider === 'google' || provider === 'azure') {
    if (!apiKey) return null
    if (provider === 'azure' && !azureRegion) return null
    return {
      provider,
      openaiConfig: null,
      apiKey,
      appId: '',
      deeplPlan,
      azureRegion,
      tencentRegion,
    }
  }

  if (!appId || !apiKey) return null
  return {
    provider,
    openaiConfig: null,
    apiKey,
    appId,
    deeplPlan,
    azureRegion,
    tencentRegion,
  }
}

/** 把会话语言 code 映射到各服务商目标语代码 */
export function mapTargetLangForProvider(
  provider: TranslationProviderId,
  code: string,
): string {
  const c = String(code ?? '').trim() || 'zh-CN'
  switch (provider) {
    case 'deepl': {
      const m: Record<string, string> = {
        'zh-CN': 'ZH',
        'zh-TW': 'ZH',
        en: 'EN',
        ja: 'JA',
        ko: 'KO',
        fr: 'FR',
        de: 'DE',
        es: 'ES',
        ru: 'RU',
      }
      return m[c] || 'ZH'
    }
    case 'azure': {
      const m: Record<string, string> = {
        'zh-CN': 'zh-Hans',
        'zh-TW': 'zh-Hant',
        en: 'en',
        ja: 'ja',
        ko: 'ko',
        fr: 'fr',
        de: 'de',
        es: 'es',
        ru: 'ru',
        th: 'th',
        vi: 'vi',
      }
      return m[c] || 'zh-Hans'
    }
    case 'baidu': {
      const m: Record<string, string> = {
        'zh-CN': 'zh',
        'zh-TW': 'cht',
        en: 'en',
        ja: 'jp',
        ko: 'kor',
        fr: 'fra',
        de: 'de',
        es: 'spa',
        ru: 'ru',
        th: 'th',
        vi: 'vie',
      }
      return m[c] || 'zh'
    }
    case 'youdao': {
      const m: Record<string, string> = {
        'zh-CN': 'zh-CHS',
        'zh-TW': 'zh-CHT',
        en: 'en',
        ja: 'ja',
        ko: 'ko',
        fr: 'fr',
        de: 'de',
        es: 'es',
        ru: 'ru',
        th: 'th',
        vi: 'vi',
      }
      return m[c] || 'zh-CHS'
    }
    case 'tencent': {
      const m: Record<string, string> = {
        'zh-CN': 'zh',
        'zh-TW': 'zh-TW',
        en: 'en',
        ja: 'ja',
        ko: 'ko',
        fr: 'fr',
        de: 'de',
        es: 'es',
        ru: 'ru',
        th: 'th',
        vi: 'vi',
      }
      return m[c] || 'zh'
    }
    case 'google':
    case 'openai':
    default:
      return c
  }
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
}

function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function translateDeepL(
  texts: string[],
  target: string,
  apiKey: string,
  plan: 'free' | 'pro',
): Promise<string[]> {
  const endpoint =
    plan === 'pro' ? 'https://api.deepl.com/v2/translate' : 'https://api-free.deepl.com/v2/translate'
  const body = new URLSearchParams()
  for (const t of texts) body.append('text', t)
  body.set('target_lang', target)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as { translations?: Array<{ text?: string }> }
  const out = (json.translations ?? []).map((x) => String(x.text ?? '').trim())
  if (out.length !== texts.length) throw new Error('DeepL 返回条数与输入不一致')
  return out
}

async function translateGoogle(texts: string[], target: string, apiKey: string): Promise<string[]> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, target, format: 'text' }),
  })
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as {
    data?: { translations?: Array<{ translatedText?: string }> }
  }
  const out = (json.data?.translations ?? []).map((x) => String(x.translatedText ?? '').trim())
  if (out.length !== texts.length) throw new Error('Google 返回条数与输入不一致')
  return out
}

async function translateAzure(
  texts: string[],
  target: string,
  apiKey: string,
  region: string,
): Promise<string[]> {
  const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(target)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Ocp-Apim-Subscription-Region': region,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(texts.map((text) => ({ Text: text }))),
  })
  if (!res.ok) throw new Error(`Azure ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as Array<{ translations?: Array<{ text?: string }> }>
  const out = json.map((row) => String(row.translations?.[0]?.text ?? '').trim())
  if (out.length !== texts.length) throw new Error('Azure 返回条数与输入不一致')
  return out
}

async function translateBaidu(
  texts: string[],
  target: string,
  appId: string,
  secret: string,
): Promise<string[]> {
  // 百度单次建议一条；串行保证顺序
  const out: string[] = []
  for (const q of texts) {
    const salt = String(Date.now())
    const sign = md5Hex(`${appId}${q}${salt}${secret}`)
    const body = new URLSearchParams({
      q,
      from: 'auto',
      to: target,
      appid: appId,
      salt,
      sign,
    })
    const res = await fetch('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) throw new Error(`百度翻译 HTTP ${res.status}`)
    const json = (await res.json()) as {
      error_code?: string
      error_msg?: string
      trans_result?: Array<{ dst?: string }>
    }
    if (json.error_code) throw new Error(`百度翻译 ${json.error_code}: ${json.error_msg || ''}`)
    out.push(String(json.trans_result?.[0]?.dst ?? '').trim())
  }
  return out
}

async function translateYoudao(
  texts: string[],
  target: string,
  appKey: string,
  appSecret: string,
): Promise<string[]> {
  const out: string[] = []
  for (const q of texts) {
    const salt = String(Date.now())
    const curtime = String(Math.floor(Date.now() / 1000))
    const input = q.length <= 20 ? q : `${q.slice(0, 10)}${q.length}${q.slice(-10)}`
    const sign = await sha256Hex(`${appKey}${input}${salt}${curtime}${appSecret}`)
    const body = new URLSearchParams({
      q,
      from: 'auto',
      to: target,
      appKey,
      salt,
      sign,
      signType: 'v3',
      curtime,
    })
    const res = await fetch('https://openapi.youdao.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) throw new Error(`有道翻译 HTTP ${res.status}`)
    const json = (await res.json()) as { errorCode?: string; translation?: string[] }
    if (json.errorCode && json.errorCode !== '0') throw new Error(`有道翻译错误码 ${json.errorCode}`)
    out.push(String(json.translation?.[0] ?? '').trim())
  }
  return out
}

async function translateTencent(
  texts: string[],
  target: string,
  secretId: string,
  secretKey: string,
  region: string,
): Promise<string[]> {
  const host = 'tmt.tencentcloudapi.com'
  const service = 'tmt'
  const action = 'TextTranslateBatch'
  const version = '2018-03-21'
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
  const payloadObj = {
    SourceTextList: texts,
    Source: 'auto',
    Target: target,
    ProjectId: 0,
  }
  const payload = JSON.stringify(payloadObj)
  const hashedPayload = await sha256Hex(payload)
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`
  const signedHeaders = 'content-type;host;x-tc-action'
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join('\n')
  const credentialScope = `${date}/${service}/tc3_request`
  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(timestamp),
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')

  const kDate = await hmacSha256(u8ToArrayBuffer(new TextEncoder().encode(`TC3${secretKey}`)), date)
  const kService = await hmacSha256(kDate, service)
  const kSigning = await hmacSha256(kService, 'tc3_request')
  const signature = bytesToHex(await hmacSha256(kSigning, stringToSign))
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(`https://${host}`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json; charset=utf-8',
      Host: host,
      'X-TC-Action': action,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': version,
      'X-TC-Region': region,
    },
    body: payload,
  })
  if (!res.ok) throw new Error(`腾讯云翻译 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as {
    Response?: { TargetTextList?: string[]; Error?: { Code?: string; Message?: string } }
  }
  if (json.Response?.Error) {
    throw new Error(`腾讯云翻译 ${json.Response.Error.Code}: ${json.Response.Error.Message}`)
  }
  const out = (json.Response?.TargetTextList ?? []).map((t) => String(t ?? '').trim())
  if (out.length !== texts.length) throw new Error('腾讯云翻译返回条数与输入不一致')
  return out
}

/** 原生翻译服务商批量译；OpenAI 兼容请走 wechatChatLanguage */
export async function translateTextsWithNativeProvider(params: {
  texts: string[]
  targetLanguage: string
  runtime: TranslationRuntime
  signal?: AbortSignal
}): Promise<string[]> {
  const texts = params.texts.map((t) => t.trim()).filter(Boolean)
  if (!texts.length) return []
  void params.signal
  const { runtime } = params
  const target = mapTargetLangForProvider(runtime.provider, params.targetLanguage)

  switch (runtime.provider) {
    case 'deepl':
      return translateDeepL(texts, target, runtime.apiKey, runtime.deeplPlan)
    case 'google':
      return translateGoogle(texts, target, runtime.apiKey)
    case 'azure':
      return translateAzure(texts, target, runtime.apiKey, runtime.azureRegion)
    case 'baidu':
      return translateBaidu(texts, target, runtime.appId, runtime.apiKey)
    case 'youdao':
      return translateYoudao(texts, target, runtime.appId, runtime.apiKey)
    case 'tencent':
      return translateTencent(texts, target, runtime.appId, runtime.apiKey, runtime.tencentRegion)
    case 'openai':
    default:
      throw new Error('OpenAI 兼容翻译请使用聊天补译接口')
  }
}

export function emptyTranslationSubDefaults(): Pick<
  SubApiConfig,
  'translationProvider' | 'deeplPlan' | 'azureRegion' | 'tencentRegion' | 'translationAppId'
> {
  return {
    translationProvider: 'openai',
    deeplPlan: 'free',
    azureRegion: 'eastasia',
    tencentRegion: 'ap-guangzhou',
    translationAppId: '',
  }
}

export function normalizeTranslationSubFields(src: Partial<SubApiConfig> | null | undefined): {
  translationProvider: TranslationProviderId
  deeplPlan: 'free' | 'pro'
  azureRegion: string
  tencentRegion: string
  translationAppId: string
} {
  const d = emptyTranslationSubDefaults()
  return {
    translationProvider: normalizeTranslationProviderId(src?.translationProvider ?? d.translationProvider),
    deeplPlan: src?.deeplPlan === 'pro' ? 'pro' : 'free',
    azureRegion: typeof src?.azureRegion === 'string' && src.azureRegion.trim() ? src.azureRegion.trim() : d.azureRegion!,
    tencentRegion:
      typeof src?.tencentRegion === 'string' && src.tencentRegion.trim()
        ? src.tencentRegion.trim()
        : d.tencentRegion!,
    translationAppId: typeof src?.translationAppId === 'string' ? src.translationAppId.trim() : '',
  }
}

export function createDefaultTranslationSub(): SubApiConfig {
  return {
    /** 默认关闭：同步翻译由聊天模型输出；勾选「使用副接口」后再走翻译服务商 */
    enabled: false,
    useMainApi: false,
    apiConfig: createEmptyApiConfig(),
    ...emptyTranslationSubDefaults(),
  }
}
