import {
  AmbientLight, Box3, BufferAttribute, BufferGeometry, CanvasTexture, Color,
  DirectionalLight, DoubleSide, Group, Line, LineBasicMaterial, LineDashedMaterial,
  LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera,
  PlaneGeometry, RingGeometry, Scene, Sphere, Sprite, SpriteMaterial, Vector3, WebGLRenderer,
  type Material, type Object3D,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Design } from '../sim/design'
import { cockedPose } from '../sim/mechanism'
import type { ShotResult } from '../sim/shot'
import { theme } from '../theme'
import { applyMechanismState, buildTrebuchetModel, type TrebuchetModel } from './trebuchetModel'
import { applyShotAtTime } from './playback'

export interface SceneApi {
  setDesign(design: Design): void
  setPrediction(shot: ShotResult | null): void
  setTargets(targets: { distance: number; lateral: number; radius: number }[]): void
  /** Rejects with AbortError when reset, replaced, or disposed before landing. */
  playShot(shot: ShotResult, opts?: { timeScale?: number }): Promise<void>
  reset(): void
  dispose(): void
}

function disposeObject(root: Object3D): void {
  const materials = new Set<Material>()
  root.traverse(object => {
    const drawable = object as Mesh
    drawable.geometry?.dispose()
    if (drawable.material) {
      for (const material of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) materials.add(material)
    }
  })
  for (const material of materials) {
    const map = (material as MeshBasicMaterial).map
    map?.dispose()
    material.dispose()
  }
  root.removeFromParent()
}

function clear(group: Group): void {
  for (const child of [...group.children]) disposeObject(child)
}

function label(text: string): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const context = canvas.getContext('2d')!
  context.fillStyle = theme.text
  context.font = '32px sans-serif'
  context.textAlign = 'center'
  context.fillText(text, 128, 44)
  const sprite = new Sprite(new SpriteMaterial({ map: new CanvasTexture(canvas), depthTest: false }))
  sprite.scale.set(8, 2, 1)
  return sprite
}

export function createScene(canvas: HTMLCanvasElement): SceneApi {
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  const world = new Scene()
  world.background = new Color(theme.background)
  const camera = new PerspectiveCamera(45, 1, 0.01, 10000)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2 - 0.01
  world.add(new AmbientLight(theme.text, 1.8))
  const sunlight = new DirectionalLight(theme.text, 3)
  sunlight.position.set(-10, 25, 15)
  world.add(sunlight)
  const ground = new Group(), targets = new Group(), paths = new Group()
  world.add(ground, targets, paths)
  let model: TrebuchetModel | undefined
  let design: Design | undefined
  let prediction: ShotResult | null = null
  let disposed = false
  let width = 0, height = 0, pixelRatio = 0
  let lastTime: number | undefined
  let playback: {
    shot: ShotResult; elapsed: number; timeScale: number
    resolve: () => void; reject: (reason: Error) => void
    path: Line; positions: Float32Array; tip: number
  } | undefined

  function assertActive(): void {
    if (disposed) throw new Error('Scene has been disposed')
  }

  function cancel(): void {
    const active = playback
    playback = undefined
    active?.reject(new DOMException('Shot playback interrupted', 'AbortError'))
  }

  function frameCamera(): void {
    const box = model ? new Box3().setFromObject(model.group) : new Box3(new Vector3(-2, 0, -2), new Vector3(2, 4, 2))
    for (const point of prediction?.flight?.points ?? []) box.expandByPoint(new Vector3(...point.position))
    const sphere = box.getBoundingSphere(new Sphere())
    const halfFov = Math.atan(Math.tan(camera.fov * Math.PI / 360) * Math.min(1, camera.aspect))
    const distance = Math.max(2, sphere.radius) / Math.sin(halfFov) * 1.15
    controls.target.copy(sphere.center)
    camera.position.copy(sphere.center).add(new Vector3(-0.35, 0.48, 1).normalize().multiplyScalar(distance))
    camera.far = Math.max(1000, distance * 5)
    camera.updateProjectionMatrix()
    controls.minDistance = Math.max(0.1, sphere.radius * 0.02)
    controls.maxDistance = Math.max(100, distance * 3)
    controls.update()
  }

  function rebuildGround(): void {
    clear(ground)
    const landing = prediction?.flight?.landing.position
    const extent = Math.max(300, Math.ceil((landing?.[0] ?? 0) / 50) * 50 + 50,
      ...targets.children.map(target => target.position.x + 50))
    const lateral = Math.max(50, Math.abs(landing?.[2] ?? 0) + 20,
      ...targets.children.map(target => Math.abs(target.position.z) + 20))
    const plane = new Mesh(new PlaneGeometry(extent + 50, lateral * 2), new MeshStandardMaterial({ color: theme.elevated, roughness: 1 }))
    plane.rotation.x = -Math.PI / 2
    plane.position.set((extent - 50) / 2, -0.08, 0)
    ground.add(plane)
    const vertices: number[] = [0, 0, 0, extent, 0, 0]
    for (let x = 0; x <= extent; x += 10) {
      const length = x % 50 === 0 ? 8 : 3
      vertices.push(x, 0, -length, x, 0, length)
      if (x % 50 === 0) {
        const mark = label(`${x} m`)
        mark.position.set(x, 0.3, 10)
        ground.add(mark)
      }
    }
    ground.add(new LineSegments(new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3)),
      new LineBasicMaterial({ color: theme.border })))
  }

  function rebuildPrediction(): void {
    const points = prediction?.flight?.points
    if (!points?.length) return
    const geometry = new BufferGeometry().setFromPoints(points.map(point => new Vector3(...point.position)))
    const arc = new Line(geometry, new LineDashedMaterial({ color: theme.primary, dashSize: 0.4, gapSize: 0.8 }))
    arc.computeLineDistances()
    paths.add(arc)
  }

  function resize(): void {
    if (disposed) return
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight)
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    if (w === width && h === height && ratio === pixelRatio) return
    width = w; height = h; pixelRatio = ratio
    renderer.setPixelRatio(ratio)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    frameCamera()
  }

  function tick(now: number): void {
    resize()
    const dt = lastTime === undefined ? 0 : (now - lastTime) / 1000
    lastTime = now
    if (playback && model) {
      const active = playback, flight = active.shot.flight!
      const releaseTime = active.shot.mechanism.release!.t
      const end = releaseTime + flight.landing.t
      active.elapsed = Math.min(end, active.elapsed + dt * active.timeScale)
      const index = applyShotAtTime(model, active.shot, active.elapsed)
      if (index >= 0) {
        // Preserve the supplied samples and extend the path to the interpolated stone.
        if (active.tip < flight.points.length) active.positions.set(flight.points[active.tip].position, active.tip * 3)
        active.tip = index + 1
        model.projectile.position.toArray(active.positions, active.tip * 3)
        active.path.geometry.attributes.position.needsUpdate = true
        active.path.geometry.setDrawRange(0, index + 2)
      }
      if (active.elapsed >= end) {
        playback = undefined
        active.resolve()
      }
    }
    controls.update()
    renderer.render(world, camera)
  }

  function visibility(): void {
    lastTime = undefined
    renderer.setAnimationLoop(document.hidden || disposed ? null : tick)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  document.addEventListener('visibilitychange', visibility)
  rebuildGround()
  resize()
  visibility()

  const api: SceneApi = {
    setDesign(next) {
      assertActive()
      // Build first, so invalid geometry leaves the current scene usable.
      const replacement = buildTrebuchetModel(next)
      cancel()
      if (model) disposeObject(model.group)
      design = { ...next }
      model = replacement
      world.add(model.group)
      prediction = null
      clear(paths)
      rebuildGround()
      frameCamera()
    },
    setPrediction(shot) {
      assertActive()
      cancel()
      prediction = shot
      clear(paths)
      rebuildPrediction()
      rebuildGround()
      frameCamera()
    },
    setTargets(next) {
      assertActive()
      clear(targets)
      for (const target of next) {
        const mesh = new Mesh(new RingGeometry(target.radius * 0.8, target.radius, 48),
          new MeshBasicMaterial({ color: theme.accent, side: DoubleSide }))
        mesh.rotation.x = -Math.PI / 2
        mesh.position.set(target.distance, 0.02, target.lateral)
        targets.add(mesh)
      }
      rebuildGround()
    },
    async playShot(shot, opts = {}) {
      assertActive()
      const timeScale = opts.timeScale ?? 1
      if (!Number.isFinite(timeScale) || timeScale <= 0) throw new RangeError('timeScale must be finite and greater than 0')
      if (!model) throw new Error('Set a design before playing a shot')
      if (!shot.mechanism.release || !shot.flight?.points.length) throw new Error('Shot has no landing trajectory')
      api.reset()
      const positions = new Float32Array((shot.flight.points.length + 1) * 3)
      shot.flight.points.forEach((point, index) => positions.set(point.position, index * 3))
      const geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3))
      geometry.setDrawRange(0, 0)
      const path = new Line(geometry, new LineBasicMaterial({ color: theme.accent }))
      // The trailing vertex changes each frame; don't cull from an outdated bound.
      path.frustumCulled = false
      paths.add(path)
      lastTime = undefined
      return new Promise<void>((resolve, reject) => {
        playback = { shot, elapsed: 0, timeScale, resolve, reject, path, positions, tip: 0 }
      })
    },
    reset() {
      assertActive()
      cancel()
      if (model && design) {
        applyMechanismState(model, cockedPose(design)!)
        model.sling.visible = true
      }
      clear(paths)
      rebuildPrediction()
    },
    dispose() {
      if (disposed) return
      cancel()
      disposed = true
      renderer.setAnimationLoop(null)
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      controls.dispose()
      for (const child of [...world.children]) disposeObject(child)
      renderer.dispose()
    },
  }
  return api
}
