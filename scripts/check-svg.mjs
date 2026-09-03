/** Every inline SVG must carry explicit width and height attributes.
 *
 *  Chromium derives a size from the viewBox; Safari does not, and renders an
 *  unsized SVG at its default intrinsic size — which blew a card open to
 *  several hundred pixels on iPhone while every Chromium test passed. Sizing a
 *  replaced element from CSS alone is not portable, so this is a build gate
 *  rather than a convention. */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : []
})

const problems = []
for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8')
  // Each <svg ...> opening tag, with its attributes.
  for (const m of src.matchAll(/<svg\b([^>]*)>/g)) {
    const attrs = m[1]
    if (!/\bwidth=/.test(attrs) || !/\bheight=/.test(attrs)) {
      const line = src.slice(0, m.index).split('\n').length
      problems.push(`${file}:${line} <svg> without explicit width/height`)
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} unsized SVG${problems.length === 1 ? '' : 's'}:`)
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log('every inline SVG carries explicit width and height')
