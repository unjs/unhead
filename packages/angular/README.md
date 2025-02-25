# @unhead/angular

> Full-stack `<head>` management for Angular applications

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## Features

- 🧩 Angular-optimized head management
- 🔄 Reactive titles, meta tags, and other head elements
- 🔍 SEO-friendly head control
- 🖥️ Server-side rendering support
- 💉 Angular dependency injection integration
- 📦 Lightweight with zero dependencies (except for Angular & unhead)

## Installation

```bash
# npm
npm install @unhead/angular

# yarn
yarn add @unhead/angular

# pnpm
pnpm add @unhead/angular
```

## Usage

### Setup

First, provide the Unhead service in your application:

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core'
import { provideClientHead } from '@unhead/angular'

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    provideClientHead(),
  ]
}
```

For server-side rendering (Angular Universal):

```typescript
// server.ts
import { provideServerHead } from '@unhead/angular'

// In your server module providers:
providers: [
  // ... other providers
  provideServerHead(),
]
```

### Basic Usage

```typescript
// app.component.ts
import { Component } from '@angular/core'
import { Unhead } from '@unhead/angular'

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
})
export class AppComponent {
  constructor(private unhead: Unhead) {
    // Set page title
    this.unhead.useHead({
      title: 'My Application',
    })
  }
}
```

### Setting Meta Tags

```typescript
// home.component.ts
import { Component, OnInit } from '@angular/core'
import { Unhead } from '@unhead/angular'

@Component({
  selector: 'app-home',
  template: '<h1>Home</h1>',
})
export class HomeComponent implements OnInit {
  constructor(private unhead: Unhead) {}

  ngOnInit() {
    this.unhead.useSeoMeta({
      title: 'Home Page',
      description: 'Welcome to our website',
      ogTitle: 'Welcome to Home Page',
      ogDescription: 'Our fantastic home page',
      ogImage: 'https://example.com/image.jpg',
    })
  }
}
```

### Reactive Head Elements

```typescript
// profile.component.ts
import { Component, signal } from '@angular/core'
import { Unhead } from '@unhead/angular'

@Component({
  selector: 'app-profile',
  template: `
    <h1>{{ userName() }}'s Profile</h1>
    <button (click)="updateName('New Name')">Update Name</button>
  `,
})
export class ProfileComponent {
  userName = signal('User')

  constructor(private unhead: Unhead) {
    this.unhead.useHead({
      title: () => `${this.userName()} - Profile`, // Reactive title
      meta: [
        {
          name: 'description',
          content: () => `${this.userName()}'s profile page`, // Reactive description
        },
      ],
    })
  }

  updateName(name: string) {
    this.userName.set(name)
    // Title and meta automatically update!
  }
}
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
[npm-version-src]: https://img.shields.io/npm/v/@unhead/angular/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@unhead/angular

[npm-downloads-src]: https://img.shields.io/npm/dm/@unhead/angular.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@unhead/angular

[license-src]: https://img.shields.io/github/license/unjs/unhead.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/unjs/unhead/blob/main/LICENSE
