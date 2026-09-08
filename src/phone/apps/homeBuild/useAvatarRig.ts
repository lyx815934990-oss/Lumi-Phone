import { useEffect, useState } from 'react'
import { createAvatarRig, type AvatarRig } from './avatarRig'
import { AVATAR_PREP_REV } from './avatarMeshPrep'
import { clearAllAvatarFbxCache } from './loadAvatarFbx'
import { subscribeOcModelChange } from './ocModelEvents'

export type UseAvatarRigOptions = {
  staticMeshOnly?: boolean
}

export function useAvatarRig(
  characterId: string,
  options: UseAvatarRigOptions = {},
): AvatarRig | null {
  const staticMeshOnly = Boolean(options.staticMeshOnly)
  const [rig, setRig] = useState<AvatarRig | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const bumpModel = (cid: string) => {
      if (cid !== characterId.trim()) return
      setReloadToken((n) => n + 1)
    }
    return subscribeOcModelChange(bumpModel)
  }, [characterId])

  useEffect(() => {
    setRig(null)
  }, [characterId, staticMeshOnly, AVATAR_PREP_REV])

  useEffect(() => {
    clearAllAvatarFbxCache()
  }, [AVATAR_PREP_REV])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const next = await createAvatarRig({ characterId, staticMeshOnly })
        if (!cancelled) setRig(next)
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[homeBuild] OC 加载失败', err)
        }
        try {
          const fallback = await createAvatarRig({ characterId: '', staticMeshOnly })
          if (!cancelled) setRig(fallback)
        } catch {
          /* ignore */
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [characterId, reloadToken, staticMeshOnly, AVATAR_PREP_REV])

  return rig
}
