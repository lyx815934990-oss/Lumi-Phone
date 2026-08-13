/* PWA Service Worker：壳资源缓存 + Web Push 系统通知
 * 硬规则：fetch 处理器里 respondWith 的 Promise **禁止 reject**（iOS 会直接白屏：
 * FetchEvent.respondWith received an error: TypeError: Load failed）
 */

const NOTIFY_ICON_CACHE = 'lumi-notify-icons-v1'
/** 发版后 bump，强制丢掉指着旧 hash / 坏 vendor 拆包的壳缓存 */
const ASSET_CACHE = 'lumi-runtime-assets-v6'
const SHELL_CACHE = 'lumi-shell-v6'
const NOTIFY_ICON_PATH_MARKER = '/__lumi_notify_icon__/'

/** 剧本杀 / 超大视频：永不进 SW 缓存，也勿拦截为 cache-first */
const SKIP_CACHE_RE =
  /JBSGameFlow|jubensha|Jubensha|jbsChat|剧本杀|\.mp4(?:$|\?)|聊天室背景/i

function resolveDefaultIconUrl() {
  try {
    return new URL('image/主屏幕图标.png', self.registration.scope).href
  } catch {
    return 'image/主屏幕图标.png'
  }
}

function shouldSkipCache(url) {
  try {
    const u = typeof url === 'string' ? url : url.href
    return SKIP_CACHE_RE.test(u)
  } catch {
    return true
  }
}

function isHashedAsset(url) {
  return url.origin === self.location.origin && url.pathname.includes('/assets/')
}

function isCacheableAsset(url) {
  if (shouldSkipCache(url)) return false
  if (!isHashedAsset(url)) return false
  return /\.(js|css|woff2?|png|jpg|jpeg|webp|svg|gif|avif)($|\?)/i.test(url.pathname)
}

/** 导航失败时仍返回可读页，并尽量跳到 www、卸掉坏 SW */
function offlineNavigateResponse() {
  const html = `<!DOCTYPE html><html lang="zh-CN"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>Lumi Phone</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif;
background:#f2f2f4;color:#1c1c1e;padding:24px;text-align:center}
a{color:#007aff;font-weight:600}
p{line-height:1.55;font-size:15px;max-width:320px;margin:0 auto 12px}
</style></head><body>
<p>页面暂时打不开（更新后缓存或网络异常）。</p>
<p><a id="go" href="https://www.lumiphone.cn/">点这里打开 www.lumiphone.cn</a></p>
<script>
(function(){
  try{
    if('serviceWorker' in navigator){
      navigator.serviceWorker.getRegistrations().then(function(rs){
        rs.forEach(function(r){ try{ r.unregister(); }catch(e){} });
      });
    }
    if(typeof caches!=='undefined'){
      caches.keys().then(function(ks){ ks.forEach(function(k){ caches.delete(k); }); });
    }
  }catch(e){}
  var q=location.search||'';
  var h=location.hash||'';
  var target='https://www.lumiphone.cn/'+q+h;
  var a=document.getElementById('go');
  if(a) a.href=target;
  setTimeout(function(){ location.replace(target); }, 600);
})();
</script>
</body></html>`
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function emptyErrorResponse(status) {
  return new Response('', { status: status || 503, statusText: 'Unavailable' })
}

async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName)
    const hit = await cache.match(request, { ignoreSearch: false })
    if (hit) return hit
    try {
      const res = await fetch(request)
      if (res && res.ok) {
        try {
          await cache.put(request, res.clone())
        } catch {
          /* quota */
        }
      }
      return res
    } catch {
      return emptyErrorResponse(504)
    }
  } catch {
    return emptyErrorResponse(504)
  }
}

async function networkFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName)
    try {
      const res = await fetch(request)
      if (res && res.ok) {
        try {
          await cache.put(request, res.clone())
        } catch {
          /* quota */
        }
      }
      // 即使非 ok 也返回网络响应，勿 throw
      if (res) return res
    } catch {
      /* fall through to cache / offline */
    }
    const hit = await cache.match(request)
    if (hit) return hit
    if (request.mode === 'navigate') return offlineNavigateResponse()
    return emptyErrorResponse(504)
  } catch {
    if (request.mode === 'navigate') return offlineNavigateResponse()
    return emptyErrorResponse(504)
  }
}

async function putUrls(urls) {
  const cache = await caches.open(ASSET_CACHE)
  const list = Array.isArray(urls) ? urls : []
  const concurrency = 3
  let cursor = 0
  const worker = async () => {
    while (cursor < list.length) {
      const index = cursor
      cursor += 1
      const raw = list[index]
      if (typeof raw !== 'string' || !raw) continue
      if (shouldSkipCache(raw)) continue
      try {
        const url = new URL(raw, self.registration.scope)
        if (url.origin !== self.location.origin) continue
        if (!isCacheableAsset(url) && !/\.(js|css)($|\?)/i.test(url.pathname)) continue
        const req = new Request(url.href, { credentials: 'same-origin' })
        const hit = await cache.match(req)
        if (hit) continue
        const res = await fetch(req)
        if (res && res.ok) await cache.put(req, res)
      } catch {
        /* ignore single url */
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([NOTIFY_ICON_CACHE, ASSET_CACHE, SHELL_CACHE])
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }

  if (url.pathname.includes(NOTIFY_ICON_PATH_MARKER)) {
    event.respondWith(
      caches
        .open(NOTIFY_ICON_CACHE)
        .then((cache) =>
          cache.match(req).then((cached) => cached || new Response('', { status: 404, statusText: 'Not Found' })),
        )
        .catch(() => new Response('', { status: 404, statusText: 'Not Found' })),
    )
    return
  }

  if (url.origin !== self.location.origin) return
  if (shouldSkipCache(url)) return

  if (req.mode === 'navigate') {
    // 文档必须尽量拿新壳；失败时绝不能 reject respondWith
    event.respondWith(networkFirst(req, SHELL_CACHE))
    return
  }

  if (isCacheableAsset(url)) {
    event.respondWith(cacheFirst(req, ASSET_CACHE))
  }
})

/** 通知头像：页面将 data URL 写入 Cache 后，由 SW 在同源路径下读出 */
self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return
  if (data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
    return
  }
  if (data.type === 'LUMI_UNREGISTER_SW') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
        await self.registration.unregister()
      })(),
    )
    return
  }
  if (data.type === 'lumi-cache-urls') {
    event.waitUntil(putUrls(data.urls))
    return
  }
  if (data.type === 'lumi-keepalive-ping') return
  if (data.type === 'lumi-keepalive-show') {
    const title = typeof data.title === 'string' ? data.title : 'Lumi Phone'
    const body = typeof data.body === 'string' ? data.body : '后台运行中 · 等待微信新消息'
    const icon = typeof data.icon === 'string' ? data.icon : resolveDefaultIconUrl()
    void self.registration
      .showNotification(title, {
        body,
        icon,
        badge: icon,
        tag: 'lumi-keepalive-session',
        silent: true,
        data: { type: 'keepalive-session' },
      })
      .catch(() => {})
    return
  }
  if (data.type === 'lumi-keepalive-hide') {
    event.waitUntil(
      self.registration.getNotifications({ tag: 'lumi-keepalive-session' }).then((list) => {
        list.forEach((n) => n.close())
      }),
    )
    return
  }
  if (data.type !== 'lumi-show-notification') return
  const title = typeof data.title === 'string' ? data.title : 'Lumi Phone'
  const body = typeof data.body === 'string' ? data.body : '新消息'
  const tag = typeof data.tag === 'string' ? data.tag : 'lumi-local'
  const icon = typeof data.icon === 'string' && data.icon.trim() ? data.icon.trim() : resolveDefaultIconUrl()
  const badge = resolveDefaultIconUrl()
  void self.registration
    .showNotification(title, {
      body,
      icon,
      badge,
      image: icon,
      data: data.data && typeof data.data === 'object' ? data.data : {},
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
    })
    .catch(() => {})
})

self.addEventListener('push', (event) => {
  let payload = { title: 'Lumi Phone', body: '新消息', data: {} }
  try {
    if (event.data) {
      const parsed = event.data.json()
      payload = {
        title: typeof parsed.title === 'string' ? parsed.title : payload.title,
        body: typeof parsed.body === 'string' ? parsed.body : payload.body,
        data: parsed.data && typeof parsed.data === 'object' ? parsed.data : {},
      }
    }
  } catch {
    /* 使用默认文案 */
  }

  const icon = resolveDefaultIconUrl()
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon,
      badge: icon,
      data: payload.data,
      tag: 'lumi-push',
      renotify: true,
      vibrate: [200, 100, 200],
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(self.registration.scope)
      }
      return undefined
    }),
  )
})
