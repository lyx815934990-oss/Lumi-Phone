/**
 * 用户自定义「续写方向」chip（全局，所有角色共用）。
 */

import type { ContinueProbeCategoryId, ContinueProbePreset } from './datingContinueProbePresets'

export type UserContinueProbe = {
  id: string
  label: string
  probe: string
  category?: ContinueProbeCategoryId
}

const LS_KEY = 'wechat-dating-continue-probes:custom'
const MAX_CUSTOM = 24

function uid(): string {
  return `ucp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function loadUserContinueProbes(): UserContinueProbe[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: UserContinueProbe[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      const id = String(o.id ?? '').trim()
      const label = String(o.label ?? '').trim()
      const probe = String(o.probe ?? '').trim()
      if (!id || !label || !probe) continue
      const cat = o.category
      out.push({
        id,
        label: label.slice(0, 12),
        probe: probe.slice(0, 160),
        category:
          cat === 'relation' ||
          cat === 'event' ||
          cat === 'scene' ||
          cat === 'intimate' ||
          cat === 'nsfw_foreplay' ||
          cat === 'nsfw_act' ||
          cat === 'nsfw_after' ||
          cat === 'mood' ||
          cat === 'atmosphere' ||
          cat === 'daily'
            ? cat
            : cat === 'nsfw'
              ? 'nsfw_foreplay'
              : undefined,
      })
    }
    return out.slice(0, MAX_CUSTOM)
  } catch {
    return []
  }
}

export function saveUserContinueProbes(list: UserContinueProbe[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, MAX_CUSTOM)))
  } catch {
    // ignore quota
  }
}

export function addUserContinueProbe(input: {
  label: string
  probe: string
  category?: ContinueProbeCategoryId
}): UserContinueProbe | null {
  const label = String(input.label ?? '').trim().slice(0, 12)
  const probe = String(input.probe ?? '').trim().slice(0, 160)
  if (!label || !probe) return null
  const list = loadUserContinueProbes()
  if (list.length >= MAX_CUSTOM) return null
  const item: UserContinueProbe = {
    id: uid(),
    label,
    probe,
    category: input.category,
  }
  saveUserContinueProbes([...list, item])
  return item
}

export function removeUserContinueProbe(id: string): void {
  const tid = String(id ?? '').trim()
  if (!tid) return
  saveUserContinueProbes(loadUserContinueProbes().filter((x) => x.id !== tid))
}

export function userProbeToPreset(u: UserContinueProbe): ContinueProbePreset {
  return {
    id: `custom:${u.id}`,
    category: u.category ?? 'relation',
    label: u.label,
    hint: u.probe.length > 28 ? `${u.probe.slice(0, 28)}…` : u.probe,
    probe: u.probe,
  }
}
