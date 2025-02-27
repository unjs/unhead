<script lang="ts" setup>
import { useHead } from '@unhead/vue'
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'

useHead({
  templateParams: {
    // use XSS for json script
    xssVar: '<\/script><script>alert(1)<\/script>',
  },
})

useSchemaOrg([
  defineWebPage({
    name: 'test',
    description: '%xssVar',
    foo: '<\/script><script>alert(2)<\/script>',
  }),
])
</script>

<template>
  <div>schema.org</div>
</template>
