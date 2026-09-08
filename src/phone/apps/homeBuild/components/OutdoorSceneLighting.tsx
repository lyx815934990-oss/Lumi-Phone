import type { OutdoorEnvironmentConfig } from '../outdoorEnvironment'

type Props = {
  env: OutdoorEnvironmentConfig
}

/** 轻量室外光照：半球光 + 环境光 + 主/补光，无 PMREM / 软阴影 / 多向补光。 */
export function OutdoorSceneLighting({ env }: Props) {
  const groundColor = env.time === 'night' ? '#1a2440' : env.time === 'dusk' ? '#4a4048' : '#506070'

  return (
    <>
      <hemisphereLight
        color={env.ambientColor}
        groundColor={groundColor}
        intensity={env.ambientIntensity}
      />
      <ambientLight intensity={env.ambientIntensity * 0.42} color={env.ambientColor} />

      {env.sunIntensity > 0 ? (
        <directionalLight
          position={env.sunPosition}
          intensity={env.sunIntensity}
          color={env.sunLightColor}
        />
      ) : null}

      <directionalLight
        position={env.fillPosition}
        intensity={env.fillIntensity}
        color={env.fillColor}
      />
    </>
  )
}
