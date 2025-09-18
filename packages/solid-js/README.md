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
- 📦 Lightweight with zero dependencies (except for SolidJS & unhead)

## Installation

```bash
# npm
npm install @unhead/solid-js

# yarn
yarn add @unhead/solid-js

# pnpm
pnpm add @unhead/solid-js
```

## Usage

### Setup

#### Client-side (SPA)

```jsx
// main.jsx
import { render } from 'solid-js/web'
import App from './App'
import { createHead } from '@unhead/solid-js/client'
import { UnheadContext } from '@unhead/solid-js'

const head = createHead({ /* config */ })

render(() => (
  <UnheadContext.Provider value={head}>
    <App />
  </UnheadContext.Provider>
), document.getElementById('root'))
```

#### Server-side (SSR)

```jsx
// entry-server.jsx
import { renderToString } from 'solid-js/web'
import App from './App'
import { createHead } from '@unhead/solid-js/server'
import { UnheadContext } from '@unhead/solid-js'

export function render(url) {
  const head = createHead()
  const html = renderToString(() => (
    <UnheadContext.Provider value={head}>
      <App />
    </UnheadContext.Provider>
  ))
  return { html, head }
}
```

```jsx
// entry-client.jsx (for hydration)
import { hydrate } from 'solid-js/web'
import App from './App'
import { createHead } from '@unhead/solid-js/client'
import { UnheadContext } from '@unhead/solid-js'

const head = createHead({ /* config */ })

hydrate(() => (
  <UnheadContext.Provider value={head}>
    <App />
  </UnheadContext.Provider>
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
// Profile.jsx
import { createSignal, createEffect } from 'solid-js'
import { useHead } from '@unhead/solid-js'

function Profile() {
  const [userName, setUserName] = createSignal('User')

  // SolidJS automatically tracks reactive changes in useHead
  useHead(() => ({
    title: `${userName()} - Profile`, // Reactive title
    meta: [
      {
        name: 'description',
        content: `${userName()}'s profile page`, // Reactive description
      },
    ],
  }))

  return (
    <div>
      <h1>{userName()}'s Profile</h1>
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