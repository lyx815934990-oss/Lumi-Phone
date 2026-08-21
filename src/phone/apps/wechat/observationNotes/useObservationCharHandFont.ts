import { useEffect, useState } from 'react'

import { ensureObsHandFontLoaded, OBS_HAND_FAMILY, OBS_HAND_STACK } from './handFont'

/**
 * 观察笔记手记体：全页统一 Aa拾光明信片。
 */
export function useObservationCharHandFont(_params?: {
  characterId?: string | null
  accountId?: string | null
  language?: string | null
}): {
  handStack: string
  fontFamily: string
  ready: boolean
} {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    void ensureObsHandFontLoaded().then((ok) => {
      if (!cancelled) setReady(ok)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return {
    handStack: OBS_HAND_STACK,
    fontFamily: OBS_HAND_FAMILY,
    ready,
  }
}
