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

await page.click('text=Start session')
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

await page.click('nav >> text=Settings')
await page.waitForSelector('text=Check for updates')
console.log('9. settings + update button present')
await page.screenshot({ path: '/tmp/shot-settings.png' })

// reload: data must survive
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const h1 = await page.textContent('h1')
console.log('10. after reload:', h1, '(should be Today, not onboarding)')

console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors')
await browser.close()
