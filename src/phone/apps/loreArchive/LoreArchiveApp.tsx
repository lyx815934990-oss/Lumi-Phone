import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { personaDb } from '../wechat/newFriendsPersona/idb'
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
    setBuiltinPresetEnabled,
  } = useWorldbookStore()

  const [segment, setSegment] = useState<LoreHomeSegment>('all')
  const [screen, setScreen] = useState<'list' | 'edit'>('list')
  const [draft, setDraft] = useState<LoreEntry | null>(null)
  const [draftIsNew, setDraftIsNew] = useState(false)
  const [roster, setRoster] = useState<LoreEditorCharacter[]>([])
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [systemDetail, setSystemDetail] = useState<LoreArchiveBuiltinPresetMeta | null>(null)
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null)

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
        onClose={() => setSystemDetail(null)}
        onToggle={(enabled) => {
          if (!systemDetail) return
          setBuiltinPresetEnabled(systemDetail.id, enabled)
        }}
      />
    </div>
  )
}
