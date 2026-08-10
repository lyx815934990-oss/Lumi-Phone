import { Music2, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
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

/** 4×2 NOW PLAYING 横卡 */
export function MusicNowPlayingWidget({
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
  const appearance = parseAppearance(cfg.appearance, {
    bgColor: '#2c2c2e',
    textColor: '#ffffff',
    opacity: 1,
    blur: MUSIC_DEFAULT_FROST,
  })
  const ink = appearance.textColor
  const art = api.display.artworkUrl

  const openSource = () => {
    if (!isEditMode) setSourceOpen(true)
  }

  return (
    <WidgetChrome
      size={placement.size}
      bare
      isEditMode={isEditMode}
      isDragging={isDragging}
    >
      <div
        className="relative flex h-full w-full items-center gap-3 overflow-hidden rounded-[20px] px-2.5 py-2"
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
          className="relative z-[1] h-[82%] aspect-square shrink-0 overflow-hidden rounded-[12px] bg-black/30"
          onClick={openSource}
          aria-label="选择播放方式"
        >
          {art ? (
            <img src={art} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-35">
              <Music2 size={22} />
            </div>
          )}
        </button>

        <div className="relative z-[1] min-w-0 flex-1 py-0.5">
          <Music2
            size={14}
            className="absolute right-0 top-0 opacity-70"
            strokeWidth={1.7}
          />
          <button
            type="button"
            disabled={isEditMode}
            className="block w-full min-w-0 pr-5 text-left"
            onClick={openSource}
          >
            <p className="text-[9px] font-medium tracking-[0.14em] opacity-55">
              NOW PLAYING
            </p>
            <p className="mt-1 truncate text-[15px] font-semibold leading-tight">
              {api.display.title}
            </p>
            <p className="mt-0.5 truncate text-[11px] opacity-65">{api.display.artist}</p>
          </button>

          <MusicProgressBar
            className="mt-1"
            progress={api.progress}
            currentTime={api.currentTime}
            duration={api.duration}
            ink={ink}
            muted={`${ink}99`}
            isEditMode={isEditMode}
            formatTime={api.formatTime}
            onSeekRatio={api.seekRatio}
            showTimes
            timeLayout="inline"
            compact
          />

          <div className="mt-1 flex items-center gap-1.5">
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/12 opacity-90"
              aria-label="上一首"
              onClick={(e) => {
                e.stopPropagation()
                api.skipPrev()
              }}
            >
              <SkipBack size={13} fill={ink} strokeWidth={0} />
            </button>
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium"
              style={{
                background: ink,
                color: appearance.bgColor,
              }}
              onClick={(e) => {
                e.stopPropagation()
                api.toggle()
              }}
            >
              {api.playing ? (
                <Pause size={12} fill="currentColor" strokeWidth={0} />
              ) : (
                <Play size={12} fill="currentColor" strokeWidth={0} />
              )}
              {api.playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/12 opacity-90"
              aria-label="下一首"
              onClick={(e) => {
                e.stopPropagation()
                api.skipNext()
              }}
            >
              <SkipForward size={13} fill={ink} strokeWidth={0} />
            </button>
            <MusicLikeButton
              songId={api.neteaseSongId}
              isEditMode={isEditMode}
              size={15}
              color={ink}
              className="ml-auto h-8 w-8 rounded-full bg-white/12"
            />
            <MusicPlayModeButton
              mode={api.playMode}
              onCycle={api.cyclePlayMode}
              disabled={isEditMode}
              size={14}
              color={ink}
              className="h-8 w-8 rounded-full bg-white/12"
            />
          </div>
        </div>
      </div>

      <WidgetStyleSheet
        open={styleOpen}
        title="音乐播放器 · 中号"
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
              bgColor: '#2c2c2e',
              textColor: '#ffffff',
              opacity: 1,
              blur: MUSIC_DEFAULT_FROST,
            },
            bgImage: '',
          })
        }
        onClose={() => setStyleOpen(false)}
        extras={
          <MusicPlayerExtras
            bgImage={bgImage}
            cropAspect={2}
            onBgImage={(dataUrl) => patchConfig(placement.id, { bgImage: dataUrl })}
            openListenLabel="选择播放方式"
            hint="点封面可选：上传本地音乐，或进入听一听搜歌。底部可切歌与暂停。"
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
