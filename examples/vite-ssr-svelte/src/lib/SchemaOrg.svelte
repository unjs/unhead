<script lang="ts">
import { useSchemaOrg, defineWebPage } from '@unhead/schema-org/svelte'

useSchemaOrg([
  defineWebPage({
    name: 'Home',
    description: 'A simple example of using Schema.org with Svelte',
    url: 'https://example.com',
  }),
])
</script>
