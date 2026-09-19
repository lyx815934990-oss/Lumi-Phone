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
