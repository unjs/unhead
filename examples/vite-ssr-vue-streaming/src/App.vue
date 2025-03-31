<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import HelloWorld from './components/HelloWorld.vue'
import SlowComponent from './components/SlowComponent.vue'
import { useHead } from '@unhead/vue'

useHead({
  htmlAttrs: {
    class: 'layout-default',
  },
  bodyAttrs: {
    style: 'overflow: hidden;',
  },
  title: 'hello world'
})
</script>

<template>
<div>
  <div>
    <a href="https://vite.dev" target="_blank">
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld msg="Vite + Vue" />
  <div>
    <Suspense>
      <template #default>
      <SlowComponent />
      </template>
      <template #fallback>
      <div class="loading">Loading slow component...</div>
      </template>
    </Suspense>
  </div>
</div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
.loading {
  padding: 2rem;
  margin: 1rem 0;
  background-color: #fafafa;
  border-radius: 8px;
  border: 1px dashed #ddd;
  font-style: italic;
}
</style>
