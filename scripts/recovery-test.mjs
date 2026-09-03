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

const mode = process.argv[2] ?? 'missing'
const dir = mkdtempSync(join(tmpdir(), 'beau-broken-'))
cpSync('dist', join(dir, 'Beau'), { recursive: true })

const indexPath = join(dir, 'Beau', 'index.html')
const html = readFileSync(indexPath, 'utf8')
if (mode === 'missing') {
  // A stale cached shell: the script it names is gone from the server.
  writeFileSync(indexPath, html.replace(/src="\/Beau\/assets\/index-[^"]+\.js"/,
    'src="/Beau/assets/index-DELETED0.js"'))
} else {
  // The script loads but throws. Clearing caches can never fix this, so the
  // guard must say so instead of reloading forever.
  const name = html.match(/\/Beau\/assets\/(index-[^"]+\.js)/)[1]
  writeFileSync(join(dir, 'Beau', 'assets', name),
    'throw new Error("simulated startup crash")')
}

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
const detail = (await page.textContent('#boot-detail')).trim()
const msg = (await page.textContent('#boot-msg')).trim()
const hasButton = !!(await page.$('#boot-fix'))

console.log('mode:', mode)
console.log('navigations:', navigations.length)
console.log('attempted cache reset:', healed)
console.log('detail shown:', JSON.stringify(detail.slice(0, 80)))

let ok = hasButton && detail.length > 0
if (mode === 'missing') {
  // A genuinely stale cache is worth clearing exactly once.
  ok = ok && healed && navigations.length === 2 && /could not be loaded/.test(msg)
  console.log(ok ? 'PASS — a dead shell resets its cache once, then explains itself'
                 : 'FAIL — a dead shell did not recover cleanly')
} else {
  // A crash must NOT trigger a reload loop: one navigation, and an honest message.
  ok = ok && !healed && navigations.length === 1 && /crashed while starting/.test(msg)
       && /simulated startup crash/.test(detail)
  console.log(ok ? 'PASS — a crash reports the real error without looping'
                 : 'FAIL — a crash looped or hid its cause')
}

await browser.close()
server.close()
rmSync(dir, { recursive: true, force: true })
process.exit(ok ? 0 : 1)
