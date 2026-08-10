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

/** 2×2 经典竖卡：点封面选播放方式，底部进度 + 播控 */
export function MusicPlayerCardWidget({
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
    bgColor: '#2c3440',
    textColor: '#ffffff',
    opacity: 1,
    blur: MUSIC_DEFAULT_FROST,
  })
  const ink = appearance.textColor
  const muted = `${ink}99`
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
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[18px] px-2.5 pb-2 pt-2"
        style={{
          color: ink,
          boxShadow: '0 10px 24px rgba(28,28,30,0.18)',
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
          className="relative z-[1] min-h-0 flex-[1.15] overflow-hidden rounded-[10px] bg-black/25 text-left"
          onClick={openSource}
          aria-label="选择播放方式"
        >
          {art ? (
            <img src={art} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] opacity-45">
              <Music2 size={16} strokeWidth={1.7} />
              选择播放方式
            </div>
          )}
        </button>

        <button
          type="button"
          disabled={isEditMode}
          className="relative z-[1] mt-1.5 min-w-0 shrink-0 text-left"
          onClick={openSource}
        >
          <p className="truncate text-[9px] opacity-55">{api.display.artist}</p>
          <p className="truncate text-[11px] font-medium leading-tight">{api.display.title}</p>
        </button>

        <MusicProgressBar
          className="relative z-[1] mt-1"
          progress={api.progress}
          currentTime={api.currentTime}
          duration={api.duration}
          ink={ink}
          muted={muted}
          isEditMode={isEditMode}
          formatTime={api.formatTime}
          onSeekRatio={api.seekRatio}
          showTimes
          compact
        />

        <div className="relative z-[1] mt-1.5 flex shrink-0 items-center justify-between px-0.5">
          <MusicPlayModeButton
            mode={api.playMode}
            onCycle={api.cyclePlayMode}
            disabled={isEditMode}
            size={12}
            color={muted}
          />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              className="opacity-80"
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
              onClick={(e) => {
                e.stopPropagation()
                api.toggle()
              }}
            >
              {api.playing ? (
                <Pause size={15} fill={ink} strokeWidth={0} />
              ) : (
                <Play size={15} fill={ink} strokeWidth={0} />
              )}
            </button>
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              className="opacity-80"
              onClick={(e) => {
                e.stopPropagation()
                api.skipNext()
              }}
            >
              <SkipForward size={13} fill={ink} strokeWidth={0} />
            </button>
          </div>
          <MusicLikeButton
            songId={api.neteaseSongId}
            isEditMode={isEditMode}
            size={13}
            color={muted}
          />
        </div>
      </div>

      <WidgetStyleSheet
        open={styleOpen}
        title="音乐播放器 · 小号"
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
              bgColor: '#2c3440',
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
            cropAspect={1}
            onBgImage={(dataUrl) => patchConfig(placement.id, { bgImage: dataUrl })}
            openListenLabel="选择播放方式"
            hint="点封面可选：上传本地音乐，或进入听一听搜歌。"
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
