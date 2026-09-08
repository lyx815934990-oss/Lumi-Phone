import { Hand, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { HOME_AVATAR_CLIPS, HOME_AVATAR_WALK_CLIPS } from '../avatarAnimations'
import { rigKindLabel } from '../avatarMeshAnalyze'
import {
  deleteOcModel,
  getOcModelMeta,
  saveOcModel,
  setOcModelScale,
  type OcModelMeta,
} from '../ocModelStore'
import { subscribeOcModelChange } from '../ocModelEvents'
import { setWalkAvatar3dEnabled } from '../walkInput'
import { useHomeBuildStore } from '../store'
import { OcModelPreview } from './OcModelPreview'

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function skeletonStatus(meta: OcModelMeta | null): string {
  if (!meta) {
    return '未导入外形：漫游/摆放使用内置 Mixamo 人型 + 动作包。'
  }
  if (meta.rigKind === 'mixamo') {
    return '已识别 Mixamo 骨骼：可直接播内置慢走、被拎起、下落等动作。'
  }
  if (meta.rigKind === 'skinned') {
    return '已识别混元类绑骨：小窝会把内置动作自动重定向到你的骨架（拎起 / 走路 / 下落）。若姿态异常，把控制台里的骨名发我，可再补映射。'
  }
  return '未检测到骨骼：请导入混元「绑骨蒙皮」后的 FBX/GLB。'
}

type Props = {
  characterId: string
  avatar3dEnabled: boolean
  onAvatar3dChange: (enabled: boolean) => void
  onImported?: () => void
}

export function OcModelImportPanel({
  characterId,
  avatar3dEnabled,
  onAvatar3dChange,
  onImported,
}: Props) {
  const setMode = useHomeBuildStore((s) => s.setMode)
  const inputRef = useRef<HTMLInputElement>(null)
  const [meta, setMeta] = useState<OcModelMeta | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const cid = characterId.trim()
    if (!cid) {
      setMeta(null)
      return
    }
    setMeta(await getOcModelMeta(cid))
  }, [characterId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    return subscribeOcModelChange((cid) => {
      if (cid === characterId.trim()) void refresh()
    })
  }, [characterId, refresh])

  const onPickFile = () => {
    setError('')
    inputRef.current?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setBusy(true)
    setError('')
    try {
      const next = await saveOcModel(characterId, file)
      setMeta(next)
      setWalkAvatar3dEnabled(true)
      onAvatar3dChange(true)
      onImported?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async () => {
    if (!meta) return
    if (!window.confirm('确定移除已导入的 OC 模型？')) return
    setBusy(true)
    setError('')
    try {
      await deleteOcModel(characterId)
      setMeta(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const onScaleChange = async (scale: number) => {
    if (!meta) return
    setMeta((prev) => (prev ? { ...prev, scale } : prev))
    try {
      const next = await setOcModelScale(characterId, scale)
      if (next) setMeta(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : '缩放保存失败')
    }
  }

  const disabled = !characterId.trim() || busy
  const walkClipLabels = HOME_AVATAR_WALK_CLIPS.map((id) => HOME_AVATAR_CLIPS[id].label).join(' · ')

  return (
    <section className="hb-char-studio-card mb-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-medium text-[var(--hb-ink)]">OC 3D 模型</p>
        <label className="flex items-center gap-2 text-[11px] text-[var(--hb-mist)]">
          3D 动作
          <button
            type="button"
            role="switch"
            aria-checked={avatar3dEnabled}
            className={`hb-walk-switch ${avatar3dEnabled ? 'is-on' : ''}`}
            onClick={() => onAvatar3dChange(!avatar3dEnabled)}
          >
            <span className="hb-walk-switch-knob" />
          </button>
        </label>
      </div>

      <p className="mb-2 text-[10px] leading-relaxed text-[var(--hb-mist)]">
        推荐导入混元「绑骨蒙皮」FBX。小窝会自动把内置 Mixamo 动作重定向到混元骨架。
        内置动作：{walkClipLabels} · 被拎起 · 下落。
      </p>

      <div className="mb-3 rounded-lg bg-[var(--hb-paper)] px-3 py-2 text-[10px] leading-relaxed text-[var(--hb-ink)]">
        {skeletonStatus(meta)}
      </div>

      <p className="mb-2 text-[11px] font-medium text-[var(--hb-ink)]">导入 OC（推荐绑骨 FBX）</p>

      <input
        ref={inputRef}
        type="file"
        accept=".fbx,.glb,.gltf,.FBX,.GLB,application/octet-stream"
        className="hidden"
        onChange={onFileChange}
      />

      {!meta ? (
        <p className="mb-3 rounded-lg border border-dashed border-[var(--hb-hairline)] px-3 py-3 text-[10px] leading-relaxed text-[var(--hb-mist)]">
          还没有导入模型。点下方「导入 GLB / FBX」，在系统文件窗口里选你下载保存的 .fbx。
          若列表里看不到，把文件类型改成「所有文件」。
        </p>
      ) : (
        <>
          <OcModelPreview
            characterId={characterId}
            scale={meta.scale}
            onRigKind={(kind) => setMeta((prev) => (prev ? { ...prev, rigKind: kind } : prev))}
          />
          <p className="mb-1 truncate text-[11px] text-[var(--hb-ink)]">{meta.fileName}</p>
          <p className="mb-2 text-[10px] text-[var(--hb-mist)]">
            {meta.format.toUpperCase()} · {formatFileSize(meta.fileSize)} · {rigKindLabel(meta.rigKind)}
          </p>
          <label className="mb-3 block text-[11px] text-[var(--hb-mist)]">
            <span className="mb-1 flex justify-between">
              <span>预览缩放</span>
              <span className="tabular-nums text-[var(--hb-ink)]">{meta.scale.toFixed(2)}×</span>
            </span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={meta.scale}
              disabled={busy}
              onChange={(e) =>
                setMeta((prev) => (prev ? { ...prev, scale: Number.parseFloat(e.target.value) } : prev))
              }
              onPointerUp={(e) => void onScaleChange(Number.parseFloat((e.target as HTMLInputElement).value))}
              className="hb-char-studio-slider w-full"
              aria-label="OC 模型缩放"
            />
          </label>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="hb-char-studio-link inline-flex items-center gap-1"
          disabled={disabled}
          onClick={onPickFile}
        >
          <Upload className="size-3.5" />
          {meta ? '替换模型' : '导入 GLB / FBX'}
        </button>
        {meta ? (
          <button
            type="button"
            className="hb-char-studio-chip inline-flex items-center gap-1 text-red-600"
            disabled={busy}
            onClick={() => void onRemove()}
          >
            <Trash2 className="size-3.5" />
            移除
          </button>
        ) : null}
        <button
          type="button"
          className="hb-char-studio-link inline-flex items-center gap-1"
          onClick={() => setMode('ghost')}
        >
          <Hand className="size-3.5" />
          去摆放
        </button>
      </div>

      {busy ? <p className="mt-2 text-[10px] text-[var(--hb-mist)]">处理中…</p> : null}
      {error ? <p className="mt-2 text-[10px] text-red-600">{error}</p> : null}
    </section>
  )
}
