import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useState } from 'react'
import { WidgetChrome } from '../../WidgetChrome'
import { WidgetStyleSheet } from '../../WidgetStyleSheet'
import { parseAppearance } from '../../widgetAppearance'
import type { GalleryWidgetPlacement } from '../../types'
import { useWidgetGallery } from '../../WidgetGalleryContext'
import { useDesktopMusic } from '../../music/useDesktopMusic'
import { MusicCardBackground } from '../../music/MusicCardBackground'
import {
  MUSIC_DEFAULT_FROST,
  MUSIC_SPIN_SEC,
  MusicPlayerExtras,
} from '../../music/MusicPlayerExtras'
import { MusicSourceActionSheet } from '../../music/MusicSourceActionSheet'
import { MusicPlayModeButton } from '../../music/MusicPlayModeButton'
import { MusicProgressBar } from '../../music/MusicProgressBar'
import { MusicLikeButton } from '../../music/MusicLikeButton'

type Props = {
  placement: GalleryWidgetPlacement
  isEditMode?: boolean
  isDragging?: boolean
}

/** 4×2 黑胶唱机条：左唱片+唱臂，右曲名与播控 */
export function MusicVinylDeckWidget({
  placement,
  isEditMode = false,
  isDragging = false,
}: Props) {
  const { patchConfig } = useWidgetGallery()
  const api = useDesktopMusic()
  const [styleOpen, setStyleOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const cfg = placement.config ?? {}
  const bgImage = typeof cfg.bgImage === 'string' ? cfg.bgImage : ''
  const spinSpeed =
    cfg.spinSpeed === 'slow' || cfg.spinSpeed === 'fast' ? cfg.spinSpeed : 'medium'
  const appearance = parseAppearance(cfg.appearance, {
    bgColor: '#5a6570',
    textColor: '#ffffff',
    opacity: 1,
    blur: MUSIC_DEFAULT_FROST,
  })
  const ink = appearance.textColor
  const art = api.display.artworkUrl
  const spinSec = MUSIC_SPIN_SEC[spinSpeed]

  return (
    <WidgetChrome
      size={placement.size}
      bare
      isEditMode={isEditMode}
      isDragging={isDragging}
    >
      <div
        className="relative flex h-full w-full items-center gap-2 overflow-hidden rounded-[20px] px-2 py-1.5"
        style={{
          color: ink,
          boxShadow: '0 10px 26px rgba(28,28,30,0.16)',
        }}
      >
        <MusicCardBackground
          bgColor={appearance.bgColor}
          bgImage={bgImage}
          frostBlur={appearance.blur}
        />
        <button
          type="button"
          disabled={isEditMode}
          className="relative z-[1] flex h-full w-[36%] shrink-0 items-center justify-center"
          onClick={() => {
            if (!isEditMode) setSourceOpen(true)
          }}
          aria-label="选择播放方式"
        >
          <div
            className="relative aspect-square h-[86%] w-auto shrink-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, #2a2a2c 0 12%, #0e0e10 13%, #1a1a1c 26%, #080808 27%, #222 40%, #050505 41%, #18181a 100%)',
              boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
              animation: api.playing
                ? `wg-deck-spin ${spinSec}s linear infinite`
                : undefined,
            }}
          >
            <div className="absolute left-1/2 top-1/2 aspect-square h-[38%] w-auto -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/15">
              {art ? (
                <img src={art} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <div className="h-full w-full bg-[#3a3a3c]" />
              )}
            </div>
          </div>
          <span
            className="pointer-events-none absolute left-[8%] top-[10%] h-[42%] w-[3px] origin-top rounded-full"
            style={{
              background: 'linear-gradient(180deg, #f5f5f7, #c8c8cc)',
              transform: api.playing ? 'rotate(8deg)' : 'rotate(18deg)',
              transition: 'transform 0.35s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }}
            aria-hidden
          />
        </button>

        <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1.5 pr-0.5">
          <button
            type="button"
            disabled={isEditMode}
            className="min-w-0 shrink-0 text-center"
            onClick={() => {
              if (!isEditMode) setSourceOpen(true)
            }}
          >
            <p className="truncate text-[13px] font-medium leading-tight">
              {api.display.title}
            </p>
            <p className="mt-0.5 truncate text-[10px] opacity-65">
              {api.display.artist}
            </p>
          </button>

          <MusicProgressBar
            className="w-full"
            progress={api.progress}
            currentTime={api.currentTime}
            duration={api.duration}
            ink={ink}
            muted={`${ink}aa`}
            isEditMode={isEditMode}
            formatTime={api.formatTime}
            onSeekRatio={api.seekRatio}
            showTimes
            timeLayout="inline"
            compact
          />

          <div className="flex w-full shrink-0 items-center justify-evenly">
            <MusicPlayModeButton
              mode={api.playMode}
              onCycle={api.cyclePlayMode}
              disabled={isEditMode}
              size={13}
              color={`${ink}cc`}
              className="flex h-8 w-8 items-center justify-center"
            />
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              className="flex h-8 w-8 items-center justify-center"
              aria-label="上一首"
              onClick={(e) => {
                e.stopPropagation()
                api.skipPrev()
              }}
            >
              <SkipBack size={15} fill={ink} strokeWidth={0} />
            </button>
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: `${ink}22` }}
              aria-label={api.playing ? '暂停' : '播放'}
              onClick={(e) => {
                e.stopPropagation()
                api.toggle()
              }}
            >
              {api.playing ? (
                <Pause size={16} fill={ink} strokeWidth={0} />
              ) : (
                <Play size={16} fill={ink} strokeWidth={0} className="translate-x-[0.5px]" />
              )}
            </button>
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              className="flex h-8 w-8 items-center justify-center"
              aria-label="下一首"
              onClick={(e) => {
                e.stopPropagation()
                api.skipNext()
              }}
            >
              <SkipForward size={15} fill={ink} strokeWidth={0} />
            </button>
            <MusicLikeButton
              songId={api.neteaseSongId}
              isEditMode={isEditMode}
              size={15}
              color={ink}
              className="flex h-8 w-8 items-center justify-center"
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wg-deck-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <WidgetStyleSheet
        open={styleOpen}
        title="黑胶唱机 · 中号"
        appearance={appearance}
        showOpacity={false}
        showBgColor={!bgImage}
        blurLabel="背景毛玻璃"
        onChange={(next) =>
          patchConfig(placement.id, {
            appearance: next,
            ...(next.bgColor !== appearance.bgColor ? { bgImage: '' } : {}),
          })
        }
        onReset={() =>
          patchConfig(placement.id, {
            appearance: {
              bgColor: '#5a6570',
              textColor: '#ffffff',
              opacity: 1,
              blur: MUSIC_DEFAULT_FROST,
            },
            spinSpeed: 'medium',
            bgImage: '',
          })
        }
        onClose={() => setStyleOpen(false)}
        extras={
          <MusicPlayerExtras
            bgImage={bgImage}
            cropAspect={2}
            onBgImage={(dataUrl) => patchConfig(placement.id, { bgImage: dataUrl })}
            spinSpeed={spinSpeed}
            onSpinSpeed={(v) => patchConfig(placement.id, { spinSpeed: v })}
            openListenLabel="选择播放方式"
            hint="点按唱片可选择：上传本地音乐，或进入听一听搜歌 / 资料库。"
            onOpenListen={() => {
              setStyleOpen(false)
              setSourceOpen(true)
            }}
          />
        }
      />
      <MusicSourceActionSheet
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onOpenListen={api.openListenTogether}
        onEditAppearance={() => setStyleOpen(true)}
      />
    </WidgetChrome>
  )
}
