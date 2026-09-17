import { AnimatePresence, motion } from 'framer-motion'
import { Download, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'

export type DataTransferExportKind = 'persona' | 'runtime'

export function DataTransferTab({
  ioExporting,
  runtimeExporting,
  onExport,
  onExportRuntime,
  onImportFileChange,
}: {
  ioExporting: boolean
  runtimeExporting?: boolean
  onExport: () => void
  onExportRuntime?: () => void
  onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [scanning, setScanning] = useState(false)
  const [exportKind, setExportKind] = useState<DataTransferExportKind>('persona')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const fieldId = useId()
  const busy = ioExporting || !!runtimeExporting
  const canRuntime = typeof onExportRuntime === 'function'

  const runWithScan = (action: () => void) => {
    setScanning(true)
    window.setTimeout(() => {
      action()
      window.setTimeout(() => setScanning(false), 700)
    }, 360)
  }

  const exportHint =
    exportKind === 'persona'
      ? '人设 + NPC + 关系 + 世界背景；不含聊天、记忆、约会与剧情轴。'
      : '聊天 / 记忆 / 约会 / 剧情轴 + 绑定的玩家身份；不含人设正文。导入请到名册卡片操作。'

  const exportLabel =
    exportKind === 'persona'
      ? ioExporting
        ? '封装中…'
        : '导出人设包'
      : runtimeExporting
        ? '收集中…'
        : '导出数据包'

  return (
    <section className="relative overflow-hidden rounded-[14px] border border-neutral-200/90 bg-white px-4 pb-10 pt-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <header className="mb-8 border-b border-neutral-100 pb-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-neutral-400">09 DATA · 中枢</p>
        <h2 className="mt-2 text-[17px] font-semibold tracking-tight text-[#1C1C1E]">导入 / 导出</h2>
        <p className="mt-2 text-[11px] font-light leading-relaxed text-neutral-500">
          本页可导出人设包或数据包；导入仅接受人设包（避免与编辑页身份绑定冲突）。数据包请在名册底部「导入角色数据包」导入。
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="rounded-[12px] border border-neutral-200 bg-[#FAFAFA] p-3">
          <p className="mb-2 text-[11px] font-medium text-neutral-500">导出类型</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setExportKind('persona')}
              className={`rounded-[10px] border px-3 py-3 text-left transition-colors disabled:opacity-60 ${
                exportKind === 'persona'
                  ? 'border-[#1C1C1E] bg-white text-[#1C1C1E]'
                  : 'border-transparent bg-transparent text-neutral-500 hover:bg-white/70'
              }`}
            >
              <span className="block text-[13px] font-semibold tracking-wide">人设包</span>
              <span className="mt-1 block text-[10px] leading-snug text-neutral-400">档案 · 关系 · 背景</span>
            </button>
            <button
              type="button"
              disabled={busy || !canRuntime}
              onClick={() => canRuntime && setExportKind('runtime')}
              className={`rounded-[10px] border px-3 py-3 text-left transition-colors disabled:opacity-60 ${
                exportKind === 'runtime'
                  ? 'border-[#1C1C1E] bg-white text-[#1C1C1E]'
                  : 'border-transparent bg-transparent text-neutral-500 hover:bg-white/70'
              }`}
            >
              <span className="block text-[13px] font-semibold tracking-wide">数据包</span>
              <span className="mt-1 block text-[10px] leading-snug text-neutral-400">聊天 · 记忆 · 身份</span>
            </button>
          </div>
          <p className="mt-3 text-[11px] font-light leading-relaxed text-neutral-500">{exportHint}</p>
        </div>

        <button
          type="button"
          disabled={busy || (exportKind === 'runtime' && !canRuntime)}
          onClick={() =>
            runWithScan(() => {
              if (exportKind === 'runtime') onExportRuntime?.()
              else onExport()
            })
          }
          className="flex w-full items-center justify-center gap-3 rounded-[12px] border border-neutral-200 bg-[#FAFAFA] py-4 text-[14px] font-semibold tracking-wide text-[#1C1C1E] transition-colors hover:bg-neutral-100 disabled:opacity-60"
        >
          <Download className="size-5" strokeWidth={1.5} />
          {exportLabel}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => runWithScan(() => fileRef.current?.click())}
          className="flex w-full items-center justify-center gap-3 rounded-[12px] border border-neutral-200 bg-white py-4 text-[14px] font-semibold tracking-wide text-[#1C1C1E] transition-colors hover:bg-neutral-50 disabled:opacity-60"
        >
          <Upload className="size-5" strokeWidth={1.5} />
          导入人设包
        </button>
        <input
          ref={fileRef}
          id={fieldId}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onImportFileChange}
        />
      </div>

      <AnimatePresence>
        {scanning ? (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[2000] bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-x-0 top-0 h-[2px] bg-[#D4AF37]"
              initial={{ top: '15%' }}
              animate={{ top: ['15%', '85%', '15%'] }}
              transition={{ duration: 1.15, ease: 'easeInOut', repeat: Infinity }}
              style={{ boxShadow: '0 0 28px rgba(212,175,55,0.35)' }}
            />
            <p className="absolute bottom-24 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.45em] text-white/75">
              Archive Channel · Scanning
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
