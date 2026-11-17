import { describe, expect, it } from 'vitest'
import { cockedPose, simulateMechanism, type MechanismParams, type MechanismResult, type MechanismState } from './mechanism'
import benchmark from './fixtures/horsdal-2025.json'

const design: MechanismParams = {
  counterweightMass: 53.9, projectileMass: 0.717, armMass: 4.86,
  longArmLength: 0.975, shortArmLength: 0.25, hangerLength: 0.515,
  slingLength: 0.87, pivotHeight: 0.975 * Math.cos(0.55), pinAngleDeg: -45,
  axleFriction: 0, troughFriction: 0, gravity: 9.80665,
}
const medium: MechanismParams = {
  ...design, counterweightMass: 2590, projectileMass: 20.7, armMass: 112,
  longArmLength: 3.97, shortArmLength: 0.67, slingLength: 3.58,
  pivotHeight: 3.97 * Math.cos(Math.PI / 6), hangerLength: 3.97 * Math.cos(Math.PI / 6) * 2 / 3 - 0.67,
}
const large: MechanismParams = {
  ...design, counterweightMass: 15700, projectileMass: 101, armMass: 591,
  longArmLength: 5.30 / Math.cos(Math.PI / 6), shortArmLength: 7.06 - 5.30 / Math.cos(Math.PI / 6),
  slingLength: 5.57, pivotHeight: 5.30,
  hangerLength: 5.30 * 2 / 3 - (7.06 - 5.30 / Math.cos(Math.PI / 6)),
}

// Second-order backward derivative from three animation samples. Release is a
// localized endpoint, so the last interval need not equal dt. No private solver
// velocities or reported energy components enter this independent calculation.
function rate(states: MechanismState[], i: number, value: (s: MechanismState) => number) {
  const a = states[i].t - states[i - 1].t, b = states[i - 1].t - states[i - 2].t
  return (2 * a + b) / (a * (a + b)) * value(states[i])
    - (a + b) / (a * b) * value(states[i - 1]) + a / (b * (a + b)) * value(states[i - 2])
}
function mechanicalGain(p: MechanismParams, result: MechanismResult, i: number) {
  const states = result.states, state = states[i], initial = states[0]
  const speed2 = (key: 'counterweight' | 'projectile') =>
    rate(states, i, s => s[key][0]) ** 2 + rate(states, i, s => s[key][1]) ** 2
  const inertia = p.beamInertia ?? p.armMass * (p.longArmLength ** 2 - p.longArmLength * p.shortArmLength + p.shortArmLength ** 2) / 3
  const d = p.beamCenterOfMass ?? (p.longArmLength - p.shortArmLength) / 2
  const kinetic = inertia * rate(states, i, s => s.armAngle) ** 2 / 2
    + p.counterweightMass * speed2('counterweight') / 2 + p.projectileMass * speed2('projectile') / 2
  const potentialGain = (p.gravity ?? 9.81) * (p.counterweightMass * (state.counterweight[1] - initial.counterweight[1])
    + p.projectileMass * (state.projectile[1] - initial.projectile[1])
    + p.armMass * d * (Math.sin(state.armAngle) - Math.sin(initial.armAngle)))
  return kinetic + potentialGain
}
function balance(r: MechanismResult) {
  const e = r.energy
  return e.counterweightIn - e.projectileOut - e.axleLoss - e.troughLoss - e.remaining
}
function vacuumRange(r: MechanismResult, g: number) {
  expect(r.released).toBe(true)
  const { position: [x, y], velocity: [vx, vy] } = r.release!
  expect(vx).toBeGreaterThan(0)
  return x + vx * (vy + Math.sqrt(vy * vy + 2 * g * y)) / g
}

it.each([design, medium, large])('conserves independently computed mechanical energy for $counterweightMass kg', p => {
  const result = simulateMechanism(p)
  expect(result.released).toBe(true)
  expect(Math.abs(mechanicalGain(p, result, result.releaseIndex!))).toBeLessThan(0.001 * result.energy.counterweightIn)
  // Also exercise both attached phases, not just a possibly fortuitous endpoint.
  for (let i = 10; i < result.releaseIndex!; i += 10) {
    expect(Math.abs(mechanicalGain(p, result, i))).toBeLessThan(0.001 * result.energy.counterweightIn)
  }
  expect(Math.abs(balance(result))).toBeLessThan(0.001 * result.energy.counterweightIn)
  expect(result.energy.axleLoss).toBe(0)
  expect(result.energy.troughLoss).toBe(0)
})

it.each([0.03, 0.3])('balances independently computed energies with friction %s and nonnegative work', axleFriction => {
  const p = { ...design, axleFriction, troughFriction: 0.35 }
  const result = simulateMechanism(p)
  expect(result.released).toBe(true)
  expect(Math.abs(balance(result))).toBeLessThan(0.001 * result.energy.counterweightIn)
  expect(result.energy.axleLoss).toBeGreaterThan(0)
  expect(result.energy.troughLoss).toBeGreaterThan(0)
  expect(Math.abs(mechanicalGain(p, result, result.releaseIndex!) + result.energy.axleLoss + result.energy.troughLoss))
    .toBeLessThan(0.001 * result.energy.counterweightIn)
  const start = result.states[0], end = result.states[result.releaseIndex!]
  expect(result.energy.counterweightIn).toBeCloseTo(p.counterweightMass * p.gravity! * (start.counterweight[1] - end.counterweight[1]), 10)
  expect(result.energy.projectileOut).toBeCloseTo(p.projectileMass * (result.release!.speed ** 2 / 2 + p.gravity! * end.projectile[1]), 10)
  expect(result.energy.efficiency).toBe(result.energy.projectileOut / result.energy.counterweightIn)
})

it.each([design, medium, { ...design, axleFriction: 0.3, troughFriction: 0.35 }])('converges release speed when halving dt for $counterweightMass kg', p => {
  const coarse = simulateMechanism(p), fine = simulateMechanism(p, 0.0005)
  expect(coarse.released && fine.released).toBe(true)
  expect(Math.abs(coarse.release!.speed / fine.release!.speed - 1)).toBeLessThan(0.001)
  expect(Math.abs(coarse.release!.t - fine.release!.t)).toBeLessThan(0.0001)
})

it('reproduces the published computed vacuum maximum range (reference section 6)', () => {
  const p = { ...benchmark.params, pivotHeight: benchmark.params.longArmLength * Math.cos(0.55) }
  const { fromDeg, toDeg, stepDeg } = benchmark.virtualPinSearch
  const candidates: { pinAngleDeg: number; range: number; result: MechanismResult }[] = []
  // These are virtual releases on the same trajectory, not a fit of friction,
  // inertia, or geometry to a measured field range. Optimize the source policy.
  for (let pinAngleDeg = fromDeg; pinAngleDeg <= toDeg; pinAngleDeg += stepDeg) {
    const result = simulateMechanism({ ...p, pinAngleDeg })
    candidates.push({ pinAngleDeg, result, range: vacuumRange(result, p.gravity) })
  }
  candidates.sort((a, b) => b.range - a.range)
  const best = candidates[0]
  expect(best.pinAngleDeg).toBeGreaterThan(fromDeg)
  expect(best.pinAngleDeg).toBeLessThan(toDeg)
  expect(Math.abs(best.range - benchmark.expectedVacuumRange)).toBeLessThan(benchmark.rangeTolerance)
  const fine = simulateMechanism({ ...p, pinAngleDeg: best.pinAngleDeg }, 0.0005)
  expect(Math.abs(vacuumRange(fine, p.gravity) / best.range - 1)).toBeLessThan(0.001)
})

it('a larger directed tangent alpha opens earlier and increases climb in the reference shot', () => {
  const first = simulateMechanism({ ...benchmark.params, pinAngleDeg: -55 })
  const larger = simulateMechanism({ ...benchmark.params, pinAngleDeg: -50 })
  // Eq (10), on this falling relative-angle branch: dz/dalpha > 0,
  // dz/dt > 0, hence dt_release/dalpha < 0. This is not a universal
  // straight-pin/launch-angle law; the reference explicitly rejects one.
  expect(larger.release!.t).toBeLessThan(first.release!.t)
  expect(larger.release!.angleDeg).toBeGreaterThan(first.release!.angleDeg)
  for (const r of [first, larger]) {
    const s = r.states[r.releaseIndex!]
    const alpha = (r === first ? -55 : -50) * Math.PI / 180
    expect(Math.cos(s.slingAngle - s.armAngle - alpha)).toBeCloseTo(0, 9)
    const prev = r.states[r.releaseIndex! - 1]
    expect(Math.cos(prev.slingAngle - prev.armAngle - alpha)).toBeLessThan(0)
    expect(r.release!.velocity[0]).toBeGreaterThan(0)
  }
})

it('handles a counterweight of 1% of projectile mass without exception or nonfinite states', () => {
  const r = simulateMechanism({ ...design, counterweightMass: design.projectileMass * 0.01 })
  expect(!r.released || r.release!.speed < 1).toBe(true)
  expect(r.states.length).toBeGreaterThan(0)
  for (const s of r.states) for (const value of Object.values(s).flat()) expect(Number.isFinite(value)).toBe(true)
  for (const value of Object.values(r.energy)) expect(Number.isFinite(value)).toBe(true)
})

it('returns a null pose for impossible cocking and starts exactly at the valid cocked pose', () => {
  for (const longArmLength of [design.pivotHeight, design.pivotHeight / 2]) {
    const p = { ...design, longArmLength }
    expect(cockedPose(p)).toBeNull()
    expect(simulateMechanism(p)).toMatchObject({ released: false, states: [], endReason: 'no-release' })
  }
  expect(cockedPose({ ...design, hangerLength: 5 })).toBeNull()
  const pose = cockedPose(design)!
  expect(pose.armTip[0]).toBeLessThan(0)
  expect(pose.armTip[1]).toBe(0)
  expect(pose.projectile).toEqual([pose.armTip[0] + design.slingLength, 0])
  expect(pose.counterweightAngle).toBe(0)
  expect(pose.slingAngle).toBe(0)
  expect(simulateMechanism(design).states[0]).toEqual(pose)
})

it('continues machine motion for 3 seconds after release, without simulating flight', () => {
  const r = simulateMechanism(design), atRelease = r.states[r.releaseIndex!], last = r.states.at(-1)!
  expect(last.t - atRelease.t).toBeCloseTo(3, 10)
  expect(last.armTip).not.toEqual(atRelease.armTip)
  expect(last.projectile).toEqual(atRelease.projectile)
  expect(r.release!.position).toEqual(atRelease.projectile)
  for (let i = 1; i < r.states.length; i++) {
    if (i !== r.releaseIndex) expect(r.states[i].t - r.states[i - 1].t).toBeCloseTo(0.001, 10)
    const s = r.states[i]
    expect(Math.hypot(s.armTip[0], s.armTip[1] - design.pivotHeight)).toBeCloseTo(design.longArmLength, 10)
    expect(Math.hypot(s.counterweight[0] - s.hinge[0], s.counterweight[1] - s.hinge[1])).toBeCloseTo(design.hangerLength, 10)
    if (i < r.releaseIndex!) expect(Math.hypot(s.projectile[0] - s.armTip[0], s.projectile[1] - s.armTip[1])).toBeCloseTo(design.slingLength, 10)
  }
})

it('is deterministic, does not mutate parameters and uses uniform beam/gravity defaults', () => {
  const input = Object.freeze({ ...design }), first = simulateMechanism(input)
  expect(simulateMechanism(input)).toEqual(first)
  expect(input).toEqual(design)
  const { gravity, ...noGravity } = input
  expect(simulateMechanism(noGravity)).toEqual(simulateMechanism({ ...input, gravity: 9.81 }))
  expect(simulateMechanism(input)).toEqual(simulateMechanism({ ...input,
    beamCenterOfMass: (input.longArmLength - input.shortArmLength) / 2,
    beamInertia: input.armMass * (input.longArmLength ** 2 - input.longArmLength * input.shortArmLength + input.shortArmLength ** 2) / 3,
    axleRadius: 0.017, axleStaticFriction: 0, troughStaticFriction: 0,
  }))
})

describe('public caller failure and repair', () => {
  it('reports invalid opening-side arming as no-release; adjusting alpha repairs the shot', () => {
    const invalid = simulateMechanism({ ...design, pinAngleDeg: 90 })
    expect(invalid).toMatchObject({ released: false, endReason: 'no-release' })
    expect(invalid.release).toBeUndefined()
    expect(simulateMechanism(design)).toMatchObject({ released: true, endReason: 'released' })
  })
  it('holds under static axle friction and ends at the 20 s limit', () => {
    const r = simulateMechanism({ ...design, axleFriction: 0.3, axleStaticFriction: 100 }, 0.01)
    expect(r).toMatchObject({ released: false, endReason: 'time-limit' })
    expect(r.states.at(-1)!.t).toBeCloseTo(20, 10)
    expect(r.states.at(-1)!.armAngle).toBeCloseTo(r.states[0].armAngle, 8)
  })
  it.each([0, -1, NaN, Infinity])('returns no-release for unusable dt %s without a loop', dt => {
    expect(simulateMechanism(design, dt)).toMatchObject({ released: false, endReason: 'no-release' })
  })
})
