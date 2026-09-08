import { CloudSun, X } from 'lucide-react'
import { Pressable } from '../../../components/Pressable'
import {
  DEFAULT_SUN_AZIMUTH,
  OUTDOOR_SCENERY_OPTIONS,
  OUTDOOR_TIME_OPTIONS,
  OUTDOOR_WEATHER_OPTIONS,
  sunAzimuthLabel,
} from '../outdoorEnvironment'
import { useHomeBuildStore } from '../store'
import {
  OUTDOOR_SCENERY_LABELS,
  OUTDOOR_TIME_LABELS,
  OUTDOOR_WEATHER_LABELS,
  RAIN_SIZE_DEFAULT,
  RAIN_SIZE_MAX,
  RAIN_SIZE_MIN,
  type OutdoorScenery,
  type OutdoorTimeOfDay,
  type OutdoorWeather,
} from '../types'

export function OutdoorEnvironmentPanel() {
  const outdoorEnvOpen = useHomeBuildStore((s) => s.outdoorEnvOpen)
  const draft = useHomeBuildStore((s) => s.draft)
  const setOutdoorEnvOpen = useHomeBuildStore((s) => s.setOutdoorEnvOpen)
  const setOutdoorEnvironment = useHomeBuildStore((s) => s.setOutdoorEnvironment)
  const save = useHomeBuildStore((s) => s.save)

  const time = draft.outdoorTime ?? 'day'
  const weather = draft.outdoorWeather ?? 'clear'
  const scenery = draft.outdoorScenery ?? 'none'
  const sunAzimuthDay = draft.outdoorSunAzimuthDay ?? DEFAULT_SUN_AZIMUTH.day
  const sunAzimuthDusk = draft.outdoorSunAzimuthDusk ?? DEFAULT_SUN_AZIMUTH.dusk
  const rainSize = draft.outdoorRainSize ?? RAIN_SIZE_DEFAULT
  const rainThunder = draft.outdoorRainThunder ?? false
  const showSunControls = weather === 'clear'
  const showRainControls = weather === 'rain'

  const pickTime = (next: OutdoorTimeOfDay) => {
    setOutdoorEnvironment({ time: next })
    save()
  }

  const pickWeather = (next: OutdoorWeather) => {
    setOutdoorEnvironment({ weather: next })
    save()
  }

  const pickScenery = (next: OutdoorScenery) => {
    setOutdoorEnvironment({ scenery: next })
    save()
  }

  const setSunAzimuthDay = (value: number) => {
    setOutdoorEnvironment({ sunAzimuthDay: value })
    save()
  }

  const setSunAzimuthDusk = (value: number) => {
    setOutdoorEnvironment({ sunAzimuthDusk: value })
    save()
  }

  const setRainSize = (value: number) => {
    setOutdoorEnvironment({ rainSize: value })
    save()
  }

  const setRainThunder = (value: boolean) => {
    setOutdoorEnvironment({ rainThunder: value })
    save()
  }

  const rainHint = rainThunder ? '雨天·打雷' : '雨天'
  const summary =
    scenery !== 'none'
      ? `${OUTDOOR_TIME_LABELS[time]} · ${weather === 'rain' ? rainHint : OUTDOOR_WEATHER_LABELS[weather]} · ${OUTDOOR_SCENERY_LABELS[scenery]}`
      : `${OUTDOOR_TIME_LABELS[time]} · ${weather === 'rain' ? rainHint : OUTDOOR_WEATHER_LABELS[weather]}`

  if (!outdoorEnvOpen) {
    return (
      <button
        type="button"
        className="hb-outdoor-env-btn pointer-events-auto absolute right-3 top-3 z-20 flex max-w-[calc(100%-5rem)] items-center gap-1.5 rounded-2xl px-3 py-2"
        onClick={() => setOutdoorEnvOpen(true)}
        aria-label="室外天气"
      >
        <CloudSun className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="truncate text-[11px] font-medium">{summary}</span>
      </button>
    )
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col justify-end">
      <Pressable
        className="absolute inset-0 bg-black/35"
        onClick={() => setOutdoorEnvOpen(false)}
        aria-label="关闭"
      >
        <span className="sr-only">关闭</span>
      </Pressable>
      <div className="hb-outdoor-env-drawer relative max-h-[78vh] overflow-y-auto px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-1">
        <div className="hb-drawer-handle" />
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-white">室外环境</p>
            <p className="text-[11px] text-white/55">时段、天气与远景背景，3D 预览同步</p>
          </div>
          <Pressable className="hb-toolbar-btn !text-white/80" onClick={() => setOutdoorEnvOpen(false)}>
            <X className="size-4" />
          </Pressable>
        </div>

        <p className="mb-2 text-[11px] font-medium text-white/50">时段</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {OUTDOOR_TIME_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              className="hb-outdoor-chip"
              data-active={time === t}
              onClick={() => pickTime(t)}
            >
              {OUTDOOR_TIME_LABELS[t]}
            </button>
          ))}
        </div>

        <p className="mb-2 text-[11px] font-medium text-white/50">天气</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {OUTDOOR_WEATHER_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              className="hb-outdoor-chip"
              data-active={weather === w}
              onClick={() => pickWeather(w)}
            >
              {OUTDOOR_WEATHER_LABELS[w]}
            </button>
          ))}
        </div>

        {showRainControls ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <p className="mb-3 text-[11px] font-medium text-white/50">雨天设置</p>

            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
                <span>雨滴大小</span>
                <span className="text-white/45">
                  {rainSize} · {rainSize <= 2 ? '小雨' : rainSize >= 4 ? '大雨' : '中雨'}
                </span>
              </div>
              <input
                type="range"
                min={RAIN_SIZE_MIN}
                max={RAIN_SIZE_MAX}
                step={1}
                value={rainSize}
                className="hb-outdoor-slider w-full"
                onChange={(e) => setRainSize(Number.parseInt(e.target.value, 10))}
                aria-label="雨滴大小"
              />
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
                雨滴越大越密集，落地溅射也会更大。
              </p>
            </div>

            <label className="flex items-center justify-between gap-3 text-[11px] text-white/70">
              <span>打雷闪电</span>
              <button
                type="button"
                role="switch"
                aria-checked={rainThunder}
                className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                style={{
                  background: rainThunder ? 'rgba(44,111,173,0.85)' : 'rgba(255,255,255,0.15)',
                }}
                onClick={() => setRainThunder(!rainThunder)}
              >
                <span
                  className="absolute top-0.5 size-5 rounded-full bg-white transition-transform"
                  style={{ left: rainThunder ? 22 : 2 }}
                />
              </button>
            </label>
          </div>
        ) : null}

        {showSunControls ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <p className="mb-3 text-[11px] font-medium text-white/50">太阳照射方位（仅晴天）</p>

            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
                <span>白天</span>
                <span className="text-white/45">
                  {Math.round(sunAzimuthDay)}° · {sunAzimuthLabel(sunAzimuthDay)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={sunAzimuthDay}
                className="hb-outdoor-slider w-full"
                onChange={(e) => setSunAzimuthDay(Number(e.target.value))}
                aria-label="白天太阳方位"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
                <span>傍晚</span>
                <span className="text-white/45">
                  {Math.round(sunAzimuthDusk)}° · {sunAzimuthLabel(sunAzimuthDusk)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={sunAzimuthDusk}
                className="hb-outdoor-slider w-full"
                onChange={(e) => setSunAzimuthDusk(Number(e.target.value))}
                aria-label="傍晚太阳方位"
              />
            </div>

            <p className="mt-2 text-[10px] leading-relaxed text-white/35">
              拖动滑块改变太阳从哪个方向照入；切换「白天/傍晚」时段可预览对应角度。
            </p>
          </div>
        ) : null}

        <p className="mb-2 text-[11px] font-medium text-white/50">远景背景</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {OUTDOOR_SCENERY_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="hb-outdoor-chip"
              data-active={scenery === s}
              onClick={() => pickScenery(s)}
            >
              {OUTDOOR_SCENERY_LABELS[s]}
            </button>
          ))}
        </div>
        <p className="text-[10px] leading-relaxed text-white/40">
          晴天可见太阳，夜晚可见月亮与星空；阴/雨/雪会有云层。远景环绕房屋四周显示。
        </p>
      </div>
    </div>
  )
}
