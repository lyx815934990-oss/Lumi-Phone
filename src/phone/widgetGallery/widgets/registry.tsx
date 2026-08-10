import { lazy, Suspense, type ComponentType } from 'react'
import type { GalleryWidgetPlacement } from '../types'

type WidgetRenderProps = {
  placement: GalleryWidgetPlacement
  isEditMode?: boolean
  isDragging?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
}

type WidgetComp = ComponentType<{
  placement: GalleryWidgetPlacement
  isEditMode?: boolean
  isDragging?: boolean
}>

/** 全部按需加载，避免音乐/听一听引擎打进桌面首包导致手机卡在「正在加载资源」 */
const PolaroidWidget = lazy(() =>
  import('./PolaroidWidget').then((m) => ({ default: m.PolaroidWidget })),
)
const PolaroidTripleWidget = lazy(() =>
  import('./PolaroidTripleWidget').then((m) => ({ default: m.PolaroidTripleWidget })),
)
const AnniversaryWidget = lazy(() =>
  import('./AnniversaryWidget').then((m) => ({ default: m.AnniversaryWidget })),
)
const StickyNoteWidget = lazy(() =>
  import('./StickyNoteWidget').then((m) => ({ default: m.StickyNoteWidget })),
)
const RetroCameraWidget = lazy(() =>
  import('./RetroCameraWidget').then((m) => ({ default: m.RetroCameraWidget })),
)
const MusicVinylSleeveWidget = lazy(() =>
  import('./music/MusicVinylSleeveWidget').then((m) => ({
    default: m.MusicVinylSleeveWidget,
  })),
)
const MusicPlayerCardWidget = lazy(() =>
  import('./music/MusicPlayerCardWidget').then((m) => ({
    default: m.MusicPlayerCardWidget,
  })),
)
const MusicNowPlayingWidget = lazy(() =>
  import('./music/MusicNowPlayingWidget').then((m) => ({
    default: m.MusicNowPlayingWidget,
  })),
)
const MusicVinylDeckWidget = lazy(() =>
  import('./music/MusicVinylDeckWidget').then((m) => ({
    default: m.MusicVinylDeckWidget,
  })),
)

const KIND_MAP: Record<string, WidgetComp> = {
  polaroid: PolaroidWidget,
  polaroidTriple: PolaroidTripleWidget,
  anniversary: AnniversaryWidget,
  stickyNote: StickyNoteWidget,
  retroCamera: RetroCameraWidget,
  musicVinylSleeve: MusicVinylSleeveWidget,
  musicPlayerCard: MusicPlayerCardWidget,
  musicNowPlaying: MusicNowPlayingWidget,
  musicVinylDeck: MusicVinylDeckWidget,
}

/** 按 kind 渲染组件。新增组件时在 KIND_MAP 注册。 */
export function renderGalleryWidget({
  placement,
  isEditMode,
  isDragging,
}: WidgetRenderProps) {
  const Comp = KIND_MAP[placement.kind]
  if (!Comp) return null
  return (
    <Suspense fallback={null}>
      <Comp
        placement={placement}
        isEditMode={isEditMode}
        isDragging={isDragging}
      />
    </Suspense>
  )
}
