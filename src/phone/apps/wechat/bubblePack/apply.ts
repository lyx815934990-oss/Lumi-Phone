import type { ChatThemePatch } from '../ChatThemeContext'
import type { WeChatBubblePreset } from '../wechatBubblePresets'
import {
  collectWeChatAvatarChromeAssetIds,
  emptyWeChatAvatarChrome,
  type WeChatAvatarChrome,
} from '../wechatAvatarChrome'
import {
  ingestBubblePackAssets,
  loadWeChatAvatarChromeAssetDataUrl,
  listWeChatAvatarChromeAssets,
} from '../wechatAvatarChromePersist'
import type { WeChatBubbleTheme, WeChatTheme } from '../../../types'
import { ensureFrostedBubbleCss, extractBubbleBackdropBlurPx, normalizeBubblePackScopedCss } from './scopedCss'
import { ensureCssSkinSpecialRules } from './cssSkinStarter'
import {
  emptyBubbleEdgeStickers,
  normalizeBubbleEdgeStickers,
} from '../bubbleEdgeStickers'
import {
  emptyBubbleFrames,
  normalizeBubbleFrames,
} from '../bubbleFrame'
import {
  emptyAvatarStickers,
  normalizeAvatarStickers,
} from '../avatarStickers'
import {
  emptyBubbleBadges,
  normalizeBubbleBadges,
} from '../bubbleBadge'
import {
  LUMI_BUBBLE_PACK_FORMAT,
  LUMI_BUBBLE_PACK_VERSION,
  isCssSkinEngine,
  type LumiWeChatBubblePack,
} from './types'

export type ApplyBubblePackScope = 'global' | 'role'

export type ApplyBubblePackArgs = {
  pack: LumiWeChatBubblePack
  /** 当前激活气泡（用于保留已导入的单侧字体） */
  activeBubble: WeChatBubbleTheme
  bubbleScope: ApplyBubblePackScope
  bubbleRole: string
  wechatBubbleByRole: Record<string, WeChatBubbleTheme>
  setWeChatTheme: (patch: Partial<WeChatTheme>) => void
  updateChatTheme: (patch: ChatThemePatch) => void
  /** 未带 avatarChrome 字段时是否清空（默认 false，保留当前） */
  clearAvatarChromeIfAbsent?: boolean
}

/** 与 WeChatApp.applyBubblePreset 同路径，并写入 skinOverrides / scopedCss / avatarChrome */
export async function applyBubblePack(args: ApplyBubblePackArgs): Promise<void> {
  const {
    pack,
    activeBubble,
    bubbleScope,
    bubbleRole,
    wechatBubbleByRole,
    setWeChatTheme,
    updateChatTheme,
    clearAvatarChromeIfAbsent = false,
  } = args
  const preset = pack.preset

  if (pack.assets && Object.keys(pack.assets).length) {
    await ingestBubblePackAssets(pack.assets)
  }

  if (preset.chatThemePatch) {
    if (preset.id === 'wechat-app-default') {
      updateChatTheme({
        ...preset.chatThemePatch,
        inputBar: {
          ...preset.chatThemePatch.inputBar,
          layout: 'lumi',
          sendButtonColor: undefined,
        },
      })
    } else {
      updateChatTheme(preset.chatThemePatch)
    }
  }

  const cssEngine = isCssSkinEngine(pack.skinEngine)
  const scopedCss = cssEngine
    ? ensureCssSkinSpecialRules(normalizeBubblePackScopedCss(pack.scopedCss))
    : ensureFrostedBubbleCss(pack.scopedCss)
  const blurPx = cssEngine ? null : extractBubbleBackdropBlurPx(scopedCss)

  const nextBubble: WeChatBubbleTheme = {
    ...preset.bubble,
    ...(cssEngine
      ? {
          // 纯 CSS 空白画布：透明底；液态玻璃固定无尾巴
          otherBubbleBg: 'transparent',
          selfBubbleBg: 'transparent',
          showBubbleTail: false,
          showBubbleTailSelf: true,
          showBubbleTailOther: true,
          ...(typeof preset.bubble.glassBubbleStyleSelf === 'boolean'
            ? { glassBubbleStyleSelf: preset.bubble.glassBubbleStyleSelf }
            : { glassBubbleStyleSelf: true }),
          ...(typeof preset.bubble.glassBubbleStyleOther === 'boolean'
            ? { glassBubbleStyleOther: preset.bubble.glassBubbleStyleOther }
            : { glassBubbleStyleOther: true }),
        }
      : blurPx != null
        ? {
            otherBubbleBg: forceTranslucentCssColor(preset.bubble.otherBubbleBg, 0.62),
            selfBubbleBg: forceTranslucentCssColor(preset.bubble.selfBubbleBg, 0.62),
          }
        : {}),
    selfFont: activeBubble.selfFont ?? null,
    otherFont: activeBubble.otherFont ?? null,
  }
  if (cssEngine) {
    delete nextBubble.bubbleTailStyle
  }

  const skinPatch: Partial<WeChatTheme> = {
    chatSkinOverrides: pack.skinOverrides && Object.keys(pack.skinOverrides).length
      ? { ...pack.skinOverrides }
      : {},
    chatSkinScopedCss: scopedCss,
    chatSkinEngine: cssEngine ? 'css' : 'structured',
  }

  // 套用皮肤时永不覆盖用户聊天室背景图 / 默认壁纸
  const rawThemePatch = preset.wechatThemePatch ?? {}
  const { chatRoomDefaultBg: _ignoreRoomBg, ...themePatchSansRoom } = rawThemePatch
  const wechatPatch = { ...themePatchSansRoom }

  if (pack.avatarChrome) {
    skinPatch.avatarChrome = { ...emptyWeChatAvatarChrome(), ...pack.avatarChrome }
  } else if (clearAvatarChromeIfAbsent) {
    skinPatch.avatarChrome = emptyWeChatAvatarChrome()
  }

  // 始终写入：无贴纸/框的包应清空旧数据，避免残留
  skinPatch.bubbleEdgeStickers = pack.bubbleEdgeStickers
    ? normalizeBubbleEdgeStickers(pack.bubbleEdgeStickers)
    : emptyBubbleEdgeStickers()
  skinPatch.bubbleFrames = pack.bubbleFrames
    ? normalizeBubbleFrames(pack.bubbleFrames)
    : emptyBubbleFrames()
  skinPatch.avatarStickers = pack.avatarStickers
    ? normalizeAvatarStickers(pack.avatarStickers)
    : emptyAvatarStickers()
  skinPatch.bubbleBadges = pack.bubbleBadges
    ? normalizeBubbleBadges(pack.bubbleBadges)
    : emptyBubbleBadges()

  if (bubbleScope === 'global') {
    setWeChatTheme({
      bubbleGlobal: nextBubble,
      selfBubbleText: preset.selfBubbleText,
      otherBubbleText: preset.otherBubbleText,
      ...wechatPatch,
      ...skinPatch,
    })
    return
  }

  setWeChatTheme({
    bubbleByRole: { ...wechatBubbleByRole, [bubbleRole]: nextBubble },
    selfBubbleText: preset.selfBubbleText,
    otherBubbleText: preset.otherBubbleText,
    ...skinPatch,
  })
}

function forceTranslucentCssColor(color: string, alpha: number): string {
  const c = String(color ?? '').trim()
  if (!c) return `rgba(255,255,255,${alpha})`
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(c)
  if (rgba) {
    const a = rgba[4] != null ? Number(rgba[4]) : 1
    if (Number.isFinite(a) && a <= 0.88) return c
    return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${alpha})`
  }
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c)
  if (hex) {
    let h = hex[1]!
    if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('')
    if (h.length === 8) {
      const a = parseInt(h.slice(6, 8), 16) / 255
      if (a <= 0.88) {
        return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`
      }
    }
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return c
}

export type BuildBubblePackFromCurrentParams = {
  meta: LumiWeChatBubblePack['meta']
  activeBubble: WeChatBubbleTheme
  wechatTheme: WeChatTheme
  chatThemePatch?: ChatThemePatch
  /** 默认 true：把引用到的头像装饰图内嵌进包 */
  embedAssets?: boolean
}

/** 从当前主题导出气泡包（往返） */
export async function buildBubblePackFromCurrent(
  params: BuildBubblePackFromCurrentParams,
): Promise<LumiWeChatBubblePack> {
  const { meta, activeBubble, wechatTheme, chatThemePatch, embedAssets = true } = params
  const { selfFont: _sf, otherFont: _of, ...bubbleSansFonts } = activeBubble
  const preset: WeChatBubblePreset = {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    bubble: bubbleSansFonts,
    selfBubbleText: wechatTheme.selfBubbleText,
    otherBubbleText: wechatTheme.otherBubbleText,
    chatRoomDefaultBg: wechatTheme.chatRoomDefaultBg,
    wechatThemePatch: {
      chatRoomDefaultBg: wechatTheme.chatRoomDefaultBg,
      chatInputBg: wechatTheme.chatInputBg,
      chatInputBorder: wechatTheme.chatInputBorder,
    },
  }
  if (chatThemePatch) preset.chatThemePatch = chatThemePatch

  const pack: LumiWeChatBubblePack = {
    format: LUMI_BUBBLE_PACK_FORMAT,
    version: LUMI_BUBBLE_PACK_VERSION,
    meta,
    preset,
  }

  const overrides = wechatTheme.chatSkinOverrides
  if (overrides && Object.keys(overrides).length) {
    pack.skinOverrides = { ...overrides }
  }
  const css = wechatTheme.chatSkinScopedCss?.trim()
  if (css) pack.scopedCss = css
  if (wechatTheme.chatSkinEngine === 'css' || wechatTheme.chatSkinEngine === 'structured') {
    pack.skinEngine = wechatTheme.chatSkinEngine
  }

  const chrome = wechatTheme.avatarChrome
  if (chrome) {
    pack.avatarChrome = { ...emptyWeChatAvatarChrome(), ...chrome }
  }

  if (embedAssets && chrome) {
    const ids = collectWeChatAvatarChromeAssetIds(chrome)
    if (ids.length) {
      const metaList = await listWeChatAvatarChromeAssets()
      const nameById = new Map(metaList.map((m) => [m.id, m.name]))
      const assets: NonNullable<LumiWeChatBubblePack['assets']> = {}
      for (const id of ids) {
        const dataUrl = await loadWeChatAvatarChromeAssetDataUrl(id)
        if (!dataUrl) continue
        const mime = /^data:([^;]+);/i.exec(dataUrl)?.[1]?.trim() || 'image/png'
        assets[id] = {
          mime,
          dataUrl,
          ...(nameById.get(id) ? { name: nameById.get(id) } : {}),
        }
      }
      if (Object.keys(assets).length) pack.assets = assets
    }
  }

  const edge = wechatTheme.bubbleEdgeStickers
  if (edge && (edge.self.length || edge.other.length)) {
    pack.bubbleEdgeStickers = {
      self: [...edge.self],
      other: [...edge.other],
    }
  }

  const frames = wechatTheme.bubbleFrames
  if (frames && (frames.self || frames.other)) {
    pack.bubbleFrames = {
      self: frames.self,
      other: frames.other,
    }
  }

  const avatarStickers = wechatTheme.avatarStickers
  if (avatarStickers && (avatarStickers.self.length || avatarStickers.other.length)) {
    pack.avatarStickers = {
      self: [...avatarStickers.self],
      other: [...avatarStickers.other],
    }
  }

  const bubbleBadges = wechatTheme.bubbleBadges
  if (
    bubbleBadges &&
    ((bubbleBadges.self?.enabled && bubbleBadges.self.text.trim()) ||
      (bubbleBadges.other?.enabled && bubbleBadges.other.text.trim()))
  ) {
    pack.bubbleBadges = {
      self: bubbleBadges.self,
      other: bubbleBadges.other,
    }
  }

  return pack
}

export function patchWeChatAvatarChrome(
  setWeChatTheme: (patch: Partial<WeChatTheme>) => void,
  prev: WeChatAvatarChrome | null | undefined,
  patch: Partial<WeChatAvatarChrome>,
): void {
  setWeChatTheme({
    avatarChrome: {
      ...emptyWeChatAvatarChrome(),
      ...(prev ?? {}),
      ...patch,
    },
  })
}
