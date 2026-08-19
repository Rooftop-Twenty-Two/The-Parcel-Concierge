/**
 * Screenshots the running site for design review. Not part of the app and
 * not on any build path.
 *
 * Playwright is not a dependency of this project, so install it when you
 * need this:
 *
 *   npm install --no-save playwright
 *   npm run build && npx next start -p 3100 &
 *   node scripts/screenshots.mjs
 *
 * Output goes to /tmp/shots, or SHOT_DIR if set. It confirms the age gate
 * once so alcohol pages are not all shot through the modal, then shoots one
 * page with the gate showing on purpose.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = process.env.SHOT_DIR ?? '/tmp/shots'
mkdirSync(OUT, { recursive: true })

const DESKTOP = { width: 1440, height: 1000 }
const MOBILE = { width: 390, height: 844 }

/** [path, name, viewport, fullPage, prep] */
const pages = [
  ['/', '01-home', DESKTOP, true],
  ['/hampers', '02-hampers-hub', DESKTOP, true],
  ['/hampers/under-75', '03-hampers-under-75', DESKTOP, true],
  ['/hampers/the-boyne-valley', '04-hamper-pdp', DESKTOP, true],
  ['/hampers/the-new-arrival', '04b-hamper-pdp-baby', DESKTOP, true],
  ['/wine', '05-wine-hub', DESKTOP, true],
  ['/wine/red', '06-wine-listing-filters', DESKTOP, true],
  ['/wine/fine-wines', '06b-fine-wines', DESKTOP, true],
  ['/wine/subscription', '06c-wine-club', DESKTOP, false],
  ['/wine/krug-grand-cuvee', '07-wine-pdp', DESKTOP, true],
  ['/build-your-own-hamper', '08-builder', DESKTOP, false],
  ['/corporate-gifting', '09-corporate', DESKTOP, true],
  ['/corporate-gifting/enquiry', '10-corporate-enquiry', DESKTOP, true],
  ['/delivery', '11-delivery', DESKTOP, true],
  ['/gifts-by-budget', '12-budget-hub', DESKTOP, true],
  ['/guides/what-to-send-after-a-bereavement', '13-guide', DESKTOP, true],
  ['/about/our-makers', '14-makers', DESKTOP, true],
  ['/faq', '15-faq', DESKTOP, true],
  ['/', '16-mobile-home', MOBILE, true],
  ['/hampers/the-boyne-valley', '17-mobile-pdp', MOBILE, true],
  ['/build-your-own-hamper', '18-mobile-builder', MOBILE, false],
]

/**
 * Images below the fold are lazy loaded, so a full-page screenshot taken
 * without scrolling captures empty frames. Walk the page down and back up
 * first, then let the decodes settle.
 */
async function loadEverything(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(600)
}

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
const context = await browser.newContext({ deviceScaleFactor: 1 })

// Confirm the age gate once so alcohol pages are not screenshotted behind it.
await context.addCookies([
  { name: 'tpc_age_ok', value: 'true', domain: 'localhost', path: '/' },
])

for (const [path, name, viewport, fullPage] of pages) {
  const page = await context.newPage()
  await page.setViewportSize(viewport)
  await page.goto('http://localhost:3100' + path, { waitUntil: 'load', timeout: 60000 })
  await loadEverything(page)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage })
  console.log('shot', name)
  await page.close()
}

// The cart, with something in it and a gift message on the line.
{
  const page = await context.newPage()
  await page.setViewportSize(DESKTOP)
  await page.goto('http://localhost:3100/hampers/the-boyne-valley', { waitUntil: 'load', timeout: 60000 })
  await page.fill('#personalisation-gift-message', 'Happy retirement Dad. Enjoy every bit of it. Love from all of us.')
  await page.selectOption('#personalisation-ribbon-colour', { label: 'Gold' })
  await page.locator('form button[type="submit"]').filter({ hasText: 'Add to cart' }).first().click()
  await page.waitForTimeout(1500)
  await page.goto('http://localhost:3100/cart', { waitUntil: 'load', timeout: 60000 })
  await loadEverything(page)
  await page.screenshot({ path: `${OUT}/19-cart.png`, fullPage: true })
  console.log('shot 19-cart')
  await page.close()
}

// The age gate, on a fresh context with no confirmation cookie.
{
  const fresh = await browser.newContext()
  const page = await fresh.newPage()
  await page.setViewportSize(DESKTOP)
  await page.goto('http://localhost:3100/wine', { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/20-age-gate.png`, fullPage: false })
  console.log('shot 20-age-gate')
  await fresh.close()
}

await browser.close()
