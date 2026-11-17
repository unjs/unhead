import type { DevframeDefinition } from 'devframe'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createGetConfigRpc, getDistTagsRpc, runLintRpc } from './rpc'

export const UNHEAD_DEVFRAME_ID = 'unhead'

const UNHEAD_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23FBBF24'/%3E%3Cstop offset='100%25' stop-color='%23f0db4f'/%3E%3C/linearGradient%3E%3Cmask id='m'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Cpath d='M12 32 L1 32 L15 15 Z' fill='black'/%3E%3C/mask%3E%3C/defs%3E%3Cpath fill='none' stroke='url(%23g)' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M6 4v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4' mask='url(%23m)'/%3E%3C/svg%3E`

/**
 * Resolve the `@unhead/bundler` package root by walking up from this module.
 *
 * unbuild may code-split this module into `dist/shared/*.mjs`, so we can't
 * assume a fixed depth from `import.meta.url`. Walking up to the nearest
 * `package.json` works whichever chunk this code ends up in.
 */
export function findPkgRoot(fromUrl: string): string {
  let dir = dirname(fileURLToPath(fromUrl))
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'package.json')))
      return dir
    dir = dirname(dir)
  }
  return dir
}

function readVersion(pkgDir: string): string {
  return JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf-8')).version || ''
}

/**
 * Resolve the `unhead` entry through Node's module resolution, then walk up to
 * its package.json. Works under hoisted and pnpm installs (unhead doesn't
 * export ./package.json, and it isn't nested inside @unhead/bundler).
 */
function resolveUnheadVersion(): string {
  try {
    const unheadEntry = createRequire(import.meta.url).resolve('unhead')
    return readVersion(findPkgRoot(pathToFileURL(unheadEntry).href))
  }
  catch {
    // Version metadata is optional for devtools; leave it blank if package resolution fails.
    return ''
  }
}

/**
 * The Unhead DevTools devframe: the panel SPA, the page script that reads the
 * live head, and the node-side RPC. Hosts such as Vite DevTools mount it with
 * `createPluginFromDevframe`.
 */
export function createUnheadDevframe(): DevframeDefinition {
  const pkgDir = findPkgRoot(import.meta.url)
  const panelDir = resolve(pkgDir, 'dist/devtools-ui')
  // Self-contained bundle: the hub serves its directory statically, untransformed.
  const pageScript = resolve(pkgDir, 'dist/devtools/bridge.mjs')
  let unheadVersion: string | undefined
  const getConfigRpc = createGetConfigRpc(() => unheadVersion ??= resolveUnheadVersion())

  return {
    id: UNHEAD_DEVFRAME_ID,
    name: 'Unhead',
    version: readVersion(pkgDir),
    packageName: '@unhead/bundler',
    importMetaUrl: import.meta.url,
    homepage: 'https://unhead.unjs.io',
    description: 'Inspect head tags, entries, scripts, and SEO metadata of the current page.',
    icon: UNHEAD_ICON,
    basePath: `/__${UNHEAD_DEVFRAME_ID}/`,
    clientAssets: existsSync(panelDir) ? panelDir : undefined,
    dock: existsSync(pageScript)
      ? { clientScript: { importFrom: pageScript, eager: true } }
      : undefined,
    setup(ctx) {
      const unhead = ctx.scope(UNHEAD_DEVFRAME_ID)
      unhead.rpc.register(getConfigRpc)
      unhead.rpc.register(getDistTagsRpc)
      unhead.rpc.register(runLintRpc)
    },
  }
}
