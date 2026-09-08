import { useEffect, useMemo, useState } from 'react'
import type { WeChatPersonaContact } from '../../types'
import { applyWalkSettings } from './walkInput'
import { loadWalkSettings } from './walkSettings'
import { FloorPlanCanvas } from './components/FloorPlanCanvas'
import { CharacterStudioPage } from './components/CharacterStudioPage'
import { Scene3D } from './components/Scene3D'
import { TopToolbar } from './components/TopToolbar'
import { useHomeBuildStore } from './store'
import type { HomeBuildMode } from './types'
import './homeBuild.css'

export type HomeBuildAppInnerProps = {
  onBack: () => void
  className?: string
  personaContacts?: WeChatPersonaContact[]
  wechatAccountId?: string
}

export function HomeBuildAppInner({
  onBack,
  className = '',
  personaContacts = [],
}: HomeBuildAppInnerProps) {
  const mode = useHomeBuildStore((s) => s.mode)
  const setMode = useHomeBuildStore((s) => s.setMode)
  const setCharacter = useHomeBuildStore((s) => s.setCharacter)
  const save = useHomeBuildStore((s) => s.save)
  const resetDraft = useHomeBuildStore((s) => s.resetDraft)
  const characterId = useHomeBuildStore((s) => s.characterId)

  const [toast, setToast] = useState('')
  const [canvasReady, setCanvasReady] = useState(false)

  const contacts = useMemo(() => {
    if (personaContacts.length) return personaContacts
    return [{ id: 'default', characterId: 'default', remarkName: '我的小窝' }]
  }, [personaContacts])

  const activeContact =
    contacts.find((c) => c.characterId === characterId) ?? contacts[0]

  useEffect(() => {
    applyWalkSettings(loadWalkSettings())
  }, [])

  useEffect(() => {
    const first = contacts.find((c) => c.characterId?.trim())
    if (!characterId && first) {
      setCharacter(first.characterId)
    }
  }, [characterId, contacts, setCharacter])

  useEffect(() => {
    const id = requestAnimationFrame(() => setCanvasReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2000)
  }

  const handleSave = () => {
    save()
    showToast('已保存到 TA 的小窝')
  }

  const handleModeChange = (next: HomeBuildMode) => {
    setMode(next)
    if (next === 'ghost') showToast('摆放模式 · 可拎起 OC 放置，也可打开家具目录')
    if (next === 'avatar') showToast('人物 · 调立绘抠图，以后可换 3D')
    if (next === 'walk') showToast('室内漫游 · 可沿楼梯上下楼')
  }

  const handleReset = () => {
    if (!characterId) return
    if (!window.confirm('确定重置当前角色的小窝？此操作不可撤销。')) return
    resetDraft()
    showToast('已重置当前小窝')
  }

  return (
    <div
      className={`hb-root pointer-events-auto relative flex h-full min-h-0 flex-col ${className}`}
      data-app-id="homeBuild"
    >
      <TopToolbar
        onBack={onBack}
        onSave={handleSave}
        onReset={handleReset}
        toast={toast}
        onModeChange={handleModeChange}
      />

      {contacts.length > 1 ? (
        <div className="hb-char-strip pointer-events-auto relative z-40 flex shrink-0 gap-2 overflow-x-auto px-3 py-2">
          {contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              className="hb-char-chip shrink-0"
              data-active={activeContact?.characterId === c.characterId}
              onClick={() => setCharacter(c.characterId)}
            >
              {c.remarkName}
            </button>
          ))}
        </div>
      ) : (
        <div className="hb-char-strip pointer-events-auto relative z-40 shrink-0 px-3 py-2">
          <span className="text-[12px] font-medium" style={{ color: 'var(--hb-mist)' }}>
            {activeContact?.remarkName ?? '我的小窝'}
          </span>
        </div>
      )}

      {!canvasReady ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--hb-mist)]">
          加载中…
        </div>
      ) : mode === 'floorplan' ? (
        <FloorPlanCanvas />
      ) : mode === 'avatar' ? (
        <CharacterStudioPage />
      ) : (
        <Scene3D mode={mode} />
      )}
    </div>
  )
}
