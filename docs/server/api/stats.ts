import { modules } from '../../const'

function customSortSemver(a, b) {
  const aParts = String(a).split('.')
  const bParts = String(b).split('.')
  for (let i = 0; i < aParts.length; i++) {
    if (aParts[i] === bParts[i]) {
      continue
    }
    return Number.parseInt(bParts[i]) - Number.parseInt(aParts[i])
  }
  return 0
}

export default defineCachedEventHandler(async (e) => {
  const promises = []
  const [stars, commitCount, issuesClosed, releases, contributors] = await Promise.all([
    e.$fetch(`/api/github/unjs@unhead/stars`),
    e.$fetch(`/api/github/unjs@unhead/commit-count`),
    e.$fetch(`/api/github/unjs@unhead/issues-closed`),
    e.$fetch(`/api/github/unjs@unhead/releases`),
    e.$fetch(`/api/github/unjs@unhead/contributors`),
  ])
  // get all major versions from releases, need to map into major version groups then get first child
  const versionGroups = releases.map(r => r.name).reduce((group, v) => {
    const [major] = v.split('.').slice(0, 1)
    group[major] = group[major] || []
    group[major].push(v)
    return group
  }, [])
  const versions = Object.values(versionGroups).sort(customSortSemver).map(v => v[0]).map(v => v.startsWith('v') ? v : `v${v}`).sort((a, b) => b.localeCompare(a))

  for (const m of modules) {
    // eslint-disable-next-line no-async-promise-executor
    promises.push(new Promise(async (resolve) => {
      const downloads = await e.$fetch(`/api/npm/${m.npm.replace('/', '_')}/downloads`).catch(() => {
        return {
          totalDownloads90: 0,
          totalDownloads30: 0,
          averageDownloads30: 0,
          averageDownloads90: 0,
          percentageChange: 0,
        }
      })
      // first of each group make an object, sort so we get the oldest version
      resolve({
        slug: m.slug,
        ...downloads,
      })
    }))
  }
  return {
    fetchedAt: Date.now(),
    modules: await Promise.all(promises),
    versions,
    stars,
    commitCount,
    issuesClosed,
    releases,
    contributors,
  }
}, {
  // last for 1 day
  maxAge: 60 * 60 * 24,
  swr: true,
})
