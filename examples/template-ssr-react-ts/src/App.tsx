import './App.css'
import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import { Head, useHead } from '@unhead/react'
import { ScriptComponent } from './ScriptComponent.tsx'

function PageHead() {
  const [title, setTitle] = useState('Loading...')

  useEffect(() => {
    async function loadData() {
      const data = await new Promise(resolve => setTimeout(() => resolve({ title: 'Vite + React + Unhead' }), 1000))
      setTitle(data.title)
    }
    loadData()
  }, [])

  useHead({
    title
  })

  return null
}

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Head>
        <title>Count is {count}</title>
      </Head>
      <PageHead />
      <ScriptComponent />
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
