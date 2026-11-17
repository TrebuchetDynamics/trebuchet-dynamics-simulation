import * as THREE from 'three'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')
if (canvas === null) {
  throw new Error('Missing <canvas id="scene"> in index.html')
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#101820')

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
camera.position.set(0, 2, 8)

function resize(): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
}

resize()
window.addEventListener('resize', resize)

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera)
})
