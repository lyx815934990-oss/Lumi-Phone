import { BookMarked, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AnonymousQaWechatContext } from '../../../../components/anonymousQa/buildAnonymousQaPersonaContext'
import { Pressable } from '../../../components/Pressable'
import type { WeChatPersonaContact } from '../../../types'
import { resolveCharacterAvatarUrl } from '../../../utils/characterAvatarUrl'
import { MemoryCoachPortal } from '../memory/MemoryCoachPortal'
import { MemoryTutorialModal } from '../memory/MemoryTutorialModal'
import { readMemoryCoachSeen, writeMemoryCoachSeen } from '../memory/memoryCoachTypes'
import {
  loadObservationNotesAutoUpdateCharacterIds,
  OBS_NOTES_AUTO_UPDATE_CHANGED_EVENT,
  setObservationNotesAutoUpdateEnabled,
} from './autoUpdate'
import { formatObsRelativeTime } from './formatTime'
import {
  OBS_NOTES_COACH_ROOT_ATTR,
  OBS_NOTES_COACH_TARGET_ATTR,
  OBS_NOTES_HUB_COACH_SCOPE,
  OBS_NOTES_HUB_COACH_SEEN_KEY,
  OBS_NOTES_HUB_COACH_STEPS,
} from './observationNotesCoach'
import { OBS_NOTES_HUB_TUTORIAL_SECTIONS } from './observationNotesTutorialCopy'
import { ObservationNotesScreen } from './ObservationNotesScreen'
import { OBS_NOTES_UPDATED_EVENT } from './obsNotesPatch'
import {
  getObservationEntryPreview,
  loadObservationNotes,
  clearObservationNotes,
  createBlankObservationNotesDoc,
  saveObservationNotes,
  type ObservationNotesEntryPreview,
} from './store'
import type { ObservationNotesDoc } from './types'
import { looksLikeLegacySampleObservationNotes } from './previousVersion'
import {
  OBS_NOTES,
  OBS_NOTES_EN_STYLE,
  OBS_NOTES_FONT,
  OBS_NOTES_HEADER,
  OBS_NOTES_SERIF_CLASS,
} from './theme'

function ObsSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className="relative h-7 w-[46px] shrink-0 rounded-full transition-colors duration-200"
      style={{ backgroundColor: on ? OBS_NOTES.garnet : 'rgba(48,58,78,0.18)' }}
    >
      <span
        className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out"
        style={{ left: on ? 20 : 2 }}
        aria-hidden
      />
    </button>
  )
}

type RowState = {
  characterId: string
  remarkName: string
  avatarUrl?: string
  autoUpdate: boolean
  preview: ObservationNotesEntryPreview | null
}

export function ObservationNotesHubApp({
  onBack,
  playerIdentityId,
  personaContacts = [],
  accountId,
  wechatCtx = null,
  className = '',
}: {
  onBack: () => void
  playerIdentityId: string
  personaContacts?: WeChatPersonaContact[]
  accountId?: string
  wechatCtx?: AnonymousQaWechatContext | null
  className?: string
}) {
  const pid = playerIdentityId.trim()
  const [rows, setRows] = useState<RowState[]>([])
  const [openCharId, setOpenCharId] = useState<string | null>(null)
  const [openDoc, setOpenDoc] = useState<ObservationNotesDoc | null>(null)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [coachStepIndex, setCoachStepIndex] = useState(0)
  const hubAutoCoachStartedRef = useRef(false)

  const startLiveCoach = useCallback(() => {
    setCoachStepIndex(0)
    setCoachOpen(true)
  }, [])

  const finishCoach = useCallback((opts?: { openTutorial?: boolean }) => {
    writeMemoryCoachSeen(OBS_NOTES_HUB_COACH_SEEN_KEY)
    setCoachOpen(false)
    setCoachStepIndex(0)
    if (opts?.openTutorial) setTutorialOpen(true)
  }, [])

  useEffect(() => {
    if (openCharId != null) return
    if (hubAutoCoachStartedRef.current) return
    if (readMemoryCoachSeen(OBS_NOTES_HUB_COACH_SEEN_KEY)) return
    hubAutoCoachStartedRef.current = true
    writeMemoryCoachSeen(OBS_NOTES_HUB_COACH_SEEN_KEY)
    const id = window.setTimeout(() => startLiveCoach(), 520)
    return () => window.clearTimeout(id)
  }, [openCharId, startLiveCoach])

  const contacts = useMemo(() => {
    const seen = new Set<string>()
    const out: WeChatPersonaContact[] = []
    for (const c of personaContacts) {
      const id = c.characterId?.trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(c)
    }
    return out
  }, [personaContacts])

  const reload = useCallback(async () => {
    if (!pid || pid === '__none__') {
      setRows([])
      return
    }
    const enabled = await loadObservationNotesAutoUpdateCharacterIds(pid)
    const next: RowState[] = []
    for (const c of contacts) {
      const cid = c.characterId.trim()
      const name = c.remarkName.trim() || '未命名'
      let preview: ObservationNotesEntryPreview | null = null
      try {
        const doc = await loadObservationNotes({
          conversationCharacterId: cid,
          playerIdentityId: pid,
          charDisplayName: name,
          seedIfEmpty: false,
        })
        preview = getObservationEntryPreview(doc)
      } catch {
        preview = null
      }
      next.push({
        characterId: cid,
        remarkName: name,
        avatarUrl: c.avatarUrl,
        autoUpdate: enabled.has(cid),
        preview,
      })
    }
    setRows(next)
  }, [contacts, pid])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const onChange = () => void reload()
    window.addEventListener(OBS_NOTES_AUTO_UPDATE_CHANGED_EVENT, onChange)
    window.addEventListener(OBS_NOTES_UPDATED_EVENT, onChange)
    return () => {
      window.removeEventListener(OBS_NOTES_AUTO_UPDATE_CHANGED_EVENT, onChange)
      window.removeEventListener(OBS_NOTES_UPDATED_EVENT, onChange)
    }
  }, [reload])

  const openNotes = useCallback(
    async (row: RowState) => {
      let doc = await loadObservationNotes({
        conversationCharacterId: row.characterId,
        playerIdentityId: pid,
        charDisplayName: row.remarkName,
        seedIfEmpty: false,
      })
      if (doc && looksLikeLegacySampleObservationNotes(doc)) {
        await clearObservationNotes({
          conversationCharacterId: row.characterId,
          playerIdentityId: pid,
        })
        doc = null
      }
      if (!doc) {
        doc = createBlankObservationNotesDoc({
          conversationCharacterId: row.characterId,
          playerIdentityId: pid,
          charDisplayName: row.remarkName,
        })
        await saveObservationNotes(doc)
      }
      setOpenDoc(doc)
      setOpenCharId(row.characterId)
    },
    [pid],
  )

  const toggleAuto = useCallback(
    async (characterId: string, enabled: boolean) => {
      await setObservationNotesAutoUpdateEnabled({
        conversationCharacterId: characterId,
        playerIdentityId: pid,
        enabled,
      })
      setRows((prev) =>
        prev.map((r) => (r.characterId === characterId ? { ...r, autoUpdate: enabled } : r)),
      )
    },
    [pid],
  )

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${OBS_NOTES_SERIF_CLASS} ${className}`}
      style={{ background: OBS_NOTES.paper, fontFamily: OBS_NOTES_FONT }}
      {...{ [OBS_NOTES_COACH_ROOT_ATTR]: OBS_NOTES_HUB_COACH_SCOPE }}
    >
      <div
        className="relative flex min-h-[52px] shrink-0 items-center px-1 pt-[max(6px,env(safe-area-inset-top,0px))]"
        style={{
          borderBottom: `1px solid ${OBS_NOTES.hairline}`,
          background: 'rgba(242,244,247,0.88)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Pressable
          type="button"
          aria-label="返回"
          className="relative z-[1] flex size-10 shrink-0 items-center justify-center"
          onClick={onBack}
        >
          <ChevronLeft className="size-5" style={{ color: OBS_NOTES.ink }} />
        </Pressable>
        <div className="pointer-events-none absolute inset-x-11 top-[max(6px,env(safe-area-inset-top,0px))] bottom-0 flex flex-col items-center justify-center">
          <p className="text-[16px] font-semibold tracking-[0.12em]" style={{ color: OBS_NOTES.ink }}>
            {OBS_NOTES_HEADER.zh}
          </p>
          <p className="mt-0.5" style={{ ...OBS_NOTES_EN_STYLE, fontSize: 8, letterSpacing: '0.18em' }}>
            {OBS_NOTES_HEADER.en}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTutorialOpen(true)}
          className="relative z-[1] ml-auto mr-1.5 flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 transition-colors active:opacity-80"
          style={{
            background: OBS_NOTES.garnetSoftBg,
            color: OBS_NOTES.garnet,
            border: `1px solid rgba(139,26,26,0.22)`,
          }}
          aria-label="私藏侧写教程"
          {...{ [OBS_NOTES_COACH_TARGET_ATTR]: 'obs-hub-tutorial' }}
        >
          <BookOpen className="size-3.5" strokeWidth={1.5} aria-hidden />
          <span className="text-[11px] font-medium tracking-wide">教程</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-4">
        <div
          className="mb-4 rounded-[12px] px-3.5 py-3"
          style={{
            background: OBS_NOTES.card,
            border: `1px solid ${OBS_NOTES.hairline}`,
          }}
          {...{ [OBS_NOTES_COACH_TARGET_ATTR]: 'obs-hub-blurb' }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: OBS_NOTES.inkSoft }}>
            开启「自动更新」后，线上私聊与线下约会的同一次主回复都会自行交卷整理侧写（与人生账本同级：规范 char 如何看待/称呼/对待 user）。打开档案后也可点「手动更新」。
          </p>
        </div>

        {rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center px-6 py-16 text-center"
            style={{
              background: OBS_NOTES.card,
              borderRadius: 12,
              border: `1px solid ${OBS_NOTES.hairline}`,
            }}
            {...{ [OBS_NOTES_COACH_TARGET_ATTR]: 'obs-hub-card' }}
          >
            <BookMarked className="mb-3 size-7" style={{ color: OBS_NOTES.mist }} strokeWidth={1.4} />
            <p className="text-[14px]" style={{ color: OBS_NOTES.ink }}>
              还没有可整理的联系人
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: OBS_NOTES.mist }}>
              添加人设联系人后，可在此开启自动侧写。
            </p>
          </div>
        ) : (
          <ul
            className="overflow-hidden rounded-[12px]"
            style={{
              background: OBS_NOTES.card,
              border: `1px solid ${OBS_NOTES.hairline}`,
            }}
          >
            {rows.map((row, idx) => {
              const isLast = idx === rows.length - 1
              const avatar = resolveCharacterAvatarUrl({
                avatarUrl: row.avatarUrl,
              })
              return (
                <li key={row.characterId}>
                  <div
                    className="flex items-center gap-3 px-3.5 py-3"
                    style={{
                      borderBottom: isLast ? undefined : `1px solid ${OBS_NOTES.hairline}`,
                    }}
                  >
                    <Pressable
                      type="button"
                      onClick={() => void openNotes(row)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-90"
                      aria-label={`打开${row.remarkName}的侧写`}
                      {...(idx === 0
                        ? { [OBS_NOTES_COACH_TARGET_ATTR]: 'obs-hub-card' }
                        : {})}
                    >
                      <span
                        className="size-10 shrink-0 overflow-hidden rounded-full"
                        style={{ background: OBS_NOTES.paperSoft }}
                      >
                        {avatar ? (
                          <img src={avatar} alt="" className="size-full object-cover" />
                        ) : (
                          <span
                            className="flex size-full items-center justify-center text-[14px] font-semibold"
                            style={{ color: OBS_NOTES.garnet }}
                          >
                            {(row.remarkName || '?').slice(0, 1)}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium" style={{ color: OBS_NOTES.ink }}>
                          {row.remarkName}
                        </p>
                        <p className="mt-0.5 truncate text-[11px]" style={{ color: OBS_NOTES.mist }}>
                          {row.preview
                            ? `最近写就 · ${formatObsRelativeTime(row.preview.updatedAt)}`
                            : '尚未写下侧写'}
                          {row.preview?.hasUnread ? ' · 有更新' : ''}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0" style={{ color: OBS_NOTES.mist }} />
                    </Pressable>
                    <div
                      className="flex shrink-0 flex-col items-end gap-1 pl-1"
                      {...(idx === 0
                        ? { [OBS_NOTES_COACH_TARGET_ATTR]: 'obs-hub-auto-switch' }
                        : {})}
                    >
                      <span className="text-[10px]" style={{ color: OBS_NOTES.mist }}>
                        自动更新
                      </span>
                      <ObsSwitch
                        on={row.autoUpdate}
                        onToggle={() => void toggleAuto(row.characterId, !row.autoUpdate)}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ObservationNotesScreen
        open={openCharId != null}
        doc={openDoc}
        onClose={() => {
          setOpenCharId(null)
          setOpenDoc(null)
          void reload()
        }}
        onDocChange={setOpenDoc}
        accountId={accountId}
        wechatCtx={wechatCtx}
      />

      <MemoryTutorialModal
        open={tutorialOpen && openCharId == null}
        onClose={() => setTutorialOpen(false)}
        title="私藏侧写 · 列表说明"
        subtitle="这是什么 · 自动更新 · 点卡片看详情"
        sections={OBS_NOTES_HUB_TUTORIAL_SECTIONS}
        onStartLiveCoach={() => {
          setTutorialOpen(false)
          startLiveCoach()
        }}
        zIndex={62000}
      />
      <MemoryCoachPortal
        open={coachOpen && openCharId == null}
        steps={OBS_NOTES_HUB_COACH_STEPS}
        stepIndex={coachStepIndex}
        onStepChange={setCoachStepIndex}
        onSkip={() => finishCoach()}
        onComplete={finishCoach}
        scopeRoot={OBS_NOTES_HUB_COACH_SCOPE}
        coachTargetAttr={OBS_NOTES_COACH_TARGET_ATTR}
        coachRootAttr={OBS_NOTES_COACH_ROOT_ATTR}
        zIndex={62100}
      />
    </div>
  )
}
