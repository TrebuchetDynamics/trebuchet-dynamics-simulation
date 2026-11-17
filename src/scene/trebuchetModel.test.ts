import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { PRESETS } from '../sim/design'
import { cockedPose } from '../sim/mechanism'
import { simulateShot } from '../sim/shot'
import { applyMechanismState, buildTrebuchetModel } from './trebuchetModel'

const calm = { windSpeed: 0, windDirectionDeg: 0, airDensity: 1.225 }

describe('design-driven primitives', () => {
  it.each([PRESETS.small, PRESETS.large])('builds metre-scaled arm, sling and pivot ($pivotHeight m)', design => {
    const model = buildTrebuchetModel(design)
    expect(model.arm.scale.y).toBeCloseTo(design.longArmLength + design.shortArmLength, 6)
    expect(model.sling.scale.y).toBeCloseTo(design.slingLength, 6)
    expect(model.pivot.position.y).toBeCloseTo(design.pivotHeight, 6)
    const pose = cockedPose(design)!
    const tip = new Vector3(0, 0.5, 0).applyQuaternion(model.arm.quaternion)
      .multiplyScalar(model.arm.scale.y).add(model.arm.position)
    expect(tip.distanceTo(new Vector3(...pose.armTip, 0))).toBeLessThan(1e-6)
  })

  it('maps solver positions, including the projectile, without running physics', () => {
    const shot = simulateShot(PRESETS.medium, calm)
    const state = shot.mechanism.states[shot.mechanism.releaseIndex!]
    const model = buildTrebuchetModel(PRESETS.medium)
    applyMechanismState(model, state)
    expect(model.projectile.position.distanceTo(new Vector3(...state.projectile, 0))).toBeLessThan(1e-6)
    expect(model.counterweight.position.distanceTo(new Vector3(...state.counterweight, 0))).toBeLessThan(1e-6)
    const hinge = new Vector3(0, -0.5 * model.arm.scale.y, 0)
      .applyQuaternion(model.arm.quaternion).add(model.arm.position)
    expect(hinge.distanceTo(new Vector3(...state.hinge, 0))).toBeLessThan(1e-6)
    expect(model.hanger.scale.y).toBeCloseTo(PRESETS.medium.hangerLength, 6)
  })

  it('rejects impossible cocked geometry and accepts a repaired preset', () => {
    expect(() => buildTrebuchetModel({ ...PRESETS.small, pivotHeight: 10 }))
      .toThrow('Design cannot form a cocked pose')
    expect(() => buildTrebuchetModel(PRESETS.small)).not.toThrow()
  })
})
