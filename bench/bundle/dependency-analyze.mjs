import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const packagesDir = resolve(root, 'packages')

function readManifest(packageDir) {
  return JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'))
}

function collectWorkspacePackages() {
  return new Map(
    readdirSync(packagesDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => resolve(packagesDir, entry.name))
      .filter(packageDir => existsSync(resolve(packageDir, 'package.json')))
      .map(packageDir => {
        const manifest = readManifest(packageDir)
        return [manifest.name, { dir: packageDir, manifest }]
      }),
  )
}

function packageSize(packageDir) {
  return readdirSync(packageDir, { withFileTypes: true }).reduce((total, entry) => {
    if (entry.name === 'node_modules')
      return total
    const path = resolve(packageDir, entry.name)
    if (entry.isDirectory())
      return total + packageSize(path)
    if (entry.isFile())
      return total + lstatSync(path).size
    return total
  }, 0)
}

function productionDependencies(manifest) {
  const dependencies = new Map(
    Object.keys(manifest.dependencies || {}).map(name => [name, { name, optional: false }]),
  )
  for (const name of Object.keys(manifest.optionalDependencies || {}))
    dependencies.set(name, { name, optional: true })
  return [...dependencies.values()]
}

function resolveInstalledPackage(name, fromDir) {
  const require = createRequire(resolve(fromDir, 'package.json'))
  const packageJson = require.resolve.paths(name)
    ?.map(nodeModulesDir => resolve(nodeModulesDir, name, 'package.json'))
    .find(existsSync)
  if (!packageJson)
    return null
  const dir = realpathSync(dirname(packageJson))
  return { dir, manifest: readManifest(dir) }
}

function analyzePackage(rootPackage, workspacePackages) {
  const visitedWorkspacePackages = new Set()
  const externalPackages = new Map()
  const skippedOptionalDependencies = []

  function visitPackage(packageDir, manifest, isWorkspace) {
    if (isWorkspace) {
      if (visitedWorkspacePackages.has(manifest.name))
        return
      visitedWorkspacePackages.add(manifest.name)
    }

    for (const dependency of productionDependencies(manifest)) {
      const workspaceDependency = isWorkspace ? workspacePackages.get(dependency.name) : null
      if (workspaceDependency) {
        visitPackage(workspaceDependency.dir, workspaceDependency.manifest, true)
        continue
      }

      const installed = resolveInstalledPackage(dependency.name, packageDir)
      if (!installed) {
        if (dependency.optional) {
          // Platform-specific optional packages can be absent from this runner.
          skippedOptionalDependencies.push(`${manifest.name} -> ${dependency.name}`)
          continue
        }
        throw new Error(`Cannot resolve production dependency ${manifest.name} -> ${dependency.name}`)
      }

      const key = `${installed.manifest.name}@${installed.manifest.version}`
      if (externalPackages.has(key))
        continue

      externalPackages.set(key, {
        name: installed.manifest.name,
        version: installed.manifest.version,
        size: packageSize(installed.dir),
      })
      visitPackage(installed.dir, installed.manifest, false)
    }
  }

  visitPackage(rootPackage.dir, rootPackage.manifest, true)
  const dependencies = [...externalPackages.values()]
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))

  return {
    name: rootPackage.manifest.name,
    dependencyCount: dependencies.length,
    dependencySize: dependencies.reduce((total, dependency) => total + dependency.size, 0),
    dependencies,
    skippedOptionalDependencies: skippedOptionalDependencies.sort(),
  }
}

const workspacePackages = collectWorkspacePackages()
const packages = [...workspacePackages.values()]
  .filter(pkg => pkg.manifest.private !== true)
  .map(pkg => analyzePackage(pkg, workspacePackages))
  .sort((a, b) => a.name.localeCompare(b.name))

process.stdout.write(`${JSON.stringify({ packages }, null, 2)}\n`)
