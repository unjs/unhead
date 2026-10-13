import type { BuildOptions } from 'vite'

export interface InlineScriptTransformOptions {
  /** Override Vite's resolved browser target for inline scripts. */
  target?: BuildOptions['target']
}

type ViteTransformTarget = Exclude<BuildOptions['target'], false>
type ViteTransformApi = Pick<typeof import('vite'), 'resolveConfig' | 'transformWithEsbuild'> & Partial<Pick<typeof import('vite'), 'transformWithOxc'>>

const resolvedBaselineTargets = new WeakMap<ViteTransformApi, Promise<ViteTransformTarget>>()

function resolveViteTransformTarget(vite: ViteTransformApi, target: ViteTransformTarget): Promise<ViteTransformTarget> {
  if (target !== 'baseline-widely-available')
    return Promise.resolve(target)

  let resolved = resolvedBaselineTargets.get(vite)
  if (!resolved) {
    resolved = vite.resolveConfig({ configFile: false, build: { target } }, 'build').then(async (config) => {
      if (config.build.target !== target)
        return config.build.target === false ? undefined : config.build.target

      const fallback = await vite.resolveConfig({ configFile: false, build: { target: 'modules' } }, 'build')
      return fallback.build.target === false ? undefined : fallback.build.target
    })
    resolvedBaselineTargets.set(vite, resolved)
  }
  return resolved
}

export async function transformInlineScriptWithVite(vite: ViteTransformApi, code: string, target: BuildOptions['target']): Promise<string> {
  if (target === false)
    return code

  const resolvedTarget = await resolveViteTransformTarget(vite, target)
  if (typeof vite.transformWithOxc === 'function') {
    const result = await vite.transformWithOxc(code, 'unhead-inline-script.js', {
      lang: 'js',
      sourcemap: false,
      target: resolvedTarget,
    })
    return result.code.trim()
  }

  const result = await vite.transformWithEsbuild(code, 'unhead-inline-script.js', {
    loader: 'js',
    target: resolvedTarget,
  })
  return result.code.trim()
}
