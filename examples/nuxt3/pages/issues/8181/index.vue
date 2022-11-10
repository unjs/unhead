<template>
<div>
  <div class="red">Index Page</div>
  <NuxtLink to="/issues/8181/test">test</NuxtLink>
  <br />
  <NuxtLink to="/issues/8181">index</NuxtLink>
</div>
</template>

<script setup lang="ts">
useHead({
  style: [
    {
      children: '.red { background-color: red }',
    },
  ],
})
</script>
