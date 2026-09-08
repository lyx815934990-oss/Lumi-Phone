import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Download, FolderOpen, Maximize2, RotateCcw, Save, Upload } from 'lucide-react'
import { Pressable } from '../../components/Pressable'
import { LUMI_BUBBLE_PACK_EXT, serializeLumiBubblePack } from '../wechat/bubblePack'
import {
  compileLookWorkshopBubblePack,
  compileLookWorkshopScopedCss,
  downloadJsonFile,
  downloadTextFile,
} from './compile'
import { ControlPanel } from './editors/ControlPanel'
import { LivePreview } from './preview/LivePreview'
import { useLookWorkshopStore, hydrateLookWorkshopStore, flushLookWorkshopPersist } from './store'
import { LOOK_WORKSHOP_DRAFT_FORMAT } from './types'
import './lookWorkshop.css'

type Props = { onBack: () => void }

export function LookWorkshopApp({ onBack }: Props) {
  const draft = useLookWorkshopStore((s) => s.draft)
  const library = useLookWorkshopStore((s) => s.library)
  const resetDraft = useLookWorkshopStore((s) => s.resetDraft)
  const importArchive = useLookWorkshopStore((s) => s.importArchive)
  const saveToLibrary = useLookWorkshopStore((s) => s.saveToLibrary)
  const deleteFromLibrary = useLookWorkshopStore((s) => s.deleteFromLibrary)
  const loadFromLibrary = useLookWorkshopStore((s) => s.loadFromLibrary)
  const setOpenSection = useLookWorkshopStore((s) => s.setOpenSection)

  const archiveInputRef = useRef<HTMLInputElement>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [fullscreenPreview, setFullscreenPreview] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  // 进入工坊时收起全部手动画板（不要默认展开皮肤信息等）
  useEffect(() => {
    setOpenSection('')
  }, [setOpenSection])

  // 从 IndexedDB 恢复完整草稿（含聊天室背景图等大字段）
  useEffect(() => {
    void hydrateLookWorkshopStore()
    return () => {
      flushLookWorkshopPersist()
    }
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }

  const exportBubblePack = () => {
    try {
      const pack = compileLookWorkshopBubblePack(draft)
      const body = serializeLumiBubblePack(pack)
      const safe = (draft.meta.name || 'look-workshop').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 48)
      downloadTextFile(`${safe}${LUMI_BUBBLE_PACK_EXT}`, body, 'application/json;charset=utf-8')
      showToast('已导出气泡包，请到「微信 → 外观 → 聊天气泡」上传')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '导出失败')
    }
  }

  const exportArchive = () => {
    downloadJsonFile(`${(draft.meta.name || 'look-workshop-draft').slice(0, 40)}.json`, {
      format: LOOK_WORKSHOP_DRAFT_FORMAT,
      version: 1,
      draft,
    })
    showToast('已导出编辑存档')
  }

  const exportCss = () => {
    const css = compileLookWorkshopScopedCss(draft)
    downloadTextFile(`${(draft.meta.name || 'look-workshop').slice(0, 40)}.css`, css)
    showToast('已导出 CSS（仅供参考）')
  }

  const onImportFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const result = importArchive(parsed)
      if (!result.ok) {
        showToast(result.error)
        return
      }
      showToast('存档已导入')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '导入失败')
    }
  }

  /** 全屏真机聊天室预览：铺满工坊视口（含安全区），左上角退出 */
  if (fullscreenPreview) {
    return (
      <div
        className="lw-root relative flex h-full min-h-0 flex-col bg-[#EDEDED]"
        data-app-id="lookWorkshop"
        data-lw-fullscreen-preview="true"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div className="relative z-0 min-h-0 flex-1">
          <LivePreview />
        </div>
        {/* 退出键放在聊天标题栏下方，避免挡住顶栏控件 */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-start"
          style={{
            paddingTop: `calc(max(8px, env(safe-area-inset-top, 0px)) + ${Math.max(36, draft.header.heightPx)}px + 8px)`,
            paddingLeft: 'max(8px, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(8px, env(safe-area-inset-right, 0px))',
          }}
        >
          <Pressable
            type="button"
            onClick={() => setFullscreenPreview(false)}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white shadow-md backdrop-blur-sm active:bg-black/50"
            aria-label="退出全屏预览"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </Pressable>
        </div>
        {toast ? <div className="lw-toast">{toast}</div> : null}
      </div>
    )
  }

  return (
    <div className="lw-root relative flex h-full min-h-0 flex-col" data-app-id="lookWorkshop">
      <header
        className="flex shrink-0 items-center gap-1.5 border-b border-black/6 bg-white/70 px-1.5 pb-1.5 backdrop-blur-md"
        style={{ paddingTop: 'max(6px, env(safe-area-inset-top, 0px))' }}
      >
        <Pressable
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full active:bg-black/5"
          aria-label="返回"
        >
          <ChevronLeft size={18} strokeWidth={1.6} />
        </Pressable>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[13px] font-semibold tracking-tight">外观工坊</h1>
        </div>
        <div className="flex max-w-[68%] flex-wrap justify-end gap-1">
          <button
            type="button"
            className="lw-btn-primary inline-flex items-center gap-0.5 !px-2 !py-1"
            onClick={() => setFullscreenPreview(true)}
          >
            <Maximize2 size={12} strokeWidth={2} />
            全屏预览
          </button>
          <button type="button" className="lw-btn-primary inline-flex items-center gap-0.5 !px-2 !py-1" onClick={exportBubblePack}>
            <Download size={12} strokeWidth={2} />
            导出包
          </button>
          <button type="button" className="lw-btn inline-flex items-center gap-0.5 !px-2 !py-1" onClick={exportArchive}>
            <Save size={12} strokeWidth={2} />
            存档
          </button>
          <button
            type="button"
            className="lw-btn inline-flex items-center gap-0.5 !px-2 !py-1"
            onClick={() => archiveInputRef.current?.click()}
          >
            <Upload size={12} strokeWidth={2} />
            导入
          </button>
          <button
            type="button"
            className={`lw-btn inline-flex items-center gap-0.5 !px-2 !py-1 ${libraryOpen ? '!bg-neutral-900 !text-white' : ''}`}
            onClick={() => setLibraryOpen((v) => !v)}
          >
            <FolderOpen size={12} strokeWidth={2} />
            库
          </button>
          <button type="button" className="lw-btn-ghost !px-2 !py-1" onClick={exportCss}>
            CSS
          </button>
          <button
            type="button"
            className="lw-btn-ghost inline-flex items-center !px-2 !py-1"
            onClick={() => {
              if (window.confirm('确定重置全部控件？')) {
                resetDraft()
                showToast('已重置')
              }
            }}
            aria-label="重置"
          >
            <RotateCcw size={12} strokeWidth={2} />
          </button>
        </div>
        <input
          ref={archiveInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            e.target.value = ''
            void onImportFile(f)
          }}
        />
      </header>

      {libraryOpen ? (
        <div className="shrink-0 border-b border-black/5 bg-white/70 px-2 py-2">
          <LibraryList
            library={library}
            onLoad={(id) => {
              loadFromLibrary(id)
              setLibraryOpen(false)
              showToast('已载入')
            }}
            onDelete={deleteFromLibrary}
            onSave={() => {
              saveToLibrary()
              showToast('已保存到本地皮肤列表')
            }}
          />
        </div>
      ) : null}

      {/* 上下分屏：上预览、下手动编辑 */}
      <div className="flex min-h-0 flex-1 flex-col">
        <section className="flex min-h-0 basis-[44%] flex-col border-b border-black/8 bg-white/40 p-1.5">
          <div className="mb-1 flex shrink-0 items-center justify-between gap-2 px-1">
            <p className="text-[9px] leading-snug text-neutral-400">
              上预览实时刷新 · 点「全屏预览」看真机聊天室效果
            </p>
            <button
              type="button"
              className="text-[10px] font-medium text-neutral-600 underline-offset-2 hover:underline"
              onClick={() => setFullscreenPreview(true)}
            >
              全屏
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <LivePreview compact />
          </div>
        </section>

        <section className="flex min-h-0 basis-[56%] flex-col bg-white/55">
          <div className="flex shrink-0 items-center border-b border-black/5 px-3 py-1.5">
            <p className="text-[11px] font-semibold text-neutral-700">手动编辑</p>
          </div>
          <div className="min-h-0 flex-1">
            <ControlPanel />
          </div>
        </section>
      </div>

      {toast ? <div className="lw-toast">{toast}</div> : null}
    </div>
  )
}

function LibraryList({
  library,
  onLoad,
  onDelete,
  onSave,
}: {
  library: { id: string; name: string; updatedAt: number }[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onSave: () => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-neutral-700">本地皮肤库</p>
        <button type="button" className="lw-btn !px-2 !py-1" onClick={onSave}>
          存当前到库
        </button>
      </div>
      {!library.length ? (
        <p className="text-[11px] text-neutral-400">库为空。可先编辑再「存当前到库」。</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {library.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 rounded-[10px] border border-black/6 bg-white/80 px-2 py-1"
            >
              <button
                type="button"
                className="min-w-0 max-w-[140px] truncate text-left text-[11px]"
                onClick={() => onLoad(item.id)}
              >
                {item.name}
              </button>
              <button
                type="button"
                className="text-[10px] text-neutral-400"
                onClick={() => {
                  if (window.confirm(`删除「${item.name}」？`)) onDelete(item.id)
                }}
              >
                删
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
