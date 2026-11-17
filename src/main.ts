import { createScene } from './scene'
import { PRESETS } from './sim/design'
import { theme } from './theme'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')
if (canvas === null) {
  throw new Error('Missing <canvas id="scene"> in index.html')
}

document.body.style.background = theme.background
export const scene = createScene(canvas)
scene.setDesign(PRESETS.medium)
