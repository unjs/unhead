import './App.css'
import { createSignal, createEffect } from 'solid-js'
import solidLogo from './assets/solid.svg'
import { useHead, useScript } from '@unhead/solid-js'
import { useSchemaOrg, defineWebSite, defineWebPage } from '@unhead/schema-org/solid-js'

function App() {
  const [count, setCount] = createSignal(0)
  const [jsConfetti, setJsConfetti] = createSignal(null)

  const head = useHead()
  createEffect(() => {
    head.patch({
      title: `${count()} - Count`,
    })
    if (count() > 5) {
      jsConfetti()?.addConfetti({
        emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'],
      })
    }
  })

  useSchemaOrg([
    defineWebSite({
      url: 'https://example.com',
      name: 'Example',
    }),
    defineWebPage({
      title: 'Example page',
      description: 'This is an example page.',
    }),
  ])

  const { onLoaded } = useScript('https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js', {
    use() {
      return (window as any).JSConfetti
    }
  })
  onLoaded((inst) => {
    setJsConfetti(new inst())
  })

  return (
    <div class="App">
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" class="logo" alt="Vite logo" />
        </a>
        <a href="https://www.solidjs.com" target="_blank">
          <img src={solidLogo} class="logo solid" alt="Solid logo" />
        </a>
      </div>
      <h1>Vite + Solid</h1>
      <div class="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count()}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p class="read-the-docs">
        Click on the Vite and Solid logos to learn more
      </p>
    </div>
  )
}

export default App
