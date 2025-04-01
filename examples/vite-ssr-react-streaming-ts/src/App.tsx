import './App.css'
import { Suspense, lazy } from 'react'
import reactLogo from './assets/react.svg'

// Works also with SSR as expected
const Card = lazy(() => import('./Card'))
const SlowComponent = lazy(() => import('./components/SlowComponent'))
const SlowComponentTwo = lazy(() => import('./components/SlowComponentTwo'))
const SlowComponentThree = lazy(() => import('./components/SlowComponentThree'))

function App() {
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React Streaming Demo</h1>

      <div className="streaming-demo">
        <h2>Fast Component (loads immediately)</h2>
        <Suspense fallback={<p>Loading card component...</p>}>
          <Card />
        </Suspense>

        <h2>Slow Components (demonstrate streaming)</h2>
        <p>These components simulate network delays to show streaming in action:</p>

        <Suspense fallback={<div className="loading-indicator">Loading first slow component...</div>}>
          <SlowComponent />
        </Suspense>

        <Suspense fallback={<div className="loading-indicator">Loading second slow component...</div>}>
          <SlowComponentTwo />
        </Suspense>

        <Suspense fallback={<div className="loading-indicator">Loading third slow component...</div>}>
          <SlowComponentThree />
        </Suspense>
      </div>

      <p className="read-the-docs">
        Watch how components stream in progressively as they become available
      </p>
    </>
  )
}

export default App
