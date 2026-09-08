import { createEmptyApiConfig } from '../api/mock'
import type { ApiConfig } from '../api/types'

export type LookWorkshopAiApiSource = 'main' | 'sub' | 'custom'

export type LookWorkshopAiApiSettings = {
  source: LookWorkshopAiApiSource
  /** 自定义接口（source === 'custom'） */
  custom: ApiConfig
}

const LS_KEY = 'lumi.lookWorkshop.aiApi.v1'

export function createDefaultLookWorkshopAiApiSettings(): LookWorkshopAiApiSettings {
  return {
    source: 'main',
    custom: createEmptyApiConfig(),
  }
}

export function loadLookWorkshopAiApiSettings(): LookWorkshopAiApiSettings {
  const base = createDefaultLookWorkshopAiApiSettings()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<LookWorkshopAiApiSettings>
    const source =
      parsed.source === 'main' || parsed.source === 'sub' || parsed.source === 'custom'
        ? parsed.source
        : 'main'
    const c =
      parsed.custom && typeof parsed.custom === 'object'
        ? (parsed.custom as Record<string, unknown>)
        : ({} as Record<string, unknown>)
    const modelList = Array.isArray(c.modelList)
      ? c.modelList.filter((x: unknown): x is string => typeof x === 'string')
      : []
    const pricingRaw = c.modelPricingById
    return {
      source,
      custom: {
        apiUrl: typeof c.apiUrl === 'string' ? c.apiUrl : '',
        apiKey: typeof c.apiKey === 'string' ? c.apiKey : '',
        modelId: typeof c.modelId === 'string' ? c.modelId : '',
        modelList,
        modelPricingById:
          pricingRaw && typeof pricingRaw === 'object' && !Array.isArray(pricingRaw)
            ? (pricingRaw as ApiConfig['modelPricingById'])
            : undefined,
      },
    }
  } catch {
    return base
  }
}

export function saveLookWorkshopAiApiSettings(settings: LookWorkshopAiApiSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings))
  } catch {
    /* quota */
  }
}

export function isApiConfigReady(cfg: ApiConfig | null | undefined): boolean {
  return !!(cfg?.apiUrl?.trim() && cfg?.apiKey?.trim() && cfg?.modelId?.trim())
}
