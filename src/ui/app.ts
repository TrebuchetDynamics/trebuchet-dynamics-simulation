import { createScene } from '../scene'
import { PARAMETERS, PRESETS, validateDesign, type Design, type Environment } from '../sim/design'
import { simulateShot, type ShotResult } from '../sim/shot'
import { createControls } from './controls'
import { text } from './strings'

export function mountWidget(root: HTMLElement): void {
  document.title = text('title')
  root.innerHTML = `
    <header><h1>${text('title')}</h1><p>${text('subtitle')}</p></header>
    <div class="workspace">
      <section class="viewport"><canvas id="scene" aria-label="${text('canvas')}"></canvas><p class="target">${text('target')}</p></section>
      <section class="panel" aria-label="${text('controls')}">
        <div id="controls"></div>
        <div class="actions"><button id="launch" type="button">${text('launch')}</button><button id="replay" type="button" disabled>${text('replay')}</button></div>
        <p id="status" role="status" aria-live="polite"></p>
        <section aria-labelledby="telemetry-title"><h2 id="telemetry-title">${text('telemetry')}</h2><dl id="telemetry"></dl></section>
        <section aria-labelledby="energy-title"><h2 id="energy-title">${text('energy')}</h2><p>${text('energyHelp')}</p><div class="energy-bar" role="img" aria-labelledby="energy-title" aria-describedby="energy-values"></div><dl id="energy-values"></dl></section>
        <section aria-labelledby="messages-title"><h2 id="messages-title">${text('messages')}</h2><ul id="messages" aria-live="polite"></ul></section>
      </section>
    </div>`
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!
  const status = get('status'), launch = get<HTMLButtonElement>('launch'), replay = get<HTMLButtonElement>('replay')
  const energyBar = root.querySelector<HTMLElement>('.energy-bar')!
  const metrics = new Map<string, HTMLElement>()
  const units = {
    predictedRange: 'unitDistance', releaseSpeed: 'unitSpeed', releaseAngleDeg: 'unitAngle', range: 'unitDistance', lateralDrift: 'unitDistance', flightTime: 'unitTime', maxHeight: 'unitDistance',
    counterweightIn: 'unitEnergy', projectileOut: 'unitEnergy', axleLoss: 'unitEnergy', troughLoss: 'unitEnergy', remaining: 'unitEnergy', efficiency: 'unitPercent',
  }
  for (const [key, unit] of Object.entries(units)) {
    const term = document.createElement('dt'), definition = document.createElement('dd'), value = document.createElement('span')
    term.textContent = text(key)
    if (['projectileOut', 'axleLoss', 'troughLoss', 'remaining'].includes(key)) term.className = key
    value.dataset.testid = key
    value.textContent = text('pending')
    definition.append(value, ` ${text(unit)}`)
    metrics.set(key, value)
    get(key in { counterweightIn: 1, projectileOut: 1, axleLoss: 1, troughLoss: 1, remaining: 1, efficiency: 1 } ? 'energy-values' : 'telemetry').append(term, definition)
  }

  let scene: ReturnType<typeof createScene>
  try {
    scene = createScene(get<HTMLCanvasElement>('scene'))
    scene.setTargets([{ distance: 100, lateral: 0, radius: 5 }])
  } catch {
    status.textContent = text('sceneFailed')
    launch.disabled = true
    return
  }
  let design: Design = { ...PRESETS.medium }
  let environment: Environment = { windSpeed: 0, windDirectionDeg: 0, airDensity: 1.225 }
  let prediction: ShotResult | null = null
  let revision = 0
  let activePreset: string | undefined = 'medium'

  function resolvedValues(): Record<keyof typeof PARAMETERS, number> {
    return {
      ...design,
      gravity: design.gravity ?? 9.81,
      beamCenterOfMass: design.beamCenterOfMass ?? (design.longArmLength - design.shortArmLength) / 2,
      beamInertia: design.beamInertia ?? design.armMass * (design.longArmLength ** 2 - design.longArmLength * design.shortArmLength + design.shortArmLength ** 2) / 3,
      axleRadius: design.axleRadius ?? 0.017,
      axleStaticFriction: design.axleStaticFriction ?? design.axleFriction,
      troughStaticFriction: design.troughStaticFriction ?? design.troughFriction,
      ...environment,
    }
  }
  const controls = createControls(get('controls'), name => {
    design = { ...PRESETS[name] }
    activePreset = name
    update()
  }, (field, value) => {
    if (field in environment) environment = { ...environment, [field]: value }
    else design = { ...design, [field]: value }
    activePreset = undefined
    update()
  })

  function clearMeasured(): void {
    for (const [key, value] of metrics) if (key !== 'predictedRange') value.textContent = text('pending')
    energyBar.replaceChildren()
  }

  function update(): void {
    revision++
    scene.reset()
    prediction = null
    clearMeasured()
    metrics.get('predictedRange')!.textContent = text('pending')
    get('messages').replaceChildren()
    launch.disabled = true
    replay.disabled = true
    launch.textContent = text('launch')
    const issues = validateDesign(design)
    controls.update(resolvedValues(), issues, activePreset)
    if (issues.length) {
      scene.setPrediction(null)
      status.textContent = text('invalid')
      return
    }
    try {
      prediction = simulateShot(design, environment)
      scene.setDesign(design)
      scene.setPrediction(prediction)
      metrics.get('predictedRange')!.textContent = prediction.telemetry.range.toFixed(2)
      for (const message of prediction.messages) {
        const item = document.createElement('li')
        item.textContent = text(message.code)
        item.className = message.severity
        get('messages').append(item)
      }
      launch.disabled = !prediction.flight
      status.textContent = text(prediction.flight ? 'ready' : 'unplayable')
    } catch {
      prediction = null
      scene.setPrediction(null)
      status.textContent = text('simulationFailed')
    }
  }

  function showResult(shot: ShotResult): void {
    for (const [key, value] of Object.entries(shot.telemetry)) {
      if (key !== 'efficiency') metrics.get(key)!.textContent = value.toFixed(2)
    }
    for (const [key, value] of Object.entries(shot.mechanism.energy)) {
      metrics.get(key)!.textContent = (key === 'efficiency' ? value * 100 : value).toFixed(2)
    }
    energyBar.replaceChildren()
    const energy = shot.mechanism.energy
    for (const key of ['projectileOut', 'axleLoss', 'troughLoss', 'remaining'] as const) {
      const segment = document.createElement('span')
      segment.className = key
      // Input is an amount, not a fifth segment. Clamp only visual widths;
      // the numbers above preserve the solver's signed energy accounting.
      const share = energy.counterweightIn > 0 ? Math.max(0, energy[key]) / energy.counterweightIn * 100 : 0
      segment.style.width = `${share}%`
      segment.title = `${text(key)}: ${energy[key].toFixed(2)} ${text('unitEnergy')}`
      energyBar.append(segment)
    }
  }

  async function play(timeScale: number): Promise<void> {
    const shot = prediction
    if (!shot?.flight) return
    const playingRevision = revision
    launch.disabled = true
    replay.disabled = true
    clearMeasured()
    status.textContent = text('launching')
    if (window.matchMedia('(max-width: 1023px)').matches) get('scene').scrollIntoView({ block: 'start' })
    try {
      await scene.playShot(shot, { timeScale })
      if (playingRevision !== revision) return
      showResult(shot)
      status.textContent = text('complete')
      launch.disabled = false
      replay.disabled = false
      if (window.matchMedia('(max-width: 1023px)').matches) get('telemetry-title').scrollIntoView({ block: 'start' })
    } catch {
      if (playingRevision !== revision) return
      status.textContent = text('playbackFailed')
      launch.disabled = false
    }
  }
  launch.addEventListener('click', () => { void play(1) })
  replay.addEventListener('click', () => { void play(0.25) })
  update()
}
