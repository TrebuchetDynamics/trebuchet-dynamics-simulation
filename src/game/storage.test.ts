import { afterEach, expect, it, vi } from 'vitest'
import { loadState, saveState, STORAGE_KEY } from './storage'
import { PRESETS } from '../sim/design'

afterEach(() => vi.unstubAllGlobals())

it('returns defaults and never throws when even the localStorage getter throws', () => {
  vi.stubGlobal('localStorage', undefined)
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('denied') } })
  expect(loadState()).toEqual({ highScore: 0, design: PRESETS.medium })
  expect(() => saveState({ highScore: 150, design: PRESETS.small })).not.toThrow()
})

it('returns defaults when storage methods throw', () => {
  vi.stubGlobal('localStorage', { getItem() { throw new Error('denied') }, setItem() { throw new Error('quota') } })
  expect(loadState()).toEqual({ highScore: 0, design: PRESETS.medium })
  expect(() => saveState({ highScore: 150, design: PRESETS.small })).not.toThrow()
})

it('saves high score and last design together under the versioned key', () => {
  const setItem = vi.fn()
  const state = { highScore: 142.5, design: PRESETS.small }
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(state), setItem })
  expect(STORAGE_KEY).toBe('trebuchet-sim:v1')
  expect(loadState()).toEqual(state)
  saveState(state)
  expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(state))
})

it.each(['{', 'null', '{}', '{"highScore":-1}', JSON.stringify({ highScore: 2, design: { ...PRESETS.medium, longArmLength: 0 } })])('rejects invalid saved state %s', value => {
  vi.stubGlobal('localStorage', { getItem: () => value })
  expect(loadState()).toEqual({ highScore: 0, design: PRESETS.medium })
})
