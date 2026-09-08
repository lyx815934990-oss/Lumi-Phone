import { Group, type AnimationClip } from 'three'
import { loadAvatarFbx } from './loadAvatarFbx'
import { loadFurnitureGltf } from './loadFurnitureGltf'
import type { OcModelFormat } from './ocModelStore'

export type LoadedOcModel = {
  group: Group
  /** GLB/FBX 内嵌动画（若导出时带骨骼动作） */
  clips: AnimationClip[]
}

/** 从 blob URL 加载用户 OC 模型 */
export async function loadOcModelGroup(url: string, format: OcModelFormat): Promise<LoadedOcModel> {
  if (format === 'glb') {
    const gltf = await loadFurnitureGltf(url)
    const root = new Group()
    root.add(gltf.scene)
    return { group: root, clips: gltf.animations ?? [] }
  }
  const fbx = await loadAvatarFbx(url)
  return { group: fbx, clips: fbx.animations ?? [] }
}

/** 从模型内嵌动画里找「拎起 / 待机」类 clip */
export function pickEmbeddedClip(clips: AnimationClip[], prefer: 'picked-up' | 'sleep' | 'idle'): AnimationClip | null {
  if (!clips.length) return null
  const lower = (s: string) => s.toLowerCase()
  const keywords: Record<typeof prefer, string[]> = {
    'picked-up': ['pick', 'lift', 'carry', '拎', 'picked'],
    sleep: ['sleep', 'rest', '睡'],
    idle: ['idle', 'stand', '待'],
  }
  for (const kw of keywords[prefer]) {
    const hit = clips.find((c) => lower(c.name).includes(kw))
    if (hit) return hit
  }
  // picked-up 不要回退到 clips[0]（常是 T-pose / idle）
  if (prefer === 'picked-up') return null
  return clips[0] ?? null
}
