/**
 * 内置向量 / 语音走服务端代理。硅基流动 Key 只放在 Worker Secret，不要写进前端或仓库。
 * 代理只转发 BAAI/bge-m3 与 FunAudioLLM/SenseVoiceSmall。
 */
const DEFAULT_BUILTIN_SILICONFLOW_PROXY_BASE_URL =
  'https://siliconflow-builtin.lyx815934990.workers.dev'

export function readBuiltinSiliconflowProxyBase(): string {
  const fromEnv = import.meta.env.VITE_SILICONFLOW_BUILTIN_PROXY
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, '')
  }
  return DEFAULT_BUILTIN_SILICONFLOW_PROXY_BASE_URL
}

export function isBuiltinSiliconflowProxyUrl(url: string): boolean {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) return false
  return trimmed === readBuiltinSiliconflowProxyBase()
}

/** 勾选内置 Key 时给配置页看的说明 */
export const BUILTIN_SILICONFLOW_PROXY_HINT =
  '内置 Key 经 Cloudflare 转发，国内一般要先开代理才能连上。关掉后填写自己的地址和密钥，可直连，不用开代理。'
