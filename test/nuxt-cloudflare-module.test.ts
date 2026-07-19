import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { x } from 'tinyexec'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./fixtures/nuxt-cloudflare-module', import.meta.url))
const localIife = fileURLToPath(new URL('../packages/unhead/dist/stream/iife.mjs', import.meta.url))

describe('nuxt cloudflare_module', () => {
  it('builds a prerendered app with the streaming IIFE', async () => {
    const require = createRequire(join(fixtureDir, 'package.json'))
    expect(realpathSync(require.resolve('unhead/stream/iife'))).toBe(realpathSync(localIife))

    const result = await x('pnpm', ['exec', 'nuxt', 'build'], {
      timeout: 180_000,
      throwOnError: false,
      nodeOptions: {
        cwd: fixtureDir,
        env: {
          ...process.env,
          NUXT_TELEMETRY_DISABLED: '1',
        },
      },
    })

    expect(result.exitCode, result.stderr || result.stdout).toBe(0)
    expect(existsSync(join(fixtureDir, '.output/server/index.mjs'))).toBe(true)
    expect(JSON.parse(readFileSync(join(fixtureDir, '.output/nitro.json'), 'utf8'))).toMatchObject({
      preset: 'cloudflare-module',
      framework: {
        name: 'nuxt',
        version: '4.5.0',
      },
    })
  }, 200_000)
})
