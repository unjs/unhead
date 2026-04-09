export const latestVersion = ref<string | null>(null)
export const hasUpdate = ref(false)

let checked = false
let checking = false

interface ParsedVersion {
  major: number
  minor: number
  patch: number
  prerelease: string | null
}

function parseVersion(v: string): ParsedVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/.exec(v)
  if (!match)
    return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  }
}

// Returns >0 if a > b, <0 if a < b, 0 if equal. Follows semver precedence:
// a stable release ranks higher than any prerelease of the same x.y.z, and
// prerelease identifiers are compared dot-by-dot with numeric awareness.
function compareSemver(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa || !pb)
    return a.localeCompare(b)
  if (pa.major !== pb.major)
    return pa.major - pb.major
  if (pa.minor !== pb.minor)
    return pa.minor - pb.minor
  if (pa.patch !== pb.patch)
    return pa.patch - pb.patch
  if (pa.prerelease === pb.prerelease)
    return 0
  if (pa.prerelease === null)
    return 1
  if (pb.prerelease === null)
    return -1
  const ai = pa.prerelease.split('.')
  const bi = pb.prerelease.split('.')
  for (let i = 0; i < Math.max(ai.length, bi.length); i++) {
    const x = ai[i]
    const y = bi[i]
    if (x === undefined)
      return -1
    if (y === undefined)
      return 1
    const xn = /^\d+$/.test(x) ? Number(x) : null
    const yn = /^\d+$/.test(y) ? Number(y) : null
    if (xn !== null && yn !== null) {
      if (xn !== yn)
        return xn - yn
    }
    else if (xn !== null) {
      return -1
    }
    else if (yn !== null) {
      return 1
    }
    else if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  return 0
}

export function checkForUpdate(currentVersion: string) {
  // Skip during SSR/prerender so the static build doesn't depend on the npm
  // registry, and don't permanently disable on transient failures
  if (typeof window === 'undefined' || checked || checking || !currentVersion)
    return
  checking = true

  // Fetch all dist-tags so we can pick the right channel for the user's
  // current version (e.g. someone on 3.0.0-beta.12 should not be told to
  // "update" to the older stable 2.1.13 sitting on the `latest` tag).
  fetch('https://registry.npmjs.org/-/package/unhead/dist-tags')
    .then(r => r.json())
    .then((tags: Record<string, string>) => {
      if (!tags || typeof tags !== 'object')
        return
      let best: string | null = null
      for (const v of Object.values(tags)) {
        if (typeof v !== 'string')
          continue
        if (compareSemver(v, currentVersion) <= 0)
          continue
        if (!best || compareSemver(v, best) > 0)
          best = v
      }
      latestVersion.value = best
      hasUpdate.value = best !== null
      checked = true
    })
    .catch(() => {})
    .finally(() => {
      checking = false
    })
}
