import { useEffect, useMemo, useState } from 'react'
import { useCustomization } from '../../../CustomizationContext'
import { personaDb } from '../newFriendsPersona/idb'

/**
 * 查手机 UI 展示名：优先「备注」（角色卡 remark → 通讯录 remarkName），
 * 其次微信昵称；不用角色卡真实姓名 name。
 */
export function useCheckPhonePeerLabel(characterId: string, fallbackName?: string): string {
  const { state } = useCustomization()
  const [personaRemark, setPersonaRemark] = useState<string | null>(null)
  const [personaNick, setPersonaNick] = useState<string | null>(null)

  useEffect(() => {
    const cid = characterId.trim()
    if (!cid) {
      setPersonaRemark(null)
      setPersonaNick(null)
      return
    }
    let cancelled = false
    void personaDb.getCharacter(cid).then((ch) => {
      if (cancelled || !ch) return
      setPersonaRemark(ch.remark?.trim() || null)
      setPersonaNick(ch.wechatNickname?.trim() || null)
    })
    return () => {
      cancelled = true
    }
  }, [characterId])

  return useMemo(() => {
    const cid = characterId.trim()
    const contactRemark = cid
      ? (state.wechatPersonaContacts ?? []).find((c) => c.characterId === cid)?.remarkName?.trim()
      : ''
    if (personaRemark) return personaRemark
    if (contactRemark) return contactRemark
    if (personaNick) return personaNick
    const fb = fallbackName?.trim()
    if (fb) return fb
    return '对方'
  }, [characterId, fallbackName, personaNick, personaRemark, state.wechatPersonaContacts])
}
