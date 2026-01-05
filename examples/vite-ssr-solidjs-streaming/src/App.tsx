import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'

interface AppProps {
  url?: string
}

export default function App(props: AppProps) {
  const isAbout = () => props.url === '/about'

  return (
    <div id="app" class="app">
      <div class="stream-progress" />
      {isAbout() ? <AboutPage /> : <HomePage />}
      <footer class="site-footer">
        <p>StreamShop - SolidJS Streaming SSR Demo</p>
      </footer>
    </div>
  )
}
