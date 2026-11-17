import { describe, expect, it } from 'vitest'
import { simulateFlight, type FlightInput } from './flight'

const release: FlightInput = {
  position: [12, 2, 0],
  velocity: [28, 21, 0],
  mass: 1,
  diameter: 0.12,
  dragCoefficient: 0.47,
  airDensity: 1.225,
  wind: [0, 0, 0],
  gravity: 9.81,
  groundY: 0,
}

const vacuum = (input: FlightInput) => {
  const g = input.gravity ?? 9.81
  const height = input.position[1] - (input.groundY ?? 0)
  const t = (input.velocity[1] + Math.sqrt(input.velocity[1] ** 2 + 2 * g * height)) / g
  return { t, distance: input.velocity[0] * t }
}

describe('simulateFlight', () => {
  it('matches the closed-form no-drag time and distance to relative error 1e-6', () => {
    const input: FlightInput = {
      ...release,
      position: [12, 5, -2],
      velocity: [28, 21, 3],
      groundY: 3,
      dragCoefficient: 0,
    }
    const expected = vacuum(input)
    // Include a coarse step to expose linear ground-interpolation error.
    for (const dt of [undefined, 0.2]) {
      const { landing, points } = simulateFlight(input, dt)
      expect(Math.abs(landing.t / expected.t - 1)).toBeLessThan(1e-6)
      expect(Math.abs((landing.position[0] - input.position[0]) / expected.distance - 1)).toBeLessThan(1e-6)
      expect(landing.position[1]).toBe(3)
      expect(landing.position[2]).toBeCloseTo(-2 + 3 * expected.t, 9)
      expect(landing.range).toBe(landing.position[0])
      expect(landing.lateralDrift).toBe(landing.position[2])
      expect(landing.speed).toBeCloseTo(Math.hypot(28, 21 - 9.81 * expected.t, 3), 9)
      expect(points[0]).toEqual({ t: 0, position: input.position, velocity: input.velocity })
      expect(points.at(-1)?.t).toBe(landing.t)
      expect(points.at(-1)?.position).toEqual(landing.position)
      for (let i = 1; i < points.length - 1; i++) {
        expect(points[i].t - points[i - 1].t).toBeCloseTo(dt ?? 0.005, 12)
        expect(points[i].position[1]).toBeGreaterThan(input.groundY!)
      }
    }
  })

  it('reduces range with drag and never increases kinetic plus potential energy in still air', () => {
    const result = simulateFlight(release)
    expect(result.landing.range).toBeLessThan(simulateFlight({ ...release, dragCoefficient: 0 }).landing.range)
    const energies = result.points.map(({ position, velocity }) =>
      0.5 * release.mass * velocity.reduce((sum, v) => sum + v * v, 0)
      + release.mass * release.gravity! * (position[1] - release.groundY!),
    )
    for (let i = 1; i < energies.length; i++) {
      expect(energies[i]).toBeLessThanOrEqual(energies[i - 1] + 1e-9)
    }
  })

  it('matches the analytic quadratic-drag vertical fall solution', () => {
    const input: FlightInput = { ...release, position: [0, 1000, 0], velocity: [0, 0, 0] }
    const point = simulateFlight(input).points[200] // t = 1 s
    const area = Math.PI * input.diameter ** 2 / 4
    const terminalSpeed = Math.sqrt(2 * input.mass * input.gravity! / (input.airDensity! * input.dragCoefficient! * area))
    const expectedSpeed = -terminalSpeed * Math.tanh(input.gravity! * point.t / terminalSpeed)
    const expectedHeight = 1000 - terminalSpeed ** 2 / input.gravity! * Math.log(Math.cosh(input.gravity! * point.t / terminalSpeed))
    expect(point.velocity[1]).toBeCloseTo(expectedSpeed, 8)
    expect(point.position[1]).toBeCloseTo(expectedHeight, 8)
  })

  it('produces positive lateral drift for positive z wind and mirror drift for opposite wind within 1e-9', () => {
    const positive = simulateFlight({ ...release, wind: [0, 0, 8] }).landing
    const negative = simulateFlight({ ...release, wind: [0, 0, -8] }).landing
    expect(positive.lateralDrift).toBeGreaterThan(0)
    expect(Math.abs(positive.lateralDrift + negative.lateralDrift)).toBeLessThan(1e-9)
  })

  it('flies farther with a tail wind than with an equally fast head wind', () => {
    const tail = simulateFlight({ ...release, wind: [10, 0, 0] })
    const head = simulateFlight({ ...release, wind: [-10, 0, 0] })
    expect(tail.landing.range).toBeGreaterThan(head.landing.range)
  })

  it('returns deeply equal results without mutating input or sharing output vectors', () => {
    const input = structuredClone(release)
    const first = simulateFlight(input)
    expect(simulateFlight(input)).toEqual(first)
    expect(input).toEqual(release)
    first.points[0].position[0] = -100
    first.points[0].velocity[0] = -100
    first.landing.position[0] = -100
    expect(input).toEqual(release)
    expect(first.points.at(-1)?.position[0]).not.toBe(-100)
  })

  it('lands immediately at the starting position when on the ground moving downward', () => {
    const input: FlightInput = { ...release, position: [4, 3, -2], groundY: 3, velocity: [10, -2, 1] }
    const result = simulateFlight(input)
    expect(result.points).toEqual([{ t: 0, position: input.position, velocity: input.velocity }])
    expect(result.landing).toMatchObject({ t: 0, position: input.position, range: 4, lateralDrift: -2 })
    expect(result.landing.speed).toBeCloseTo(Math.sqrt(105), 12)
  })

  it('allows an upward launch from the ground to fly before landing', () => {
    const input: FlightInput = { ...release, position: [0, 0, 0], dragCoefficient: 0 }
    expect(simulateFlight(input).landing.t).toBeCloseTo(vacuum(input).t, 9)
  })

  it('uses the documented atmosphere, gravity, ground and time-step defaults', () => {
    const { dragCoefficient, airDensity, gravity, groundY, ...input } = release
    expect(simulateFlight(input)).toEqual(simulateFlight(release, 0.005))
  })

  it('terminates with a useful error when a sustained vertical updraft prevents landing', () => {
    // k = 1 and relative vertical velocity = -1: drag cancels gravity,
    // leaving a constant upward ground velocity of 1 m/s.
    const input: FlightInput = {
      ...release, position: [0, 1, 0], velocity: [0, 1, 0], wind: [0, 2, 0],
      mass: Math.PI, diameter: 2, airDensity: 2, dragCoefficient: 1, gravity: 1,
    }
    expect(() => simulateFlight(input, 1)).toThrow('Flight did not land within 100000 steps')
  })

  it('reports numerical overflow instead of returning a non-finite trajectory', () => {
    expect(() => simulateFlight({ ...release, diameter: 1e200 })).toThrow('Flight integration became non-finite')
  })

  it.each([0, -0.005, NaN, Infinity])('rejects invalid dt %s with a repairable error', (dt) => {
    expect(() => simulateFlight(release, dt)).toThrow('dt must be finite and greater than 0')
  })

  it.each([
    { mass: 0 }, { diameter: -1 }, { dragCoefficient: -1 }, { airDensity: -1 },
    { gravity: 0 }, { groundY: Infinity }, { position: [0, NaN, 0] },
    { velocity: [Infinity, 0, 0] }, { wind: [0, 0, NaN] }, { position: [0, -1, 0] },
  ])('rejects invalid physical inputs %j instead of integrating indefinitely', (invalid) => {
    expect(() => simulateFlight({ ...release, ...invalid } as FlightInput)).toThrow(RangeError)
  })
})
