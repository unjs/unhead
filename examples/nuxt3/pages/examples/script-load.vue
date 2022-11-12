<script lang="ts" setup>
useHead({
  script: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
      onload: (el) => 'loaded!' && console.log(el)
    }
  ]
})

useHead({
  bodyAttrs: {
    onresize: (e) => {
      console.log('resized', e)
    },
  }
})
</script>
<template>
<div>
  script load test

  <a href="#hash">change hash</a>
  <a href="#">clear hash</a>
</div>
</template>
