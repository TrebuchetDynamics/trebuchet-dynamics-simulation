import { describe, expect, it } from 'vitest'
import { CHALLENGES, evaluateShot } from './challenge'
import { simulateShot } from '../sim/shot'
import { PRESETS } from '../sim/design'

const shot = simulateShot(PRESETS.medium, { windSpeed: 0, windDirectionDeg: 0, airDensity: 1.225 })
const target = { distance: 100, lateral: 20, radius: 5 }
function landing(x: number, z: number) {
  return { ...shot, flight: { ...shot.flight!, landing: { ...shot.flight!.landing, position: [x, 0, z] as [number, number, number] } } }
}

describe('target challenge scoring in pivot-ground x/z coordinates', () => {
  it('awards 150 for a centre hit', () => {
    expect(evaluateShot(landing(100, 20), target, 1)).toMatchObject({ hit: true, points: 150, distance: 0 })
  })
  it('includes the edge with no accuracy bonus', () => {
    expect(evaluateShot(landing(103, 24), target, 1)).toMatchObject({ hit: true, points: 100, distance: 5 })
  })
  it('awards nothing for a miss and reports signed direction offsets', () => {
    expect(evaluateShot(landing(94, 28), target, 1)).toEqual({ hit: false, points: 0, distance: 10, forward: -6, lateral: 8 })
  })
  it('penalizes the fifth shot by 40 and linearly reduces the bonus', () => {
    expect(evaluateShot(landing(100, 20), target, 5)?.points).toBe(110)
    expect(evaluateShot(landing(100, 22.5), target, 5)?.points).toBe(85)
  })
  it('floors the base score at 10, not the accuracy bonus', () => {
    expect(evaluateShot(landing(103, 24), target, 30)?.points).toBe(10)
    expect(evaluateShot(landing(100, 20), target, 30)?.points).toBe(60)
  })
  it('does not invent a landing for a failed flight', () => {
    expect(evaluateShot({ ...shot, flight: undefined }, target, 1)).toBeNull()
  })
  it('provides ten increasingly distant targets, lateral offsets and set winds', () => {
    expect(CHALLENGES).toHaveLength(10)
    expect(CHALLENGES.every((target, i) => !i || target.distance > CHALLENGES[i - 1].distance)).toBe(true)
    expect(CHALLENGES.some(target => target.lateral !== 0)).toBe(true)
    expect(CHALLENGES.some(target => target.wind !== undefined)).toBe(true)
  })
})
