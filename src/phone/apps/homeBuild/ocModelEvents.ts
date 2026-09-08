type OcChangeListener = (characterId: string) => void

const modelListeners = new Set<OcChangeListener>()
const jointListeners = new Set<OcChangeListener>()

export function subscribeOcModelChange(listener: OcChangeListener): () => void {
  modelListeners.add(listener)
  return () => modelListeners.delete(listener)
}

export function emitOcModelChange(characterId: string): void {
  const cid = characterId.trim()
  if (!cid) return
  for (const listener of modelListeners) listener(cid)
}

/** 仅关节定位变更（不要触发编辑器整模重新加载） */
export function subscribeOcJointChange(listener: OcChangeListener): () => void {
  jointListeners.add(listener)
  return () => jointListeners.delete(listener)
}

export function emitOcJointChange(characterId: string): void {
  const cid = characterId.trim()
  if (!cid) return
  for (const listener of jointListeners) listener(cid)
}
