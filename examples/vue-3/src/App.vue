<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { Head } from '@unhead/vue/components'
import TheWelcome from './components/TheWelcome.vue'
import HelloWorld from './components/HelloWorld.vue'

useHead({
  meta: [
    {
      name: 'description',
      content: 'Vue 3 Head is a Vue 3 composition API for managing the document head.',
    },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      href: 'https://vueuse.org/logo.png',
    },
  ],
  bodyAttrs: {
    onresize: () => {
      console.log('resized')
    },
  },
  script: [
    {
      src: 'https://unpkg.com/vue@next',
      onload: () => {
        console.log('loaded')
      },
    },
  ],
})
</script>

<template>
  <header>
    <Head>
      <title>Vue 3 Head</title>
    </Head>
    <img alt="Vue logo" class="logo" src="./assets/logo.svg" width="125" height="125">

    <div class="wrapper">
      <HelloWorld msg="You did it!" />
    </div>
  </header>

  <main>
    <TheWelcome />
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
