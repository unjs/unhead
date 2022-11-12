<script lang="ts" setup>
useHead({
  script: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
      onload: (el) => 'loaded!' && console.log(el)
    }
  ]
})
</script>
<template>
<div>
  script load test
</div>
</template>
