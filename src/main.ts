import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './style.css'
import { theme } from './theme'
import { mountWidget } from './ui/app'

for (const [name, value] of Object.entries(theme)) {
  document.documentElement.style.setProperty(`--${name}`, value)
}
const embed = new URLSearchParams(location.search).get('embed') === '1'
mountWidget(document.querySelector<HTMLElement>('#app')!, embed)
