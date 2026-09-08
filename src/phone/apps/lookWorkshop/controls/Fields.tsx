import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ImageCropperModal } from '../../../components/ImageCropperModal'
import { readAndCompressInputBtnIcon } from '../iconCompress'
import {
  lookWorkshopFontStack,
  readLookWorkshopFontFile,
} from '../headerFonts'
import type { LookWorkshopCustomFont } from '../types'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      if (src) resolve(src)
      else reject(new Error('empty'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader'))
    reader.readAsDataURL(file)
  })
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-medium tracking-wide text-neutral-600">{children}</span>
      {hint ? <span className="text-[10px] tabular-nums text-neutral-400">{hint}</span> : null}
    </div>
  )
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="lw-field block">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#191919'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-black/8 bg-white p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="lw-input min-w-0 flex-1"
        />
      </div>
    </label>
  )
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="lw-field block">
      <FieldLabel hint={`${value}${unit}`}>
        {label}
      </FieldLabel>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lw-range w-full"
      />
    </label>
  )
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      className="lw-field flex w-full items-center justify-between gap-3 text-left"
      onClick={() => onChange(!checked)}
    >
      <span className="text-[11px] font-medium text-neutral-600">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-neutral-800' : 'bg-neutral-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="lw-field block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="lw-input w-full"
      />
    </label>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <label className="lw-field block">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </label>
  )
}

/** 上传小图标（data URL）；清空后恢复默认矢量 */
export function ImageUploadField({
  label,
  value,
  onChange,
  hint = 'PNG / WebP / JPG',
  previewRadiusPx = 8,
}: {
  label: string
  value: string
  onChange: (dataUrl: string) => void
  hint?: string
  /** 缩略图圆角预览（与输入栏图标圆角联动） */
  previewRadiusPx?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onPick = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const dataUrl = await readAndCompressInputBtnIcon(file)
      onChange(dataUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="lw-field block">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-black/8 bg-neutral-50"
          style={{ borderRadius: Math.max(0, previewRadiusPx) }}
          aria-hidden
        >
          {value.trim() ? (
            <img
              src={value}
              alt=""
              className="h-7 w-7 object-cover"
              style={{ borderRadius: Math.max(0, Math.min(previewRadiusPx, 14)) }}
              draggable={false}
            />
          ) : (
            <span className="text-[9px] text-neutral-400">默认</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {busy ? '处理中…' : value.trim() ? '更换' : '上传'}
        </button>
        {value.trim() ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600"
          >
            清除
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-[10px] text-red-500">{error}</p> : null}
    </div>
  )
}

/** 上传并裁剪横幅背景图（data URL）；清空后仅用底色 */
export function BgImageCropField({
  label,
  value,
  onChange,
  aspect,
  title = '裁剪背景图',
  hint = '上传后按区域比例裁剪',
  maxSide = 900,
}: {
  label: string
  value: string
  onChange: (dataUrl: string) => void
  /** 宽/高 */
  aspect: number
  title?: string
  hint?: string
  maxSide?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState('')
  const [error, setError] = useState('')
  const shell =
    typeof document !== 'undefined'
      ? document.querySelector('[data-phone-shell="true"]')
      : null

  return (
    <div className="lw-field block">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      {value.trim() ? (
        <div className="mb-2 overflow-hidden rounded-lg border border-black/8 bg-neutral-50">
          <img
            src={value}
            alt=""
            className="h-14 w-full object-cover"
            draggable={false}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file || !file.type.startsWith('image/')) return
            setError('')
            void readFileAsDataUrl(file)
              .then((src) => setCropSrc(src))
              .catch(() => setError('读取图片失败'))
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-white"
        >
          {value.trim() ? '更换并裁剪' : '上传并裁剪'}
        </button>
        {value.trim() ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600"
          >
            清除
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[10px] text-neutral-400">有图时覆盖底色显示；清除后仍用下方背景色</p>
      {error ? <p className="mt-1 text-[10px] text-red-500">{error}</p> : null}

      {shell && cropSrc
        ? createPortal(
            <div
              className="absolute inset-0 z-[530]"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ImageCropperModal
                open
                imageSrc={cropSrc}
                title={title}
                aspect={aspect}
                maxSide={maxSide}
                objectFit="horizontal-cover"
                onCancel={() => setCropSrc('')}
                onConfirm={(dataUrl) => {
                  onChange(dataUrl)
                  setCropSrc('')
                }}
              />
            </div>,
            shell,
          )
        : null}
    </div>
  )
}

/** 上传字体文件；清空后恢复系统默认 */
export function FontUploadField({
  label,
  value,
  onChange,
  hint = '.ttf / .otf / .woff / .woff2（≤16MB）',
  previewText = '字体预览 Aa 你好',
  emptyText = '使用系统默认字体',
}: {
  label: string
  value: LookWorkshopCustomFont | null
  onChange: (next: LookWorkshopCustomFont | null) => void
  hint?: string
  previewText?: string
  /** 未上传时的说明文案 */
  emptyText?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onPick = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const font = await readLookWorkshopFontFile(file)
      onChange(font)
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const stack = lookWorkshopFontStack(value)

  return (
    <div className="lw-field block">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/font-woff,application/font-woff2,application/x-font-ttf,application/x-font-otf"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {busy ? '导入中…' : value?.dataUrl ? '更换字体' : '上传字体'}
        </button>
        {value?.dataUrl ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600"
          >
            清除
          </button>
        ) : null}
      </div>
      <p
        className="mt-1.5 truncate text-[12px] text-neutral-700"
        style={stack ? { fontFamily: stack } : undefined}
        title={value?.fileName || undefined}
      >
        {value?.dataUrl ? value.fileName || previewText : emptyText}
      </p>
      {value?.dataUrl ? (
        <p className="mt-0.5 text-[11px] text-neutral-500" style={stack ? { fontFamily: stack } : undefined}>
          {previewText}
        </p>
      ) : null}
      {error ? <p className="mt-1 text-[10px] text-red-500">{error}</p> : null}
    </div>
  )
}

export function Accordion({
  id,
  title,
  open,
  onToggle,
  children,
  subtitle,
}: {
  id: string
  title: string
  open: boolean
  onToggle: (id: string) => void
  children: ReactNode
  /** 折叠条下方一行说明 */
  subtitle?: string
}) {
  return (
    <section className="lw-acc overflow-hidden rounded-[14px] border border-black/6 bg-white/80">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-[12px] font-semibold tracking-wide text-neutral-800">
            {title}
          </span>
          {subtitle ? (
            <span className="mt-0.5 block text-[10px] font-normal text-neutral-400">
              {subtitle}
            </span>
          ) : null}
        </span>
        <span
          className={`shrink-0 text-[12px] text-neutral-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-t border-black/5 px-3 py-3">{children}</div>
        </div>
      </div>
    </section>
  )
}

/** 面板大类分隔：基础 / 气泡 / 聊天框 */
export function PanelCategory({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-0.5 pt-3 first:pt-1">
      <span className="shrink-0 text-[10px] font-semibold tracking-[0.12em] text-neutral-400">
        {label}
      </span>
      <div className="h-px min-w-0 flex-1 bg-neutral-200/90" aria-hidden />
    </div>
  )
}

/** 手风琴内的参数小组：标题 + 可选说明，视觉上一组 */
export function FieldGroup({
  title,
  hint,
  tone = 'default',
  action,
  children,
}: {
  title: string
  hint?: string
  tone?: 'default' | 'accent'
  action?: ReactNode
  children: ReactNode
}) {
  const shell =
    tone === 'accent'
      ? 'border-sky-200/80 bg-gradient-to-b from-sky-50/90 to-white'
      : 'border-black/[0.07] bg-neutral-50/80'
  const titleCls = tone === 'accent' ? 'text-sky-900' : 'text-neutral-800'
  const hintCls = tone === 'accent' ? 'text-sky-800/70' : 'text-neutral-400'
  return (
    <div className={`rounded-xl border p-2.5 ${shell}`}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[12px] font-semibold ${titleCls}`}>{title}</p>
          {hint ? (
            <p className={`mt-0.5 text-[10px] leading-relaxed ${hintCls}`}>{hint}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}
