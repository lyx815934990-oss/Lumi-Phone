import { useCallback, useEffect, useState } from 'react'
import { Loader2, Wand2 } from 'lucide-react'

import type { WeChatPersonaContact } from '../../../types'
import {
  imageDataUrlToBeadPattern,
  PHOTO_GRID_SIZE_OPTIONS,
  type ImageToPatternResult,
} from '../imageToPattern'
import type { BeadPattern } from '../types'
import { CharacterPickerModal } from './CharacterPickerModal'
import { PatternPreview } from './BeadGrid'

export function UploadPatternModal({
  fileName,
  dataUrl,
  contacts,
  onSave,
  onStart,
  onClose,
}: {
  fileName: string
  dataUrl: string
  contacts: WeChatPersonaContact[]
  onSave: (pattern: BeadPattern) => void
  onStart: (pattern: BeadPattern, contact: WeChatPersonaContact) => void
  onClose: () => void
}) {
  const [result, setResult] = useState<ImageToPatternResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gridSize, setGridSize] = useState<number | null>(null)
  const [pickCharacter, setPickCharacter] = useState(false)

  const convert = useCallback(
    async (size: number | null) => {
      setLoading(true)
      setError('')
      try {
        const next = await imageDataUrlToBeadPattern(dataUrl, fileName, {
          mode: size == null ? 'auto' : 'photo',
          gridSize: size ?? undefined,
        })
        setResult(next)
        if (size == null && next.detectedCols) {
          setGridSize(null)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '识别失败')
        setResult(null)
      } finally {
        setLoading(false)
      }
    },
    [dataUrl, fileName],
  )

  useEffect(() => {
    void convert(null)
  }, [convert])

  const handleGridSize = (size: number) => {
    setGridSize(size)
    void convert(size)
  }

  const handleAuto = () => {
    setGridSize(null)
    void convert(null)
  }

  const pattern = result?.pattern

  if (pickCharacter && pattern) {
    return (
      <CharacterPickerModal
        contacts={contacts}
        onPick={(contact) => {
          onStart(pattern, contact)
          setPickCharacter(false)
        }}
        onClose={() => setPickCharacter(false)}
      />
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/35 p-4">
      <div className="bc-card w-full max-w-[400px] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#f0e4dc] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">识别拼豆图纸</p>
            <p className="mt-0.5 truncate text-[11px] text-[#9a8f8a]">{fileName}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-[13px] text-[#9a8f8a]">
            取消
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center justify-center rounded-2xl bg-[#fff5f8] py-5">
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-[#9a8f8a]">
                <Loader2 className="size-6 animate-spin text-[#ff7b9c]" />
                <span className="text-[12px]">正在识别颜色与格数…</span>
              </div>
            ) : pattern ? (
              <PatternPreview
                width={pattern.width}
                height={pattern.height}
                palette={pattern.palette}
                cells={pattern.cells}
                maxSize={140}
              />
            ) : (
              <p className="text-[13px] text-[#e5484d]">{error || '无法识别'}</p>
            )}
          </div>

          {result && !loading ? (
            <p className="mt-3 text-center text-[12px] text-[#9a8f8a]">
              <Wand2 className="mr-1 inline size-3.5 text-[#ff7b9c]" />
              {result.recognitionLabel}
              {pattern ? ` · ${pattern.palette.length} 色` : ''}
            </p>
          ) : null}

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium text-[#b0a6a0]">格数（照片可手动调）</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAuto}
                disabled={loading}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  gridSize == null
                    ? 'bg-[#ff7b9c] text-white'
                    : 'bg-[#f5ebe4] text-[#9a8f8a]'
                }`}
              >
                自动识别
              </button>
              {PHOTO_GRID_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleGridSize(size)}
                  disabled={loading}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    gridSize === size
                      ? 'bg-[#ff7b9c] text-white'
                      : 'bg-[#f5ebe4] text-[#9a8f8a]'
                  }`}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-[#f0e4dc] px-4 py-3">
          <button
            type="button"
            disabled={!pattern || loading}
            onClick={() => {
              if (!pattern) return
              onSave(pattern)
              onClose()
            }}
            className="flex-1 rounded-2xl border border-[#f0e4dc] bg-white py-2.5 text-[13px] font-medium text-[#2a2220] disabled:opacity-40"
          >
            保存到广场
          </button>
          <button
            type="button"
            disabled={!pattern || loading}
            onClick={() => setPickCharacter(true)}
            className="flex-1 rounded-2xl bg-[#ff7b9c] py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(255,123,156,0.28)] disabled:opacity-40"
          >
            选 TA 开拼
          </button>
        </div>
      </div>
    </div>
  )
}
