<script lang="ts" setup>
import { useScript } from '@unhead/vue'

const { myScript, status, onLoaded } = useScript<{ myScript: (arg: string) => void }>('/test/myScript.js', {
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

console.log(myScript)
myScript('test')
</script>

<template>
<div>
  hello world
  <div>status: {{ status }}</div>
</div>
</template>
