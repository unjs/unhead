// @ts-expect-error untyped
import yaml from 'js-yaml'
import { x } from 'tinyexec'
import { describe, expect, it } from 'vitest'
import { getPackageExportsManifest } from 'vitest-package-exports'

describe('exports-snapshot', async () => {
  const packages: { name: string, path: string, private?: boolean }[] = JSON.parse(
    await x('pnpm', ['ls', '-r', '--json', '--depth', '-1']).then(r => r.stdout),
  )

  for (const pkg of packages) {
    if (pkg.private || pkg.path.includes('packages-aliased') || pkg.path.includes('angular'))
      continue
    it(`${pkg.name}`, async () => {
      const manifest = await getPackageExportsManifest({
        importMode: 'dist',
        cwd: pkg.path,
      })
      // @ts-expect-error untyped
      await expect(yaml.dump(manifest.exports, { sortKeys: (a, b) => a.localeCompare(b) }))
        .toMatchFileSnapshot(`./exports/${pkg.name.split('/').pop()}.yaml`)
    })
  }
})
