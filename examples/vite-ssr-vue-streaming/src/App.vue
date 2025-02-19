<template>
  <div>
    <RouterLink to="/">
      Home
    </RouterLink>|
    <RouterLink to="/about">
      About
    </RouterLink>|
    <RouterLink to="/red">
      Red
    </RouterLink>|
    <RouterLink to="/stripe">
      Stripe
    </RouterLink>|
    <RouterLink to="/fathom">
      Fathom
    </RouterLink>|
    <RouterLink to="/js-confetti">
      JS Confetti
    </RouterLink>|
    <RouterLink to="/custom-script">
      Custom Script
    </RouterLink>|
    <RouterLink to="/manual-script">
      Manual
    </RouterLink> |
    <RouterLink to="/timer-script">
      Timer Script
    </RouterLink> |
    <RouterLink to="/timer-script2">
      Timer Script 2
    </RouterLink>
    <RouterView v-slot="{ Component }">
      <Suspense>
        <div>
          <Component :is="Component" />
        </div>
      </Suspense>
    </RouterView>
    <LazyComponent />
  </div>
</template>

<style>
@font-face {
  font-family: 'Inter';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('./assets/fonts/Inter-Italic.woff2#iefix') format('woff2'),
    url('./assets/fonts/Inter-Italic.woff') format('woff');
}
.inter {
  font-family: 'Inter';
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
<script setup lang="ts">
import LazyComponent from "./composables/LazyComponent.vue";
import {useHead} from "@unhead/vue";

useHead({
  title: 'root',
})
</script>
