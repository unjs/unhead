<script lang="ts" setup>
import { onMounted } from 'vue'
import { useScript } from '@unhead/vue'

export interface FathomAnalyticsApi {
  beacon: (ctx: { url: string, referrer?: string }) => void
  blockTrackingForMe: () => void
  enableTrackingForMe: () => void
  isTrackingEnabled: () => boolean
  send: (type: string, data: unknown) => void
  setSite: (siteId: string) => void
  siteId: string
  trackPageview: (ctx?: { url: string, referrer?: string }) => void
  trackGoal: (goalId: string, cents: number) => void
  trackEvent: (eventName: string, value: { _value: number }) => void
}

const {  proxy } = useScript<FathomAnalyticsApi>({
  src: 'https://cdn.usefathom.com/script.js',
  ['data-site']: 'KGILBQDV',
}, {
  use() {
    // @ts-expect-error untyped
    return window.fathom
  },
})
const { trackPageview, blockTrackingForMe, siteId } = proxy

blockTrackingForMe()
trackPageview({
  url: '/test',
  referrer: '',
})
onMounted(async () => {
  console.log(siteId)
})
</script>
<template>
<div>test</div>
</template>
