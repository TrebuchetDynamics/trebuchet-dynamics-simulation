import { describe, expect, it } from 'vitest'
import { PARAMETERS, PRESETS, validateDesign, type Design, type Environment } from './design'
import { cockedPose } from './mechanism'

const environmentFields: (keyof Environment)[] = ['windSpeed', 'windDirectionDeg', 'airDensity']
const designFields = (Object.keys(PARAMETERS) as (keyof typeof PARAMETERS)[])
  .filter((field): field is keyof Design => !environmentFields.includes(field as keyof Environment))

it('has metadata for every design/environment field and exactly six main controls', () => {
  const fields: Record<keyof Design | keyof Environment, true> = {
    counterweightMass: true, projectileMass: true, armMass: true, longArmLength: true,
    shortArmLength: true, hangerLength: true, slingLength: true, pivotHeight: true,
    pinAngleDeg: true, axleFriction: true, troughFriction: true, gravity: true,
    beamCenterOfMass: true, beamInertia: true, axleRadius: true,
    axleStaticFriction: true, troughStaticFriction: true, projectileDiameter: true,
    dragCoefficient: true, windSpeed: true, windDirectionDeg: true, airDensity: true,
  }
  expect(Object.keys(PARAMETERS).sort()).toEqual(Object.keys(fields).sort())
  expect(Object.entries(PARAMETERS).filter(([, p]) => p.level === 'main').map(([field]) => field).sort()).toEqual([
    'counterweightMass', 'projectileMass', 'longArmLength', 'shortArmLength', 'slingLength', 'pinAngleDeg',
  ].sort())
  for (const p of Object.values(PARAMETERS)) {
    expect(p.labelKey).toBeTruthy()
    expect(typeof p.unit).toBe('string')
    expect(p.min).toBeLessThan(p.max)
    expect(p.step).toBeGreaterThan(0)
    expect(p.step).toBeLessThanOrEqual(p.max - p.min)
  }
})

it.each(designFields)('rejects nonfinite and out-of-range %s values', field => {
  for (const value of [NaN, Infinity, -Infinity]) {
    expect(validateDesign({ ...PRESETS.small, [field]: value })).toContainEqual({ field, code: 'NOT_FINITE' })
  }
  const { min, max, step } = PARAMETERS[field]
  for (const value of [min - step, max + step]) {
    expect(validateDesign({ ...PRESETS.small, [field]: value })).toContainEqual({ field, code: 'OUT_OF_RANGE' })
  }
})

it('allows omitted solver defaults, signed pin/beam offsets and zero losses/drag', () => {
  expect(validateDesign({ ...PRESETS.medium, beamCenterOfMass: -0.1, pinAngleDeg: -45, dragCoefficient: 0 })).toEqual([])
  expect(validateDesign(PRESETS.medium)).toEqual([])
})

it('reports impossible cocking but does not reject merely poor performance', () => {
  for (const design of [
    { ...PRESETS.small, pivotHeight: 1 },
    { ...PRESETS.small, hangerLength: 2 },
  ]) {
    expect(cockedPose(design)).toBeNull()
    expect(validateDesign(design)).toContainEqual(expect.objectContaining({ code: 'IMPOSSIBLE_COCKED_POSE' }))
  }
  expect(validateDesign({ ...PRESETS.small, pinAngleDeg: 90 })).toEqual([])
  expect(validateDesign({ ...PRESETS.small, counterweightMass: 0.01 })).toEqual([])
})

describe('section 7 source-backed preset values', () => {
  it('retains measured small-machine geometry and beam properties', () => {
    expect(PRESETS.small).toMatchObject({
      longArmLength: 0.975, shortArmLength: 0.25, hangerLength: 0.515, slingLength: 0.87,
      counterweightMass: 53.9, armMass: 4.86, projectileMass: 0.717, beamCenterOfMass: 0.465, beamInertia: 1.85,
    })
    expect(PRESETS.small.pivotHeight).toBe(0.975 * Math.cos(0.55))
  })
  it('uses the section 7 completion rules for theoretical size classes', () => {
    expect(PRESETS.medium).toMatchObject({ longArmLength: 3.97, shortArmLength: 0.67, slingLength: 3.58, counterweightMass: 2590, armMass: 112, projectileMass: 20.7 })
    expect(PRESETS.large).toMatchObject({ pivotHeight: 5.30, slingLength: 5.57, counterweightMass: 15700, armMass: 591, projectileMass: 101 })
    expect(PRESETS.large.longArmLength + PRESETS.large.shortArmLength).toBe(7.06)
    for (const preset of [PRESETS.medium, PRESETS.large]) {
      expect(preset.pivotHeight).toBe(preset.longArmLength * Math.cos(Math.PI / 6))
      expect(preset.hangerLength).toBe(preset.pivotHeight * 2 / 3 - preset.shortArmLength)
    }
  })
})
