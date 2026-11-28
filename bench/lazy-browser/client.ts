import { pageHead } from './head'

const mode = new URLSearchParams(location.search).get('head')
const button = document.querySelector('button')!
const heading = document.querySelector('h1')!
const status = document.createElement('output')
document.body.appendChild(status)

// Report the browser's next-paint timing for the first interaction. First-input
// includes short interactions that the event observer can omit.
const durations = new Map<number, number>()
let firstInteraction: number | undefined
function observe(type: string, options?: PerformanceObserverInit & { durationThreshold?: number }) {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as PerformanceEventTiming[]) {
      if (entry.target !== button || !entry.interactionId)
        continue
      if (type === 'first-input')
        firstInteraction = entry.interactionId
      const previous = durations.get(entry.interactionId) ?? 0
      durations.set(entry.interactionId, Math.max(previous, entry.duration))
    }
    if (firstInteraction !== undefined)
      status.dataset.nextPaint = String(durations.get(firstInteraction))
  }).observe({ type, buffered: true, ...options })
}
observe('first-input')
observe('event', { durationThreshold: 16 })

function afterFrame(callback: () => void) {
  requestAnimationFrame(() => setTimeout(callback, 0))
}

async function setup() {
  let showPage: () => void
  if (mode === 'lazy' || mode === 'on-click') {
    const { createHead } = await import('unhead/lazy')
    const head = createHead()
    const entry = head.push(pageHead('Home'))
    head.finishHydration()
    showPage = () => {
      entry.patch(pageHead('Next page'))
      const load = () => {
        performance.mark('head-load-start')
        void head.load().catch(error => console.error(error))
      }
      if (mode === 'on-click')
        load()
      else
        afterFrame(load)
    }
  }
  else {
    const { createHead } = await import('unhead/client')
    const head = createHead()
    const entry = head.push(pageHead('Home'))
    showPage = () => {
      entry.patch(pageHead('Next page'))
    }
  }

  button.disabled = false
  button.addEventListener('click', () => {
    performance.mark('page-click')
    heading.textContent = 'Next page'
    showPage()
  }, { once: true })
}

void setup().catch(error => console.error(error))
