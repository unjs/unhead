<h1 align='center'>unhead</h1>

<p align="center">
<a href='https://github.com/harlan-zw/unhead/actions/workflows/test.yml'>
</a>
<a href="https://www.npmjs.com/package/unhead" target="__blank"><img src="https://img.shields.io/npm/v/unhead?style=flat&colorA=002438&colorB=28CF8D" alt="NPM version"></a>
<a href="https://www.npmjs.com/package/unhead" target="__blank"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/unhead?flat&colorA=002438&colorB=28CF8D"></a>
<a href="https://github.com/harlan-zw/unhead" target="__blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/harlan-zw/unhead?flat&colorA=002438&colorB=28CF8D"></a>
</p>


<p align="center">
Universal document <head> tag manager. Tiny, adaptable and full featured.
</p>

<p align="center">
<table>
<tbody>
<td align="center">
<img width="800" height="0" /><br>
<i>Status:</i> Stable</b> <br>
<sup> Please report any issues 🐛</sup><br>
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
<img width="800" height="0" />
</td>
</tbody>
</table>
</p>

## Highlights

- 💎 Fully typed augmentable Schema powered by [zhead](https://github.com/harlan-zw/zhead)
- 🧑‍🤝‍🧑 Side-effect based DOM patching, plays nicely your existing other tags and attributes
- 🤝 Built for everyone: Vue, React (soon), Svelte (soon), (more soon).
- 🚀 Optimised, tiny SSR and DOM bundles
- 🖥️ `useServerHead` (supporting 0kb runtime soon) 
- 🍣 Intuitive deduping, sorting, title templates, class merging and more
- 🪝 Extensible hook / plugin based API

## Install

```bash
npm i unhead
```

## Usage

For specific frameworks integrations, see the [docs](https://unhead.netlify.app/).

### Basic

Create the head client somewhere in your root application.

```ts
import { createHead } from 'unhead'

createHead()
```

Then use the composables anywhere you want.

```ts
// pages/about.js
import { useHead } from 'unhead'

useHead({
  title: 'About',
  meta: [
    { name: 'description', content: 'Learn more about us.' },
  ],
})
```

## Docs

Visit the [documentation site](https://unhead.harlanzw.com/) for guides and API reference.

## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>


## License

MIT License © 2022-PRESENT [Harlan Wilton](https://github.com/harlan-zw)
