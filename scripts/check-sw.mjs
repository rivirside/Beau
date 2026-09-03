/** The service worker must never serve navigations from the precache alone.
 *
 *  workbox's navigateFallback registers a NavigationRoute bound to a precached
 *  index.html and answers every navigation from it, without consulting the
 *  network. When a later deploy replaces the hashed script and stylesheet that
 *  shell references, the app loads dead HTML forever and reloading cannot
 *  escape it — it took wiping site data by hand to recover. Navigations must be
 *  NetworkFirst so fresh HTML wins whenever the network answers. */

import { readFileSync } from 'node:fs'

const sw = readFileSync('dist/sw.js', 'utf8')
const problems = []

if (sw.includes('createHandlerBoundToURL')) {
  problems.push('sw.js serves navigations from the precache (createHandlerBoundToURL). '
    + 'Set workbox.navigateFallback to null and route navigations with NetworkFirst.')
}
if (!/"navigate"===\w+\.mode/.test(sw) && !/request\.mode\s*===\s*['"]navigate['"]/.test(sw)) {
  problems.push('sw.js has no navigation route at all — navigations will not work offline.')
}
if (!sw.includes('NetworkFirst')) {
  problems.push('sw.js does not use NetworkFirst anywhere; navigations must not be cache-first.')
}

if (problems.length) {
  console.error('service worker check failed:')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log('service worker serves navigations NetworkFirst, with no precached shell')
