import { readdir, readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const budget = 300_000
try {
  const directory = new URL('../dist/assets/', import.meta.url)
  const files = (await readdir(directory)).filter(file => file.endsWith('.js'))
  if (files.length === 0) throw new Error('No dist/assets/*.js files; run npm run build first')
  const sizes = await Promise.all(files.map(async file => gzipSync(await readFile(new URL(file, directory))).length))
  const total = sizes.reduce((sum, size) => sum + size, 0)
  console.log(`JavaScript gzip total: ${total} bytes / ${budget} bytes`)
  if (total > budget) {
    console.error('Bundle exceeds 300 kB gzip. Reduce JavaScript imports or dependencies and rebuild.')
    process.exitCode = 1
  }
} catch (error) {
  console.error(`Cannot check bundle size: ${error.message}. Run npm run build first.`)
  process.exitCode = 1
}
