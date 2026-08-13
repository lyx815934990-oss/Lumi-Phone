/** 微信主包单例：开屏预加载与进应用共用同一 Promise，避免「开屏说好了、点开又重下」 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WeChatMod = { WeChatApp: any }

let wechatModulePromise: Promise<WeChatMod> | null = null

export function loadWeChatAppModule(): Promise<WeChatMod> {
  if (!wechatModulePromise) {
    wechatModulePromise = (import('../apps/wechat/WeChatApp') as Promise<WeChatMod>).catch((err) => {
      // 失败后允许重试，勿把 rejected Promise 永久钉死
      wechatModulePromise = null
      throw err
    })
  }
  return wechatModulePromise
}

/** 供 React.lazy：始终走同一模块 Promise */
export function loadWeChatAppDefault() {
  return loadWeChatAppModule().then((m) => ({ default: m.WeChatApp }))
}

export function isWeChatAppModuleCached(): boolean {
  return wechatModulePromise != null
}
