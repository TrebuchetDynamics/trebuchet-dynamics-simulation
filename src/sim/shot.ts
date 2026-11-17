import { validateDesign, type Design, type Environment } from './design'
import { simulateMechanism, type MechanismResult } from './mechanism'
import { simulateFlight, type FlightResult } from './flight'

export interface ShotResult {
  mechanism: MechanismResult
  flight?: FlightResult // absent without release or if flight integration fails
  telemetry: {
    releaseSpeed: number; releaseAngleDeg: number; range: number; lateralDrift: number
    flightTime: number; maxHeight: number; efficiency: number
  }
  messages: { code: string; severity: 'info' | 'warning' }[]
}

/** Complete shot in pivot-ground coordinates: x forward, y up, z lateral.
 * Flight times are relative to release; mechanism times start at arming.
 */
export function simulateShot(design: Design, env: Environment): ShotResult {
  const errors = validateDesign(design)
  if (errors.length) throw new RangeError(errors.map(({ field, code }) => `${field}: ${code}`).join('; '))

  const mechanism = simulateMechanism(design)
  const telemetry: ShotResult['telemetry'] = {
    releaseSpeed: 0, releaseAngleDeg: 0, range: 0, lateralDrift: 0,
    flightTime: 0, maxHeight: 0, efficiency: mechanism.energy.efficiency,
  }
  const messages: ShotResult['messages'] = []
  let flight: FlightResult | undefined
  if (mechanism.release) {
    const release = mechanism.release
    telemetry.releaseSpeed = release.speed
    telemetry.releaseAngleDeg = release.angleDeg
    telemetry.maxHeight = release.position[1]
    const direction = env.windDirectionDeg * Math.PI / 180
    try {
      flight = simulateFlight({
        position: [...release.position, 0], velocity: [...release.velocity, 0],
        mass: design.projectileMass, diameter: design.projectileDiameter,
        dragCoefficient: design.dragCoefficient, airDensity: env.airDensity,
        wind: [env.windSpeed * Math.cos(direction), 0, env.windSpeed * Math.sin(direction)],
        gravity: design.gravity,
      })
    } catch {
      // The shot API throws only for design validation. Do not fabricate a
      // landing if flight rejects the environment or cannot integrate it.
      messages.push({ code: 'FLIGHT_FAILED', severity: 'warning' })
    }
    if (flight) {
      Object.assign(telemetry, {
        range: flight.landing.range, lateralDrift: flight.landing.lateralDrift, flightTime: flight.landing.t,
        maxHeight: flight.points.reduce((height, point) => Math.max(height, point.position[1]), 0),
      })
      if (telemetry.range < 0) messages.push({ code: 'BACKWARD_SHOT', severity: 'warning' })
      else if (telemetry.range < design.longArmLength) messages.push({ code: 'WEAK_SHOT', severity: 'warning' })
    }
  } else {
    messages.push({ code: 'NO_RELEASE', severity: 'warning' })
  }
  if (telemetry.efficiency < 0.2) messages.push({ code: 'LOW_EFFICIENCY', severity: 'warning' })
  else if (telemetry.efficiency >= 0.6) messages.push({ code: 'GOOD_EFFICIENCY', severity: 'info' })
  return { mechanism, flight, telemetry, messages }
}
