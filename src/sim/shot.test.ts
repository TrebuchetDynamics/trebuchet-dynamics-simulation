import { describe, expect, it, vi } from 'vitest'
import * as mechanismSolver from './mechanism'
import * as flightSolver from './flight'
import { PARAMETERS, PRESETS, validateDesign, type Design, type Environment } from './design'
import { simulateShot } from './shot'

const calm = { windSpeed: 0, windDirectionDeg: 0, airDensity: 1.225 }

describe('preset shots', () => {
  it.each(['small', 'medium', 'large'] as const)('%s is valid and lands forward without warnings', name => {
    expect(validateDesign(PRESETS[name])).toEqual([])
    const shot = simulateShot(PRESETS[name], calm)
    expect(shot.mechanism.released).toBe(true)
    expect(shot.flight!.landing.range).toBeGreaterThan(0)
    expect(shot.messages.filter(message => message.severity === 'warning')).toEqual([])
  })
})

function expectFinite(value: unknown, path = 'shot'): void {
  function findNonfinite(value: unknown, path: string): string | undefined {
    if (typeof value === 'number' && !Number.isFinite(value)) return `${path}: ${value}`
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        const found = findNonfinite(child, `${path}.${key}`)
        if (found) return found
      }
    }
  }
  expect(findNonfinite(value, path)).toBeUndefined()
}

it.each(['small', 'medium', 'large'] as const)('%s supports every single-field slider endpoint', name => {
  for (const [field, parameter] of Object.entries(PARAMETERS)) {
    for (const value of [parameter.min, parameter.max]) {
      const isEnvironment = field in calm
      const design: Design = { ...PRESETS[name], ...(!isEnvironment && { [field]: value }) }
      const env: Environment = { ...calm, ...(isEnvironment && { [field]: value }) }
      if (validateDesign(design).length) continue
      expectFinite(simulateShot(design, env), `${name}.${field}=${value}`)
    }
  }
}, 30000)

it('rejects a negative length with the field and lets the caller repair it', () => {
  const design = { ...PRESETS.small, longArmLength: -1 }
  expect(validateDesign(design)).toContainEqual({ field: 'longArmLength', code: 'OUT_OF_RANGE' })
  expect(() => simulateShot(design, calm)).toThrow('longArmLength')
  expect(simulateShot(PRESETS.small, calm).mechanism.released).toBe(true)
})

it('returns a design warning, not an exception, for a very light counterweight', () => {
  const shot = simulateShot({ ...PRESETS.small, counterweightMass: 0.01 }, calm)
  expect(shot.messages.some(({ code }) => code === 'NO_RELEASE' || code === 'WEAK_SHOT')).toBe(true)
  expectFinite(shot)
  if (!shot.mechanism.released) {
    expect(shot.flight).toBeUndefined()
    expect(shot.telemetry).toMatchObject({ releaseSpeed: 0, releaseAngleDeg: 0, range: 0, lateralDrift: 0, flightTime: 0, maxHeight: 0 })
  }
})

it('maps wind to +x at zero degrees and +z at 90 degrees, with zero calm drift', () => {
  const shot = simulateShot(PRESETS.small, { ...calm, windSpeed: 10, windDirectionDeg: 90 })
  expect(shot.telemetry.lateralDrift).toBeGreaterThan(0)
  const tail = simulateShot(PRESETS.small, { ...calm, windSpeed: 10 })
  const head = simulateShot(PRESETS.small, { ...calm, windSpeed: 10, windDirectionDeg: 180 })
  expect(tail.telemetry.range).toBeGreaterThan(head.telemetry.range)
  expect(simulateShot(PRESETS.small, calm).telemetry.lateralDrift).toBe(0)
})

it('preserves the pivot origin and exposes release, flight and energy telemetry', () => {
  const design = PRESETS.small
  const shot = simulateShot(design, calm), release = shot.mechanism.release!, flight = shot.flight!
  expect(flight.points[0]).toMatchObject({ t: 0, position: [...release.position, 0], velocity: [...release.velocity, 0] })
  expect(shot.telemetry).toEqual({
    releaseSpeed: release.speed, releaseAngleDeg: release.angleDeg,
    range: flight.landing.range, lateralDrift: flight.landing.lateralDrift, flightTime: flight.landing.t,
    maxHeight: Math.max(...flight.points.map(point => point.position[1])),
    efficiency: shot.mechanism.energy.efficiency,
  })
  expect(shot.telemetry.range).toBe(flight.landing.position[0])
  expect(shot.telemetry.range).not.toBeCloseTo(flight.landing.range - release.position[0], 3)
})

it('runs a large shot in under 50 ms (median of five complete public calls)', () => {
  const times = Array.from({ length: 5 }, () => {
    const start = performance.now()
    simulateShot(PRESETS.large, calm)
    return performance.now() - start
  }).sort((a, b) => a - b)
  expect(times[2]).toBeLessThan(50)
})

it.each([
  { range: -1, efficiency: 0.1, codes: ['BACKWARD_SHOT', 'LOW_EFFICIENCY'] },
  { range: 0, efficiency: 0.2, codes: ['WEAK_SHOT'] },
  { range: PRESETS.small.longArmLength - 0.001, efficiency: 0.5999, codes: ['WEAK_SHOT'] },
  { range: PRESETS.small.longArmLength, efficiency: 0.6, codes: ['GOOD_EFFICIENCY'] },
])('uses the specified message thresholds for range=$range efficiency=$efficiency', ({ range, efficiency, codes }) => {
  const mechanism = mechanismSolver.simulateMechanism(PRESETS.small)
  const flight = flightSolver.simulateFlight({ position: [0, 1, 0], velocity: [1, 1, 0], mass: 1, diameter: 0.1, wind: [0, 0, 0] })
  const mechanismMock = vi.spyOn(mechanismSolver, 'simulateMechanism').mockReturnValue({
    ...mechanism, energy: { ...mechanism.energy, efficiency },
  })
  const flightMock = vi.spyOn(flightSolver, 'simulateFlight').mockReturnValue({
    ...flight, landing: { ...flight.landing, range },
  })
  try {
    const shot = simulateShot(PRESETS.small, calm)
    expect(shot.messages).toEqual(codes.map(code => ({ code, severity: code === 'GOOD_EFFICIENCY' ? 'info' : 'warning' })))
  } finally {
    mechanismMock.mockRestore()
    flightMock.mockRestore()
  }
})

it('returns NO_RELEASE for a geometrically valid pin setting that cannot release', () => {
  const shot = simulateShot({ ...PRESETS.small, pinAngleDeg: 90 }, calm)
  expect(shot.flight).toBeUndefined()
  expect(shot.messages).toContainEqual({ code: 'NO_RELEASE', severity: 'warning' })
  expect(shot.messages).toContainEqual({ code: 'LOW_EFFICIENCY', severity: 'warning' })
})

it('throws only for invalid designs, reporting unusable flight inputs as a warning', () => {
  const shot = simulateShot(PRESETS.small, { ...calm, windSpeed: NaN })
  expectFinite(shot)
  expect(shot.mechanism.released).toBe(true)
  expect(shot.flight).toBeUndefined()
  expect(shot.telemetry.releaseSpeed).toBeGreaterThan(0)
  expect(shot.messages.some(message => message.severity === 'warning')).toBe(true)
})

it('does not mutate a design or environment', () => {
  const design = Object.freeze({ ...PRESETS.small }), env = Object.freeze({ ...calm })
  simulateShot(design, env)
  expect(design).toEqual(PRESETS.small)
  expect(env).toEqual(calm)
})
