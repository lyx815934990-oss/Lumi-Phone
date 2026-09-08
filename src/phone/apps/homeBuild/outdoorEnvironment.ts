import type { OutdoorTimeOfDay, OutdoorWeather } from './types'

export type OutdoorSkyFlags = {
  showSun: boolean
  showMoon: boolean
  showStars: boolean
  cloudDensity: number
  sunColor: string
  moonColor: string
}

export type OutdoorEnvironmentConfig = {
  time: OutdoorTimeOfDay
  weather: OutdoorWeather
  background: string
  fogColor: string
  fogNear: number
  fogFar: number
  ambientIntensity: number
  ambientColor: string
  sunPosition: [number, number, number]
  sunIntensity: number
  sunLightColor: string
  fillPosition: [number, number, number]
  fillIntensity: number
  fillColor: string
  gridCell: string
  gridSection: string
  showWeatherFx: boolean
  /** 仅晴天启用表面高光 */
  allowSpecular: boolean
  /** 月亮视觉位置（天空装饰用） */
  moonPosition: [number, number, number]
  /** 室内表面色调（乘到墙/地/顶颜色上） */
  surfaceTint: string
  /** 室内表面亮度系数 0–1 */
  surfaceDim: number
  sky: OutdoorSkyFlags
}

const TIME_BASE: Record<
  OutdoorTimeOfDay,
  Omit<
    OutdoorEnvironmentConfig,
    | 'time'
    | 'weather'
    | 'showWeatherFx'
    | 'sky'
    | 'allowSpecular'
    | 'moonPosition'
    | 'surfaceTint'
    | 'surfaceDim'
  >
> = {
  day: {
    background: '#87b8e8',
    fogColor: '#a8c8e8',
    fogNear: 28,
    fogFar: 64,
    ambientIntensity: 0.68,
    ambientColor: '#eef4ff',
    sunPosition: [10, 18, 8],
    sunIntensity: 1.15,
    sunLightColor: '#fff8ee',
    fillPosition: [-6, 8, -4],
    fillIntensity: 0.55,
    fillColor: '#d0e0f8',
    gridCell: '#4a6a82',
    gridSection: '#5a7a92',
  },
  dusk: {
    background: '#c87858',
    fogColor: '#c88868',
    fogNear: 24,
    fogFar: 58,
    ambientIntensity: 0.52,
    ambientColor: '#ffe0c8',
    sunPosition: [-12, 6, 4],
    sunIntensity: 0.62,
    sunLightColor: '#ffb080',
    fillPosition: [4, 5, -6],
    fillIntensity: 0.45,
    fillColor: '#a88898',
    gridCell: '#6a5048',
    gridSection: '#7a6058',
  },
  night: {
    background: '#141e38',
    fogColor: '#1a2848',
    fogNear: 16,
    fogFar: 46,
    ambientIntensity: 0.38,
    ambientColor: '#506080',
    sunPosition: [-4, 12, -8],
    sunIntensity: 0,
    sunLightColor: '#8090c0',
    fillPosition: [6, 4, 6],
    fillIntensity: 0.18,
    fillColor: '#384858',
    gridCell: '#384058',
    gridSection: '#485068',
  },
}

function applyWeather(
  base: Omit<
    OutdoorEnvironmentConfig,
    | 'time'
    | 'weather'
    | 'showWeatherFx'
    | 'sky'
    | 'allowSpecular'
    | 'moonPosition'
    | 'surfaceTint'
    | 'surfaceDim'
  >,
  weather: OutdoorWeather,
  time: OutdoorTimeOfDay,
): Omit<
  OutdoorEnvironmentConfig,
  | 'time'
  | 'weather'
  | 'showWeatherFx'
  | 'sky'
  | 'allowSpecular'
  | 'moonPosition'
  | 'surfaceTint'
  | 'surfaceDim'
> {
  switch (weather) {
    case 'cloudy':
      return {
        ...base,
        background: time === 'night' ? '#121820' : time === 'dusk' ? '#a86858' : '#8a9aa8',
        fogColor: time === 'night' ? '#182028' : time === 'dusk' ? '#986858' : '#98a8b8',
        ambientIntensity: base.ambientIntensity * 0.92,
        sunIntensity: 0,
        fillIntensity: base.fillIntensity * 1.05,
      }
    case 'rain':
      if (time === 'night') {
        return {
          ...base,
          background: '#121a2a',
          fogColor: '#182030',
          fogNear: base.fogNear * 0.75,
          fogFar: base.fogFar * 0.85,
          ambientIntensity: base.ambientIntensity * 1.1,
          sunIntensity: 0,
          fillIntensity: base.fillIntensity * 0.75,
          gridCell: '#3a4858',
          gridSection: '#4a5868',
        }
      }
      if (time === 'dusk') {
        return {
          ...base,
          background: '#a88878',
          fogColor: '#b89888',
          fogNear: base.fogNear * 0.85,
          fogFar: base.fogFar * 0.92,
          ambientIntensity: base.ambientIntensity * 0.98,
          sunIntensity: 0,
          fillIntensity: base.fillIntensity * 0.85,
          gridCell: '#6a5850',
          gridSection: '#7a6860',
        }
      }
      // 白天下雨：略阴，不要阴沉发黑
      return {
        ...base,
        background: '#9eb4c8',
        fogColor: '#b0c4d4',
        fogNear: base.fogNear * 0.9,
        fogFar: base.fogFar * 0.95,
        ambientIntensity: base.ambientIntensity * 1.02,
        ambientColor: '#e8eef4',
        sunIntensity: 0,
        fillIntensity: base.fillIntensity * 0.95,
        fillColor: '#d8e4f0',
        gridCell: '#6a8090',
        gridSection: '#7a90a0',
      }
    case 'snow':
      return {
        ...base,
        background: time === 'night' ? '#1a2438' : time === 'dusk' ? '#b0a0a8' : '#c8d4e0',
        fogColor: time === 'night' ? '#243040' : time === 'dusk' ? '#a898a0' : '#d8e4f0',
        fogNear: base.fogNear * 0.85,
        fogFar: base.fogFar * 0.9,
        ambientIntensity: base.ambientIntensity * 1.08,
        sunIntensity: 0,
        fillIntensity: base.fillIntensity * 1.05,
        fillColor: '#e8f0ff',
        gridCell: '#8898a8',
        gridSection: '#98a8b8',
      }
    default:
      return base
  }
}

function resolveSkyFlags(time: OutdoorTimeOfDay, weather: OutdoorWeather): OutdoorSkyFlags {
  const isNight = time === 'night'
  const isDusk = time === 'dusk'

  let cloudDensity = 0
  if (weather === 'clear') cloudDensity = isNight ? 0.08 : isDusk ? 0.35 : 0.18
  else if (weather === 'cloudy') cloudDensity = isNight ? 0.75 : 0.82
  else if (weather === 'rain') cloudDensity = isNight ? 0.88 : isDusk ? 0.78 : 0.62
  else if (weather === 'snow') cloudDensity = 0.7
  else cloudDensity = 0.5

  const showSun = !isNight && weather === 'clear'
  const showMoon = isNight && weather !== 'rain'
  const showStars = isNight && weather === 'clear'

  return {
    showSun,
    showMoon,
    showStars,
    cloudDensity,
    sunColor: isDusk ? '#ffb060' : '#fff4d0',
    moonColor: '#e8eeff',
  }
}

export function allowOutdoorSpecular(weather: OutdoorWeather): boolean {
  return weather === 'clear'
}

/** 与默认 sunPosition 对应的方位角（度，0=北，顺时针） */
export const DEFAULT_SUN_AZIMUTH = {
  day: 52,
  dusk: 288,
} as const

const SUN_HORIZONTAL_DIST = {
  day: Math.hypot(10, 8),
  dusk: Math.hypot(12, 4),
} as const

const SUN_HEIGHT = {
  day: 18,
  dusk: 6,
} as const

export function normalizeSunAzimuth(deg: number): number {
  const n = deg % 360
  return n < 0 ? n + 360 : n
}

export function sunAzimuthLabel(deg: number): string {
  const d = normalizeSunAzimuth(deg)
  if (d < 22.5 || d >= 337.5) return '北'
  if (d < 67.5) return '东北'
  if (d < 112.5) return '东'
  if (d < 157.5) return '东南'
  if (d < 202.5) return '南'
  if (d < 247.5) return '西南'
  if (d < 292.5) return '西'
  return '西北'
}

export function sunPositionFromAzimuth(
  azimuthDeg: number,
  time: 'day' | 'dusk',
): [number, number, number] {
  const az = (normalizeSunAzimuth(azimuthDeg) * Math.PI) / 180
  const hDist = SUN_HORIZONTAL_DIST[time]
  const y = SUN_HEIGHT[time]
  return [Math.sin(az) * hDist, y, Math.cos(az) * hDist]
}

export type OutdoorSunAzimuth = {
  day?: number
  dusk?: number
}

const MOON_POSITION: [number, number, number] = [7, 20, -9]

export function resolveOutdoorEnvironment(
  time: OutdoorTimeOfDay = 'day',
  weather: OutdoorWeather = 'clear',
  sunAzimuth?: OutdoorSunAzimuth,
): OutdoorEnvironmentConfig {
  const base = TIME_BASE[time]
  let merged = applyWeather(base, weather, time)
  const allowSpecular = allowOutdoorSpecular(weather)
  const useDirectSun = allowSpecular && time !== 'night'

  if (useDirectSun && (time === 'day' || time === 'dusk')) {
    const az =
      time === 'day'
        ? (sunAzimuth?.day ?? DEFAULT_SUN_AZIMUTH.day)
        : (sunAzimuth?.dusk ?? DEFAULT_SUN_AZIMUTH.dusk)
    merged = {
      ...merged,
      sunPosition: sunPositionFromAzimuth(az, time),
    }
  } else if (!useDirectSun) {
    merged = { ...merged, sunIntensity: 0 }
  }

  const surfaceByTime = {
    day: { tint: '#ffffff', dim: 1 },
    dusk: { tint: '#ffd4b8', dim: 0.66 },
    night: { tint: '#7888a8', dim: 0.42 },
  } as const
  const surface = surfaceByTime[time]
  const surfaceDim =
    time === 'night' && weather === 'rain' ? surface.dim * 0.82 : surface.dim

  return {
    ...merged,
    time,
    weather,
    showWeatherFx: weather === 'rain' || weather === 'snow',
    allowSpecular,
    moonPosition: MOON_POSITION,
    surfaceTint: surface.tint,
    surfaceDim,
    sky: resolveSkyFlags(time, weather),
  }
}

export const OUTDOOR_TIME_OPTIONS: OutdoorTimeOfDay[] = ['day', 'dusk', 'night']
export const OUTDOOR_WEATHER_OPTIONS: OutdoorWeather[] = ['clear', 'cloudy', 'rain', 'snow']

export const OUTDOOR_SCENERY_OPTIONS = [
  'none',
  'city',
  'mountain',
  'suburb',
  'coast',
  'forest',
  'field',
  'desert',
] as const
