/** 微信主包单例：开屏预加载与进应用共用同一 Promise，避免「开屏说好了、点开又重下」 */

import type { ComponentType } from 'react'
import { importNamedWithRetry } from '../lazyWithRetry'

type WeChatAppProps = { onBack: () => void }
type WeChatMod = { WeChatApp: ComponentType<WeChatAppProps> }
type WeChatLazyDefault = { default: ComponentType<WeChatAppProps> }

let wechatModulePromise: Promise<WeChatMod> | null = null
let wechatDefaultPromise: Promise<WeChatLazyDefault> | null = null
let wechatReady = false

export function loadWeChatAppModule(): Promise<WeChatMod> {
  if (!wechatModulePromise) {
    wechatModulePromise = importNamedWithRetry(
      () => import('../apps/wechat/WeChatApp') as Promise<WeChatMod>,
      { retries: 5, baseDelayMs: 700 },
    ).catch((err) => {
      wechatModulePromise = null
      wechatDefaultPromise = null
      wechatReady = false
      throw err
    })
  }
  return wechatModulePromise
}

/** 供 React.lazy：缓存同一 default Promise，避免每次 .then 新建挂起 */
export function loadWeChatAppDefault(): Promise<WeChatLazyDefault> {
  if (!wechatDefaultPromise) {
    wechatDefaultPromise = loadWeChatAppModule()
      .then((m) => {
        wechatReady = true
        return { default: m.WeChatApp }
      })
      .catch((err) => {
        wechatDefaultPromise = null
        wechatReady = false
        throw err
      })
  }
  return wechatDefaultPromise
}

/** 强制丢掉失败缓存，便于开屏外层再试一轮（带 cache-bust） */
export function resetWeChatAppModuleCache(): void {
  wechatModulePromise = null
  wechatDefaultPromise = null
  wechatReady = false
}

/** 模块 import 是否已成功（开屏拉完应为 true） */
export function isWeChatAppModuleReady(): boolean {
  return wechatReady
}

export function isWeChatAppModuleCached(): boolean {
  return wechatModulePromise != null
}
