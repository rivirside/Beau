import { chromium } from 'playwright'

const base = 'http://localhost:4173/Beau/'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))
const step = (n, msg) => console.log(`${String(n).padStart(2)}. ${msg}`)

await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForSelector('h1.large-title')
step(1, 'setup: ' + await page.textContent('h1.large-title'))
await page.click('text=Continue')                       // welcome → you
await page.click('text=Intermediate')
await page.click('text=Continue')                       // you → week
await page.click('text=Upper / Lower × 4')
await page.click('text=Continue')                       // week → gym
await page.click('text=Commercial gym')
await page.click('text=Continue')                       // gym → lifts
const anchors = await page.$$eval('.row .label > span:first-child', (n) => n.map((x) => x.textContent))
step(2, 'anchor lifts offered: ' + anchors.join(' | '))
const w = await page.$$('input[placeholder="lb"]'); const r = await page.$$('input[placeholder="reps"]')
await w[0].fill('185'); await r[0].fill('5')             // seed the squat
await page.click('text=Start training')
await page.waitForSelector('h1.large-title:has-text("Today")')
await page.waitForTimeout(600)
const proposed = await page.$$eval('.group-header:has-text("Proposed session") + .group .row .label > span:first-child', (n) => n.map((x) => x.textContent))
step(3, `proposal (${proposed.length}): ` + proposed.slice(0, 4).join(' | '))
const subs = await page.$$eval('.group-header:has-text("Proposed session") + .group .row .label .sub', (n) => n.map((x) => x.textContent))
step(4, 'seeded squat not a cold start: ' + (subs.some((s) => s.includes('185') || s.includes('180') || s.includes('175')) ? 'yes' : 'not in this proposal (' + subs[0] + ')'))

// push into an exercise, swap it, come back
await page.click('.group-header:has-text("Proposed session") + .group .row >> nth=0')
await page.waitForSelector('text=Swap for something similar')
step(5, 'exercise page: ' + await page.textContent('h1.large-title'))
await page.click('text=Swap for something similar')
await page.waitForSelector('h1.large-title:has-text("Alternatives")')
const alts = await page.$$eval('.group .row', (n) => n.length)
await page.click('.group .row >> nth=0')
await page.waitForSelector('h1.large-title:has-text("Today")')
step(6, `swapped via ${alts} alternatives, back on Today`)

// reject one for today via the action sheet
await page.click('.group-header:has-text("Proposed session") + .group .row >> nth=1')
await page.click('text=Not this one…')
await page.click('text=Not today — find something else')
await page.waitForSelector('h1.large-title:has-text("Today")')
step(7, 'rejected for today, refilled')

await page.click('button.btn.primary')
await page.waitForSelector('h1.large-title:has-text("Session")')
const reps = await page.$$('input[placeholder="reps"]'); await reps[0].fill('8')
const wt = await page.$('.set-grid input[placeholder="weight?"], .set-grid input[placeholder="lb"]'); await wt.fill('90')
await page.click('.set-grid .go')
await page.waitForSelector('.timer')
step(8, 'logged a set, rest timer ' + (await page.textContent('.timer')).trim() + ', card: ' + (await page.$('.card-face') ? 'yes' : 'no'))
await page.click('text=Skip rest')
await page.click('text=Finish session')
await page.waitForSelector('.tabbar')

await page.click('.tabbar button:has-text("Progress")')
await page.waitForSelector('h1.large-title:has-text("Progress")')
const rec = await page.$$eval('.group-header:has-text("Recovery") + .group .row-custom', (n) => n.length)
step(9, `progress: ${rec} muscles recovering after that set (must be > 0)`)
if (rec === 0) { errors.push('a logged weighted set produced no recovery state') }

await page.click('.tabbar button:has-text("Learn")')
await page.click('text=Thigh')
await page.waitForSelector('h1.large-title:has-text("Thigh")')
await page.click('text=Rectus femoris')
await page.waitForSelector('text=Antagonists')
step(10, 'learn → region → muscle → antagonists derived')
await page.goBack(); await page.goBack()
await page.waitForSelector('h1.large-title:has-text("Learn")')
step(11, 'browser back pops pages')

await page.click('.tabbar button:has-text("Settings")')
await page.click('text=Updates')
await page.click('text=Check for updates')
await page.waitForSelector('text=latest version', { timeout: 8000 })
step(12, 'update check answers')

await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(600)
step(13, 'after reload: ' + await page.textContent('h1.large-title'))
console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors')
await browser.close()
