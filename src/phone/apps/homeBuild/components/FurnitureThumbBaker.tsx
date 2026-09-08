import { Component, Suspense, useLayoutEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clearFurnitureGltf, useFurnitureGltf } from '../loadFurnitureGltf'
import { applyAutoUnitScale } from '../modelUnitScale'
import { useHomeBuildStore } from '../store'
import { finishFurnitureThumb, takeNextThumbUrl } from '../furnitureThumbRenderer'

const SIZE = 128

type Engine = {
  rt: THREE.WebGLRenderTarget
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  readBuf: Uint8Array
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

/**
 * 安全缩略图：与摆放同一套 fetch+parse 加载，渲染到 FBO。
 * 绝不 dispose 共享贴图/几何。
 */
export function FurnitureThumbBaker() {
  const catalogOpen = useHomeBuildStore((s) => s.catalogOpen)
  const mode = useHomeBuildStore((s) => s.mode)
  const [url, setUrl] = useState<string | null>(null)
  const engineRef = useRef<Engine | null>(null)

  useLayoutEffect(() => {
    const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    })
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#2c2c30')
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 80)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6a70, 1.15))
    const key = new THREE.DirectionalLight(0xffffff, 1.2)
    key.position.set(2.4, 4.2, 2.6)
    scene.add(key)

    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      rt.dispose()
      return
    }
    engineRef.current = { rt, scene, camera, readBuf: new Uint8Array(SIZE * SIZE * 4), canvas, ctx }
    return () => {
      rt.dispose()
      engineRef.current = null
    }
  }, [])

  useFrame(() => {
    if (url) return
    if (mode !== 'ghost' || !catalogOpen) return
    const next = takeNextThumbUrl()
    if (next) setUrl(next)
  })

  if (!url) return null

  return (
    <ThumbJobErrorBoundary key={url} url={url} onDone={() => setUrl(null)}>
      <Suspense fallback={null}>
        <ThumbBakeJob
          url={url}
          engineRef={engineRef}
          onDone={(data) => {
            finishFurnitureThumb(url, data)
            setUrl(null)
          }}
        />
      </Suspense>
    </ThumbJobErrorBoundary>
  )
}

function ThumbBakeJob({
  url,
  engineRef,
  onDone,
}: {
  url: string
  engineRef: React.RefObject<Engine | null>
  onDone: (data: string | null) => void
}) {
  const gltf = useFurnitureGltf(url)
  const { gl } = useThree()
  const once = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useLayoutEffect(() => {
    if (once.current) return
    once.current = true
    const engine = engineRef.current
    if (!engine) {
      onDoneRef.current(null)
      return
    }

    const clone = gltf.scene.clone(true)
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((m) => m.clone())
      else if (mesh.material) mesh.material = mesh.material.clone()
    })
    applyAutoUnitScale(clone)

    const prevRt = gl.getRenderTarget()
    const prevClear = new THREE.Color()
    gl.getClearColor(prevClear)
    const prevAlpha = gl.getClearAlpha()
    const prevAutoClear = gl.autoClear
    const prevXr = gl.xr.enabled
    const prevViewport = new THREE.Vector4()
    gl.getViewport(prevViewport)
    const prevScissor = new THREE.Vector4()
    gl.getScissor(prevScissor)
    const prevScissorTest = gl.getScissorTest()

    try {
      engine.scene.add(clone)
      fitCamera(engine.camera, clone)

      gl.xr.enabled = false
      gl.autoClear = true
      gl.setScissorTest(false)
      gl.setRenderTarget(engine.rt)
      gl.setViewport(0, 0, SIZE, SIZE)
      gl.setClearColor('#2c2c30', 1)
      gl.clear()
      gl.render(engine.scene, engine.camera)
      gl.readRenderTargetPixels(engine.rt, 0, 0, SIZE, SIZE, engine.readBuf)

      const { ctx, canvas, readBuf } = engine
      const img = ctx.createImageData(SIZE, SIZE)
      for (let y = 0; y < SIZE; y++) {
        const srcRow = (SIZE - 1 - y) * SIZE * 4
        img.data.set(readBuf.subarray(srcRow, srcRow + SIZE * 4), y * SIZE * 4)
      }
      ctx.putImageData(img, 0, 0)
      onDoneRef.current(canvas.toDataURL('image/png'))
    } catch {
      onDoneRef.current(null)
    } finally {
      engine.scene.remove(clone)
      gl.setRenderTarget(prevRt)
      gl.setClearColor(prevClear, prevAlpha)
      gl.autoClear = prevAutoClear
      gl.xr.enabled = prevXr
      gl.setViewport(prevViewport)
      gl.setScissor(prevScissor)
      gl.setScissorTest(prevScissorTest)
    }
  }, [gltf.scene, gl, engineRef, url])

  return null
}

class ThumbJobErrorBoundary extends Component<
  { url: string; onDone: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[HomeBuild] thumb bake failed', this.props.url, error, info.componentStack)
    clearFurnitureGltf(this.props.url)
    finishFurnitureThumb(this.props.url, null)
    this.props.onDone()
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

function fitCamera(camera: THREE.PerspectiveCamera, root: THREE.Object3D) {
  root.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  root.position.sub(center)
  const maxDim = Math.max(size.x, size.y, size.z, 0.05)
  const dist = maxDim * 1.9
  camera.position.set(dist * 0.75, dist * 0.55, dist * 0.98)
  camera.near = Math.max(0.01, dist / 100)
  camera.far = dist * 24
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
}
