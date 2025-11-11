import './App.css'
import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import { useHead, useScript, useSeoMeta, Head } from '@unhead/react'
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

function PageHeadComponent() {
  const [fontSize, setFontSize] = useState(16);
  const [increasing, setIncreasing] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);
  const [renderCount, setRenderCount] = useState(0);

  // Track component renders
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isAnimating) return;

    const timer = setInterval(() => {
      setFontSize(prevSize => {
        if (increasing) {
          if (prevSize >= 20) {
            setIncreasing(false);
            return 20;
          }
          return prevSize + 0.1;
        } else {
          if (prevSize <= 14) {
            setIncreasing(true);
            return 14.1;
          }
          return prevSize - 0.1;
        }
      });
    }, 10);

    return () => clearInterval(timer);
  }, [increasing, isAnimating]);

  const dynamicStyle = `
    html {
      font-size: ${fontSize.toFixed(1)}px;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    code {
      font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
    }
  `;

  const buttonStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: 1000,
    padding: '8px 12px',
    backgroundColor: isAnimating ? '#f44336' : '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  };

  const renderCountStyle = {
    position: 'fixed',
    top: '50px',
    right: '10px',
    zIndex: 1000,
    padding: '4px 8px',
    backgroundColor: '#333',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px'
  };

  return (
    <>
      <Head>
        {/* Dynamic content that will re-render */}
        <style>{dynamicStyle}</style>

        {/* Static content with a key that won't re-render */}
        <link
          key="static-font"
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap"
        />
        <meta
          key="static-viewport"
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <meta
          key="static-color-scheme"
          name="color-scheme"
          content="light dark"
        />
      </Head>
      <button
        onClick={() => setIsAnimating(!isAnimating)}
        style={buttonStyle as React.CSSProperties}
      >
        {isAnimating ? 'Stop Animation' : 'Start Animation'}
      </button>
      <div style={renderCountStyle as React.CSSProperties}>
        Component renders: {renderCount}
        <br />
        <small>Static head elements won't re-render</small>
      </div>
    </>
  );
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
      <PageHeadComponent />
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
