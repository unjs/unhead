import './App.css'
import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import { useHead, useScript, useSeoMeta } from '@unhead/react'
import { useSchemaOrg, defineWebPage, defineWebSite } from '@unhead/schema-org/react'

function PageHead() {
  const [title, setTitle] = useState('Loading...')

  useEffect(() => {
    async function loadData() {
      const data = await new Promise<{ title: string }>(resolve => setTimeout(() => resolve({ title: 'Loaded!' }), 1000))
      setTitle(data.title)
    }
    loadData()
  }, [])

  const headEntry = useHead()
  useEffect(() => {
    headEntry.patch({ title })
  }, [title])

  return null
}

function App() {
  const [count, setCount] = useState(0)
  const [jsConfetti, setJsConfetti] = useState<{ addConfetti: (opt: any) => void } | null>(null)
  //
  useHead({
    bodyAttrs: {
      style: 'background-color: salmon;',
    }
  })

  const name = "World"
  useSeoMeta({
    title: `Hello  - ${name}`,
    description: `Welcome to ${name}`,
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

  const headEntry = useHead()
  useEffect(() => {
    headEntry.patch({
      title: `Count is ${count}`
    })
    if (count > 5) {
      jsConfetti?.addConfetti({
        emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'],
      })
    }
  }, [count])

  const { onLoaded } = useScript('https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js', {
    use() {
      return (window as any).JSConfetti
    }
  })
  onLoaded((inst) => {
    setJsConfetti(new inst())
  })

  return (
    <>
      <PageHead />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + Unhead</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
