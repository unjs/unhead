import { it } from 'vitest'
import { minifyCSS, minifyJS } from '../packages/unhead/src/minify'

const css = '.item { color: red; padding: calc(1rem + 2px); } /* comment */\n'
const js = 'var item = { key: "value", count: 1 }; // comment\n'
const cssSmall = css.repeat(Math.ceil(4096 / css.length))
const cssLarge = css.repeat(Math.ceil(262_144 / css.length))
const cssComment = `/* ${'reset stylesheet '.repeat(256)} */ body { margin: 0; }`
const cssString = `a::after { content: "${'some content '.repeat(256)}"; }`
const jsSmall = js.repeat(Math.ceil(4096 / js.length))
const jsLarge = js.repeat(Math.ceil(262_144 / js.length))
const jsUnicode = 'var\u00A0ü\uFEFF=\u20031;\u2028ü++;\n'.repeat(80)

it('runtime minifiers', async ({ bench }) => {
  await bench.compare(
    bench('CSS formatted 4 KiB', () => minifyCSS(cssSmall)),
    bench('CSS formatted 256 KiB', () => minifyCSS(cssLarge)),
    bench('CSS long comment', () => minifyCSS(cssComment)),
    bench('CSS long string', () => minifyCSS(cssString)),
    bench('JS formatted 4 KiB', () => minifyJS(jsSmall)),
    bench('JS formatted 256 KiB', () => minifyJS(jsLarge)),
    bench('JS Unicode whitespace', () => minifyJS(jsUnicode)),
  )
})
