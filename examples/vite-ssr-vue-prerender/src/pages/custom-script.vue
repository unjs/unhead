<script lang="ts" setup>
import { useScript } from '@unhead/vue'

const { proxy, status, onLoaded } = useScript<{ myScript: (arg: string) => void }>('/test/myScript.js', {
  trigger: 'server',
  use() {
    return {
      // @ts-expect-error untyped
      myScript: window.myScript,
    }
  },
})

onLoaded(() => {
  console.log('onloaded')
})

proxy.myScript('test')
</script>

<template>
<div>
  hello world
  <div>status: {{ status }}</div>
</div>
</template>
