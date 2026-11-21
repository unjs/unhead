# @unhead/solid-js

> Full-stack `<head>` management for SolidJS applications

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## Features

- 💎 SolidJS-optimized head management
- 🔄 Reactive titles, meta tags, and other head elements
- 🔍 SEO-friendly head control
- 🖥️ Server-side rendering support
- 📦 Built for Solid 2 and `@solidjs/web`

## Installation

```bash
# npm
npm install @unhead/solid-js solid-js@^2 @solidjs/web@^2

# yarn
yarn add @unhead/solid-js solid-js@^2 @solidjs/web@^2

# pnpm
pnpm add @unhead/solid-js solid-js@^2 @solidjs/web@^2
```

## Usage

### Setup

#### Client-side (SPA)

```jsx
import { createHead, UnheadContext } from '@unhead/solid-js/client'
// main.jsx
import { render } from '@solidjs/web'
import App from './App'

const head = createHead({ /* config */ })

render(() => (
  <UnheadContext value={head}>
    <App />
  </UnheadContext>
), document.getElementById('root'))
```

#### Server-side (SSR)

```jsx
import { createHead, UnheadContext } from '@unhead/solid-js/server'
// entry-server.jsx
import { renderToString } from '@solidjs/web'
import App from './App'

export function render(url) {
  const head = createHead()
  const html = renderToString(() => (
    <UnheadContext value={head}>
      <App />
    </UnheadContext>
  ))
  return { html, head }
}
```

```jsx
import { createHead, UnheadContext } from '@unhead/solid-js/client'
// entry-client.jsx (for hydration)
import { hydrate } from '@solidjs/web'
import App from './App'

const head = createHead({ /* config */ })

hydrate(() => (
  <UnheadContext value={head}>
    <App />
  </UnheadContext>
), document.getElementById('root'))
```

### Basic Usage

```jsx
// Home.jsx
import { useHead } from '@unhead/solid-js'

function Home() {
  useHead({
    title: 'Home Page',
    meta: [
      {
        name: 'description',
        content: 'Welcome to our website'
      }
    ]
  })

  return <h1>Home</h1>
}

export default Home
```

### Setting Meta Tags

```jsx
// About.jsx
import { useSeoMeta } from '@unhead/solid-js'

function About() {
  useSeoMeta({
    title: 'About Us',
    description: 'Learn more about our company',
    ogTitle: 'About Our Company',
    ogDescription: 'Our fantastic about page',
    ogImage: 'https://example.com/image.jpg',
  })

  return <h1>About Us</h1>
}

export default About
```

### Reactive Head Elements

```jsx
import { useHead } from '@unhead/solid-js'
// Profile.jsx
import { createEffect, createSignal } from 'solid-js'

function Profile() {
  const [userName, setUserName] = createSignal('User')

  const input = (name) => ({
    title: `${name} - Profile`,
    meta: [
      {
        name: 'description',
        content: `${name}'s profile page`,
      },
    ],
  })
  const entry = useHead(input('User'))

  createEffect(userName, name => entry.patch(input(name)))

  return (
    <div>
      <h1>
        {userName()}
        's Profile
      </h1>
      <button onClick={() => setUserName('New Name')}>
        Update Name
      </button>
    </div>
  )
}

export default Profile
```

## Development

```bash
# Install dependencies
npm install

# Generate build files
npm run build

# Run tests
npm run test
```

## License

[MIT](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@unhead/solid-js/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@unhead/solid-js

[npm-downloads-src]: https://img.shields.io/npm/dm/@unhead/solid-js.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@unhead/solid-js

[license-src]: https://img.shields.io/github/license/unjs/unhead.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/unjs/unhead/blob/main/LICENSE
