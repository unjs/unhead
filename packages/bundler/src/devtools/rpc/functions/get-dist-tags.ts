import { defineRpcFunction } from '@vitejs/devtools-kit'

const DIST_TAGS_URL = 'https://registry.npmjs.org/-/package/unhead/dist-tags'

// Explicit `any` annotation for the same TS2883 reason as get-config.
export const getDistTagsRpc: any = defineRpcFunction({
  name: 'get-dist-tags',
  type: 'query',
  jsonSerializable: true,
  setup: () => {
    let tags: Promise<Record<string, string> | null> | undefined
    return {
      // The panel can't fetch this itself: the registry's dist-tags endpoint sends no CORS headers.
      handler: (): Promise<Record<string, string> | null> => {
        tags ??= fetch(DIST_TAGS_URL)
          .then((res) => {
            if (!res.ok)
              throw new Error(`npm registry responded ${res.status}`)
            return res.json() as Promise<Record<string, string>>
          })
          .catch(() => {
            // Offline or registry down: the update check is optional, so retry on the next call.
            tags = undefined
            return null
          })
        return tags
      },
    }
  },
})
