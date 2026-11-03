import { useEffect } from 'react'
import type { WorldBookItem, WorldBookPriority } from '../types'
import { PlatinumSwitch } from '../PlatinumSwitch'

/** 水墨杂志：冷灰纸、墨色书脊 */
const INK = '#1E2024'
const PAGE = '#EDEBE7'
const CARD = '#F8F7F4'
const LINE = '#D2D0CB'
const FOIL = '#5A6574'
const MUTED = '#6A6E76'
const PAPER = '#F4F0E8'

const SPINE = [INK, FOIL, '#8A909A', '#3A414C', '#6A6E76', '#2C3138']
const HEIGHTS = [118, 102, 110, 94, 108, 100]
const WIDTHS = [30, 26, 28, 24, 27, 25]

const OPEN_CSS = `
@keyframes lumiBookRise {
  from { transform: translateY(36px) scale(0.62); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes lumiCoverOpen {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(-162deg); }
}
@keyframes lumiSpreadIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes lumiPageLeaf {
  0% { opacity: 0; transform: rotateY(0deg); }
  12% { opacity: 1; }
  100% { opacity: 1; transform: rotateY(-168deg); }
}
`

function spineInk(tone: string) {
  return tone === INK || tone === '#2C3138' || tone === '#3A414C' ? CARD : INK
}

function ShelfBook({
  title,
  height,
  width,
  tone,
  dimmed,
  onOpen,
}: {
  title: string
  height: number
  width: number
  tone: string
  dimmed?: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onOpen}
      className="relative shrink-0 cursor-pointer border-0 bg-transparent p-0"
      style={{
        width,
        height,
        alignSelf: 'flex-end',
        opacity: dimmed ? 0.42 : 1,
      }}
    >
      <span
        aria-hidden
        className="absolute border border-b-0"
        style={{
          top: -4,
          left: 2,
          right: -3,
          height: 5,
          background: '#E8E0D4',
          borderColor: INK,
          transform: 'skewX(-12deg)',
          transformOrigin: 'left bottom',
        }}
      />
      <span
        className="absolute inset-0 flex items-center justify-center overflow-hidden border-[1.5px]"
        style={{
          background: tone,
          borderColor: INK,
          borderRadius: '2px 3px 2px 2px',
        }}
      >
        <span className="absolute left-[3px] right-[3px] top-2 h-px opacity-25" style={{ background: INK }} />
        <span className="absolute bottom-2 left-[3px] right-[3px] h-px opacity-25" style={{ background: INK }} />
        <span
          className="max-h-[calc(100%-18px)] overflow-hidden font-serif text-[10px] font-bold tracking-[0.16em]"
          style={{ writingMode: 'vertical-rl', color: spineInk(tone) }}
        >
          {title}
        </span>
      </span>
      <span
        aria-hidden
        className="absolute border border-l-0"
        style={{
          top: 1,
          right: -4,
          width: 5,
          bottom: 1,
          background: PAPER,
          borderColor: INK,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </button>
  )
}

function ShelfRow({
  label,
  en,
  items,
  onOpen,
  onToggle,
  onAdd,
}: {
  label: string
  en: string
  items: WorldBookItem[]
  onOpen: (item: WorldBookItem) => void
  onToggle: (item: WorldBookItem, enabled: boolean) => void
  onAdd: () => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-serif text-[13px] font-semibold tracking-wide" style={{ color: INK }}>
          {label}
        </p>
        <p className="font-mono text-[9px] tracking-[0.14em]" style={{ color: '#9AA0A8' }}>
          {en} · {items.length}
        </p>
      </div>
      <div className="overflow-hidden rounded-[14px] border" style={{ borderColor: LINE, background: PAGE }}>
        <div className="flex items-end gap-2 overflow-x-auto px-3 pb-2.5 pt-4">
          {items.map((it, i) => (
            <div key={it.id} className="flex shrink-0 flex-col items-center gap-1.5">
              <ShelfBook
                title={(it.name || '未名').slice(0, 8)}
                height={HEIGHTS[i % HEIGHTS.length]!}
                width={WIDTHS[i % WIDTHS.length]!}
                tone={SPINE[i % SPINE.length]!}
                dimmed={!it.enabled}
                onOpen={() => onOpen(it)}
              />
              <PlatinumSwitch
                checked={it.enabled}
                onChange={(v) => onToggle(it, v)}
                aria-label={`${it.name || '条目'}是否生效`}
                className="origin-top scale-[0.72]"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="mb-8 flex h-[70px] w-8 shrink-0 items-center justify-center border-[1.5px] text-[16px]"
            style={{
              alignSelf: 'flex-end',
              borderColor: INK,
              color: FOIL,
              background: '#E2E5EA',
              borderRadius: 2,
              transform: 'skewY(-8deg)',
            }}
            aria-label={`在${label}上架新书`}
          >
            +
          </button>
        </div>
        <div className="relative h-2.5 border-y" style={{ background: '#E2E5EA', borderColor: INK }}>
          <span className="absolute left-3 right-3 top-[3px] h-px" style={{ background: LINE }} />
        </div>
      </div>
    </div>
  )
}

export function WorldbookInkShelf({
  items,
  onOpen,
  onToggle,
  onAdd,
}: {
  items: WorldBookItem[]
  onOpen: (item: WorldBookItem) => void
  onToggle: (item: WorldBookItem, enabled: boolean) => void
  onAdd: (priority: WorldBookPriority) => void
}) {
  const fixed = items.filter((it) => it.priority !== 'after')
  const epilogue = items.filter((it) => it.priority === 'after')
  return (
    <div className="space-y-4 px-3 pb-4 pt-3">
      <ShelfRow
        label="固定"
        en="FIXED"
        items={fixed}
        onOpen={onOpen}
        onToggle={onToggle}
        onAdd={() => onAdd('before')}
      />
      <ShelfRow
        label="尾声"
        en="EPILOGUE"
        items={epilogue}
        onOpen={onOpen}
        onToggle={onToggle}
        onAdd={() => onAdd('after')}
      />
    </div>
  )
}

export function BookOpenOverlay({
  title,
  shelf,
  onDone,
}: {
  title: string
  shelf: '固定' | '尾声'
  onDone: () => void
}) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 1680)
    return () => window.clearTimeout(id)
  }, [title, onDone])

  const tone = shelf === '尾声' ? FOIL : INK
  const coverInk = shelf === '尾声' ? CARD : PAGE

  return (
    <div
      className="fixed inset-0 z-[1140] flex flex-col items-center justify-center"
      style={{ background: PAGE, color: INK }}
    >
      <style>{OPEN_CSS}</style>
      <p className="font-mono text-[10px] tracking-[0.22em]" style={{ color: FOIL }}>
        {shelf === '尾声' ? 'EPILOGUE' : 'FIXED'}
      </p>
      <div
        className="relative mt-5"
        style={{
          perspective: 1100,
          width: 210,
          height: 248,
          animation: 'lumiBookRise 0.42s ease both',
        }}
      >
        <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
          <div
            className="absolute border-[1.5px]"
            style={{
              top: 10,
              bottom: 10,
              left: 18,
              width: 168,
              background: '#FBF7F0',
              borderColor: INK,
              borderRadius: '2px 10px 10px 2px',
              opacity: 0,
              animation: 'lumiSpreadIn 0.45s ease 0.48s forwards',
            }}
          />
          <div
            className="absolute border"
            style={{
              top: 14,
              bottom: 14,
              left: 18,
              width: 78,
              background: '#FBF7F0',
              borderColor: INK,
              transformOrigin: 'right center',
              opacity: 0,
              animation: 'lumiPageLeaf 0.55s ease 0.95s forwards',
            }}
          />
          <div
            className="absolute flex items-center justify-center border-[1.5px]"
            style={{
              top: 0,
              left: 18,
              width: 92,
              height: '100%',
              background: tone,
              borderColor: INK,
              borderRadius: '3px 4px 4px 3px',
              transformOrigin: 'left center',
              transformStyle: 'preserve-3d',
              animation: 'lumiCoverOpen 0.95s cubic-bezier(.45,.02,.2,1) 0.38s forwards',
            }}
          >
            <span
              className="font-serif text-[15px] font-bold tracking-[0.28em]"
              style={{ writingMode: 'vertical-rl', color: coverInk }}
            >
              {(title || '未名').slice(0, 8)}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-6 text-[12px] tracking-wide" style={{ color: MUTED }}>
        正在翻开 · {title || '未命名条目'}
      </p>
    </div>
  )
}
