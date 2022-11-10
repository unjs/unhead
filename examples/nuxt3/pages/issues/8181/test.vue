<template>
<div>
  <div class="red">Test Page</div>
  <NuxtLink to="/issues/8181/test">test</NuxtLink>
  <br />
  <NuxtLink to="/issues/8181">index</NuxtLink>
</div>
</template>

<script setup lang="ts">
useHead({
  style: [
    {
      id: 'test',
      children: '.red { background-color: red }',
    },
  ],
});
</script>
