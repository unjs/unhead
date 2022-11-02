<h1 align='center'>unhead</h1>

<p align="center">
<a href='https://github.com/harlan-zw/unhead/actions/workflows/test.yml'>
</a>
<a href="https://www.npmjs.com/package/unhead" target="__blank"><img src="https://img.shields.io/npm/v/unhead?style=flat&colorA=002438&colorB=28CF8D" alt="NPM version"></a>
<a href="https://www.npmjs.com/package/unhead" target="__blank"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/unhead?flat&colorA=002438&colorB=28CF8D"></a>
<a href="https://github.com/harlan-zw/unhead" target="__blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/harlan-zw/unhead?flat&colorA=002438&colorB=28CF8D"></a>
</p>


<p align="center">
Universal document &lt;head&gt; manager for everyone.  
</p>

<p align="center">
<table>
<tbody>
<td align="center">
<img width="800" height="0" /><br>
<i>Status:</i> In development</b> <br>
<sup> Please report any issues 🐛</sup><br>
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
<img width="800" height="0" />
</td>
</tbody>
</table>
</p>

## Highlights

- 💎 Fully typed
- 🧑‍🤝‍🧑 New DOM patching algorithm, plays nicely with other libraries
- 🤝 Built for everyone: Vue, React, Svelte, etc.
- 🚀 Optimised, tiny SSR and DOM bundles
- 🖥️ `useServerHead` for 0kb runtime head management
- 🍣 Intuitive tag deduping, sorting and title templates
- 🪝 Extensible hook / plugin based API

## Features

## Duplicate Tag Removal

When you register multiple tags which are duplicated, only the most recent one will be used. This is useful for tags like `title` and some `meta` which can only appear once on a page.

There is different logic used to determine what tags are duplicates:
- Any of the following tags: `base`, `title`, `titleTemplate`, `bodyAttrs`, `htmlAttrs`.
- `<link rel="canonical">`
- `<meta charset="">`
- Custom provided `key` attribute
- Meta `content`, `property` and `http-equiv` attributes

Example of a dedupe using the meta `content`.

```ts
const head = createHead()
head.push({
    meta: [
      {
        name: 'description',
        content: 'my site wide description',
      },
    ],
  },
)
head.push({
    meta: [
      {
        name: 'description',
        content: 'my page description',
      },
    ],
  },
)

// <meta name="description" content="my page description" />
```

### Meta content as an array

When you register multiple `meta` tags with the same `name` or `property` attributes, they will be deduped.

This is not always useful, consider tags like `og:image` and `twitter:image` which can appear multiple times on a page.

To prevent deduping in these instances, you can provide an array of values for the `content` attribute.

```ts
const head = createHead()
head.push({
    meta: [
      {
        name: 'og:image',
        key: 'parent-og-image',
        content: 'https://example.com/image1.jpg'
      },
    ],
  },
)
// some other page
head.push({
    meta: [
      {
        name: 'og:image',
        key: 'child-og-image',
        content: 'https://example.com/image2.jpg'
      },
    ],
  },
)

// <meta name=\"og:image\" content=\"https://example.com/image1.jpg\" >
// <meta name=\"og:image\" content=\"https://example.com/image2.jpg\" >
```

### Providing a `key` attribute

If you want to avoid deduping occurring accross all tags, you can provide a `key` attribute.

```ts

```

## Sorting

By default, tags are rendered in the order they are added.

However, this is not always useful, some tags need to be in certain positions to work. To resolve position issues
this package uses implementing critical tags sorting and the user configured `tagPosition`.

### Critical Tag Sorting

A sorting algorithm is used to ensure that critical tags are always in the correct order.

The following tags have set priorities:

- `-2` &lt;meta charset ...&gt;
- `-1` &lt;base&gt;
- `0` &lt;meta http-equiv=&quot;content-security-policy&quot; ...&gt;

All other tags have a default priority of 10: <meta>, <script>, <link>, <style>, etc

### Tag Position

You can also set custom priorities for tags using the `tagPosition` attribute.

You can either provide a number or a string beginning with `before:` or `after:` and target a tag key.

#### Sort by number

When providing a number, refer to the default priorities in [Crticial Tag Sorting](#critical-tag-sorting).

```ts
const head = createHead()
head.push({
  script: [
    {
      src: '/not-important-script.js',
    },
  ],
})
head.push({
  script: [
    {
      src: '/very-important-script.js',
      tagPosition: 0,
    },
  ],
})

// <script src=\"/very-important-script.js\"></script>
// <script src=\"/not-important-script.js\"></script>
```


#### Sort with `before:` and `after:`

When providing a string, you can use `before:` or `after:` to target a tag key.

Tag keys are prefixed with their tag name to avoid dedupe collisions, so you need to use the form of `{tagName}:{key}`.

```ts
const head = createHead()
head.push({
  script: [
    {
      key: 'not-important',
      src: '/not-important-script.js',
    },
  ],
})
head.push({
  script: [
    {
      // script is the tag name to target, `not-important` is the key we're targeting  
      tagPosition: 'before:script:not-important',
      src: '/must-be-first-script.js',
    },
  ],
})
// <script src=\"/must-be-first-script.js\"></script>
// <script src=\"/not-important-script.js\"></script>
```

## Hooks

## Plugins

## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>


## License

MIT License © 2022-PRESENT [Harlan Wilton](https://github.com/harlan-zw)
