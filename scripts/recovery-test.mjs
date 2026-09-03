/** Proves the boot guard in index.html recovers a stale shell.
 *
 *  The failure it defends against — a cached index.html pointing at a hashed
 *  script the server has replaced — cannot happen in a fresh browser, so it is
 *  simulated by serving a copy of dist whose script tag points at a file that
 *  does not exist. */

import { chromium } from 'playwright'
import { cpSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { extname } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'beau-broken-'))
cpSync('dist', join(dir, 'Beau'), { recursive: true })

// Point the shell at a script that is gone, exactly as a stale cache would.
const indexPath = join(dir, 'Beau', 'index.html')
const html = readFileSync(indexPath, 'utf8')
writeFileSync(indexPath, html.replace(/src="\/Beau\/assets\/index-[^"]+\.js"/,
  'src="/Beau/assets/index-DELETED0.js"'))

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
const server = createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0])
  if (rel.endsWith('/')) rel += 'index.html'          // directory index
  const path = join(dir, rel)
  try {
    const body = readFileSync(path)
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    res.end(body)
  } catch { res.writeHead(404); res.end('not found') }
})
await new Promise((r) => server.listen(4174, r))

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const navigations = []
page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigations.push(f.url()) })
page.on('console', (m) => console.log('  [console]', m.type(), m.text()))
page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 120)))
page.on('requestfailed', (r) => console.log('  [failed]', r.url().split('/').pop()))
page.on('response', (r) => { if (r.status() >= 400) console.log('  [http]', r.status(), r.url().split('/').pop()) })

await page.goto('http://localhost:4174/Beau/', { waitUntil: 'domcontentloaded' })
// The guard should self-heal (one reload) and then, still broken, say so.
await page.waitForSelector('#boot', { state: 'visible', timeout: 45000 })

const healed = navigations.some((u) => u.includes('heal='))
const message = (await page.textContent('#boot h1')).trim()
const hasButton = !!(await page.$('#boot-fix'))

console.log('navigations:', navigations.length)
console.log('attempted self-heal:', healed)
console.log('fallback shown:', JSON.stringify(message), '| button:', hasButton)

const ok = healed && message === 'Beau could not start' && hasButton
console.log(ok ? 'PASS — a dead shell heals once, then offers a way out'
               : 'FAIL — a dead shell left the user with a white screen')

await browser.close()
server.close()
rmSync(dir, { recursive: true, force: true })
process.exit(ok ? 0 : 1)
