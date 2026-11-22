import { PRESETS, validateDesign, type Design } from '../sim/design'

export const STORAGE_KEY = 'trebuchet-sim:v1'
export interface SavedState { highScore: number; design: Design }

export function loadState(): SavedState {
  const defaults = { highScore: 0, design: { ...PRESETS.medium } }
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!value || typeof value.highScore !== 'number' || !Number.isFinite(value.highScore) || value.highScore < 0 ||
      !value.design || validateDesign(value.design).length) return defaults
    return { highScore: value.highScore, design: value.design }
  } catch {
    return defaults
  }
}

export function saveState(state: SavedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private browsing, blocked storage and quota failures leave the app usable.
  }
}
