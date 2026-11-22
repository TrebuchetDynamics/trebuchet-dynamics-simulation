import type { ShotResult } from '../sim/shot'

export interface Target {
  distance: number
  lateral: number
  radius: number
  wind?: { windSpeed: number; windDirectionDeg: number }
}

export const CHALLENGES: readonly Target[] = [
  { distance: 100, lateral: 0, radius: 10 },
  { distance: 120, lateral: 0, radius: 9 },
  { distance: 140, lateral: 3, radius: 8 },
  { distance: 160, lateral: -4, radius: 8, wind: { windSpeed: 5, windDirectionDeg: 270 } },
  { distance: 180, lateral: 5, radius: 7 },
  { distance: 200, lateral: 6, radius: 7, wind: { windSpeed: 8, windDirectionDeg: 90 } },
  { distance: 220, lateral: -7, radius: 6, wind: { windSpeed: 10, windDirectionDeg: 270 } },
  { distance: 240, lateral: 8, radius: 6, wind: { windSpeed: 12, windDirectionDeg: 60 } },
  { distance: 260, lateral: -10, radius: 5, wind: { windSpeed: 15, windDirectionDeg: 300 } },
  { distance: 280, lateral: 12, radius: 4, wind: { windSpeed: 18, windDirectionDeg: 90 } },
]

/** Attempt is one-based. Replays are not attempts. Distances use the actual
 * landing x/z, never the unsigned telemetry range or release-relative position.
 */
export function evaluateShot(shot: ShotResult, target: Target, attempt: number) {
  if (!shot.flight) return null
  const [x, , z] = shot.flight.landing.position
  const forward = x - target.distance, lateral = z - target.lateral
  const distance = Math.hypot(forward, lateral)
  const hit = distance <= target.radius
  const points = hit ? Math.max(10, 100 - 10 * (attempt - 1)) + 50 * (1 - distance / target.radius) : 0
  return { hit, points, distance, forward, lateral }
}
