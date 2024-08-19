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
    </RouterLink>
    <RouterView v-slot="{ Component }">
      <Suspense>
        <div>
          <Component :is="Component" />
        </div>
      </Suspense>
    </RouterView>
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
</script>
