<script lang="ts" setup>
// wait 3 seconds
await new Promise(resolve => setTimeout(resolve, 3000))
useHead({
  title: 'Lazy Component',
})
</script>
<template>
  <div>
    <h1>Lazy Component</h1>
  </div>
</template>
