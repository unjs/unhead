<script lang="ts" setup>
const { colour, changeColour, nextColour } = useChangeColour()
</script>

<template>
  <div>
    <Html lang="en-AU" dir="ltr" :style="`background: ${colour}`" />
    <Body :style="`background: ${nextColour}; margin: 50px 100px; padding: 20px;`" class="test" />
    <Title>Html: {{ colour }} Body: {{ nextColour }}</Title>
    <h1>html-attrs</h1>
    <button @click="changeColour">
      Switch background colour
    </button>
  </div>
</template>
