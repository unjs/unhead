<script lang="ts" setup>
import { useChangeColour } from '~/composables/change-colour'
import { useHead } from '#head'

const { colour, changeColour } = useChangeColour()

useHead({
  htmlAttrs: {
    style: () => {
      console.log('computed getter colour', colour.value)
      return `background: ${colour.value}`
    },
    class: () => `bg-${colour.value}-500`,
    lang: 'en-AU',
    dir: 'ltr',
  },
})
//
// useHead({
//   bodyAttrs: {
//     style: 'background: white',
//     class: 'bg-white',
//   },
// })
//
// useHead(() => {
//   console.log('use head called, bodyAttrs')
//   changeColour()
//   return {
//     bodyAttrs: {
//       style: () => `background: ${colour.value}`,
//       class: () => `bg-${colour.value}-500`,
//     },
//   }
// })
</script>

<template>
  <div>
    <h1>html-attrs</h1>
    <button @click="changeColour">
      Switch background colour
    </button>
  </div>
</template>
