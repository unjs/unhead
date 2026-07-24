export interface RuntimeDependency {
  name: string
  version: string
  size: number
}

export interface PackageDependencyStats {
  name: string
  dependencyCount: number
  dependencySize: number
  dependencies: RuntimeDependency[]
}

export interface DependencyAnalysis {
  packages: PackageDependencyStats[]
}

type DependencyChange
  = | { _tag: 'new', current: PackageDependencyStats }
    | { _tag: 'removed', base: PackageDependencyStats }
    | { _tag: 'same', base: PackageDependencyStats, current: PackageDependencyStats }
    | { _tag: 'changed', base: PackageDependencyStats, current: PackageDependencyStats, sizeDelta: number }

function formatSize(bytes: number): string {
  const units = [
    { value: 1_000_000, suffix: 'MB' },
    { value: 1_000, suffix: 'kB' },
  ]
  const unit = units.find(candidate => Math.abs(bytes) >= candidate.value)
  if (!unit)
    return `${bytes} B`
  return `${Number((bytes / unit.value).toFixed(1))} ${unit.suffix}`
}

function formatDelta(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const sign = bytes > 0 ? '+' : '-'
  return `${sign}${formatSize(Math.abs(bytes))}`
}

function formatDependencyDelta(count: number): string {
  const sign = count > 0 ? '+' : '-'
  const absolute = Math.abs(count)
  return `${sign}${absolute} dependenc${absolute === 1 ? 'y' : 'ies'}`
}

function formatPercent(diff: number, base: number): string {
  if (base === 0)
    return ''
  const value = (diff / base) * 100
  return ` (${value > 0 ? '+' : '-'}${Math.abs(value).toFixed(1)}%)`
}

function collectChanges(base: DependencyAnalysis | null, current: DependencyAnalysis): DependencyChange[] {
  const basePackages = new Map(base?.packages.map(pkg => [pkg.name, pkg]))
  const currentPackages = new Map(current.packages.map(pkg => [pkg.name, pkg]))
  const names = [...new Set([...basePackages.keys(), ...currentPackages.keys()])].sort()

  return names.map((name) => {
    const basePackage = basePackages.get(name)
    const currentPackage = currentPackages.get(name)
    if (!basePackage)
      return { _tag: 'new', current: currentPackage! }
    if (!currentPackage)
      return { _tag: 'removed', base: basePackage }
    if (
      basePackage.dependencySize === currentPackage.dependencySize
      && basePackage.dependencyCount === currentPackage.dependencyCount
    ) {
      return { _tag: 'same', base: basePackage, current: currentPackage }
    }
    return {
      _tag: 'changed',
      base: basePackage,
      current: currentPackage,
      sizeDelta: currentPackage.dependencySize - basePackage.dependencySize,
    }
  })
}

function renderDelta(change: DependencyChange): string {
  if (change._tag === 'new')
    return '🆕 new'
  if (change._tag === 'removed')
    return '🟢 removed'
  if (change._tag === 'same')
    return 'same'
  if (change.sizeDelta === 0) {
    const countDelta = change.current.dependencyCount - change.base.dependencyCount
    const emoji = countDelta > 0 ? '🔴' : '🟢'
    return `${emoji} ${formatDependencyDelta(countDelta)}`
  }
  const emoji = change.sizeDelta > 0 ? '🔴' : '🟢'
  return `${emoji} ${formatDelta(change.sizeDelta)}${formatPercent(change.sizeDelta, change.base.dependencySize)}`
}

export function renderDependencyReport(base: DependencyAnalysis | null, current: DependencyAnalysis): string {
  const changes = collectChanges(base, current)
  const changed = changes.filter(change => change._tag !== 'same')
  const grew = changed.filter(change =>
    change._tag === 'new'
    || (change._tag === 'changed' && (
      change.sizeDelta > 0
      || (change.sizeDelta === 0 && change.current.dependencyCount > change.base.dependencyCount)
    )),
  )
  const netSize = changed.reduce((total, change) => {
    if (change._tag === 'new')
      return total + change.current.dependencySize
    if (change._tag === 'removed')
      return total - change.base.dependencySize
    if (change._tag === 'changed')
      return total + change.sizeDelta
    return total
  }, 0)
  const netCount = changed.reduce((total, change) => {
    if (change._tag === 'new')
      return total + change.current.dependencyCount
    if (change._tag === 'removed')
      return total - change.base.dependencyCount
    if (change._tag === 'changed')
      return total + change.current.dependencyCount - change.base.dependencyCount
    return total
  }, 0)
  const net = netSize === 0 ? formatDependencyDelta(netCount) : formatDelta(netSize)

  const out = ['### 📦 Runtime Dependencies', '']
  if (!changed.length) {
    out.push('✅ **No runtime dependency changes**')
  }
  else if (grew.length) {
    out.push(`⚠️ **${grew.length} package${grew.length === 1 ? '' : 's'} grew** · net ${net}`)
  }
  else {
    out.push(`🟢 **${changed.length} package${changed.length === 1 ? '' : 's'} smaller** · net ${net}`)
  }

  if (changed.length) {
    out.push('', '| Package | Install size | Dependencies | Δ |', '|---|---|---|---|')
    for (const change of changed) {
      const name = change._tag === 'removed' ? change.base.name : change.current.name
      const baseSize = change._tag === 'new' ? 0 : change.base.dependencySize
      const currentSize = change._tag === 'removed' ? 0 : change.current.dependencySize
      const baseCount = change._tag === 'new' ? 0 : change.base.dependencyCount
      const currentCount = change._tag === 'removed' ? 0 : change.current.dependencyCount
      out.push(`| **${name}** | ${formatSize(baseSize)} → ${formatSize(currentSize)} | ${baseCount} → ${currentCount} | ${renderDelta(change)} |`)
    }
  }

  out.push('', `<details><summary>All packages (${current.packages.length})</summary>`, '')
  out.push('| Package | External deps | Install size | Largest dependency |', '|---|---|---|---|')
  for (const pkg of [...current.packages].sort((a, b) => a.name.localeCompare(b.name))) {
    const largest = [...pkg.dependencies].sort((a, b) => b.size - a.size)[0]
    const largestLabel = largest ? `${largest.name} ${formatSize(largest.size)}` : 'none'
    out.push(`| ${pkg.name} | ${pkg.dependencyCount} | ${formatSize(pkg.dependencySize)} | ${largestLabel} |`)
  }
  out.push('', '</details>', '')
  out.push('<sub>Production dependencies only. Peer dependencies and Unhead workspace packages are excluded.</sub>')

  return out.join('\n')
}
