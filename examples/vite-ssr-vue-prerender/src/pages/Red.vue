<script>
export default {
  async setup() {
    useHead({
      title: 'Red',
      htmlAttrs: {
        style: 'background: red',
      },
      bodyAttrs: {
        class: ['white'],
      },
    })
  },
}
</script>

<template>
  <h1>Red</h1>
</template>

<style>
.white {
  color: white;
}
</style>
