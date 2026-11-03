import { useEffect, useState } from 'react'
import { INK_KICKER, INK_LEAD, INK_SECTION, INK_TITLE } from './personaEditorTabs'
import type { Character, PlayerIdentity } from '../types'
import { personaDb } from '../idb'
import { loadAccountsBundle } from '../../wechatAccountPersistence'
import {
  backfillCharacterPlayerIdentityLinkMeta,
  backfillNpcPlayerIdentityFromRootMain,
  formatPlayerIdentityDisplayName,
  getCharacterBoundPlayerIdentityId,
  getCharacterCrossAccountLinkedPlayerIdentityIds,
  getCharacterLinkedPlayerIdentityIds,
} from '../../wechatCharacterPlayerIdentity'
import {
  formatWechatAccountLabel,
  resolvePlayerIdentityWechatAccountId,
} from '../../wechatContactIdentityPrompt'

type BindingRow = {
  identityId: string
  role: 'primary' | 'linked'
  identity: PlayerIdentity | null
  accountId: string
  accountLabel: string
}

function BindingCard({ row }: { row: BindingRow }) {
  const name = formatPlayerIdentityDisplayName(row.identity, row.identityId)
  const wxNick = row.identity?.wechatNickname?.trim()
  const title = row.identity?.identity?.trim()
  const isPrimary = row.role === 'primary'

  return (
    <div
      className={`rounded-[12px] border px-4 py-3.5 ${
        isPrimary ? 'border-[#5A6574]/55 bg-[#EBEEF2]' : 'border-[#D2D0CB] bg-[#EDEBE7]/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
            isPrimary ? 'bg-[#5A6574]/15 text-[#3A414C]' : 'bg-[#D2D0CB]/80 text-[#6A6E76]'
          }`}
        >
          {isPrimary ? '档案主绑定' : '副绑定 · 关联马甲'}
        </span>
        {row.accountId ? (
          <span className="min-w-0 truncate text-right text-[11px] font-medium text-[#1C1C1E]">
            {row.accountLabel}
          </span>
        ) : (
          <span className="text-[11px] text-neutral-400">未标注微信账号</span>
        )}
      </div>
      <p className="mt-2.5 text-[15px] font-semibold tracking-tight text-[#1C1C1E]">{name}</p>
      {wxNick && wxNick !== name ? (
        <p className="mt-0.5 text-[12px] text-neutral-500">微信昵称：{wxNick}</p>
      ) : null}
      {title ? <p className="mt-1 text-[12px] text-neutral-500">身份/职务：{title}</p> : null}
      <p className="mt-2 font-mono text-[10px] text-neutral-400">ID · {row.identityId}</p>
    </div>
  )
}

export function BindingsInfoTab({ character }: { character: Character }) {
  const [rows, setRows] = useState<BindingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        await backfillCharacterPlayerIdentityLinkMeta(character.id)
        let fresh = (await personaDb.getCharacter(character.id)) ?? character
        const rootId = fresh.generatedForCharacterId?.trim()
        if (rootId && !getCharacterBoundPlayerIdentityId(fresh)) {
          await backfillNpcPlayerIdentityFromRootMain(rootId)
          fresh = (await personaDb.getCharacter(character.id)) ?? fresh
        }
        const bundle = await loadAccountsBundle()
        const primary = getCharacterBoundPlayerIdentityId(fresh)
        const identityCache = new Map<string, PlayerIdentity | null>()
        await Promise.all(
          getCharacterLinkedPlayerIdentityIds(fresh).map(async (id) => {
            identityCache.set(id, await personaDb.getPlayerIdentity(id))
          }),
        )
        const accountFor = (identityId: string) =>
          resolvePlayerIdentityWechatAccountId(
            fresh,
            identityId,
            identityCache.get(identityId) ?? null,
          )
        const linked = primary ? getCharacterCrossAccountLinkedPlayerIdentityIds(fresh, accountFor) : []
        const items: BindingRow[] = []

        const pushRow = async (identityId: string, role: 'primary' | 'linked') => {
          let identity = identityCache.get(identityId)
          if (identity === undefined) {
            identity = await personaDb.getPlayerIdentity(identityId)
            identityCache.set(identityId, identity)
          }
          const accountId = accountFor(identityId)
          items.push({
            identityId,
            role,
            identity,
            accountId,
            accountLabel: formatWechatAccountLabel(bundle, accountId),
          })
        }

        if (primary) {
          await pushRow(primary, 'primary')
          for (const lid of linked) await pushRow(lid, 'linked')
        }

        if (!cancelled) setRows(items)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    character.id,
    character.playerIdentityId,
    character.linkedPlayerIdentityIds,
    character.playerIdentityLinkMeta,
  ])

  return (
    <section className={`${INK_SECTION} px-3 pb-6 pt-5`}>
      <header className="mb-4 border-b border-[#D2D0CB] pb-4">
        <p className={INK_KICKER}>04 LINK · 扮演绑定</p>
        <h2 className={INK_TITLE}>绑定信息</h2>
        <p className={INK_LEAD}>
          主绑定为创建角色时写入档案的扮演身份。仅当<strong className="font-medium text-neutral-600">其它微信号</strong>
          也与本角色建立绑定时，才会出现副绑定；同一微信下的多个「我的身份」不会在此重复列出。私聊时 AI 按当前微信线与主绑定分属账号区分，避免误判为换号。
        </p>
      </header>

      {loading ? (
        <p className="py-8 text-center text-[13px] text-neutral-400">加载绑定信息…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-8 text-center">
          <p className="text-[14px] font-medium text-neutral-600">尚未绑定玩家身份</p>
          <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
            创建角色时选择身份；其它微信号加好友通过后，若与主绑定不是同一微信账号，会写入副绑定。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <BindingCard key={`${row.role}-${row.identityId}`} row={row} />
          ))}
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-neutral-400">
        修改跨角色绑定关系：返回角色列表，通过「绑定管理」入口操作。
      </p>
    </section>
  )
}
