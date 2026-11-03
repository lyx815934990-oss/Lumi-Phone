import { useCallback, useMemo, useState } from 'react'
import { useWechatStore } from '../../useWechatStore'
import {
  findAccountById,
  loadAccountsBundle,
  reconcileWeChatCharacterOwnershipAfterArchiveImport,
} from '../../wechatAccountPersistence'
import { countWeChatPersonaCoreStoreRecords } from '../../../dataArchive/scanWeChatPersonaIndexedDb'
import { personaDb } from '../idb'
import type { Character, PersonaPack, PlayerIdentity } from '../types'
import { personaPackPremiseLabel } from '../personaPack'
import {
  backfillAllNpcPlayerIdentityFromRootMains,
  backfillCharacterPlayerIdentityLinkMeta,
  buildIdentityDisplayNameMapForCharacters,
  repairCharacterSlotPrimaryBindingFromLinked,
} from '../../wechatCharacterPlayerIdentity'
import { characterAccessibleToWechatAccount } from '../../wechatAccountScope'
import {
  buildWechatSelfContactExclusionContext,
  isCharacterUserAccountSelf,
} from '../../wechatPersonaContactsSelfFilter'
import { isMainCharacter, isPersonaRosterMainCharacter } from './personaRosterTypes'

export function usePersonaRoster(linkedCharacterIds: readonly string[]) {
  const { currentAccountId } = useWechatStore()
  const linkedCharacterIdSet = useMemo(() => new Set(linkedCharacterIds), [linkedCharacterIds])

  const [mainCharacters, setMainCharacters] = useState<Character[]>([])
  const [npcCharacters, setNpcCharacters] = useState<Character[]>([])
  const [identityList, setIdentityList] = useState<PlayerIdentity[]>([])
  const [identityNameById, setIdentityNameById] = useState<Record<string, string>>({})
  const [accountsBundle, setAccountsBundle] = useState<Awaited<ReturnType<typeof loadAccountsBundle>>>(null)
  const [loading, setLoading] = useState(false)
  const [packLabelByCharacterId, setPackLabelByCharacterId] = useState<Record<string, string>>({})
  const [ensemblePacks, setEnsemblePacks] = useState<PersonaPack[]>([])
  /** 多人卡盒面头像：优先可攻略席首位 */
  const [packCoverByPackId, setPackCoverByPackId] = useState<Record<string, Character>>({})

  const mainNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of mainCharacters) {
      const id = c.id.trim()
      if (id) map[id] = c.name?.trim() || '未命名'
    }
    return map
  }, [mainCharacters])

  const mainById = useMemo(() => {
    const map: Record<string, Character> = {}
    for (const c of mainCharacters) {
      const id = c.id.trim()
      if (id) map[id] = c
    }
    return map
  }, [mainCharacters])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const acc = currentAccountId?.trim()
      if (!acc) {
        setMainCharacters([])
        setNpcCharacters([])
        setIdentityNameById({})
        setIdentityList([])
        setPackLabelByCharacterId({})
        setEnsemblePacks([])
        setPackCoverByPackId({})
        return
      }

      let roots = await personaDb.listRootCharactersAccessibleToWechatAccount(acc, [...linkedCharacterIds])
      if (!roots.length) {
        const core = await countWeChatPersonaCoreStoreRecords()
        if (core.characters > 0) {
          try {
            await reconcileWeChatCharacterOwnershipAfterArchiveImport()
            roots = await personaDb.listRootCharactersAccessibleToWechatAccount(acc, [...linkedCharacterIds])
          } catch (e) {
            console.warn('[persona-roster] ownership reconcile failed', e)
          }
        }
      }
      let repaired = false
      for (const c of roots) {
        if (await repairCharacterSlotPrimaryBindingFromLinked(c.id)) repaired = true
        if (await backfillCharacterPlayerIdentityLinkMeta(c.id)) repaired = true
      }
      if ((await backfillAllNpcPlayerIdentityFromRootMains(acc)) > 0) repaired = true
      if (repaired) {
        roots = await personaDb.listRootCharactersAccessibleToWechatAccount(acc, [...linkedCharacterIds])
      }

      const bundle = await loadAccountsBundle()
      const account = bundle ? findAccountById(bundle, acc) : null
      const selfExclusion = account ? await buildWechatSelfContactExclusionContext(account) : null
      roots = roots.filter(
        (c) =>
          isPersonaRosterMainCharacter(c) &&
          (!selfExclusion || !isCharacterUserAccountSelf(c, selfExclusion)),
      )

      const packs = await personaDb.listPersonaPacks()
      const accPacks = packs.filter(
        (p) => !p.wechatAccountId?.trim() || p.wechatAccountId.trim() === acc,
      )
      const ensemble = accPacks
        .filter((p) => p.kind === 'ensemble')
        .sort((a, b) => b.updatedAt - a.updatedAt)
      const packMemberIds = new Set<string>()
      const packMap: Record<string, string> = {}
      const coverByPack: Record<string, Character> = {}
      const charById = new Map<string, Character>()
      {
        const allForCover = await personaDb.listCharactersForWechatAccount(acc)
        for (const c of allForCover) {
          const id = c.id.trim()
          if (id) charById.set(id, c)
        }
      }
      for (const p of ensemble) {
        const label = `${personaPackPremiseLabel(p.premiseKind)} · ${p.title.trim() || '未命名'}`
        for (const id of [...p.memberIds, ...p.npcIds]) {
          const cid = id.trim()
          if (!cid) continue
          packMemberIds.add(cid)
          packMap[cid] = label
        }
        const coverId =
          p.memberIds.map((x) => x.trim()).find(Boolean) ||
          p.anchorMemberId?.trim() ||
          p.npcIds.map((x) => x.trim()).find(Boolean) ||
          ''
        const cover = coverId ? charById.get(coverId) : undefined
        if (cover) coverByPack[p.id] = cover
      }
      // 多人卡成员不单独占文件袋格：整卡一张盒；名册里只留单人主角
      const ensembleIds = new Set(ensemble.map((p) => p.id))
      roots = roots.filter((c) => {
        const pid = c.packId?.trim()
        if (pid && ensembleIds.has(pid)) return false
        if (packMemberIds.has(c.id.trim())) return false
        return true
      })

      const allChars = [...charById.values()]
      const npcs = allChars.filter(
        (c) =>
          !isMainCharacter(c) &&
          characterAccessibleToWechatAccount(c, acc, linkedCharacterIdSet) &&
          !(c.packId?.trim() && ensemble.some((p) => p.id === c.packId?.trim())),
      )
      npcs.sort((a, b) => b.updatedAt - a.updatedAt)
      roots.sort((a, b) => b.updatedAt - a.updatedAt)

      const idents = await personaDb.listPlayerIdentities(acc)
      setMainCharacters(roots)
      setNpcCharacters(npcs)
      setIdentityList(idents)
      setIdentityNameById(await buildIdentityDisplayNameMapForCharacters(acc, [...roots, ...npcs]))
      setAccountsBundle(bundle)
      setEnsemblePacks(ensemble)
      setPackCoverByPackId(coverByPack)
      setPackLabelByCharacterId(packMap)
    } catch (e) {
      console.warn('[persona-roster] refresh failed', e)
      window.alert(e instanceof Error ? e.message : '加载人物名册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [currentAccountId, linkedCharacterIdSet, linkedCharacterIds])

  return {
    mainCharacters,
    npcCharacters,
    identityList,
    identityNameById,
    accountsBundle,
    mainNameById,
    mainById,
    loading,
    packLabelByCharacterId,
    ensemblePacks,
    packCoverByPackId,
    refresh,
  }
}
