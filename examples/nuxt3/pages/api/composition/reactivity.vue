<script lang="ts" setup>
const { colour, changeColour, nextColour } = useChangeColour()

useHead({
  htmlAttrs: {
    style: () => `background: ${colour.value}`,
    lang: 'en-AU',
    dir: 'ltr',
  },
})

useHead(() => {
  return {
    bodyAttrs: {
      style: () => `background: ${nextColour.value}; margin: 50px 100px; padding: 20px;`,
    },
  }
})

useHead(() => ({
  title: `Html: ${colour.value} Body: ${nextColour.value}`,
}))
</script>

<template>
  <div>
    <h1>html-attrs</h1>
    <button @click="changeColour">
      Switch background colour
    </button>
  </div>
</template>
