import React from 'react'
import './App.css'
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import { UnheadProvider, useHead } from '@unhead/react'
import { Counter } from './Counter.jsx'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <UnheadProvider>
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src="/vite.svg" className="logo" alt="Vite logo" />
          </a>
          <a href="https://reactjs.org" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>Vite + React</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.jsx</code> and save to test HMR
          </p>
          <Counter count={count} />
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
      </UnheadProvider>
    </>
  )
}

export default App
