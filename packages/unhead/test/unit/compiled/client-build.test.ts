import { resolve } from 'node:path'
import { rolldown } from 'rolldown'
import { describe, expect, it } from 'vitest'

// The compiled client head as an app bundler builds it, for one NODE_ENV
async function build(env: string) {
  const bundle = await rolldown({
    input: resolve(__dirname, '../../../src/compiled/client.ts'),
    external: ['hookable'],
    transform: { define: { 'process.env.NODE_ENV': JSON.stringify(env) } },
  })
  const { output } = await bundle.generate({ format: 'esm', minify: true })
  await bundle.close()
  return output.map(chunk => chunk.type === 'chunk' ? chunk.code : '').join('\n')
}

describe('compiled client build', () => {
  it('ships no dev warning code in production', async () => {
    const code = await build('production')
    expect(code).not.toContain('differs from the server head')
    expect(code).not.toContain('is missing from the server head')
  })

  it('ships the dev warning in development', async () => {
    expect(await build('development')).toContain('differs from the server head')
  })
})
