import ReactDOMServer from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { createHead } from '../../../packages/unhead/src/createHead'
import { App } from './App'

createHead()

export function render(url, context) {
  return ReactDOMServer.renderToString(
    <StaticRouter location={url} context={context}>
      <App />
    </StaticRouter>,
  )
}
