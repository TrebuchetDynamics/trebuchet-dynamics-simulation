import { cockedPose, type MechanismParams } from './mechanism'

export interface Design extends MechanismParams {
  projectileDiameter: number
  dragCoefficient: number
}

export interface Environment {
  windSpeed: number // m/s
  windDirectionDeg: number // 0: tailwind (+x); 90: from the left toward +z
  airDensity: number // kg/m³
}

interface Parameter {
  labelKey: string
  unit: string
  min: number
  max: number
  step: number
  level: 'main' | 'advanced'
}

/** Slider limits, not construction/safety limits. Signed angles/beam offsets
 * and zero friction, drag and wind are valid; masses and lengths are positive.
 * Optional beam/bearing inputs retain mechanism.ts defaults when omitted.
 */
export const PARAMETERS = {
  counterweightMass: { labelKey: 'parameters.counterweightMass', unit: 'kg', min: 0.01, max: 20000, step: 1, level: 'main' },
  projectileMass: { labelKey: 'parameters.projectileMass', unit: 'kg', min: 0.01, max: 200, step: 0.1, level: 'main' },
  longArmLength: { labelKey: 'parameters.longArmLength', unit: 'm', min: 0.1, max: 10, step: 0.01, level: 'main' },
  shortArmLength: { labelKey: 'parameters.shortArmLength', unit: 'm', min: 0.05, max: 3, step: 0.01, level: 'main' },
  slingLength: { labelKey: 'parameters.slingLength', unit: 'm', min: 0.1, max: 10, step: 0.01, level: 'main' },
  pinAngleDeg: { labelKey: 'parameters.pinAngleDeg', unit: '°', min: -180, max: 180, step: 1, level: 'main' },
  armMass: { labelKey: 'parameters.armMass', unit: 'kg', min: 0.1, max: 1000, step: 0.1, level: 'advanced' },
  hangerLength: { labelKey: 'parameters.hangerLength', unit: 'm', min: 0.05, max: 5, step: 0.01, level: 'advanced' },
  pivotHeight: { labelKey: 'parameters.pivotHeight', unit: 'm', min: 0.1, max: 8, step: 0.01, level: 'advanced' },
  axleFriction: { labelKey: 'parameters.axleFriction', unit: '', min: 0, max: 0.5, step: 0.01, level: 'advanced' },
  troughFriction: { labelKey: 'parameters.troughFriction', unit: '', min: 0, max: 0.5, step: 0.01, level: 'advanced' },
  gravity: { labelKey: 'parameters.gravity', unit: 'm/s²', min: 1, max: 20, step: 0.01, level: 'advanced' },
  beamCenterOfMass: { labelKey: 'parameters.beamCenterOfMass', unit: 'm', min: -3, max: 10, step: 0.01, level: 'advanced' },
  beamInertia: { labelKey: 'parameters.beamInertia', unit: 'kg·m²', min: 0.01, max: 20000, step: 0.01, level: 'advanced' },
  axleRadius: { labelKey: 'parameters.axleRadius', unit: 'm', min: 0.001, max: 0.2, step: 0.001, level: 'advanced' },
  axleStaticFriction: { labelKey: 'parameters.axleStaticFriction', unit: '', min: 0, max: 1, step: 0.01, level: 'advanced' },
  troughStaticFriction: { labelKey: 'parameters.troughStaticFriction', unit: '', min: 0, max: 1, step: 0.01, level: 'advanced' },
  projectileDiameter: { labelKey: 'parameters.projectileDiameter', unit: 'm', min: 0.01, max: 1, step: 0.01, level: 'advanced' },
  dragCoefficient: { labelKey: 'parameters.dragCoefficient', unit: '', min: 0, max: 1.5, step: 0.01, level: 'advanced' },
  windSpeed: { labelKey: 'parameters.windSpeed', unit: 'm/s', min: 0, max: 30, step: 0.1, level: 'advanced' },
  windDirectionDeg: { labelKey: 'parameters.windDirectionDeg', unit: '°', min: 0, max: 360, step: 1, level: 'advanced' },
  airDensity: { labelKey: 'parameters.airDensity', unit: 'kg/m³', min: 0, max: 1.5, step: 0.001, level: 'advanced' },
} as const satisfies Record<keyof Design | keyof Environment, Parameter>

const mediumHeight = 3.97 * Math.cos(Math.PI / 6)
const largeArm = 5.30 / Math.cos(Math.PI / 6)

/** Research section 7: source dimensions and masses, with exact derived trough
 * geometry. Beam diameter is not projectile diameter and is not a solver input.
 */
export const PRESETS = {
  small: {
    counterweightMass: 53.9, projectileMass: 0.717, armMass: 4.86,
    longArmLength: 0.975, shortArmLength: 0.250, hangerLength: 0.515,
    slingLength: 0.870, pivotHeight: 0.975 * Math.cos(0.55),
    beamCenterOfMass: 0.465, beamInertia: 1.85, // measured, not uniform-beam defaults
    pinAngleDeg: -45, // Tuned ideal pin tangent, not a measured spigot setting.
    axleFriction: 0, troughFriction: 0, // Tuned lossless bearings/trough, not measured coefficients.
    projectileDiameter: 0.08, dragCoefficient: 0.47, // Tuned spherical projectile/drag; no source area.
  },
  medium: {
    counterweightMass: 2590, projectileMass: 20.7, armMass: 112,
    longArmLength: 3.97, shortArmLength: 0.67, hangerLength: mediumHeight * 2 / 3 - 0.67,
    slingLength: 3.58, pivotHeight: mediumHeight,
    pinAngleDeg: -45, // Tuned ideal pin tangent; source optimizes virtual release.
    axleFriction: 0, troughFriction: 0, // Tuned lossless bearings/trough.
    projectileDiameter: 0.25, dragCoefficient: 0.47, // Tuned spherical projectile/drag; no source area.
  },
  large: {
    counterweightMass: 15700, projectileMass: 101, armMass: 591,
    longArmLength: largeArm, shortArmLength: 7.06 - largeArm,
    hangerLength: 5.30 * 2 / 3 - (7.06 - largeArm), slingLength: 5.57, pivotHeight: 5.30,
    pinAngleDeg: -45, // Tuned ideal pin tangent; source optimizes virtual release.
    axleFriction: 0, troughFriction: 0, // Tuned lossless bearings/trough.
    projectileDiameter: 0.42, dragCoefficient: 0.47, // Tuned spherical projectile/drag; no source area.
  },
} satisfies Record<'small' | 'medium' | 'large', Design>

export function validateDesign(design: Design): { field: string; code: string }[] {
  const errors: { field: string; code: string }[] = []
  const optional = new Set<keyof Design>(['gravity', 'beamCenterOfMass', 'beamInertia', 'axleRadius', 'axleStaticFriction', 'troughStaticFriction'])
  for (const field of Object.keys(PARAMETERS) as (keyof typeof PARAMETERS)[]) {
    if (field === 'windSpeed' || field === 'windDirectionDeg' || field === 'airDensity') continue
    const value = design[field]
    if (value === undefined && optional.has(field)) continue
    const { min, max } = PARAMETERS[field]
    if (!Number.isFinite(value)) errors.push({ field, code: 'NOT_FINITE' })
    else if (value! < min || value! > max) errors.push({ field, code: 'OUT_OF_RANGE' })
  }
  if (errors.length === 0 && cockedPose(design) === null) {
    errors.push({
      field: design.longArmLength <= design.pivotHeight ? 'longArmLength' : 'hangerLength',
      code: 'IMPOSSIBLE_COCKED_POSE',
    })
  }
  return errors
}
