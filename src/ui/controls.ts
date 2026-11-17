import { PARAMETERS } from '../sim/design'
import { text } from './strings'

type Field = keyof typeof PARAMETERS

export function createControls(root: HTMLElement, onPreset: (name: 'small' | 'medium' | 'large') => void, onChange: (field: Field, value: number) => void) {
  const inputs = new Map<Field, HTMLInputElement>()
  const values = new Map<Field, HTMLOutputElement>()
  const errors = new Map<Field, HTMLElement>()
  const presets = document.createElement('fieldset')
  const legend = document.createElement('legend')
  legend.textContent = text('presets')
  presets.append(legend)
  const buttons = new Map<string, HTMLButtonElement>()
  for (const name of ['small', 'medium', 'large'] as const) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = text(name)
    button.addEventListener('click', () => onPreset(name))
    buttons.set(name, button)
    presets.append(button)
  }
  root.append(presets)

  function group(key: string): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset')
    const legend = document.createElement('legend')
    legend.textContent = text(key)
    fieldset.append(legend)
    return fieldset
  }
  const main = group('main'), wind = group('wind'), advanced = document.createElement('details')
  const summary = document.createElement('summary')
  summary.textContent = text('advanced')
  advanced.append(summary)
  root.append(main, wind, advanced)
  const help = document.createElement('p')
  help.textContent = text('windHelp')
  wind.append(help)

  for (const field of Object.keys(PARAMETERS) as Field[]) {
    const parameter = PARAMETERS[field]
    const row = document.createElement('div')
    row.className = 'control'
    const label = document.createElement('label')
    label.htmlFor = field
    label.textContent = text(parameter.labelKey)
    const output = document.createElement('output')
    output.htmlFor = field
    const input = document.createElement('input')
    input.type = 'range'
    input.id = field
    input.min = String(parameter.min)
    input.max = String(parameter.max)
    // Preserve measured preset values in the design/output; only user edits
    // are quantized to the documented slider increment.
    input.step = String(parameter.step)
    const error = document.createElement('p')
    error.id = `${field}-error`
    error.className = 'field-error'
    error.hidden = true
    input.setAttribute('aria-describedby', error.id)
    input.addEventListener('input', () => onChange(field, Number(input.value)))
    row.append(label, output, input, error)
    const parent = field === 'windSpeed' || field === 'windDirectionDeg' ? wind : parameter.level === 'main' ? main : advanced
    parent.append(row)
    inputs.set(field, input)
    values.set(field, output)
    errors.set(field, error)
  }
  return {
    update(current: Record<Field, number>, issues: { field: string; code: string }[], preset?: string) {
      for (const [field, input] of inputs) {
        input.value = String(current[field])
        const unit = PARAMETERS[field].unit
        values.get(field)!.textContent = `${Number(current[field].toFixed(3))} ${unit}`.trim()
        input.setAttribute('aria-valuetext', values.get(field)!.textContent!)
        const issue = issues.find(issue => issue.field === field)
        input.setAttribute('aria-invalid', String(Boolean(issue)))
        const error = errors.get(field)!
        error.hidden = !issue
        error.textContent = issue ? text(issue.code) : ''
        if (issue && advanced.contains(input)) advanced.open = true
      }
      for (const [name, button] of buttons) button.setAttribute('aria-pressed', String(name === preset))
    },
  }
}
