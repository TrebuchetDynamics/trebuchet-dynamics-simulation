/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import { PARAMETERS } from '../sim/design'
import { strings } from './strings'
import shotSource from '../sim/shot.ts?raw'
import designSource from '../sim/design.ts?raw'

describe('English UI dictionary', () => {
  it('contains every parameter label', () => {
    for (const { labelKey } of Object.values(PARAMETERS)) {
      expect((strings as Record<string, string>)[labelKey]?.length).toBeGreaterThan(0)
    }
  })

  it('contains every emitted shot message and validation code', () => {
    const codes = [...`${shotSource}\n${designSource}`.matchAll(/code: '([A-Z_]+)'/g)].map(match => match[1])
    // The severity-dependent efficiency message uses a branch, not code: literals.
    codes.push('GOOD_EFFICIENCY', 'LOW_EFFICIENCY')
    expect(codes.length).toBeGreaterThanOrEqual(9)
    for (const code of codes) expect((strings as Record<string, string>)[code]?.length, code).toBeGreaterThan(0)
  })
})
