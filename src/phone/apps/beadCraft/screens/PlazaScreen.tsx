import { useRef, useState } from 'react'
import { ImagePlus, Sparkles } from 'lucide-react'

import type { WeChatPersonaContact } from '../../../types'
import { BUILTIN_BEAD_PATTERNS } from '../builtinPatterns'
import { selectActiveSession, selectUploadedPatterns, useBeadCraftStore } from '../store'
import type { BeadPattern } from '../types'
import { CharacterPickerModal } from '../components/CharacterPickerModal'
import { PatternCard } from '../components/PatternCard'
import { UploadPatternModal } from '../components/UploadPatternModal'

type UploadDraft = { fileName: string; dataUrl: string }

export function PlazaScreen({
  contacts,
  onStartSession,
}: {
  contacts: WeChatPersonaContact[]
  onStartSession: () => void
}) {
  const uploadedPatterns = useBeadCraftStore(selectUploadedPatterns)
  const addUploadedPattern = useBeadCraftStore((s) => s.addUploadedPattern)
  const startSession = useBeadCraftStore((s) => s.startSession)
  const activeSession = useBeadCraftStore(selectActiveSession)

  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPattern, setPendingPattern] = useState<BeadPattern | null>(null)
  const [uploadDraft, setUploadDraft] = useState<UploadDraft | null>(null)
  const [readingFile, setReadingFile] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }

  const handlePickPattern = (pattern: BeadPattern) => {
    if (activeSession?.status === 'playing') {
      showToast('你还有进行中的拼豆，先去继续或结束吧')
      return
    }
    setPendingPattern(pattern)
  }

  const handlePickCharacter = (contact: WeChatPersonaContact) => {
    if (!pendingPattern) return
    startSession(pendingPattern, {
      id: contact.characterId || contact.id,
      name: contact.remarkName,
      avatarUrl: contact.avatarUrl,
    })
    setPendingPattern(null)
    onStartSession()
  }

  const onUploadFile = async (file: File | null) => {
    if (!file) return
    setReadingFile(true)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setUploadDraft({ fileName: file.name, dataUrl })
    } catch (e) {
      showToast(e instanceof Error ? e.message : '读取图片失败')
    } finally {
      setReadingFile(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-4 pb-3 pt-1">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-[#ff7b9c]" />
          <div>
            <p className="text-[13px] leading-relaxed text-[#9a8f8a]">
              上传拼豆图纸或照片，会自动识别格数与颜色；也可以选官方图纸，邀请通讯录里的 TA 一起填色。
            </p>
          </div>
        </div>
        {activeSession?.status === 'playing' ? (
          <button
            type="button"
            onClick={onStartSession}
            className="mt-3 w-full rounded-2xl bg-[#ff7b9c] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(255,123,156,0.28)]"
          >
            继续和 {activeSession.characterName} 拼「{activeSession.pattern.name}」
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={readingFile}
          className="bc-card mb-4 flex w-full items-center justify-center gap-2 px-4 py-4 text-[14px] font-medium text-[#ff7b9c] transition-transform active:scale-[0.99]"
        >
          <ImagePlus className="size-[18px]" />
          {readingFile ? '正在读取图片…' : '上传拼豆图纸 / 照片'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onUploadFile(e.target.files?.[0] ?? null)}
        />

        {uploadedPatterns.length ? (
          <>
            <p className="mb-2 px-0.5 text-[12px] font-medium text-[#b0a6a0]">我上传的</p>
            <div className="mb-4 grid grid-cols-2 gap-3">
              {uploadedPatterns.map((pattern) => (
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  subtitle={`我上传 · ${pattern.width}×${pattern.height}`}
                  onClick={() => handlePickPattern(pattern)}
                />
              ))}
            </div>
          </>
        ) : null}

        <p className="mb-2 px-0.5 text-[12px] font-medium text-[#b0a6a0]">精选图纸</p>
        <div className="grid grid-cols-2 gap-3">
          {BUILTIN_BEAD_PATTERNS.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              subtitle={`官方 · ${pattern.width}×${pattern.height}`}
              onClick={() => handlePickPattern(pattern)}
            />
          ))}
        </div>
      </div>

      {uploadDraft ? (
        <UploadPatternModal
          fileName={uploadDraft.fileName}
          dataUrl={uploadDraft.dataUrl}
          contacts={contacts}
          onSave={(pattern) => {
            addUploadedPattern(pattern)
            showToast('图纸已保存，在「我上传的」里可再次开拼')
          }}
          onStart={(pattern, contact) => {
            addUploadedPattern(pattern)
            startSession(pattern, {
              id: contact.characterId || contact.id,
              name: contact.remarkName,
              avatarUrl: contact.avatarUrl,
            })
            setUploadDraft(null)
            onStartSession()
          }}
          onClose={() => setUploadDraft(null)}
        />
      ) : null}

      {pendingPattern ? (
        <CharacterPickerModal
          contacts={contacts}
          onPick={handlePickCharacter}
          onClose={() => setPendingPattern(null)}
        />
      ) : null}

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center">
          <span className="rounded-full bg-black/72 px-4 py-2 text-[12px] text-white">{toast}</span>
        </div>
      ) : null}
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}
