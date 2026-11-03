import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { personaDb } from '../wechat/newFriendsPersona/idb'
import {
  extractTextFromPersonaDoc,
  personaDocBaseName,
} from '../wechat/newFriendsPersona/importWorldBookDoc'
import { useCustomization } from '../../CustomizationContext'
import { Pressable } from '../../components/Pressable'
import type { LoreEntry } from '../../worldbook/loreArchiveTypes'
import { removeLoreEntry, useWorldbookStore } from '../../worldbook/worldbookLoreStore'
import type { LoreArchiveBuiltinPresetMeta } from '../../worldbook/loreArchiveBuiltinPresets'
import { LORE_ARCHIVE_FOCUS_ENTRY_SESSION_KEY } from './loreArchiveFocusNavigation'
import { LoreArchiveList, type LoreHomeSegment, parseLoreTagSegment } from './LoreArchiveList'
import { LoreArchiveTagManagerSheet } from './LoreArchiveTagManager'
import { LoreArchiveSystemDetailSheet } from './LoreArchiveSystemDetailSheet'
import { LoreEditor, type LoreEditorCharacter } from './LoreEditor'
import { LA, laEase, laPageStyle } from './loreArchiveTheme'

type Props = { onBack: () => void }

function newEmptyEntry(): LoreEntry {
  return {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    enabled: true,
    plateScope: { mode: 'all' },
    characterScope: { mode: 'all' },
    priorityTier: 2,
    updatedAt: Date.now(),
  }
}

export function LoreArchiveApp({ onBack }: Props) {
  const { state } = useCustomization()
  const {
    entries,
    tags,
    upsertEntry,
    upsertTag,
    removeTag,
    hydrated,
    builtinPresets,
    builtinPresetPriorityTiers,
    setBuiltinPresetEnabled,
    setBuiltinPresetPriorityTier,
  } = useWorldbookStore()

  const [segment, setSegment] = useState<LoreHomeSegment>('all')
  const [screen, setScreen] = useState<'list' | 'edit'>('list')
  const [draft, setDraft] = useState<LoreEntry | null>(null)
  const [draftIsNew, setDraftIsNew] = useState(false)
  const [roster, setRoster] = useState<LoreEditorCharacter[]>([])
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [systemDetail, setSystemDetail] = useState<LoreArchiveBuiltinPresetMeta | null>(null)
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null)
  const docImportInputRef = useRef<HTMLInputElement | null>(null)
  const [docImportConsentOpen, setDocImportConsentOpen] = useState(false)
  const [docImportBusy, setDocImportBusy] = useState(false)

  useEffect(() => {
    if (segment === 'all' || segment === 'system' || segment === 'mine' || segment === 'untagged') return
    const tagId = parseLoreTagSegment(segment)
    if (tagId && !tags.some((t) => t.id === tagId)) setSegment('all')
  }, [tags, segment])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const contacts = state.wechatPersonaContacts
        const npcRows: LoreEditorCharacter[] = (
          await Promise.all(
            contacts.map(async (c) => {
              let avatarUrl = c.avatarUrl?.trim() ?? ''
              let displayName = c.characterId
              try {
                const row = await personaDb.getCharacter(c.characterId)
                if (row?.name?.trim()) displayName = row.name.trim()
                if (row?.avatarUrl?.trim()) avatarUrl = row.avatarUrl.trim()
              } catch {
                // ignore
              }
              return {
                id: c.characterId,
                name: displayName,
                avatarUrl,
                kind: 'npc' as const,
              }
            }),
          )
        ).filter((x) => x.id)
        if (!cancelled) setRoster(npcRows)
      } catch {
        if (!cancelled) setRoster([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [state.wechatPersonaContacts])

  useEffect(() => {
    if (!highlightEntryId) return
    const t = window.setTimeout(() => setHighlightEntryId(null), 600)
    return () => window.clearTimeout(t)
  }, [highlightEntryId])

  const resolveTargets = useCallback(
    (ids: string[]) =>
      ids.map((id) => {
        const hit = roster.find((r) => r.id === id)
        return {
          id,
          avatarUrl: hit?.avatarUrl ?? '',
          name: hit?.name ?? id.slice(0, 8),
        }
      }),
    [roster],
  )

  const entryCountByTagId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of entries) {
      for (const id of e.tagIds ?? []) {
        map[id] = (map[id] ?? 0) + 1
      }
    }
    return map
  }, [entries])

  const openCreate = useCallback(() => {
    setDraft(newEmptyEntry())
    setDraftIsNew(true)
    setScreen('edit')
  }, [])

  const openImportDocConsent = useCallback(() => {
    if (docImportBusy) return
    setDocImportConsentOpen(true)
  }, [docImportBusy])

  const openEdit = useCallback(
    (id: string) => {
      const found = entries.find((e) => e.id === id)
      if (!found) return
      setDraft({ ...found })
      setDraftIsNew(false)
      setScreen('edit')
    },
    [entries],
  )

  useEffect(() => {
    if (!hydrated) return
    let pending: string | null = null
    try {
      pending = sessionStorage.getItem(LORE_ARCHIVE_FOCUS_ENTRY_SESSION_KEY)?.trim() || null
    } catch {
      return
    }
    if (!pending) return
    const found = entries.find((e) => e.id === pending)
    if (!found) return
    try {
      sessionStorage.removeItem(LORE_ARCHIVE_FOCUS_ENTRY_SESSION_KEY)
    } catch {
      // ignore
    }
    openEdit(pending)
  }, [hydrated, entries, openEdit])

  const deleteEntry = useCallback(
    (id: string) => {
      const found = entries.find((e) => e.id === id)
      const titleLabel = found?.title.trim() || '未命名世界书'
      if (!window.confirm(`确定删除「${titleLabel}」吗？`)) return
      removeLoreEntry(id)
      if (draft?.id === id) {
        setDraft(null)
        setScreen('list')
      }
    },
    [entries, draft],
  )

  const setEntryEnabled = useCallback(
    (id: string, enabled: boolean) => {
      const found = entries.find((e) => e.id === id)
      if (!found) return
      upsertEntry({ ...found, enabled, updatedAt: Date.now() })
    },
    [entries, upsertEntry],
  )

  const saveDraft = useCallback(() => {
    if (!draft) return
    const empty = !draft.title.trim() && !draft.content.trim()
    if (empty) {
      if (draftIsNew) removeLoreEntry(draft.id)
      setDraft(null)
      setScreen('list')
      return
    }
    const next = { ...draft, updatedAt: Date.now() }
    upsertEntry(next)
    setHighlightEntryId(next.id)
    setDraft(null)
    setScreen('list')
    setSegment('mine')
  }, [draft, draftIsNew, upsertEntry])

  const cancelEdit = useCallback(() => {
    if (draft && draftIsNew) {
      const empty = !draft.title.trim() && !draft.content.trim()
      if (empty) removeLoreEntry(draft.id)
    }
    setDraft(null)
    setScreen('list')
  }, [draft, draftIsNew])

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={laPageStyle}
      data-phone-page="app"
      data-app-id="loreArchive"
    >
      <AnimatePresence mode="wait" initial={false}>
        {screen === 'list' ? (
          <motion.div
            key="list"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: laEase }}
          >
            <div
              className="flex shrink-0 items-center px-2 pb-1"
              style={{
                paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
                background: LA.paper,
              }}
            >
              <Pressable
                onClick={onBack}
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ color: LA.mist }}
                aria-label="返回桌面"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Pressable>
            </div>
            <LoreArchiveList
              entries={entries}
              tags={tags}
              segment={segment}
              onSegmentChange={setSegment}
              builtinPresets={builtinPresets}
              resolveTargets={resolveTargets}
              onOpenEntry={openEdit}
              onOpenSystem={setSystemDetail}
              onCreate={openCreate}
              onImportDoc={openImportDocConsent}
              docImportBusy={docImportBusy}
              onSetEntryEnabled={setEntryEnabled}
              onSetBuiltinPresetEnabled={setBuiltinPresetEnabled}
              onOpenTagManager={() => setTagManagerOpen(true)}
              highlightEntryId={highlightEntryId}
              onDeleteEntry={deleteEntry}
            />
          </motion.div>
        ) : draft ? (
          <LoreEditor
            key={draft.id}
            draft={draft}
            isNew={draftIsNew}
            roster={roster}
            tags={tags}
            onChange={setDraft}
            onSave={saveDraft}
            onCancel={cancelEdit}
            onDelete={
              draftIsNew
                ? undefined
                : () => {
                    const titleLabel = draft.title.trim() || '未命名世界书'
                    if (!window.confirm(`确定删除「${titleLabel}」吗？`)) return
                    removeLoreEntry(draft.id)
                    setDraft(null)
                    setScreen('list')
                  }
            }
            onOpenTagManager={() => setTagManagerOpen(true)}
          />
        ) : null}
      </AnimatePresence>

      <LoreArchiveTagManagerSheet
        open={tagManagerOpen}
        tags={tags}
        entryCountByTagId={entryCountByTagId}
        onClose={() => setTagManagerOpen(false)}
        onUpsert={(input) => upsertTag(input)}
        onRemove={removeTag}
      />

      <LoreArchiveSystemDetailSheet
        open={Boolean(systemDetail)}
        preset={systemDetail}
        enabled={systemDetail ? builtinPresets[systemDetail.id] === true : false}
        priorityTier={
          systemDetail ? (builtinPresetPriorityTiers[systemDetail.id] ?? 2) : 2
        }
        onClose={() => setSystemDetail(null)}
        onToggle={(enabled) => {
          if (!systemDetail) return
          setBuiltinPresetEnabled(systemDetail.id, enabled)
        }}
        onPriorityTierChange={(tier) => {
          if (!systemDetail) return
          setBuiltinPresetPriorityTier(systemDetail.id, tier)
        }}
      />

      <input
        ref={docImportInputRef}
        type="file"
        accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const input = e.currentTarget
          void (async () => {
            const f = input.files?.[0]
            input.value = ''
            if (!f) return
            setDocImportBusy(true)
            try {
              const text = await extractTextFromPersonaDoc(f)
              if (!text) {
                window.alert('文件没有可读文字内容')
                return
              }
              const entryName = personaDocBaseName(f.name)
              setDraft({
                ...newEmptyEntry(),
                title: entryName.slice(0, 48),
                content: text,
                enabled: true,
                updatedAt: Date.now(),
              })
              setDraftIsNew(true)
              setScreen('edit')
              setSegment('mine')
            } catch (err) {
              window.alert(err instanceof Error && err.message.trim() ? err.message : '导入失败')
            } finally {
              setDocImportBusy(false)
            }
          })()
        }}
      />

      {docImportConsentOpen ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lore-doc-import-consent-title"
            className="w-full max-w-[400px] rounded-[22px] border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur-xl"
          >
            <p
              id="lore-doc-import-consent-title"
              className="text-center text-[17px] font-semibold text-stone-900"
            >
              导入前请确认
            </p>
            <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-stone-600">
              <p>
                导入文件前，请确认你已征得
                <strong className="font-semibold text-stone-800">原创作者同意</strong>
                ，有权将内容用于本机档案室世界书。
              </p>
              <p>
                请勿导入通过非正规途径获取的文件资源；违规内容引发的版权与合规风险由用户自行承担。
              </p>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setDocImportConsentOpen(false)}
                className="flex-1 rounded-full border border-stone-200 py-3 text-[14px] text-stone-700 transition-colors hover:bg-stone-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocImportConsentOpen(false)
                  window.setTimeout(() => docImportInputRef.current?.click(), 80)
                }}
                className="flex-1 rounded-full bg-stone-900 py-3 text-[14px] font-medium text-white"
              >
                我已了解，继续
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
