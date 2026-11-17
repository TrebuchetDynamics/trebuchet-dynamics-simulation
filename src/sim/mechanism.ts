export interface MechanismParams {
  counterweightMass: number; projectileMass: number; armMass: number
  longArmLength: number; shortArmLength: number
  hangerLength: number; slingLength: number; pivotHeight: number
  /** Directed pin-exit tangent alpha in reference equation (10), in degrees,
   * NOT the unsigned sling/arm angle. Release is the negative-to-positive
   * cos(slingAngle - armAngle - alpha) crossing with positive tension.
   * For a source geometry reflected in x, negate alpha as well.
   */
  pinAngleDeg: number
  axleFriction: number; troughFriction: number
  gravity?: number
  /** Optional measured beam properties; defaults are a uniform thin beam. */
  beamCenterOfMass?: number; beamInertia?: number
  /** Effective journal radius (m); .017 is the reference experimental axle. */
  axleRadius?: number
  /** Static coefficients default to the respective kinetic coefficients. */
  axleStaticFriction?: number; troughStaticFriction?: number
}

type Vec = [number, number]
export interface MechanismState {
  t: number; armAngle: number; counterweightAngle: number; slingAngle: number
  armTip: Vec; hinge: Vec; projectile: Vec; counterweight: Vec
}
export interface MechanismResult {
  states: MechanismState[]
  releaseIndex?: number
  released: boolean
  release?: { t: number; position: Vec; velocity: Vec; speed: number; angleDeg: number }
  energy: { counterweightIn: number; projectileOut: number; axleLoss: number; troughLoss: number; remaining: number; efficiency: number }
  endReason: 'released' | 'no-release' | 'projectile-left-trough-backward' | 'time-limit'
}

type Phase = 'trough' | 'free' | 'detached'
// Reference symbols: a,b,c,s = arm lengths, hanger, sling; M,m,mb = masses;
// theta = armAngle, psi = counterweightAngle - pi/2, phi = slingAngle.
// q = [theta, psi, phi, thetaDot, psiDot, phiDot, axleWork, troughWork].
type Model = ReturnType<typeof model>
function model(p: MechanismParams) {
  const a = p.longArmLength, b = p.shortArmLength
  return { a, b, c: p.hangerLength, s: p.slingLength, h: p.pivotHeight,
    M: p.counterweightMass, m: p.projectileMass, mb: p.armMass, g: p.gravity ?? 9.81,
    d: p.beamCenterOfMass ?? (a - b) / 2,
    I: p.beamInertia ?? p.armMass * (a * a - a * b + b * b) / 3,
    muA: p.axleFriction, muT: p.troughFriction, radius: p.axleRadius ?? 0.017,
    staticA: p.axleStaticFriction ?? p.axleFriction, staticT: p.troughStaticFriction ?? p.troughFriction,
    alpha: p.pinAngleDeg * Math.PI / 180 }
}

export function cockedPose(params: MechanismParams): MechanismState | null {
  const p = model(params)
  if (p.a <= p.h || p.h + p.b * p.h / p.a - p.c <= 0) return null
  const theta = -Math.PI + Math.asin(p.h / p.a)
  const state = snapshot(p, [theta, -Math.PI / 2, 0, 0, 0, 0, 0, 0], 0, 'trough')
  state.armTip[1] = 0
  state.projectile = [state.armTip[0] + p.s, 0]
  state.slingAngle = 0
  return state
}

function geometry(p: Model, q: number[], phase: Phase) {
  const [th, ps] = q, w = q[3], v = q[4]
  const B: Vec = [p.a * Math.cos(th), p.h + p.a * Math.sin(th)]
  let ph = q[2], J = 0, K = 0
  if (phase === 'trough') {
    const root = Math.sqrt(p.s * p.s - B[1] * B[1])
    ph = Math.atan2(-B[1], root)
    J = -p.a * Math.sin(th) - B[1] * p.a * Math.cos(th) / root
    K = -p.a * Math.cos(th) - ((p.a * Math.cos(th)) ** 2 - B[1] * p.a * Math.sin(th)) / root
      - (B[1] * p.a * Math.cos(th)) ** 2 / root ** 3
  }
  const H: Vec = [-p.b * Math.cos(th), p.h - p.b * Math.sin(th)]
  const W: Vec = [H[0] + p.c * Math.cos(ps), H[1] + p.c * Math.sin(ps)]
  const r: Vec = [B[0] + p.s * Math.cos(ph), phase === 'trough' ? 0 : B[1] + p.s * Math.sin(ph)]
  const vw: Vec = [p.b * Math.sin(th) * w - p.c * Math.sin(ps) * v, -p.b * Math.cos(th) * w + p.c * Math.cos(ps) * v]
  const vr: Vec = phase === 'trough' ? [J * w, 0]
    : [-p.a * Math.sin(th) * w - p.s * Math.sin(ph) * q[5], p.a * Math.cos(th) * w + p.s * Math.cos(ph) * q[5]]
  return { B, H, W, r, vw, vr, ph, J, K }
}

function snapshot(p: Model, q: number[], t: number, phase: Phase): MechanismState {
  const k = geometry(p, q, phase)
  return { t, armAngle: q[0], counterweightAngle: q[1] + Math.PI / 2, slingAngle: k.ph,
    armTip: k.B, hinge: k.H, projectile: k.r, counterweight: k.W }
}

// Small dense systems are the reduced form of reference equations (3)-(6).
function solve(matrix: number[][], rhs: number[]): number[] {
  const a = matrix.map((row, i) => [...row, rhs[i]])
  for (let i = 0; i < rhs.length; i++) {
    let pivot = i
    for (let j = i + 1; j < rhs.length; j++) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j
    ;[a[i], a[pivot]] = [a[pivot], a[i]]
    const div = a[i][i]
    for (let k = i; k <= rhs.length; k++) a[i][k] /= div
    for (let j = 0; j < rhs.length; j++) if (j !== i) {
      const factor = a[j][i]
      for (let k = i; k <= rhs.length; k++) a[j][k] -= factor * a[i][k]
    }
  }
  return a.map(row => row[rhs.length])
}

function dynamics(p: Model, q: number[], phase: Phase) {
  const [th, ps, , w, v, f] = q
  const k = geometry(p, q, phase), ph = k.ph
  const cross = p.M * p.b * p.c, delta = th - ps
  const A = p.I + p.M * p.b ** 2, B = -cross * Math.cos(delta), D = p.M * p.c ** 2
  const rhs0 = cross * Math.sin(delta) * v * v - p.g * (p.mb * p.d - p.M * p.b) * Math.cos(th)
  const rhs1 = -cross * Math.sin(delta) * w * w - p.M * p.g * p.c * Math.cos(ps)
  const ux = Math.cos(ph), uy = Math.sin(ph)
  // Solve sliding friction simultaneously with normal force; static force is
  // the force needed for zero projectile acceleration, when admissible.
  function acceleration(tau: number, mode: number | 'stick') {
    let acc: number[], Ft = 0
    if (phase === 'trough') {
      const row = mode === 'stick' ? [k.J, 0, 0] : [-Number(mode) * uy * p.m * k.J / ux, 0, 1 + Number(mode) * uy / ux]
      const target = mode === 'stick' ? -k.K * w * w : -Number(mode) * p.m * p.g + Number(mode) * uy * p.m * k.K * w * w / ux
      acc = solve([[A + p.m * k.J ** 2, B, -k.J], [B, D, 0], row],
        [rhs0 - p.m * k.J * k.K * w * w + tau, rhs1, target])
      Ft = acc[2]; acc[2] = 0
    } else if (phase === 'free') {
      const C = p.m * p.a * p.s * Math.cos(th - ph)
      acc = solve([[A + p.m * p.a ** 2, B, C], [B, D, 0], [C, 0, p.m * p.s ** 2]],
        [rhs0 - p.m * p.g * p.a * Math.cos(th) - p.m * p.a * p.s * Math.sin(th - ph) * f * f + tau,
          rhs1, p.m * p.a * p.s * Math.sin(th - ph) * w * w - p.m * p.g * p.s * Math.cos(ph)])
    } else {
      acc = [...solve([[A, B], [B, D]], [rhs0 + tau, rhs1]), 0]
    }
    const [aa, ap, af] = acc
    const bx = p.a * (-Math.sin(th) * aa - Math.cos(th) * w * w)
    const by = p.a * (Math.cos(th) * aa - Math.sin(th) * w * w)
    const wx = -p.b / p.a * bx + p.c * (-Math.sin(ps) * ap - Math.cos(ps) * v * v)
    const wy = -p.b / p.a * by + p.c * (Math.cos(ps) * ap - Math.sin(ps) * v * v)
    const rx = phase === 'trough' ? k.J * aa + k.K * w * w : bx - p.s * (Math.sin(ph) * af + Math.cos(ph) * f * f)
    const ry = phase === 'trough' ? 0 : by + p.s * (Math.cos(ph) * af - Math.sin(ph) * f * f)
    const S = phase === 'trough' ? (Ft - p.m * rx) / ux
      : phase === 'free' ? p.m * (p.s * f * f - ux * bx - uy * by - p.g * uy) : 0
    const N = phase === 'trough' ? p.m * p.g + S * uy : 0
    const attached = phase !== 'detached'
    const R = Math.hypot(p.mb * p.d / p.a * bx + p.M * wx + (attached ? p.m * rx - Ft : 0),
      p.mb * p.d / p.a * by + p.M * wy + (p.mb + p.M) * p.g + (attached ? p.m * ry + p.m * p.g - N : 0))
    return { acc, Ft, S, N, R }
  }
  function contact(tau: number) {
    if (phase !== 'trough' || p.muT === 0) return acceleration(tau, 0)
    if (Math.abs(k.vr[0]) < 1e-9) {
      const held = acceleration(tau, 'stick')
      if (Math.abs(held.Ft) <= p.staticT * Math.max(0, held.N)) return held
    }
    const direction = Math.sign(k.vr[0]) || Math.sign(k.J * acceleration(tau, 0).acc[0] + k.K * w * w)
    return acceleration(tau, p.muT * direction)
  }
  let tau = 0, motion = contact(0)
  if (p.muA > 0) {
    // Reaction depends on the unknown acceleration: iterate the journal law,
    // not a fixed counterweight-load approximation. At rest try static hold.
    if (Math.abs(w) < 1e-9) {
      const response = contact(1).acc[0] - motion.acc[0]
      const holding = -motion.acc[0] / response
      const held = contact(holding)
      if (Math.abs(holding) <= p.staticA * p.radius * held.R) {
        tau = holding; motion = held
        return { ...motion, tau, k }
      }
    }
    const direction = Math.sign(w) || Math.sign(motion.acc[0])
    for (let i = 0; i < 80; i++) {
      const desired = -p.muA * p.radius * motion.R * direction
      if (Math.abs(desired - tau) < 1e-10 * (1 + Math.abs(tau))) break
      tau = (tau + desired) / 2
      motion = contact(tau)
    }
  }
  return { ...motion, tau, k }
}

function derivative(p: Model, q: number[], phase: Phase): number[] {
  const d = dynamics(p, q, phase)
  return [q[3], q[4], phase === 'free' ? q[5] : 0, ...d.acc,
    Math.max(0, -d.tau * q[3]), Math.max(0, -d.Ft * d.k.vr[0])]
}
function step(p: Model, q: number[], dt: number, phase: Phase) {
  const add = (a: number[], scale: number) => q.map((v, i) => v + scale * a[i])
  const a = derivative(p, q, phase), b = derivative(p, add(a, dt / 2), phase)
  const c = derivative(p, add(b, dt / 2), phase), d = derivative(p, add(c, dt), phase)
  return q.map((v, i) => v + dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6)
}

function energy(p: Model, initial: number[], q: number[], phase: Phase): MechanismResult['energy'] {
  const start = geometry(p, initial, 'trough'), now = geometry(p, q, phase)
  const counterweightIn = p.M * p.g * (start.W[1] - now.W[1])
  const projectileOut = p.m * (now.vr[0] ** 2 + now.vr[1] ** 2) / 2 + p.m * p.g * (now.r[1] - start.r[1])
  const remaining = p.I * q[3] ** 2 / 2 + p.M * (now.vw[0] ** 2 + now.vw[1] ** 2) / 2
    + p.mb * p.g * p.d * (Math.sin(q[0]) - Math.sin(initial[0]))
  return { counterweightIn, projectileOut, axleLoss: q[6], troughLoss: q[7], remaining,
    efficiency: counterweightIn > 0 ? projectileOut / counterweightIn : 0 }
}

/** Pure planar solver. Slack/recontact/invalid arming are unsupported: no-release.
 * RK4 uses dt (default 1 ms), shortening only event endpoints. Animation samples
 * use dt, except the localized release sample; thereafter there are 3 seconds of
 * machine-only motion. Projectile positions are held at release (flight.ts owns flight).
 */
export function simulateMechanism(params: MechanismParams, dt = 0.001): MechanismResult {
  const p = model(params), pose = cockedPose(params)
  let q = [pose?.armAngle ?? 0, -Math.PI / 2, 0, 0, 0, 0, 0, 0]
  const initial = [...q]
  let phase: Phase = 'trough', t = 0
  const states: MechanismState[] = pose ? [pose] : []
  const empty = { counterweightIn: 0, projectileOut: 0, axleLoss: 0, troughLoss: 0, remaining: 0, efficiency: 0 }
  let result: MechanismResult = { states, released: false, energy: empty, endReason: 'no-release' }
  const z = (state: number[], ph: Phase) => Math.cos(geometry(p, state, ph).ph - state[0] - p.alpha)
  if (!pose || !(dt > 0 && Number.isFinite(dt)) || z(q, phase) >= 0) return result
  // Event localization reintegrates from the left endpoint, preserving constraint
  // and velocity consistency rather than interpolating Cartesian coordinates.
  function root(left: number[], duration: number, eventPhase: Phase, kind: 'lift' | 'release') {
    let lo = 0, hi = duration
    for (let i = 0; i < 35; i++) {
      const mid = (lo + hi) / 2, trial = step(p, left, mid, eventPhase)
      const before = kind === 'lift' ? dynamics(p, trial, eventPhase).N > 0 : z(trial, eventPhase) < 0
      if (before) lo = mid; else hi = mid
    }
    return hi
  }
  while (t < 20 - 1e-12) {
    const h = Math.min(dt, 20 - t)
    let left = q, leftTime = t
    let eventPhase: Phase = phase
    let next = step(p, left, h, eventPhase)
    if (!next.every(Number.isFinite)) break
    if (phase === 'trough' && dynamics(p, next, phase).N < 0) {
      const liftTime = root(left, h, phase, 'lift')
      left = step(p, left, liftTime, phase)
      const k = geometry(p, left, phase)
      left[2] = k.ph
      left[5] = -p.a * Math.cos(left[0]) * left[3] / (p.s * Math.cos(k.ph))
      leftTime += liftTime
      eventPhase = 'free'
      next = step(p, left, t + h - leftTime, eventPhase)
    }
    if (!next.every(Number.isFinite)) break
    const motion = dynamics(p, next, eventPhase)
    if (motion.S < -1e-7 || (eventPhase === 'free' && motion.k.r[1] < -1e-7)) break
    if (eventPhase === 'trough' && motion.k.B[1] < -1e-7) {
      result.endReason = 'projectile-left-trough-backward'; break
    }
    if (eventPhase === 'free' && z(left, eventPhase) < 0 && z(next, eventPhase) >= 0 && motion.S > 0) {
      const releaseDt = root(left, t + h - leftTime, eventPhase, 'release')
      q = step(p, left, releaseDt, eventPhase); t = leftTime + releaseDt
      phase = eventPhase
      const k = geometry(p, q, phase)
      const state = snapshot(p, q, t, phase)
      states.push(state)
      result = { states, released: true, releaseIndex: states.length - 1, endReason: 'released',
        release: { t, position: [...k.r], velocity: [...k.vr], speed: Math.hypot(...k.vr), angleDeg: Math.atan2(k.vr[1], k.vr[0]) * 180 / Math.PI },
        energy: energy(p, initial, q, phase) }
      phase = 'detached'
      const releaseTime = t
      for (let i = 1; (i - 1) * dt < 3 - 1e-12; i++) {
        const elapsed = Math.min(i * dt, 3), previous = Math.min((i - 1) * dt, 3)
        q = step(p, q, elapsed - previous, phase)
        const detached = snapshot(p, q, releaseTime + elapsed, phase)
        detached.projectile = [...k.r]
        states.push(detached)
      }
      return result
    }
    q = next; t += h; phase = eventPhase
    states.push(snapshot(p, q, t, phase))
    if (t >= 20 - 1e-12) result.endReason = 'time-limit'
  }
  result.energy = energy(p, initial, q, phase)
  return result
}
