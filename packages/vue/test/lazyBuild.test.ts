import { resolve } from 'node:path'
import { rolldown } from 'rolldown'
import { describe, expect, it } from 'vitest'

// The Vue lazy head as an app bundler builds it, for one NODE_ENV
async function build(env: string) {
  const bundle = await rolldown({
    input: resolve(__dirname, '../src/lazy.ts'),
    external: ['vue', 'unhead/lazy'],
    transform: { define: { 'process.env.NODE_ENV': JSON.stringify(env) } },
  })
  const { output } = await bundle.generate({ format: 'esm', minify: true })
  await bundle.close()
  return output.map(chunk => chunk.type === 'chunk' ? chunk.code : '').join('\n')
}

describe('vue lazy head build', () => {
  it('ships no entry source lookup in production', async () => {
    expect(await build('production')).not.toContain('__file')
  })

  it('names the component of an entry in development', async () => {
    expect(await build('development')).toContain('__file')
  })
})
