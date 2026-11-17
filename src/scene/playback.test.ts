import { expect, it } from 'vitest'
import { Vector3 } from 'three'
import { PRESETS } from '../sim/design'
import { simulateShot } from '../sim/shot'
import { buildTrebuchetModel } from './trebuchetModel'
import { applyShotAtTime } from './playback'

const shot = simulateShot(PRESETS.small, { windSpeed: 10, windDirectionDeg: 90, airDensity: 1.225 })

it('uses mechanism timestamps before release and flight-relative timestamps after release', () => {
  const model = buildTrebuchetModel(PRESETS.small)
  const state = shot.mechanism.states[10]
  applyShotAtTime(model, shot, state.t)
  expect(model.projectile.position.distanceTo(new Vector3(...state.projectile, 0))).toBeLessThan(1e-6)
  const point = shot.flight!.points[100]
  applyShotAtTime(model, shot, shot.mechanism.release!.t + point.t)
  expect(model.projectile.position.distanceTo(new Vector3(...point.position))).toBeLessThan(1e-6)
  expect(model.sling.visible).toBe(false)
})

it('interpolates supplied flight samples and clamps to the exact landing, without physics', () => {
  const model = buildTrebuchetModel(PRESETS.small)
  const flight = shot.flight!, a = flight.points[100], b = flight.points[101]
  applyShotAtTime(model, shot, shot.mechanism.release!.t + (a.t + b.t) / 2)
  const midpoint = new Vector3(...a.position).lerp(new Vector3(...b.position), 0.5)
  expect(model.projectile.position.distanceTo(midpoint)).toBeLessThan(1e-6)
  applyShotAtTime(model, shot, shot.mechanism.release!.t + flight.landing.t + 10)
  expect(model.projectile.position.distanceTo(new Vector3(...flight.landing.position))).toBeLessThan(1e-6)
})
