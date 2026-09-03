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
const proposed = await page.$$eval('.xcard .name', (n) => n.map((x) => x.textContent))
step(3, `proposal (${proposed.length}): ` + proposed.slice(0, 4).join(' | '))
if (proposed.length === 0) errors.push('no exercises proposed after setup')
const metas = await page.$$eval('.xcard .meta', (n) => n.map((x) => x.textContent))
const squat = proposed.findIndex((n) => /squat/i.test(n))
step(4, 'seeded squat carried into the proposal: ' + (squat >= 0 ? `${proposed[squat]} — ${metas[squat]}` : 'squat not proposed today'))

// Expand a card in place, swap from inside it — no page pushes at all.
const before = await page.$$eval('.xcard', (n) => n.length)
await page.click('.xcard >> nth=0 >> .xcard-head')
await page.waitForSelector('.xcard.open')
const openCount = await page.$$eval('.xcard.open', (n) => n.length)
const geom = await page.evaluate(() => {
  const card = document.querySelector('.xcard.open')
  const svgs = [...card.querySelectorAll('svg')].map((s) => s.getBoundingClientRect())
  return { h: Math.round(card.getBoundingClientRect().height),
           maxSvg: Math.round(Math.max(...svgs.map((r) => Math.max(r.width, r.height)))) }
})
step(5, `expanded in place (${openCount} of ${before}), card ${geom.h}px, largest svg ${geom.maxSvg}px, still on ` + await page.textContent('h1.large-title'))
// An unsized SVG renders at its default intrinsic size and blows the card open.
if (geom.maxSvg > 64) errors.push(`an svg rendered ${geom.maxSvg}px — check explicit width/height`)
if (geom.h > 900) errors.push(`expanded card is ${geom.h}px tall — layout has blown out`)
await page.click('.xcard.open .actions button:has-text("Swap")')
await page.waitForSelector('.xcard.open .alt')
const alts = await page.$$eval('.xcard.open .alt', (n) => n.length)
const firstName = await page.textContent('.xcard >> nth=0 >> .name')
await page.click('.xcard.open .alt >> nth=0')
await page.waitForTimeout(300)
const afterName = await page.textContent('.xcard >> nth=0 >> .name')
step(6, `swapped inline from ${alts} alternatives: ${firstName} → ${afterName}`)
if (firstName === afterName) errors.push('inline swap did not change the exercise')
if ((await page.$$eval('.xcard', (n) => n.length)) < before) errors.push('swap lost an exercise')

// Reject from inside the card
await page.click('.xcard >> nth=1 >> .xcard-head')
await page.click('.xcard.open .actions button:has-text("Not this one")')
await page.click('text=Not today — find something else')
await page.waitForTimeout(400)
step(7, 'rejected from the card, refilled to ' + (await page.$$eval('.xcard', (n) => n.length)) + ' exercises')

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

// Run setup again: returns to onboarding, keeps history, prefills current values
await page.click('.tabbar button:has-text("Settings")')
await page.click('text=Run setup again')
await page.waitForSelector('text=Setup again', { timeout: 5000 })
step(14, 'run setup again → ' + (await page.textContent('.tiny')).trim())
await page.click('text=Continue'); await page.waitForTimeout(150)
const bw = await page.inputValue('input[inputmode="decimal"]')
step(15, 'prefilled bodyweight from profile: ' + bw)
// Walk to the last step rather than counting clicks, so adding a step to
// setup does not silently break this test.
for (let i = 0; i < 6 && !(await page.$('text=Start training')); i++) {
  await page.click('text=Continue'); await page.waitForTimeout(150)
}
await page.click('text=Start training')
await page.waitForSelector('h1.large-title:has-text("Today")')
await page.click('.tabbar button:has-text("Progress")')
const kept = await page.$$eval('.group-header:has-text("Sessions") + .group .row', (n) => n.length)
step(16, 'history kept through setup re-run: ' + (kept > 0 ? 'yes' : 'NO — data lost'))
if (kept === 0) errors.push('re-running setup destroyed logged sessions')

// Reset app: erases everything, back to a genuinely first-run setup
await page.click('.tabbar button:has-text("Settings")')
await page.click('text=Reset app')
await page.click('text=Erase and start over')
await page.waitForSelector('h1.large-title:has-text("Beau")', { timeout: 5000 })
const fresh = await page.textContent('.subtitle')
step(17, 'reset app → first-run setup: ' + fresh.slice(0, 46))
if (fresh.includes('kept')) errors.push('reset showed the re-run copy, not first-run')
console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors')
await browser.close()
