import { Sparkles } from 'lucide-react'
import { INK_FOIL, INK_INK, INK_KICKER, INK_LEAD, INK_LINE, INK_PAGE, INK_SECTION, INK_TITLE } from './personaEditorTabs'
import { PlaceholderAwareTextarea } from '../characterFieldPlaceholderPreview'

/** 预览用：行首「你：」「我：」「>>」视为玩家侧；其余为角色侧。注入聊天仍按原文整行发送。 */
function parseOpeningPreviewLine(raw: string): { side: 'them' | 'me'; text: string } {
  const t = raw.trim()
  const m = /^(?:你[：:]|我[：:]|>>)\s*(.*)$/u.exec(t)
  if (m) return { side: 'me', text: (m[1] ?? '').trim() || '…' }
  return { side: 'them', text: t || '…' }
}

export function FirstMessageTab({
  editorId,
  openingLines,
  onChangeOpeningLines,
  openingGenerating,
  onRequestAiGenerate,
}: {
  editorId: string
  openingLines: string
  onChangeOpeningLines: (v: string) => void
  openingGenerating: boolean
  onRequestAiGenerate: () => void
}) {
  const lines = String(openingLines ?? '')
    .split(/\r?\n/)
    .map((s) => s.trimEnd())
  const nonempty = lines.filter((s) => s.trim().length > 0)
  const bubbles =
    nonempty.length > 0
      ? nonempty.map(parseOpeningPreviewLine)
      : [{ side: 'them' as const, text: '尚未填写开场白…' }]

  return (
    <section className={`${INK_SECTION} px-3 pb-6 pt-5`}>
      <header className="mb-5 border-b border-[#D2D0CB] pb-4">
        <p className={INK_KICKER}>05 CHAT · 首句预览</p>
        <h2 className={INK_TITLE}>开场白</h2>
        <p className={INK_LEAD}>
          每行一条气泡。默认角色在左；行首写「你：」或「我：」可在预览里摆到右侧。
        </p>
      </header>

      <div
        className="mx-auto max-w-md overflow-hidden rounded-[16px] border"
        style={{ borderColor: INK_LINE, background: INK_PAGE }}
      >
        <div className="border-b px-4 py-2.5 text-center" style={{ borderColor: INK_LINE }}>
          <span className="font-mono text-[10px] tracking-[0.14em]" style={{ color: INK_FOIL }}>
            PREVIEW · 会话壳
          </span>
        </div>
        <div className="max-h-[min(52vh,420px)] overflow-y-auto px-3 py-4">
          <div className="space-y-3">
            {bubbles.map((b, i) => {
              const them = b.side === 'them'
              return (
                <div
                  key={`${i}-${b.text.slice(0, 12)}`}
                  className={`flex items-end gap-2 ${them ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div
                    className="size-7 shrink-0 border-[1.5px]"
                    style={{
                      borderColor: INK_INK,
                      borderRadius: them ? 8 : 999,
                      background: them ? '#EBEEF2' : '#E2E5EA',
                    }}
                    aria-hidden
                  />
                  <div className="max-w-[78%]">
                    <p
                      className={`mb-1 font-mono text-[9px] tracking-wide ${them ? 'text-left' : 'text-right'}`}
                      style={{ color: '#9AA0A8' }}
                    >
                      {them ? '角色' : '你'}
                    </p>
                    <div
                      className="px-3.5 py-2.5 text-[14px] leading-snug"
                      style={{
                        background: them ? '#F8F7F4' : INK_INK,
                        color: them ? INK_INK : '#F8F7F4',
                        border: them ? `1px solid ${INK_LINE}` : 'none',
                        borderRadius: them ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      }}
                    >
                      {b.text}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] tracking-[0.16em]" style={{ color: INK_FOIL }}>
          EDIT SOURCE
        </span>
        <button
          type="button"
          disabled={openingGenerating}
          onClick={onRequestAiGenerate}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-medium transition-colors disabled:opacity-50"
          style={{ borderColor: INK_LINE, background: '#F8F7F4', color: INK_INK }}
        >
          <Sparkles className="size-3.5" strokeWidth={1.75} />
          {openingGenerating ? '生成中…' : 'AI 生成'}
        </button>
      </div>

      <PlaceholderAwareTextarea
        value={openingLines ?? ''}
        onChange={onChangeOpeningLines}
        characterId={editorId}
        className="mt-3 w-full border-0 border-b bg-transparent px-1 py-3 text-[14px] leading-relaxed outline-none ring-0 transition-colors placeholder:text-[#9AA0A8] focus:border-[#5A6574]"
        style={{ borderColor: INK_LINE, color: INK_INK }}
        rows={6}
        placeholder={'每行一条。角色侧直接写正文；玩家侧可写「你：……」'}
      />
      <p className="mt-2 text-[10px] font-light" style={{ color: '#9AA0A8' }}>
        失焦时为模型预览句式；点按输入可编辑原文。
      </p>
    </section>
  )
}
