import { useRef, useState } from 'react'

import type { WeChatBubbleSideFont } from '../../types'
import { Pressable } from '../../components/Pressable'
import {
  clearWeChatBubbleSideFont,
  uploadWeChatBubbleSideFont,
} from './wechatBubbleSideFonts'

const ACCEPT =
  '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/font-woff,application/font-woff2,application/x-font-ttf,application/x-font-otf'

/** 聊天气泡设置：单侧（用户 / 角色）导入自定义字体 */
export function WeChatBubbleSideFontField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: WeChatBubbleSideFont | null | undefined
  onChange: (next: WeChatBubbleSideFont | null) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const hasFont = Boolean(value?.id?.trim() && value?.family?.trim())

  const onPick = (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setErr(null)
    void (async () => {
      try {
        const prev = value
        const { meta } = await uploadWeChatBubbleSideFont(file)
        onChange(meta)
        if (prev?.id && prev.id !== meta.id) {
          await clearWeChatBubbleSideFont(prev)
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : '上传失败')
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <div className="rounded-[16px] border p-3" style={{ borderColor: 'var(--wx-border)', background: 'var(--wx-surface)' }}>
      <p className="text-[11px] font-medium tracking-[0.16em]" style={{ color: 'var(--wx-text-muted)' }}>
        {label}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--wx-text-muted)' }}>
          {hint}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <Pressable
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex-1 rounded-[14px] border px-3 py-2 text-[12px] disabled:opacity-50"
          style={{
            borderColor: 'var(--wx-border)',
            background: 'rgba(0,0,0,0.06)',
            color: 'var(--wx-text)',
          }}
        >
          {busy ? '导入中…' : hasFont ? '更换字体' : '导入字体'}
        </Pressable>
        {hasFont ? (
          <Pressable
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setErr(null)
                try {
                  await clearWeChatBubbleSideFont(value)
                  onChange(null)
                } catch (e) {
                  setErr(e instanceof Error ? e.message : '清除失败')
                } finally {
                  setBusy(false)
                }
              })()
            }}
            className="rounded-[14px] border px-3 py-2 text-[12px] disabled:opacity-50"
            style={{
              borderColor: 'var(--wx-border)',
              background: 'transparent',
              color: 'var(--wx-text)',
            }}
          >
            清除
          </Pressable>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      <div
        className="mt-2 rounded-[12px] border px-2.5 py-2 text-[11px] leading-snug"
        style={{
          borderColor: 'var(--wx-border)',
          background: 'rgba(0,0,0,0.03)',
          color: hasFont ? 'var(--wx-text)' : 'var(--wx-text-muted)',
          fontFamily: hasFont && value?.family ? `"${value.family}", var(--wx-font)` : undefined,
        }}
      >
        {hasFont ? `已导入 · ${value?.fileName || '自定义字体'}` : '支持 .ttf / .otf / .woff / .woff2'}
      </div>
      {err ? <p className="mt-1.5 text-[11px] text-red-600">{err}</p> : null}
    </div>
  )
}
