import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { CircleHelp, Heart, Send } from 'lucide-react'
import { DATING_STORY_COACH_TARGET_ATTR } from '../../../phone/apps/wechat/dating/datingStoryLayoutCoach'
import { useStoryRpgStore } from '../../store/useStoryRpgStore'
import { applyTextareaCursor, insertPairAtCursor } from '../../utils/insertAtCursor'
import { PillButton } from '../ui/PillButton'
import { DIRECTOR_ACTIONS, type DirectorActionId } from '../../types'

type ControlledComposer = {
  value: string
  onChange: (v: string) => void
  inputRef?: RefObject<HTMLTextAreaElement | null>
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onFocus?: () => void
  insertQuotePair?: (open: string, close: string) => void
  placeholder?: string
}

const MODE_COACH_TARGET: Partial<Record<DirectorActionId, string>> = {
  god: 'sr-mode-god',
  director: 'sr-mode-director',
  side: 'sr-mode-side',
  parallel: 'sr-mode-parallel',
  'if-line': 'sr-mode-if',
  continue: 'sr-mode-continue',
  npc: 'sr-mode-npc',
}

type Props = {
  onSend?: (text?: string) => void | Promise<void>
  loading?: boolean
  composer?: ControlledComposer
  composerRef?: RefObject<HTMLDivElement | null>
  keyboardInsetPx?: number
  activeDirectorActions?: Partial<Record<DirectorActionId, boolean>>
  onDirectorAction?: (id: DirectorActionId) => void
  onOpenAdvanced?: () => void
  onHeartWhisper?: () => void
  /** 打开上帝 / 导演 / 侧写等模式说明 */
  onOpenModeHelp?: () => void
  /** 输入框上方：本轮发送将附带的场控功能标签 */
  pendingControlTags?: Array<{ id: string; label: string }>
}

function QuickInputBar({
  onSend,
  loading,
  composer,
  onHeartWhisper,
}: Props) {
  const storeText = useStoryRpgStore((s) => s.composerText)
  const setStoreText = useStoryRpgStore((s) => s.setComposerText)
  const heartWhisperMode = useStoryRpgStore((s) => s.settings.heartWhisperMode)
  const patchSettings = useStoryRpgStore((s) => s.patchSettings)
  const fallbackRef = useRef<HTMLTextAreaElement>(null)

  const controlled = !!composer
  const composerText = controlled ? composer.value : storeText
  const setComposerText = controlled ? composer.onChange : setStoreText
  const inputRef = composer?.inputRef ?? fallbackRef

  const insertPair = (open: string, close: string) => {
    if (composer?.insertQuotePair) {
      composer.insertQuotePair(open, close)
      return
    }
    const el = inputRef.current
    if (!el) return
    const { nextValue, cursor } = insertPairAtCursor(el, open, close, composerText)
    setComposerText(nextValue)
    applyTextareaCursor(el, cursor)
  }

  const handleSend = () => {
    const t = composerText.trim()
    if (!t || loading) return
    if (controlled) {
      void onSend?.()
    } else {
      onSend?.(t)
      setComposerText('')
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-glass)] p-2 backdrop-blur-md">
      <div
        className="flex shrink-0 flex-col gap-1 pb-1"
        {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-insert-marks' }}
      >
        <button
          type="button"
          onClick={() => insertPair('\u201C', '\u201D')}
          className="rounded-lg px-1.5 py-0.5 font-serif text-[15px] text-[var(--sr-text-muted)] hover:bg-[var(--sr-glass-strong)] hover:text-[var(--sr-gold)]"
          title="插入对白"
          {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-insert-quote' }}
        >
          {'""'}
        </button>
        <button
          type="button"
          onClick={() => insertPair('**', '**')}
          className="rounded-lg px-1.5 py-0.5 font-mono text-[12px] text-[var(--sr-text-muted)] hover:bg-[var(--sr-glass-strong)] hover:text-[var(--sr-gold)]"
          title="内心 OS"
          {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-insert-os' }}
        >
          **
        </button>
      </div>
      <TextareaAutosize
        ref={inputRef}
        minRows={1}
        maxRows={6}
        value={composerText}
        onChange={(e) => setComposerText(e.target.value)}
        onKeyDown={(e) => {
          if (composer?.onKeyDown) {
            composer.onKeyDown(e)
            return
          }
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        onPointerDown={(e) => {
          const ta = inputRef.current
          if (!ta) return
          if (document.activeElement === ta) return
          e.preventDefault()
          ta.focus({ preventScroll: true })
          composer?.onFocus?.()
        }}
        onFocus={() => {
          composer?.onFocus?.()
        }}
        placeholder={composer?.placeholder ?? '续写你的剧情…'}
        className={`min-h-[36px] flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-[var(--sr-text-faint)] ${
          heartWhisperMode && !controlled
            ? 'italic text-[var(--sr-gold)]'
            : 'text-[var(--sr-text)]'
        }`}
      />
      <div className="flex shrink-0 flex-col items-center gap-1.5 pb-0.5">
        <button
          type="button"
          onClick={() => {
            if (onHeartWhisper) onHeartWhisper()
            else patchSettings({ heartWhisperMode: !heartWhisperMode })
          }}
          className={`rounded-full p-1.5 transition ${
            heartWhisperMode && !onHeartWhisper
              ? 'bg-[var(--sr-gold)]/20 text-[var(--sr-gold)]'
              : 'text-[var(--sr-text-faint)] hover:text-[var(--sr-text-soft)]'
          }`}
          aria-label="心语"
          {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-heart-whisper' }}
        >
          <Heart className="size-4" />
        </button>
        <button
          type="button"
          disabled={loading || !composerText.trim()}
          onClick={handleSend}
          className="flex size-9 items-center justify-center rounded-full bg-[var(--sr-gold)] text-[var(--sr-gold-on)] transition hover:brightness-110 disabled:opacity-35"
          aria-label="发送"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}

function DirectorActionBar({
  activeDirectorActions,
  onDirectorAction,
  onOpenModeHelp,
}: Pick<Props, 'activeDirectorActions' | 'onDirectorAction' | 'onOpenModeHelp'>) {
  const storeActive = useStoryRpgStore((s) => s.activeDirectorAction)
  const storeToggle = useStoryRpgStore((s) => s.toggleDirectorAction)

  return (
    <div
      className="sr-scroll-x flex items-center gap-2 pb-2"
      {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-director-bar' }}
    >
      {onOpenModeHelp ? (
        <button
          type="button"
          onClick={onOpenModeHelp}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--sr-border)] bg-[var(--sr-glass)] text-[var(--sr-text-muted)] transition hover:border-[var(--sr-gold)]/35 hover:text-[var(--sr-gold)]"
          aria-label="模式说明"
          title="上帝 / 导演 / 侧写说明"
        >
          <CircleHelp className="size-3.5" strokeWidth={1.75} />
        </button>
      ) : null}
      {DIRECTOR_ACTIONS.map((a) => {
        const active = onDirectorAction
          ? !!activeDirectorActions?.[a.id]
          : storeActive === a.id
        const coachTarget = MODE_COACH_TARGET[a.id]
        return (
          <PillButton
            key={a.id}
            active={active}
            onClick={() => (onDirectorAction ? onDirectorAction(a.id) : storeToggle(a.id))}
            {...(coachTarget ? { [DATING_STORY_COACH_TARGET_ATTR]: coachTarget } : {})}
          >
            {a.label}
          </PillButton>
        )
      })}
    </div>
  )
}

function PendingControlTagStrip({
  tags,
}: {
  tags: Array<{ id: string; label: string }>
}) {
  if (!tags.length) return null
  return (
    <div
      className="mb-2 flex items-start gap-2"
      aria-label="本轮附带功能"
      {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-pending-tags' }}
    >
      <span className="mt-0.5 shrink-0 pt-px text-[10px] font-medium tracking-wide text-[var(--sr-text-faint)]">
        本轮
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center rounded-full border border-[var(--sr-gold)]/30 bg-[var(--sr-gold)]/10 px-2 py-0.5 text-[10px] font-medium leading-none tracking-wide text-[var(--sr-text-soft)]"
          >
            {tag.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function DirectorConsole({
  onSend,
  loading,
  composer,
  composerRef,
  keyboardInsetPx = 0,
  activeDirectorActions,
  onDirectorAction,
  onOpenAdvanced,
  onHeartWhisper,
  onOpenModeHelp,
  pendingControlTags,
}: Props) {
  const storeOpenAdvanced = useStoryRpgStore((s) => s.setAdvancedSheetOpen)
  const localFooterRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = localFooterRef.current
    if (!el) return
    const root = el.closest('.story-rpg-root') as HTMLElement | null
    const publish = () => {
      const h = Math.ceil(el.getBoundingClientRect().height)
      if (h > 0) root?.style.setProperty('--sr-console-h', `${h}px`)
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root?.style.removeProperty('--sr-console-h')
    }
  }, [])

  return (
    <footer
      ref={(node) => {
        localFooterRef.current = node
        if (composerRef) {
          ;(composerRef as { current: HTMLDivElement | null }).current =
            node as HTMLDivElement | null
        }
      }}
      className="fixed inset-x-0 z-[90] border-t border-[var(--sr-border)] px-3 pt-2 backdrop-blur-xl transition-[bottom,transform] duration-200 will-change-transform"
      style={{
        bottom: keyboardInsetPx > 0 ? keyboardInsetPx : 0,
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        minHeight: 'var(--sr-console-min-h)',
        background: 'var(--sr-console-bg)',
      }}
    >
      <DirectorActionBar
        activeDirectorActions={activeDirectorActions}
        onDirectorAction={onDirectorAction}
        onOpenModeHelp={onOpenModeHelp}
      />
      <PendingControlTagStrip tags={pendingControlTags ?? []} />
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => (onOpenAdvanced ? onOpenAdvanced() : storeOpenAdvanced(true))}
          className="mb-1 flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--sr-border)] bg-[var(--sr-glass)] text-lg text-[var(--sr-gold)] transition hover:bg-[var(--sr-glass-strong)]"
          aria-label="高级场控"
          {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-advanced' }}
        >
          ⌘
        </button>
        <div className="min-w-0 flex-1">
          <QuickInputBar
            onSend={onSend}
            loading={loading}
            composer={composer}
            onHeartWhisper={onHeartWhisper}
          />
        </div>
      </div>
    </footer>
  )
}
