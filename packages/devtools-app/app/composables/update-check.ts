export const latestVersion = ref<string | null>(null)
export const hasUpdate = ref(false)

let checked = false

export function checkForUpdate(currentVersion: string) {
  if (checked || !currentVersion)
    return
  checked = true

  fetch('https://registry.npmjs.org/unhead/latest')
    .then(r => r.json())
    .then((data) => {
      if (data?.version) {
        latestVersion.value = data.version
        hasUpdate.value = data.version !== currentVersion
      }
    })
    .catch(() => {})
}
