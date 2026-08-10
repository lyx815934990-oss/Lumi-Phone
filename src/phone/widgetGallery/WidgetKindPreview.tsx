import type { GalleryWidgetKind, GalleryWidgetSize } from './types'
import { WIDGET_META } from './storage'

type Props = {
  kind: GalleryWidgetKind
  className?: string
}

function VinylDisc({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative rounded-full shadow-sm ${className}`}
      style={{
        background:
          'radial-gradient(circle at 50% 50%, #2a2a2c 0 14%, #111 15%, #1a1a1c 28%, #0d0d0e 29%, #222 42%, #0a0a0b 43%, #1c1c1e 58%, #050505 59%, #18181a 100%)',
      }}
    >
      <div className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/15 bg-[#6b7a8a]" />
    </div>
  )
}

/** 添加面板用：各组件外观缩略预览（纯 CSS，不依赖真实数据） */
export function WidgetKindPreview({ kind, className = '' }: Props) {
  const size: GalleryWidgetSize = WIDGET_META[kind].defaultSize
  const wide = size === '4x2'

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[12px] border border-black/8 shadow-sm ${className}`}
      style={{
        width: wide ? 104 : 56,
        height: wide ? 52 : 56,
        background: 'rgba(255,255,255,0.55)',
      }}
      aria-hidden
    >
      {kind === 'polaroid' ? (
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="flex h-[78%] w-[58%] flex-col rounded-[2px] bg-[#f7f5f1] p-[3px] shadow-md"
            style={{ transform: 'rotate(-6deg)' }}
          >
            <div
              className="min-h-0 flex-1 rounded-[1px]"
              style={{
                background:
                  'linear-gradient(145deg, #c8d0da 0%, #9aa8b8 48%, #d6dce4 100%)',
              }}
            />
            <div className="mt-[2px] h-[18%] shrink-0" />
          </div>
        </div>
      ) : null}

      {kind === 'polaroidTriple' ? (
        <div className="relative h-full w-full">
          {[
            { left: '8%', rot: '-10deg', z: 2 },
            { left: '36%', rot: '2deg', z: 1 },
            { left: '62%', rot: '11deg', z: 3 },
          ].map((f, i) => (
            <div
              key={i}
              className="absolute top-[12%] h-[72%] w-[26%] rounded-[2px] bg-[#faf9f6] p-[2px] shadow-md"
              style={{
                left: f.left,
                transform: `rotate(${f.rot})`,
                zIndex: f.z,
              }}
            >
              <div
                className="h-full w-full rounded-[1px]"
                style={{
                  background:
                    i === 1
                      ? 'linear-gradient(160deg, #b8c4d0, #8a98a8)'
                      : 'linear-gradient(145deg, #d2c8bc, #a89888)',
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {kind === 'anniversary' ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-2"
          style={{
            background:
              'linear-gradient(135deg, rgba(247,247,248,0.95), rgba(230,232,236,0.9))',
          }}
        >
          <div className="flex items-center gap-1">
            <span className="h-4 w-4 rounded-full border-2 border-white bg-[#c8c8cc] shadow-sm" />
            <span className="h-4 w-4 -ml-1.5 rounded-full border-2 border-white bg-[#aeb6c0] shadow-sm" />
          </div>
          <span className="text-[9px] font-semibold tracking-wide text-[#2c2c2e]/75">
            128
          </span>
          <span className="text-[6px] text-[#2c2c2e]/45">恋爱天数</span>
        </div>
      ) : null}

      {kind === 'stickyNote' ? (
        <div className="flex h-full w-full items-center justify-center p-1.5">
          <div
            className="relative h-full w-full rounded-[10px] px-1.5 pt-2.5"
            style={{
              background: 'rgba(255,252,245,0.95)',
              boxShadow: '0 4px 10px rgba(28,28,30,0.1)',
              transform: 'rotate(2deg)',
              border: '1px solid rgba(44,44,46,0.08)',
            }}
          >
            <span className="absolute left-1/2 top-0 h-1.5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-white/80 shadow-sm" />
            <p className="text-[5px] uppercase tracking-[0.12em] text-[#2c2c2e]/40">
              Note
            </p>
            <p className="mt-0.5 text-[7px] leading-tight text-[#2c2c2e]/70">
              今天也要
              <br />
              慢慢来。
            </p>
          </div>
        </div>
      ) : null}

      {kind === 'retroCamera' ? (
        <div
          className="flex h-full w-full items-stretch gap-1 p-1.5"
          style={{
            background: 'linear-gradient(165deg, #f7f7f8, #d8d8dc)',
          }}
        >
          <div className="flex w-[38%] flex-col justify-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#2c2c2e]/25" />
            <span className="h-1.5 w-4 rounded-sm bg-white/80 shadow-sm" />
            <span className="h-1.5 w-3 rounded-sm bg-white/70 shadow-sm" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden rounded-[4px] border border-black/20 bg-[#111113] p-[2px]">
            <div
              className="h-full w-full rounded-[2px]"
              style={{
                background:
                  'linear-gradient(145deg, #3a4550 0%, #1c2228 55%, #4a5560 100%)',
              }}
            />
          </div>
        </div>
      ) : null}

      {kind === 'musicVinylSleeve' ? (
        <div className="relative h-full w-full p-1.5">
          <div className="absolute right-[6%] top-1/2 z-0 aspect-square h-[78%] w-auto -translate-y-1/2">
            <VinylDisc className="relative h-full w-full" />
          </div>
          <div className="absolute left-[6%] top-[12%] z-[1] h-[76%] w-[52%] overflow-hidden rounded-[2px] border border-black/10 bg-white shadow-md">
            <div
              className="h-full w-full"
              style={{
                background:
                  'linear-gradient(160deg, #7a8a9a 0%, #3a4550 50%, #c8b8a8 100%)',
              }}
            />
          </div>
        </div>
      ) : null}

      {kind === 'musicPlayerCard' ? (
        <div
          className="flex h-full w-full flex-col gap-1 p-1.5"
          style={{ background: 'linear-gradient(160deg, #3a4550, #2c3440)' }}
        >
          <div
            className="min-h-0 flex-1 rounded-[6px]"
            style={{
              background:
                'linear-gradient(145deg, #8a9aaa 0%, #4a5560 55%, #c8b8a0 100%)',
            }}
          />
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-[42%] rounded-full bg-white/80" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-white/50" />
            <span className="h-2 w-2 rounded-full bg-white/80" />
            <span className="h-1 w-1 rounded-full bg-white/50" />
          </div>
        </div>
      ) : null}

      {kind === 'musicNowPlaying' ? (
        <div
          className="flex h-full w-full items-center gap-1.5 px-1.5"
          style={{ background: 'linear-gradient(120deg, #2c2c2e, #3a3a3c)' }}
        >
          <div
            className="h-[70%] aspect-square shrink-0 rounded-[6px]"
            style={{
              background:
                'linear-gradient(145deg, #9aa8b8 0%, #5a6570 50%, #d2c4b0 100%)',
            }}
          />
          <div className="min-w-0 flex-1 py-1">
            <div className="h-1 w-10 rounded-full bg-white/25" />
            <div className="mt-1 h-1.5 w-14 rounded-full bg-white/70" />
            <div className="mt-1 h-1 w-8 rounded-full bg-white/35" />
            <div className="mt-1.5 flex gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 flex-1 rounded-full bg-white/85" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      ) : null}

      {kind === 'musicVinylDeck' ? (
        <div
          className="flex h-full w-full items-center gap-1.5 px-1.5"
          style={{ background: 'linear-gradient(120deg, #5a6570, #4a5560)' }}
        >
          <div className="relative flex h-[78%] w-[36%] shrink-0 items-center justify-center">
            <VinylDisc className="relative aspect-square h-full w-auto" />
            <span
              className="pointer-events-none absolute left-[10%] top-[8%] h-[48%] w-[2px] origin-top rounded-full"
              style={{
                background: 'linear-gradient(180deg, #f5f5f7, #c8c8cc)',
                transform: 'rotate(12deg)',
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="h-1.5 w-12 rounded-full bg-white/75" />
            <div className="mt-1 h-1 w-8 rounded-full bg-white/35" />
            <div className="mt-1.5 h-[2px] w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-[55%] rounded-full bg-white/80" />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-white/45" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/85" />
              <span className="h-1 w-1 rounded-full bg-white/45" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
