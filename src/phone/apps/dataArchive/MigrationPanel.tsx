import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { PLATINUM } from './constants'
import {
  buildLumiArchiveDownloadFilename,
  defaultLumiArchiveBaseName,
  downloadBlob,
  estimateLocalStorageChars,
  exportDataToFile,
  importDataFromFile,
} from './exportImport'

const EXPORT_LINES = ['Packaging memories...', 'Compressing timelines...', 'Archive sealed.']
const IMPORT_LINES = ['Unpacking archive...', 'Rebinding local state...', 'Memory merge complete.']

function CeremonyOverlay({
  open,
  lines,
  activeLine,
  lightweight,
}: {
  open: boolean
  lines: readonly string[]
  activeLine: number
  /** 导出大数据时关掉 blur，避免和 JSON 拼装一起把手机内存顶爆 */
  lightweight?: boolean
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            background: lightweight ? 'rgba(243, 239, 234, 0.92)' : 'rgba(243, 239, 234, 0.72)',
            backdropFilter: lightweight ? undefined : 'blur(18px)',
            WebkitBackdropFilter: lightweight ? undefined : 'blur(18px)',
          }}
        >
          <div className="relative flex max-w-[320px] flex-col items-center text-center">
            <motion.div
              className="mb-8 size-[120px] rounded-full border-2"
              style={{ borderColor: `${PLATINUM.gold}55` }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
            >
              <motion.div
                className="absolute inset-2 rounded-full border border-dashed"
                style={{ borderColor: PLATINUM.gold }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.85, 0.35] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
            <p className="min-h-[44px] text-[14px] font-medium leading-relaxed tracking-wide" style={{ color: PLATINUM.ink }}>
              {lines[Math.min(activeLine, lines.length - 1)] ?? ''}
            </p>
            <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-black/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${PLATINUM.ink}, ${PLATINUM.gold})` }}
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function MigrationPanel() {
  const [ceremonyOpen, setCeremonyOpen] = useState(false)
  const [ceremonyLines, setCeremonyLines] = useState<readonly string[]>(EXPORT_LINES)
  const [lineIdx, setLineIdx] = useState(0)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [importSuccessOpen, setImportSuccessOpen] = useState(false)
  const [importSuccessDetail, setImportSuccessDetail] = useState('')
  const [pendingImportText, setPendingImportText] = useState<string | null>(null)
  const [exportNameOpen, setExportNameOpen] = useState(false)
  const [exportNameDraft, setExportNameDraft] = useState('')
  const exportNameInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const lineTimer = useRef<number>(0)

  const clearLineTimers = () => {
    window.clearInterval(lineTimer.current)
    lineTimer.current = 0
  }

  const openExportNameDialog = useCallback(() => {
    setExportNameDraft(defaultLumiArchiveBaseName())
    setExportNameOpen(true)
  }, [])

  const runExportWithChosenName = useCallback(async (displayName: string) => {
    setExportNameOpen(false)

    // 桌面组件大图 / 名片字体会把归档撑到几十 MB，iPhone 上易 OOM 并触发「模块加载失败」整页崩
    const lsChars = estimateLocalStorageChars()
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const warnAt = isIos ? 6_000_000 : 12_000_000
    if (lsChars > warnAt) {
      const mb = (lsChars / (1024 * 1024)).toFixed(1)
      const ok = window.confirm(
        `当前本机数据约 ${mb} MB，在手机上导出可能因内存不足失败（会误报「模块加载失败」）。\n\n建议：删掉部分组件大图或名片自定义字体后再试，或换电脑浏览器导出。\n\n仍要继续吗？`,
      )
      if (!ok) return
    }

    setBusy('export')
    setCeremonyLines(EXPORT_LINES)
    setLineIdx(0)
    setCeremonyOpen(true)
    clearLineTimers()
    lineTimer.current = window.setInterval(() => {
      setLineIdx((i) => Math.min(i + 1, EXPORT_LINES.length - 1))
    }, 900)

    let blob: Blob | null = null
    let filename = ''
    try {
      // 边做导出边播仪式动画，避免先空等 2.8s 再一次性撑爆内存
      const result = await exportDataToFile({ displayName })
      blob = result.blob
      filename = result.filename
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '导出失败')
      clearLineTimers()
      setCeremonyOpen(false)
      setBusy(null)
      setLineIdx(0)
      return
    }

    clearLineTimers()
    setCeremonyOpen(false)
    setBusy(null)
    setLineIdx(0)

    // 先卸掉全屏动画，再触发下载，降低 iOS 上后续动态 import 失败概率
    await new Promise((r) => window.setTimeout(r, 120))
    try {
      if (blob) await downloadBlob(blob, filename)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '保存文件失败')
    } finally {
      blob = null
      // 再让出几帧给 Safari 回收 Blob/File，减少紧接着路由切换时的 chunk 加载失败
      await new Promise((r) => window.setTimeout(r, isIos ? 280 : 60))
    }
  }, [])

  useEffect(() => {
    if (!exportNameOpen) return
    const t = window.setTimeout(() => {
      const el = exportNameInputRef.current
      if (el) {
        el.focus()
        el.select()
      }
    }, 50)
    return () => window.clearTimeout(t)
  }, [exportNameOpen])

  const finishImportCeremony = useCallback(async () => {
    setCeremonyLines(IMPORT_LINES)
    setLineIdx(0)
    setCeremonyOpen(true)
    clearLineTimers()
    lineTimer.current = window.setInterval(() => {
      setLineIdx((i) => Math.min(i + 1, IMPORT_LINES.length - 1))
    }, 850)
    await new Promise((r) => window.setTimeout(r, 2600))
    clearLineTimers()
    setCeremonyOpen(false)
    const flash = document.createElement('div')
    flash.style.cssText =
      'position:fixed;inset:0;z-index:3000;background:#fff;pointer-events:none;opacity:1;transition:opacity 0.45s ease'
    document.body.appendChild(flash)
    requestAnimationFrame(() => {
      flash.style.opacity = '0'
    })
    await new Promise<void>((resolve) => {
      window.setTimeout(() => {
        flash.remove()
        resolve()
      }, 480)
    })
  }, [])

  const executeImport = useCallback(async () => {
    const text = pendingImportText
    setImportConfirmOpen(false)
    setPendingImportText(null)
    if (!text) return
    setBusy('import')
    try {
      const result = await importDataFromFile(text)
      await finishImportCeremony()
      const parts = [`已恢复 ${result.keysRestored} 项本地键`]
      if (result.indexedDbRestored) parts.push('并已写入 IndexedDB 快照')
      setImportSuccessDetail(`${parts.join('，')}。相关界面将自动同步，无需重启。`)
      setImportSuccessOpen(true)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '导入失败')
    } finally {
      setBusy(null)
    }
  }, [finishImportCeremony, pendingImportText])

  useEffect(() => () => clearLineTimers(), [])

  return (
    <div id="data-archive-migration-panel" className="mt-6 space-y-3">
      <CeremonyOverlay
        open={ceremonyOpen}
        lines={ceremonyLines}
        activeLine={lineIdx}
        lightweight={busy === 'export'}
      />

      {exportNameOpen ? (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center px-5"
          style={{ background: 'rgba(28,28,30,0.35)', backdropFilter: 'blur(10px)' }}
        >
          <form
            className="w-full max-w-[320px] rounded-2xl border px-5 py-5 shadow-xl"
            style={{
              borderColor: PLATINUM.line,
              background: 'rgba(255,255,255,0.92)',
            }}
            onSubmit={(e) => {
              e.preventDefault()
              void runExportWithChosenName(exportNameDraft)
            }}
          >
            <p className="text-[15px] font-semibold" style={{ color: PLATINUM.ink }}>
              命名备份文件
            </p>
            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: PLATINUM.ash }}>
              将保存为 JSON 数据包。手机上请在分享面板选「存储到文件」，不要选拷贝/备忘录（会变成「文本」）。预览：
              <span className="mt-1 block font-mono text-[11px]" style={{ color: PLATINUM.ink }}>
                {buildLumiArchiveDownloadFilename(exportNameDraft)}
              </span>
            </p>
            <input
              ref={exportNameInputRef}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={exportNameDraft}
              onChange={(e) => setExportNameDraft(e.target.value)}
              className="mt-3 w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none ring-0 focus:border-opacity-80"
              style={{ borderColor: PLATINUM.line, color: PLATINUM.ink }}
              placeholder={defaultLumiArchiveBaseName()}
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border py-2.5 text-[13px] font-medium"
                style={{ borderColor: PLATINUM.line, color: PLATINUM.ink }}
                onClick={() => {
                  setExportNameOpen(false)
                  setExportNameDraft('')
                }}
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white"
                style={{ background: PLATINUM.ink }}
              >
                开始导出
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {importConfirmOpen ? (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center px-5"
          style={{ background: 'rgba(28,28,30,0.35)', backdropFilter: 'blur(10px)' }}
        >
          <div
            className="max-w-[320px] rounded-2xl border px-5 py-5 shadow-xl"
            style={{
              borderColor: PLATINUM.line,
              background: 'rgba(255,255,255,0.92)',
            }}
          >
            <p className="text-[15px] font-semibold" style={{ color: PLATINUM.ink }}>
              检测到世界线变动
            </p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: PLATINUM.ash }}>
              将覆盖本机 localStorage；若归档为 v2，还会按快照清空并重写已接入的 IndexedDB 主库。是否确认？
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border py-2.5 text-[13px] font-medium"
                style={{ borderColor: PLATINUM.line, color: PLATINUM.ink }}
                onClick={() => {
                  setImportConfirmOpen(false)
                  setPendingImportText(null)
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white"
                style={{ background: PLATINUM.ink }}
                onClick={() => void executeImport()}
              >
                确认覆盖
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importSuccessOpen ? (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center px-5"
          style={{ background: 'rgba(28,28,30,0.35)', backdropFilter: 'blur(10px)' }}
        >
          <div
            className="max-w-[320px] rounded-2xl border px-5 py-5 shadow-xl"
            style={{
              borderColor: PLATINUM.line,
              background: 'rgba(255,255,255,0.92)',
            }}
          >
            <p className="text-[15px] font-semibold" style={{ color: PLATINUM.ink }}>
              导入数据成功
            </p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: PLATINUM.ash }}>
              {importSuccessDetail || '备份已写入本机，无需重启系统。'}
            </p>
            <div className="mt-5">
              <button
                type="button"
                className="w-full rounded-xl py-2.5 text-[13px] font-semibold text-white"
                style={{ background: PLATINUM.ink }}
                onClick={() => setImportSuccessOpen(false)}
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy !== null || exportNameOpen}
        onClick={() => openExportNameDialog()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-[14px] font-semibold transition-opacity disabled:opacity-50"
        style={{
          borderColor: PLATINUM.gold,
          color: PLATINUM.ink,
          background: 'rgba(255,255,255,0.55)',
          boxShadow: '0 6px 24px rgba(197,168,128,0.12)',
        }}
      >
        <Download className="size-4" style={{ color: PLATINUM.gold }} />
        备份导出 · JSON 数据包
      </button>

      <label
        id="data-archive-import-restore"
        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border py-3.5 text-[14px] font-semibold ${
          busy ? 'pointer-events-none opacity-50' : ''
        }`}
        style={{
          borderColor: PLATINUM.gold,
          color: PLATINUM.ink,
          background: 'rgba(255,255,255,0.55)',
          boxShadow: '0 6px 24px rgba(197,168,128,0.12)',
        }}
      >
        <Upload className="size-4" style={{ color: PLATINUM.gold }} />
        恢复导入 · Restore
        <input
          type="file"
          accept=".lumi,.json,application/json"
          className="hidden"
          onChange={(e) => {
            const input = e.currentTarget
            const f = input.files?.[0]
            input.value = ''
            if (!f) return
            void (async () => {
              try {
                const text = await f.text()
                setPendingImportText(text)
                setImportConfirmOpen(true)
              } catch {
                window.alert('无法读取所选文件。')
              }
            })()
          }}
        />
      </label>
    </div>
  )
}
