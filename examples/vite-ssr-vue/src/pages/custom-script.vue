<script lang="ts" setup>
import { useScript } from '@unhead/vue'

const instance = useScript<{ myScript: (arg: string) => void }>('/test/myScript.js', {
  trigger: typeof window === 'undefined' ? undefined : new Promise(resolve => {
    requestIdleCallback(() => {
      resolve()
    })
  }),
  use() {
    return {
      // @ts-expect-error untyped
      myScript: window.myScript,
    }
  },
})

console.log(instance.value, instance.myScript)
instance.myScript('test')
</script>

<template>
<div>hello world</div>
</template>
