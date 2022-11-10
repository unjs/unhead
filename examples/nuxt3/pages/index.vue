<script lang="ts" setup>
import { useHead } from '#head'
import {Ref, version} from "vue";
import {HeadObjectPlain} from "@vueuse/head";


const head : Ref<HeadObjectPlain> = ref({})

useHead(head)

head.value.title =  `Hello world: ${version}`
head.value.meta = [
  { name: 'description', content: 'This is an example' },
  { property: 'og:title', content: 'Hello world' },
]

const doClick = () => {
  head.value.title =  `Hello world 2: ${version}`
  head.value.meta = [
    { name: 'description', content: 'This is an example 2' },
    { property: 'og:title', content: 'Hello world 2' },
  ]
}

useHead({
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  ],
  script: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js' },
  ]
})
</script>

<template>
<div>
  <h1>Index</h1>
  <nuxt-link to="/second">
    second page
  </nuxt-link>
  <nuxt-link to="/red">
    red
  </nuxt-link>
  <button @click="doClick">
    update
  </button>
  <div>
    {{ head }}
  </div>
</div>
</template>
