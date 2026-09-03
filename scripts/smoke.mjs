import { chromium } from 'playwright'

const base = 'http://localhost:4173/Beau/'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForSelector('h1')
console.log('1. loaded:', await page.textContent('h1'))

await page.click('text=Continue')
await page.waitForSelector('text=What can you train with?')
console.log('2. equipment step reached')

await page.click('text=Commercial gym')
await page.click('text=Start training')
await page.waitForSelector('text=Today', { timeout: 5000 })
await page.waitForTimeout(800)
const cards = await page.$$eval('main .card strong', (n) => n.map((x) => x.textContent))
console.log('3. generated workout:', cards.slice(0, 5).join(' | '))

await page.screenshot({ path: '/tmp/shot-today.png' })

// Review flow: swap the first pick, reject the second for today, then start.
const before = cards.length
await page.click('main .card >> nth=0 >> text=Swap')
await page.waitForSelector('.sheet')
const altCount = await page.$$eval('.sheet .stack button', (n) => n.length)
console.log('3b. swap sheet shows', altCount, 'alternatives')
await page.click('.sheet .stack button >> nth=0')
await page.waitForSelector('.sheet', { state: 'detached' })
await page.click('main .card >> nth=1 >> text=✕')
await page.waitForSelector('text=Not today')
await page.click('text=Not today')
await page.waitForSelector('.sheet', { state: 'detached' })
await page.waitForTimeout(400)
const after = await page.$$eval('main .card strong', (n) => n.length)
console.log('3c. after swap+reject still', after >= before - 1 ? 'a full session' : 'MISSING exercises')

await page.click('button:has-text("Start ·")')
await page.waitForSelector('text=Session')
console.log('4. session started')

// log a set into the first exercise
const repInput = await page.$$('input[placeholder="reps"]')
await repInput[0].fill('8')
await page.click('button.primary:has-text("✓")')
await page.waitForSelector('.timer', { timeout: 3000 })
console.log('5. set logged, rest timer showing:', await page.textContent('.timer'))
const cardFront = await page.$('.sheet .card')
console.log('6. study card:', cardFront ? (await cardFront.textContent()).slice(0, 60).trim() : 'none')
await page.screenshot({ path: '/tmp/shot-rest.png' })

await page.click('text=Skip rest')
await page.click('text=Finish session')
await page.waitForSelector('nav', { timeout: 5000 })
console.log('7. session finished')

await page.click('nav >> text=History')
await page.waitForTimeout(300)
console.log('8. history:', (await page.textContent('main p.muted')) ?? '')

await page.click('nav >> text=Plan')
await page.waitForSelector('text=Quick splits')
await page.click('text=Push / Pull / Legs × 6')
await page.waitForTimeout(200)
console.log('8b. plan set:', (await page.textContent('main p.tiny')).trim().slice(0, 40))

await page.click('nav >> text=Learn')
await page.waitForSelector('text=Study now')
console.log('8c. learn:', (await page.textContent('main p.tiny')).trim().slice(0, 60))
await page.click('text=Study now')
await page.waitForSelector('text=Tap to reveal')
await page.click('text=Tap to reveal')
await page.click('button:has-text("Good")')
console.log('8d. graded a card')
await page.click('text=Stop')

await page.click('nav >> text=Settings')
await page.waitForSelector('text=Check for updates')
await page.click('text=Check for updates')
await page.waitForSelector('text=latest version', { timeout: 8000 })
console.log('9. update check:', (await page.textContent('main .card p.tiny')).trim().slice(0, 50))
await page.screenshot({ path: '/tmp/shot-settings.png' })

// reload: data must survive
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const h1 = await page.textContent('h1')
console.log('10. after reload:', h1, '(should be Today, not onboarding)')

console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors')
await browser.close()
