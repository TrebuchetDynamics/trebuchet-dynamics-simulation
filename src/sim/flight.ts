export type Vec3 = [number, number, number] // x downrange, y up, z lateral (metres)

export interface FlightInput {
  position: Vec3
  velocity: Vec3
  mass: number // kg
  diameter: number // m (sphere)
  dragCoefficient?: number // default 0.47
  airDensity?: number // default 1.225 kg/m³
  wind: Vec3 // air velocity over ground, m/s
  gravity?: number // default 9.81 m/s²
  groundY?: number // default 0 m
}

export interface FlightResult {
  points: { t: number; position: Vec3; velocity: Vec3 }[]
  landing: { t: number; position: Vec3; range: number; lateralDrift: number; speed: number }
}

function addScaled(a: Vec3, b: Vec3, scale: number): Vec3 {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale]
}

function rk4Sum(base: Vec3, a: Vec3, b: Vec3, c: Vec3, d: Vec3, dt: number): Vec3 {
  return base.map((value, i) => value + dt / 6 * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) as Vec3
}

/** Pure fixed-step RK4 flight, ending at the first descending ground crossing.
 * Throws RangeError for invalid inputs, numerical overflow or a flight that
 * has not landed after 100,000 steps (for example, a sustained updraft).
 */
export function simulateFlight(input: FlightInput, dt = 0.005): FlightResult {
  const {
    mass, diameter, wind, dragCoefficient = 0.47, airDensity = 1.225,
    gravity = 9.81, groundY = 0,
  } = input
  if (!Number.isFinite(dt) || dt <= 0) {
    throw new RangeError('dt must be finite and greater than 0')
  }
  for (const [name, value] of Object.entries({ mass, gravity })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be finite and greater than 0`)
    }
  }
  for (const [name, value] of Object.entries({ diameter, dragCoefficient, airDensity })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be finite and nonnegative`)
    }
  }
  for (const [name, vector] of Object.entries({ position: input.position, velocity: input.velocity, wind })) {
    if (vector.length !== 3 || !vector.every(Number.isFinite)) {
      throw new RangeError(`${name} must contain three finite coordinates`)
    }
  }
  if (!Number.isFinite(groundY) || input.position[1] < groundY) {
    throw new RangeError('groundY must be finite and no higher than the release position')
  }

  // Drag acceleration is -k |v - wind| (v - wind).
  const k = 0.5 * airDensity * dragCoefficient * (Math.PI * diameter ** 2 / 4) / mass
  function acceleration(velocity: Vec3): Vec3 {
    const relative = addScaled(velocity, wind, -1)
    const drag = -k * Math.hypot(...relative)
    return [drag * relative[0], drag * relative[1] - gravity, drag * relative[2]]
  }

  let position: Vec3 = [...input.position]
  let velocity: Vec3 = [...input.velocity]
  const points: FlightResult['points'] = [{ t: 0, position, velocity }]
  function finish(t: number, p: Vec3, v: Vec3): FlightResult {
    return {
      points,
      landing: { t, position: [...p], range: p[0], lateralDrift: p[2], speed: Math.hypot(...v) },
    }
  }
  if (position[1] === groundY && velocity[1] <= 0) return finish(0, position, velocity)

  for (let step = 1; step <= 100_000; step++) {
    const a1 = acceleration(velocity)
    const v2 = addScaled(velocity, a1, dt / 2)
    const a2 = acceleration(v2)
    const v3 = addScaled(velocity, a2, dt / 2)
    const a3 = acceleration(v3)
    const v4 = addScaled(velocity, a3, dt)
    const a4 = acceleration(v4)
    const nextPosition = rk4Sum(position, velocity, v2, v3, v4, dt)
    const nextVelocity = rk4Sum(velocity, a1, a2, a3, a4, dt)
    if (![...nextPosition, ...nextVelocity].every(Number.isFinite)) {
      throw new RangeError('Flight integration became non-finite; reduce dt or check physical inputs')
    }

    if (nextPosition[1] <= groundY) {
      // Cubic Hermite dense output uses both endpoint velocities. Unlike linear
      // interpolation this is exact for a vacuum parabola, even on a coarse step.
      function interpolate(s: number): Vec3 {
        const h00 = 2 * s ** 3 - 3 * s ** 2 + 1
        const h10 = s ** 3 - 2 * s ** 2 + s
        const h01 = -2 * s ** 3 + 3 * s ** 2
        const h11 = s ** 3 - s ** 2
        return position.map((p, i) =>
          h00 * p + h10 * dt * velocity[i] + h01 * nextPosition[i] + h11 * dt * nextVelocity[i],
        ) as Vec3
      }
      let low = 0
      let high = 1
      for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2
        if (interpolate(mid)[1] > groundY) low = mid
        else high = mid
      }
      const s = (low + high) / 2
      const landedPosition = interpolate(s)
      landedPosition[1] = groundY
      const landedVelocity = position.map((p, i) =>
        (6 * s ** 2 - 6 * s) * (p - nextPosition[i]) / dt
        + (3 * s ** 2 - 4 * s + 1) * velocity[i]
        + (3 * s ** 2 - 2 * s) * nextVelocity[i],
      ) as Vec3
      const t = (step - 1 + s) * dt
      points.push({ t, position: landedPosition, velocity: landedVelocity })
      return finish(t, landedPosition, landedVelocity)
    }

    position = nextPosition
    velocity = nextVelocity
    points.push({ t: step * dt, position, velocity })
  }
  throw new RangeError('Flight did not land within 100000 steps; check wind or increase dt')
}
