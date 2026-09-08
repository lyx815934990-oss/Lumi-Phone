import { use } from 'react'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useGLTF } from '@react-three/drei'
import { Cache } from 'three'

const loader = new GLTFLoader()
const promiseCache = new Map<string, Promise<GLTF>>()

function candidatesFor(url: string): string[] {
  const list = [url]
  try {
    const decoded = decodeURI(url)
    if (decoded !== url) list.push(decoded)
  } catch {
    /* ignore */
  }
  return list
}

async function fetchGlbBuffer(url: string): Promise<ArrayBuffer> {
  let lastStatus = 0
  for (const u of candidatesFor(url)) {
    const res = await fetch(u)
    lastStatus = res.status
    if (!res.ok) continue
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const buf = await res.arrayBuffer()
    if (buf.byteLength < 4) continue
    const magic = new TextDecoder().decode(new Uint8Array(buf, 0, 4))
    if (magic !== 'glTF') {
      // SPA/HTML 回退
      if (ct.includes('text/html') || magic.startsWith('<') || magic.startsWith('<!')) {
        throw new Error(`模型地址返回了网页而非 GLB（${u}）`)
      }
      throw new Error(`不是有效 GLB：${u}`)
    }
    return buf
  }
  throw new Error(`无法加载模型 HTTP ${lastStatus}：${url}`)
}

/** 绕过 FileLoader 双重编码：fetch 二进制再 parse，与目录/摆放共用缓存 */
export function loadFurnitureGltf(url: string): Promise<GLTF> {
  let p = promiseCache.get(url)
  if (!p) {
    p = fetchGlbBuffer(url)
      .then((buf) => loader.parseAsync(buf, ''))
      .catch((err) => {
        promiseCache.delete(url)
        throw err
      })
    promiseCache.set(url, p)
  }
  return p
}

/** Suspense 友好：组件内 use(loadFurnitureGltf(url)) */
export function useFurnitureGltf(url: string): GLTF {
  return use(loadFurnitureGltf(url))
}

export function clearFurnitureGltf(url: string): void {
  promiseCache.delete(url)
  try {
    useGLTF.clear(url)
  } catch {
    /* ignore */
  }
  try {
    Cache.remove(url)
  } catch {
    /* ignore */
  }
}

export function preloadFurnitureGltf(url: string): void {
  void loadFurnitureGltf(url)
}
