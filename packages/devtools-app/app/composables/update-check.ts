export const latestVersion = ref<string | null>(null)
export const hasUpdate = ref(false)

let checked = false
let checking = false

export function checkForUpdate(currentVersion: string) {
  // Skip during SSR/prerender so the static build doesn't depend on the npm
  // registry, and don't permanently disable on transient failures
  if (typeof window === 'undefined' || checked || checking || !currentVersion)
    return
  checking = true

  fetch('https://registry.npmjs.org/unhead/latest')
    .then(r => r.json())
    .then((data) => {
      if (data?.version) {
        latestVersion.value = data.version
        hasUpdate.value = data.version !== currentVersion
        checked = true
      }
    })
    .catch(() => {})
    .finally(() => {
      checking = false
    })
}
