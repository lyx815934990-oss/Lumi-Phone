/**
 * 浏览器内设备标识（localStorage，各浏览器独立）
 * - 用于后台溯源、同浏览器防多账号
 * - 不能当作「手机硬件 ID」：Safari/Chrome 数据隔离，纯网页无法读取真机序列号
 */
const LEGACY_KEY = 'lc_device_fingerprint_v1'
const MACHINE_KEY = 'us_machine_id_v2'

function detectDeviceType(): 'mobile' | 'desktop' {
  const ua = navigator.userAgent || ''
  if (/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

function createMachineId(): string {
  if (crypto.randomUUID) return `mach_${crypto.randomUUID().replace(/-/g, '')}`
  return `mach_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

/** 同步读取已存设备码（未生成过则返回 null，不新建） */
export function readStoredDeviceId(): string | null {
  try {
    const raw = localStorage.getItem(MACHINE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { machineId?: string }
      if (parsed.machineId) return parsed.machineId
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const leg = JSON.parse(legacy) as { deviceId?: string }
      if (leg.deviceId) return leg.deviceId
    }
  } catch {
    /* ignore */
  }
  return null
}

export async function getDeviceFingerprint(): Promise<{ deviceId: string; deviceType: 'mobile' | 'desktop' }> {
  const deviceType = detectDeviceType()
  const existing = readStoredDeviceId()
  if (existing) {
    return { deviceId: existing, deviceType }
  }
  const machineId = createMachineId()
  try {
    localStorage.setItem(MACHINE_KEY, JSON.stringify({ machineId, deviceType }))
  } catch {
    /* ignore */
  }
  return { deviceId: machineId, deviceType }
}

export async function getPublicIp(): Promise<string> {
  const apis = [
    { url: 'https://api.ipify.org?format=json', pick: (d: { ip?: string }) => d.ip },
    { url: 'https://api.ip.sb/json', pick: (d: { ip?: string }) => d.ip },
  ]
  for (const api of apis) {
    try {
      const res = await fetch(api.url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const data = (await res.json()) as { ip?: string }
      const ip = api.pick(data)
      if (ip) return ip.trim()
    } catch {
      /* try next */
    }
  }
  return 'unknown'
}
