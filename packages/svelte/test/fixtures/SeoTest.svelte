<!-- tests/fixtures/SeoTest.svelte -->
<script lang="ts">
import { useSeoMeta } from '../../src/composables'

const { initialDescription = 'My page description' } = $props()
let description = $state(initialDescription)

useSeoMeta({
  ogTitle: 'My Page',
})

const entry = useSeoMeta()

$effect(() => {
  console.log('description', description)
  entry.patch({
    description,
    ogTitle: 'My Page',
    ogDescription: description,
  })
})
</script>

<button onclick={() => description = 'Updated description'}>
  Update Description
</button>
