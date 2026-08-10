import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useState } from 'react'
import { WidgetChrome } from '../../WidgetChrome'
import { WidgetStyleSheet } from '../../WidgetStyleSheet'
import { MUSIC_APPEARANCE, parseAppearance } from '../../widgetAppearance'
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

/** 2×2 超级唱片：封套 + 黑胶；点封面选播放方式，底部进度 + 播控 */
export function MusicVinylSleeveWidget({
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
    ...MUSIC_APPEARANCE,
    bgColor: '#1c1c1e',
    textColor: '#f5f5f7',
    opacity: 1,
    blur: MUSIC_DEFAULT_FROST,
  })
  const ink = appearance.textColor
  const muted = `${ink}99`
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
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[18px] px-2 pb-1.5 pt-2"
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
          className="relative z-[1] min-h-0 flex-1"
          onClick={() => {
            if (!isEditMode) setSourceOpen(true)
          }}
          aria-label="选择播放方式"
        >
          <div className="relative mx-auto h-full w-[86%]">
            <div className="absolute right-[-6%] top-1/2 z-0 aspect-square h-[88%] w-auto -translate-y-1/2">
              <div
                className="h-full w-full rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, #2a2a2c 0 14%, #111 15%, #1a1a1c 28%, #0d0d0e 29%, #222 42%, #0a0a0b 43%, #1c1c1e 58%, #050505 59%, #18181a 100%)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                  transformOrigin: 'center center',
                  animation: api.playing
                    ? `wg-vinyl-spin ${spinSec}s linear infinite`
                    : undefined,
                }}
              >
                <div
                  className="absolute left-1/2 top-1/2 aspect-square h-[34%] w-auto -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/10"
                  style={{ background: art ? undefined : '#3a3a3c' }}
                >
                  {art ? (
                    <img
                      src={art}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="absolute left-0 top-[8%] z-[1] h-[84%] w-[70%] overflow-hidden rounded-[4px] border border-black/10 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
              {art ? (
                <img src={art} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#e8e8ea] text-[10px] text-[#2c2c2e]/45">
                  选歌
                </div>
              )}
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.28), transparent 40%)',
                }}
              />
            </div>
          </div>
        </button>

        <MusicProgressBar
          className="relative z-[1] mt-1 px-0.5"
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

        <div className="relative z-[1] mt-1 flex shrink-0 items-center justify-between px-0.5">
          <MusicPlayModeButton
            mode={api.playMode}
            onCycle={api.cyclePlayMode}
            disabled={isEditMode}
            size={13}
            color={ink}
            className="h-7 w-7 rounded-full bg-white/10"
          />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              aria-label="上一首"
              onClick={(e) => {
                e.stopPropagation()
                api.skipPrev()
              }}
            >
              <SkipBack size={14} fill={ink} strokeWidth={0} />
            </button>
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"
              aria-label={api.playing ? '暂停' : '播放'}
              onClick={(e) => {
                e.stopPropagation()
                api.toggle()
              }}
            >
              {api.playing ? (
                <Pause size={15} fill={ink} strokeWidth={0} />
              ) : (
                <Play size={15} fill={ink} strokeWidth={0} className="translate-x-[0.5px]" />
              )}
            </button>
            <button
              type="button"
              data-widget-add-ui="true"
              disabled={isEditMode}
              aria-label="下一首"
              onClick={(e) => {
                e.stopPropagation()
                api.skipNext()
              }}
            >
              <SkipForward size={14} fill={ink} strokeWidth={0} />
            </button>
          </div>
          <MusicLikeButton
            songId={api.neteaseSongId}
            isEditMode={isEditMode}
            size={14}
            color={ink}
            className="h-7 w-7 rounded-full bg-white/10"
          />
        </div>
      </div>

      <style>{`
        @keyframes wg-vinyl-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <WidgetStyleSheet
        open={styleOpen}
        title="超级唱片"
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
              bgColor: '#1c1c1e',
              textColor: '#f5f5f7',
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
            cropAspect={1}
            onBgImage={(dataUrl) => patchConfig(placement.id, { bgImage: dataUrl })}
            spinSpeed={spinSpeed}
            onSpinSpeed={(v) => patchConfig(placement.id, { spinSpeed: v })}
            openListenLabel="选择播放方式"
            hint="点封面可选：上传本地音乐，或进入听一听。底部可切歌与暂停。"
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
