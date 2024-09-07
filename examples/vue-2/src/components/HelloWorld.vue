<script>
import newMixin from '../mixins/head'

export default {
  name: 'HelloWorld',
  mixins: [newMixin],
  props: {
    msg: String,
  },
  head: {
    title: 'Hello World',
    meta: [
      {
        name: 'description',
        content: 'Vue 2 Head is a Vue 3 composition API for managing the document head.',
      },
    ],
    link: [
      {
        rel: 'icon',
        type: 'image/png',
        href: 'https://vueuse.org/logo.png',
      },
    ],
  },
}
</script>

<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
