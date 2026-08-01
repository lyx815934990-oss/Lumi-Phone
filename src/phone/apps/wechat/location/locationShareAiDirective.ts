import type { WeChatLocationPayload } from '../newFriendsPersona/types'
import { createMapImageSeed } from './locationMapVisual'
import {
  buildWeChatLocationPayload,
  parseDistanceInput,
  type LocationSpoofDraft,
} from './wechatLocationUtils'
import { matchAnyDirectiveName, pickNamed, pickPositional } from '../directives/parseSpaceDirective'
import { WxCmd } from '../directives/wechatDirectiveLexicon'

export type AiLocationShareDirective = {
  name: string
  address?: string
  /** -1 = Unknown */
  distanceMeters: number
}

function readLocationShareJson(raw: string): AiLocationShareDirective | null {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>
    const name =
      (typeof j.name === 'string' ? j.name.trim() : '') ||
      (typeof j.title === 'string' ? j.title.trim() : '') ||
      (typeof j.target === 'string' ? j.target.trim() : '')
    if (!name) return null

    const addressRaw =
      (typeof j.address === 'string' ? j.address.trim() : '') ||
      (typeof j.details === 'string' ? j.details.trim() : '')
    const address = addressRaw ? addressRaw.slice(0, 160) : undefined

    if (typeof j.distance === 'string' && /^unknown$/i.test(j.distance.trim())) {
      return { name: name.slice(0, 120), address, distanceMeters: -1 }
    }

    if (typeof j.distanceMeters === 'number' && Number.isFinite(j.distanceMeters)) {
      return { name: name.slice(0, 120), address, distanceMeters: Math.max(-1, j.distanceMeters) }
    }

    if (typeof j.distanceKm === 'number' && Number.isFinite(j.distanceKm)) {
      return { name: name.slice(0, 120), address, distanceMeters: Math.max(0, j.distanceKm * 1000) }
    }

    if (typeof j.distance === 'string') {
      const parsed = parseDistanceInput(j.distance)
      if (parsed != null) {
        return { name: name.slice(0, 120), address, distanceMeters: parsed }
      }
      if (/unknown/i.test(j.distance.trim())) {
        return { name: name.slice(0, 120), address, distanceMeters: -1 }
      }
    }

    return { name: name.slice(0, 120), address, distanceMeters: 1200 }
  } catch {
    return null
  }
}

function readLocationShareSpace(line: string): AiLocationShareDirective | null {
  const parts = matchAnyDirectiveName(line, [WxCmd.location])
  if (!parts) return null
  const name =
    pickNamed(parts, ['名', 'name', 'title', 'target', '地点']) || pickPositional(parts, 0)
  if (!name) return null
  const address =
    pickNamed(parts, ['地址', 'address', 'details']) ||
    (parts.positional.length >= 2 ? pickPositional(parts, 1) : '')
  const distRaw =
    pickNamed(parts, ['距离', 'distance', 'distanceKm', 'distanceMeters']) ||
    (parts.positional.length >= 3 ? pickPositional(parts, 2) : '')
  if (!distRaw || /^unknown$/i.test(distRaw)) {
    return {
      name: name.slice(0, 120),
      address: address ? address.slice(0, 160) : undefined,
      distanceMeters: distRaw && /^unknown$/i.test(distRaw) ? -1 : 1200,
    }
  }
  if (/km$/i.test(distRaw) || /^\d+(\.\d+)?$/.test(distRaw)) {
    const n = Number(String(distRaw).replace(/km$/i, ''))
    if (Number.isFinite(n)) {
      const asKm = /km$/i.test(distRaw) || n < 50
      return {
        name: name.slice(0, 120),
        address: address ? address.slice(0, 160) : undefined,
        distanceMeters: Math.max(0, asKm ? n * 1000 : n),
      }
    }
  }
  const parsed = parseDistanceInput(distRaw)
  if (parsed != null) {
    return {
      name: name.slice(0, 120),
      address: address ? address.slice(0, 160) : undefined,
      distanceMeters: parsed,
    }
  }
  return {
    name: name.slice(0, 120),
    address: address ? address.slice(0, 160) : undefined,
    distanceMeters: 1200,
  }
}

/** 解析角色侧发位置指令行 */
export function parseLocationShareDirective(raw: string): AiLocationShareDirective | null {
  const line = String(raw ?? '').trim()
  const space = readLocationShareSpace(line)
  if (space) return space
  const m =
    /^\[LOCATION_SHARE\]\s*(\{[\s\S]*\})$/i.exec(line) ||
    /^\[LOCATION_SHARE_SEND\]\s*(\{[\s\S]*\})$/i.exec(line)
  if (!m) return null
  return readLocationShareJson(m[1]!)
}

export function isLocationShareDirectiveArtifactLine(line: string): boolean {
  const t = String(line ?? '').trim()
  if (matchAnyDirectiveName(t, [WxCmd.location])) return true
  return /^\[LOCATION_SHARE(?:_SEND)?\]\s*\{/i.test(t)
}

export function buildWeChatLocationPayloadFromAiDirective(
  directive: AiLocationShareDirective,
): WeChatLocationPayload | null {
  const draft: LocationSpoofDraft = {
    name: directive.name,
    address: directive.address ?? '',
    distanceMeters: directive.distanceMeters,
    mapImageSeed: createMapImageSeed(),
  }
  if (directive.distanceMeters < 0) {
    const base = buildWeChatLocationPayload({ ...draft, distanceMeters: 0 })
    return base ? { ...base, distance: 'Unknown', distanceMeters: undefined } : null
  }
  return buildWeChatLocationPayload(draft)
}

export const WECHAT_LOCATION_SHARE_OUTPUT_BLOCK = `
---------------------
【角色共享坐标 · 发位置卡】
---------------------
- 当你要在剧情里**主动把自己的位置（或某虚构地点）发给用户**时，除符合人设的口语外，须**单独占一行**输出机器指令（用户看不到指令行，界面会显示位置卡片）：
  - \`发位置 名=地点主标题 地址=详细地址 距离=0.5km\`
  - 也可用位置参：\`发位置 星巴克淮海店 上海市黄浦区… 0.5km\`
  - \`名\` 必填；\`地址\` 选填；\`距离\` 如 \`0.5km\` / \`500\` / \`Unknown\`。
- **不要**单独一行只写「位置 …」预览文案——**不会**生成位置卡；须用 \`发位置\` 整行。
- 距离语义与用户发给你的位置卡相同：用户界面显示的 **TARGET DISTANCE** 表示用户与该地点的相对距离（覆写坐标，非真实 GPS）。
- 可先口语铺垫（「我在哪哪哪等你」），再单独一行指令；也可指令与口语分条发送。
`.trim()
