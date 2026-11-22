import { createScene } from '../scene'
import { CHALLENGES, evaluateShot } from '../game/challenge'
import { loadState, saveState } from '../game/storage'
import { PARAMETERS, PRESETS, validateDesign, type Design, type Environment } from '../sim/design'
import { simulateShot, type ShotResult } from '../sim/shot'
import { createControls } from './controls'
import { text } from './strings'

export function mountWidget(root: HTMLElement, embed = false): void {
  document.title = text('title')
  root.innerHTML = `
    <header><h1>${text('title')}</h1><p>${text('subtitle')}</p></header>
    <div class="workspace">
      <section class="viewport"><canvas id="scene" aria-label="${text('canvas')}"></canvas><p class="target" id="target-label">${text('target')}</p></section>
      <section class="panel" aria-label="${text('controls')}">
        ${embed ? `<a id="open-full" target="_blank" rel="noopener">${text('openFull')}</a>` : `
        <section aria-labelledby="challenge-title">
          <h2 id="challenge-title">${text('challenges')}</h2>
          <label><input id="free-play" type="checkbox"> ${text('freePlay')}</label>
          <p>${text('challengeHelp')}</p>
          <p>${text('highScore')}: <span data-testid="high-score" id="high-score"></span></p>
          <div id="challenge-progress">
            <dl><dt>${text('score')}</dt><dd data-testid="score" id="score"></dd><dt>${text('attempts')}</dt><dd data-testid="attempts" id="attempts"></dd></dl>
            <p id="fixed-wind" hidden>${text('fixedWind')}</p>
            <p id="challenge-result" role="status" aria-live="polite"></p>
            <button id="next-target" type="button" hidden>${text('nextTarget')}</button>
          </div>
        </section>`}
        <div id="controls"></div>
        <div class="actions"><button id="launch" type="button">${text('launch')}</button><button id="replay" type="button" disabled>${text('replay')}</button></div>
        <p id="status" role="status" aria-live="polite"></p>
        <section aria-labelledby="telemetry-title"><h2 id="telemetry-title">${text('telemetry')}</h2><dl id="telemetry"></dl></section>
        <section aria-labelledby="energy-title"><h2 id="energy-title">${text('energy')}</h2><p>${text('energyHelp')}</p><div class="energy-bar" role="img" aria-labelledby="energy-title" aria-describedby="energy-values"></div><dl id="energy-values"></dl></section>
        <section aria-labelledby="messages-title"><h2 id="messages-title">${text('messages')}</h2><ul id="messages" aria-live="polite"></ul></section>
      </section>
    </div>`
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!
  if (embed) {
    const fullPage = new URL(location.href)
    fullPage.searchParams.delete('embed')
    get<HTMLAnchorElement>('open-full').href = fullPage.href
  }
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
  const saved = embed ? { highScore: 0, design: { ...PRESETS.medium } } : loadState()
  let design: Design = saved.design
  let highScore = saved.highScore
  let score = 0, targetIndex = 0, attempts = 0
  let freePlay = false, solved = false
  let environment: Environment = { windSpeed: 0, windDirectionDeg: 0, airDensity: 1.225 }
  let prediction: ShotResult | null = null
  let revision = 0
  let activePreset: string | undefined = embed ? 'medium' : undefined

  function persist(): void {
    if (!embed) saveState({ highScore, design })
  }

  function updateChallenge(): void {
    if (embed) return
    const target = freePlay ? { distance: 100, lateral: 0, radius: 5 } : CHALLENGES[targetIndex]
    scene.setTargets([target])
    get('target-label').textContent = freePlay ? text('target') :
      `${text('targetLabel')} ${targetIndex + 1}/${CHALLENGES.length}: ${target.distance} m, ${text('lateralLabel')} ${target.lateral} m, ${text('radiusLabel')} ${target.radius} m`
    get('high-score').textContent = highScore.toFixed(1)
    get('score').textContent = score.toFixed(1)
    get('attempts').textContent = String(attempts)
    get('challenge-progress').hidden = freePlay
    get('next-target').hidden = !solved
    get('next-target').textContent = text(targetIndex === CHALLENGES.length - 1 ? 'restartChallenges' : 'nextTarget')
    get('fixed-wind').hidden = !target.wind
    controls.lockWind(!freePlay && Boolean(target.wind))
  }

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
  }, embed)

  if (!embed) {
    get<HTMLInputElement>('free-play').addEventListener('change', event => {
      freePlay = (event.target as HTMLInputElement).checked
      if (!freePlay && CHALLENGES[targetIndex].wind) environment = { ...environment, ...CHALLENGES[targetIndex].wind }
      updateChallenge()
      update()
    })
    get('next-target').addEventListener('click', () => {
      if (!solved) return
      if (targetIndex === CHALLENGES.length - 1) { targetIndex = 0; score = 0 }
      else targetIndex++
      attempts = 0
      solved = false
      environment = { ...environment, windSpeed: 0, windDirectionDeg: 0, ...CHALLENGES[targetIndex].wind }
      get('challenge-result').textContent = ''
      updateChallenge()
      update()
    })
    updateChallenge()
  }

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
    persist()
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
      launch.disabled = !prediction.flight || (!embed && !freePlay && solved)
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

  async function play(timeScale: number, isReplay = false): Promise<void> {
    const shot = prediction
    if (!shot?.flight || (!isReplay && !embed && !freePlay && solved)) return
    const playingRevision = revision
    if (!isReplay && !embed && !freePlay) {
      attempts++
      updateChallenge()
    }
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
      if (!isReplay && !embed && !freePlay) {
        const result = evaluateShot(shot, CHALLENGES[targetIndex], attempts)!
        if (result.hit) {
          solved = true
          score += result.points
          highScore = Math.max(highScore, score)
          persist()
          get('challenge-result').textContent = `${text('hit')} +${result.points.toFixed(1)} ${text('points')}${targetIndex === CHALLENGES.length - 1 ? ` — ${text('challengeComplete')}` : ''}`
        } else {
          const directions = [
            result.forward ? `${Math.abs(result.forward).toFixed(1)} m ${text(result.forward < 0 ? 'short' : 'long')}` : '',
            result.lateral ? `${Math.abs(result.lateral).toFixed(1)} m ${text(result.lateral < 0 ? 'left' : 'right')}` : '',
          ].filter(Boolean).join(', ')
          get('challenge-result').textContent = `${text('miss')} ${result.distance.toFixed(1)} ${text('fromCentre')} (${directions})`
        }
        updateChallenge()
      }
      launch.disabled = !embed && !freePlay && solved
      replay.disabled = false
      if (window.matchMedia('(max-width: 1023px)').matches) get('telemetry-title').scrollIntoView({ block: 'start' })
    } catch {
      if (playingRevision !== revision) return
      status.textContent = text('playbackFailed')
      launch.disabled = false
    }
  }
  launch.addEventListener('click', () => { void play(1) })
  replay.addEventListener('click', () => { void play(0.25, true) })
  update()
}
