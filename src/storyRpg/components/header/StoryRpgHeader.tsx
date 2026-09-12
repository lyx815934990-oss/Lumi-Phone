import { ArrowLeft, BookOpen, CircleHelp, PenLine, RotateCcw, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import type { DatingStoryAppearance } from '../../../phone/apps/wechat/dating/datingStoryAppearance'
import {
  DATING_STORY_COACH_TARGET_ATTR,
} from '../../../phone/apps/wechat/dating/datingStoryLayoutCoach'
import type { StoryDisplayMode } from '../../types'
import { useStoryRpgStore } from '../../store/useStoryRpgStore'
import { StoryHeaderIconButton } from './StoryHeaderIconButton'
import { StoryModeSwitch } from './StoryModeSwitch'

type Props = {
  characterName?: string
  characterAvatarUrl?: string
  mode?: StoryDisplayMode
  onModeChange?: (mode: StoryDisplayMode) => void
  headerCompact?: boolean
  onBack?: () => void
  onResetProgress?: () => void
  onWorldBook?: () => void
  /** 打开「写作预设」（系统默认 / 自定义预设） */
  onWritingPresets?: () => void
  /** 打开「外观」合集（主题·字体·文风） */
  onOpenLook?: () => void
  /** 打开文字教程 / 说明 */
  onOpenTutorial?: () => void
  lookOpen?: boolean
  appearance?: DatingStoryAppearance
  /** iOS 键盘顶起时 visualViewport.offsetTop，钉住顶栏 */
  viewportOffsetTop?: number
}

export function StoryRpgHeader({
  characterName: characterNameProp,
  characterAvatarUrl,
  mode: modeProp,
  onModeChange,
  headerCompact: headerCompactProp,
  onBack,
  onResetProgress,
  onWorldBook,
  onWritingPresets,
  onOpenLook,
  onOpenTutorial,
  lookOpen = false,
  appearance: _appearance,
  viewportOffsetTop = 0,
}: Props) {
  const storeName = useStoryRpgStore((s) => s.characterName)
  const storeCompact = useStoryRpgStore((s) => s.headerCompact)
  const storeReset = useStoryRpgStore((s) => s.resetProgress)
  const storeMode = useStoryRpgStore((s) => s.settings.mode)
  const storePatchSettings = useStoryRpgStore((s) => s.patchSettings)

  const characterName = characterNameProp ?? storeName
  const mode = modeProp ?? storeMode
  const headerCompact = headerCompactProp ?? storeCompact
  const resetProgress = onResetProgress ?? storeReset
  const handleModeChange = onModeChange ?? ((next) => storePatchSettings({ mode: next }))
  const avatar = characterAvatarUrl?.trim() || ''

  const iconBtn =
    'flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--sr-text-muted)] transition hover:bg-[var(--sr-glass)] hover:text-[var(--sr-gold)]'
  const actionBtn =
    '!size-8 !min-w-8 !shrink-0 !px-0'

  return (
    <header
      className="fixed inset-x-0 z-[100] border-b border-[var(--sr-border)] backdrop-blur-md"
      style={{
        top: Math.max(0, viewportOffsetTop),
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'var(--sr-header-bg)',
      }}
      {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-header' }}
    >
      <motion.div
        animate={{ height: headerCompact ? 52 : 60 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className="flex w-full items-center justify-between gap-1 px-2.5"
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={iconBtn}
            aria-label="返回"
            title="返回约会列表"
          >
            <ArrowLeft className="size-[17px]" strokeWidth={1.75} />
          </button>
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )}

        {onWorldBook ? (
          <button
            type="button"
            onClick={onWorldBook}
            className={iconBtn}
            aria-label="世界书"
            title="档案室世界书"
            {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-worldbook' }}
          >
            <BookOpen className="size-[17px]" />
          </button>
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )}

        {onWritingPresets ? (
          <button
            type="button"
            onClick={onWritingPresets}
            className={iconBtn}
            aria-label="写作预设"
            title="写作预设（系统默认 / 自定义）"
            {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-writing-presets' }}
          >
            <PenLine className="size-[17px]" />
          </button>
        ) : null}

        <div className="flex min-w-0 max-w-[30%] items-center gap-1.5">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="size-7 shrink-0 rounded-full border border-[var(--sr-border)] object-cover shadow-sm"
              draggable={false}
            />
          ) : (
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--sr-border)] bg-[var(--sr-glass)] font-[family-name:var(--sr-font-serif)] text-[12px] text-[var(--sr-text-muted)]"
              aria-hidden
            >
              {(characterName || '?').slice(0, 1)}
            </span>
          )}
          <motion.span
            animate={{ fontSize: headerCompact ? 12 : 13 }}
            className="min-w-0 truncate font-[family-name:var(--sr-font-serif)] font-medium tracking-wide text-[var(--sr-text)]"
            title={characterName || undefined}
          >
            {characterName}
          </motion.span>
        </div>

        <StoryModeSwitch mode={mode} onModeChange={handleModeChange} />

        <StoryHeaderIconButton
          onClick={resetProgress}
          ariaLabel="重置进度"
          title="重置当前角色进度"
          className={`${actionBtn} border-red-400/25 text-red-400/90 hover:border-red-400/45 hover:text-red-400`}
          {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-reset' }}
        >
          <RotateCcw className="size-3.5" strokeWidth={1.75} />
        </StoryHeaderIconButton>

        {onOpenLook ? (
          <StoryHeaderIconButton
            onClick={onOpenLook}
            ariaLabel="外观"
            title="外观 · 主题 / 字体 / 文风 / 弹幕"
            active={lookOpen}
            className={actionBtn}
            {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-look' }}
          >
            <Sparkles className="size-3.5" strokeWidth={1.75} />
          </StoryHeaderIconButton>
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )}

        {onOpenTutorial ? (
          <StoryHeaderIconButton
            onClick={onOpenTutorial}
            ariaLabel="教程"
            title="教程与说明"
            className={actionBtn}
            {...{ [DATING_STORY_COACH_TARGET_ATTR]: 'sr-tutorial' }}
          >
            <CircleHelp className="size-3.5" strokeWidth={1.75} />
          </StoryHeaderIconButton>
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )}
      </motion.div>
    </header>
  )
}
