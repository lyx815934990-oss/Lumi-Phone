import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Music2,
  Palette,
  Plus,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import {
  addLocalMusicFiles,
  getDesktopMusicSnapshot,
  playDesktopTrack,
  removeLocalMusicTrack,
  subscribeDesktopMusic,
} from './desktopMusicEngine'

type Props = {
  open: boolean
  onClose: () => void
  onOpenListen: () => void
  /** 在曲库面板内打开外观编辑（不在组件上挂外观按钮） */
  onEditAppearance?: () => void
}

const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.amr'
const PAGE_SIZE = 5

function copySelectedFiles(fileList: FileList | null): File[] {
  // FileList 是「活」的：先清空 input.value 会把列表一起清空（手机端尤其明显）
  if (!fileList || fileList.length === 0) return []
  return Array.from(fileList)
}

/** 避免 display:none 导致部分环境无法唤起文件选择器 */
const fileInputStyle: CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 0,
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
}

/** 唱片组件：本地曲库列表点选 / 批量添加 / 跳转听一听 */
export function MusicSourceActionSheet({
  open,
  onClose,
  onOpenListen,
  onEditAppearance,
}: Props) {
  const fileId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const pickingRef = useRef(false)
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)
  const snap = useSyncExternalStore(
    subscribeDesktopMusic,
    getDesktopMusicSnapshot,
    getDesktopMusicSnapshot,
  )
  const shell =
    typeof document !== 'undefined'
      ? document.querySelector('[data-phone-shell="true"]')
      : null

  const library = snap.library
  const currentId = snap.track?.id
  const totalPages = Math.max(1, Math.ceil(library.length / PAGE_SIZE) || 1)
  const safePage = Math.min(page, totalPages - 1)
  const pageStart = safePage * PAGE_SIZE
  const pageTracks = library.slice(pageStart, pageStart + PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  useEffect(() => {
    if (!open) return
    const live = getDesktopMusicSnapshot()
    const id = live.track?.id
    if (!id) {
      setPage(0)
      return
    }
    const idx = live.library.findIndex((t) => t.id === id)
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE))
  }, [open])

  const ingestFiles = async (files: FileList | File[] | null) => {
    pickingRef.current = false
    const list = !files
      ? []
      : Array.isArray(files)
        ? files
        : Array.from(files)
    if (list.length === 0) {
      setHint('未选择文件（可再试一次「批量添加」）')
      return
    }
    setBusy(true)
    setHint(`正在导入 ${list.length} 个文件…`)
    try {
      const prevLen = getDesktopMusicSnapshot().library.length
      const added = await addLocalMusicFiles(list, { playFirst: true })
      if (added.length === 0) {
        const names = list
          .slice(0, 3)
          .map((f) => f.name || f.type || '未命名')
          .join('、')
        setHint(`未能加入曲库（已选 ${list.length} 个：${names}）。请选 mp3 / m4a 等音频`)
      } else {
        const nextLen = prevLen + added.length
        setPage(Math.max(0, Math.ceil(nextLen / PAGE_SIZE) - 1))
        if (getDesktopMusicSnapshot().playing) {
          setHint(`已加入 ${added.length} 首并开始播放`)
          onClose()
        } else {
          setHint(`已加入 ${added.length} 首 · 若未出声请点组件上的播放键`)
        }
      }
    } catch {
      setHint('导入失败，请换一种格式再试')
    } finally {
      setBusy(false)
    }
  }

  const markPicking = () => {
    pickingRef.current = true
    window.setTimeout(() => {
      pickingRef.current = false
    }, 60_000)
  }

  const openFilePicker = () => {
    markPicking()
    fileRef.current?.click()
  }

  const handleBackdropClose = () => {
    if (busy || pickingRef.current) return
    onClose()
  }

  if (!shell) return null

  return createPortal(
    <>
      {/* 文件 input 常挂，避免关面板时冲掉 onChange */}
      <input
        id={fileId}
        ref={fileRef}
        type="file"
        accept={AUDIO_ACCEPT}
        multiple
        style={fileInputStyle}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const list = copySelectedFiles(e.target.files)
          e.target.value = ''
          void ingestFiles(list)
        }}
      />

      <AnimatePresence>
        {open ? (
          <motion.div
            key="music-source-sheet"
            data-widget-add-ui="true"
            data-widget-editing="true"
            className="absolute inset-0 z-[540] flex flex-col justify-end bg-black/35 backdrop-blur-[2px]"
            style={{ touchAction: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClose}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <motion.div
              className="mx-3 mb-[max(12px,env(safe-area-inset-bottom))] flex max-h-[72%] flex-col overflow-hidden rounded-[22px] border border-white/50 bg-white/92 shadow-[0_-12px_40px_rgba(28,28,30,0.2)] backdrop-blur-xl"
              initial={{ y: 28 }}
              animate={{ y: 0 }}
              exit={{ y: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 border-b border-black/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#2c2c2e]/45">
                  Music
                </p>
                <p className="text-[15px] font-medium text-[#2c2c2e]">选择播放方式</p>
                <p className="mt-0.5 text-[11px] text-[#2c2c2e]/45">
                  本地曲库每页 {PAGE_SIZE} 首，可翻页查看
                </p>
                {hint ? (
                  <p className="mt-1.5 text-[11px] font-medium text-[#2c2c2e]/70">{hint}</p>
                ) : null}
                {busy ? (
                  <p className="mt-1.5 text-[11px] text-[#2c2c2e]/45">正在导入…</p>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {library.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-8 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2c2c2e]/6 text-[#2c2c2e]/55">
                      <Music2 size={22} strokeWidth={1.7} />
                    </span>
                    <p className="mt-3 text-[13px] font-medium text-[#2c2c2e]/70">
                      还没有本地歌曲
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#2c2c2e]/45">
                      点下方「批量添加」选择音频文件
                    </p>
                  </div>
                ) : (
                  <ul className="py-1">
                    {pageTracks.map((track, index) => {
                      const absoluteIndex = pageStart + index
                      const active = track.id === currentId
                      return (
                        <li
                          key={track.id}
                          className="flex items-stretch border-b border-black/[0.04]"
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left active:bg-black/[0.04]"
                            onClick={() => {
                              void playDesktopTrack(track)
                                .then(() => onClose())
                                .catch(() => {
                                  setHint('无法自动播放，请关闭后点组件上的播放键')
                                })
                            }}
                          >
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-medium"
                              style={{
                                background: active ? '#2c2c2e' : 'rgba(44,44,46,0.08)',
                                color: active ? '#fff' : '#2c2c2e',
                              }}
                            >
                              {absoluteIndex + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className="block truncate text-[14px] font-medium"
                                style={{ color: active ? '#1c1c1e' : '#2c2c2e' }}
                              >
                                {track.title}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-[#2c2c2e]/45">
                                {active && snap.playing ? '正在播放 · ' : ''}
                                {track.artist}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="shrink-0 px-3 text-[#2c2c2e]/35 active:text-[#2c2c2e]/70"
                            aria-label="从列表移除"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeLocalMusicTrack(track.id)
                            }}
                          >
                            <Trash2 size={15} strokeWidth={1.8} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {library.length > 0 ? (
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-black/5 px-3 py-2">
                  <button
                    type="button"
                    disabled={safePage <= 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#2c2c2e] disabled:opacity-25"
                    aria-label="上一页"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft size={18} strokeWidth={1.8} />
                  </button>
                  <p className="text-[12px] text-[#2c2c2e]/55">
                    第 {safePage + 1} / {totalPages} 页 · 共 {library.length} 首
                  </p>
                  <button
                    type="button"
                    disabled={safePage >= totalPages - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#2c2c2e] disabled:opacity-25"
                    aria-label="下一页"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight size={18} strokeWidth={1.8} />
                  </button>
                </div>
              ) : null}

              <div className="shrink-0 border-t border-black/5">
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-black/[0.04] disabled:opacity-50"
                  onClick={openFilePicker}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2c2c2e]/8 text-[#2c2c2e]">
                    <Plus size={18} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-[#2c2c2e]">
                      批量添加本地音乐
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[#2c2c2e]/50">
                      请选 mp3 / m4a / wav 等音频文件
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-t border-black/5 px-4 py-3.5 text-left active:bg-black/[0.04]"
                  onClick={() => {
                    onClose()
                    onOpenListen()
                  }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2c2c2e]/8 text-[#2c2c2e]">
                    <Headphones size={18} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-[#2c2c2e]">
                      打开听一听
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[#2c2c2e]/50">
                      搜索、资料库与在线播放
                    </span>
                  </span>
                </button>

                {onEditAppearance ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-t border-black/5 px-4 py-3.5 text-left active:bg-black/[0.04]"
                    onClick={() => {
                      onClose()
                      onEditAppearance()
                    }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2c2c2e]/8 text-[#2c2c2e]">
                      <Palette size={18} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-[#2c2c2e]">
                        编辑外观
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[#2c2c2e]/50">
                        颜色、毛玻璃与背景图
                      </span>
                    </span>
                  </button>
                ) : null}

                <button
                  type="button"
                  className="w-full border-t border-black/5 py-3 text-center text-[13px] text-[#2c2c2e]/55"
                  onClick={handleBackdropClose}
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    shell,
  )
}
