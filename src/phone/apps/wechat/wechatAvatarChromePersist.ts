import { personaDb } from './newFriendsPersona/idb'
import type { WeChatAvatarChromeAssetMeta } from './wechatAvatarChrome'

const ASSET_KV_PREFIX = 'wechat-avatar-chrome-asset-v1::'
const INDEX_KV_KEY = 'wechat-avatar-chrome-assets-index-v1'

export function wechatAvatarChromeAssetKvKey(assetId: string): string {
  return `${ASSET_KV_PREFIX}${assetId.trim()}`
}

function newAssetId(): string {
  return `avc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

async function readIndex(): Promise<WeChatAvatarChromeAssetMeta[]> {
  try {
    const raw = await personaDb.getPhoneKv(INDEX_KV_KEY)
    if (!raw || typeof raw !== 'object') return []
    const assets = (raw as { assets?: unknown }).assets
    if (!Array.isArray(assets)) return []
    const out: WeChatAvatarChromeAssetMeta[] = []
    for (const a of assets) {
      if (!a || typeof a !== 'object') continue
      const r = a as Partial<WeChatAvatarChromeAssetMeta>
      const id = typeof r.id === 'string' ? r.id.trim() : ''
      if (!id) continue
      out.push({
        id,
        name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : id,
        mime: typeof r.mime === 'string' && r.mime.trim() ? r.mime.trim() : 'image/png',
        updatedAt: typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt) ? r.updatedAt : Date.now(),
      })
    }
    return out
  } catch {
    return []
  }
}

async function writeIndex(assets: WeChatAvatarChromeAssetMeta[]): Promise<void> {
  await personaDb.setPhoneKv(INDEX_KV_KEY, { assets })
}

export async function listWeChatAvatarChromeAssets(): Promise<WeChatAvatarChromeAssetMeta[]> {
  const list = await readIndex()
  return list.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function persistWeChatAvatarChromeAsset(params: {
  dataUrl: string
  name?: string
  mime?: string
  assetId?: string
}): Promise<WeChatAvatarChromeAssetMeta> {
  const dataUrl = params.dataUrl.trim()
  if (!dataUrl) throw new Error('图片内容为空')
  const id = (params.assetId?.trim() || newAssetId()).trim()
  const mimeFromData =
    /^data:([^;]+);/i.exec(dataUrl)?.[1]?.trim() ||
    (params.mime?.trim() || 'image/png')
  const meta: WeChatAvatarChromeAssetMeta = {
    id,
    name: (params.name?.trim() || id).slice(0, 64),
    mime: mimeFromData,
    updatedAt: Date.now(),
  }
  await personaDb.setPhoneKv(wechatAvatarChromeAssetKvKey(id), dataUrl)
  const index = await readIndex()
  const next = index.filter((a) => a.id !== id)
  next.unshift(meta)
  await writeIndex(next)
  return meta
}

export async function deleteWeChatAvatarChromeAsset(assetId: string): Promise<void> {
  const id = assetId.trim()
  if (!id) return
  try {
    await personaDb.deletePhoneKv(wechatAvatarChromeAssetKvKey(id))
  } catch {
    /* ignore */
  }
  const index = await readIndex()
  await writeIndex(index.filter((a) => a.id !== id))
}

export async function loadWeChatAvatarChromeAssetDataUrl(assetId: string): Promise<string | null> {
  const id = assetId.trim()
  if (!id) return null
  try {
    const stored = await personaDb.getPhoneKv(wechatAvatarChromeAssetKvKey(id))
    if (typeof stored === 'string' && stored.trim()) return stored.trim()
  } catch {
    /* ignore */
  }
  return null
}

/** 批量解析 assetId → dataUrl（缺省跳过） */
export async function resolveWeChatAvatarChromeAssetUrls(
  ids: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const unique = [...new Set(ids.map((x) => x.trim()).filter(Boolean))]
  await Promise.all(
    unique.map(async (id) => {
      const url = await loadWeChatAvatarChromeAssetDataUrl(id)
      if (url) out[id] = url
    }),
  )
  return out
}

export type LumiBubblePackEmbeddedAsset = {
  mime: string
  dataUrl: string
  name?: string
}

/** 把气泡包内嵌 assets 写入侧存，返回 id → 已写入 meta */
export async function ingestBubblePackAssets(
  assets: Record<string, LumiBubblePackEmbeddedAsset> | undefined,
): Promise<void> {
  if (!assets) return
  for (const [id, asset] of Object.entries(assets)) {
    const assetId = id.trim()
    const dataUrl = typeof asset?.dataUrl === 'string' ? asset.dataUrl.trim() : ''
    if (!assetId || !dataUrl) continue
    await persistWeChatAvatarChromeAsset({
      assetId,
      dataUrl,
      mime: asset.mime,
      name: asset.name || assetId,
    })
  }
}
