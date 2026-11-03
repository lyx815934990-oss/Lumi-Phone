import { readStoredDeviceId } from './deviceFingerprint'
import type { UserLoginStatus } from './types'

/** 打开 Lumi 免验证的设备码白名单（仅匹配这些设备码） */
const AUTH_BYPASS_DEVICE_IDS = new Set<string>([
  'mach_b05d69f055a2473d9cd48cceb6119a68',
])

/** 本地 `npm run dev` 默认跳过账号校验；生产构建永不生效。设 VITE_LOCAL_DEV_BYPASS_AUTH=false 可关闭 */
export function isLocalDevBypassAuth(): boolean {
  if (!import.meta.env.DEV) return false
  const flag = String(import.meta.env.VITE_LOCAL_DEV_BYPASS_AUTH ?? '').trim().toLowerCase()
  if (flag === 'false' || flag === '0') return false
  return true
}

/** 指定设备码打开 Lumi 时跳过账号验证 */
export function isDeviceAuthBypass(): boolean {
  const deviceId = readStoredDeviceId()
  return !!deviceId && AUTH_BYPASS_DEVICE_IDS.has(deviceId)
}

/** 本地开发 或 白名单设备码：跳过打开 Lumi 的账号验证 */
export function shouldBypassUserAuth(): boolean {
  return isLocalDevBypassAuth() || isDeviceAuthBypass()
}

export const LOCAL_DEV_MOCK_STATUS: UserLoginStatus = {
  username: 'local-dev',
  auditStatus: 'approved',
  auditRejectReason: '',
  banStatus: 'normal',
  banReason: '',
  communityVerified: true,
  communityVerifyReason: 'ok',
  communityVerifyMessage: '',
}
