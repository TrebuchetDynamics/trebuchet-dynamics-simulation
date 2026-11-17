import { Vector3 } from 'three'
import type { ShotResult } from '../sim/shot'
import { applyMechanismState, type TrebuchetModel } from './trebuchetModel'

/** Last supplied sample at or before t, clamped to the sampled interval. */
function indexAt(samples: { t: number }[], t: number): number {
  let lo = 0, hi = samples.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (samples[mid].t <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** Playback only: positions come from the solver, with linear flight interpolation. */
export function applyShotAtTime(model: TrebuchetModel, shot: ShotResult, t: number): number {
  const states = shot.mechanism.states
  if (states.length) applyMechanismState(model, states[indexAt(states, t)])
  const release = shot.mechanism.release, flight = shot.flight
  model.sling.visible = !release || t <= release.t
  if (!release || !flight || t < release.t) return -1
  const elapsed = t - release.t
  const index = indexAt(flight.points, elapsed)
  const a = flight.points[index], b = flight.points[Math.min(index + 1, flight.points.length - 1)]
  const fraction = a.t === b.t ? 0 : Math.min(1, Math.max(0, (elapsed - a.t) / (b.t - a.t)))
  model.projectile.position.set(...a.position).lerp(new Vector3(...b.position), fraction)
  if (elapsed >= flight.landing.t) model.projectile.position.set(...flight.landing.position)
  return index
}
