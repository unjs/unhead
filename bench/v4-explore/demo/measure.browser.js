// dev-browser script: run with
//   dev-browser --headless --timeout 180 run bench/v4-explore/demo/measure.browser.js
// against a static server for the built dist dir (default port 8791; the
// page runs its own 50-switch loop and exposes window.__RESULTS__).
const BASE = 'http://127.0.0.1:8791'
const PAGES = ['v3', 'v4', 'v4-sealed']
const RUNS = 5

const out = {}
for (const name of PAGES) {
  const page = await browser.getPage(`unhead-${name}`)
  const runs = []
  for (let i = 0; i < RUNS; i++) {
    await page.goto(`${BASE}/index-${name}.html?run=${i}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction('window.__DONE__ === true', null, { timeout: 20000 })
    runs.push(await page.evaluate('window.__RESULTS__'))
  }
  const shot = await page.screenshot({ fullPage: true })
  const path = await saveScreenshot(shot, `unhead-${name}.png`)
  console.log(`${name}: ${runs.length} runs, screenshot ${path}`)
  out[name] = runs
}
const resultsPath = await writeFile('unhead-results.json', JSON.stringify(out, null, 2))
console.log(`results: ${resultsPath}`)
