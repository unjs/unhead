<!-- tests/fixtures/SeoTest.svelte -->
<script lang="ts">
import { useHeadSafe } from '../../src/composables'

const { initialDescription = 'My page description' } = $props()
let description = $state(initialDescription)

const entry = useHeadSafe({
  bodyAttrs: {
    onresize: ''
  }
})

$effect(() => {
  console.log('description', description)
  entry.patch({
    bodyAttrs: {
      onresize: ''
    }
  })
})
</script>

<button onclick={() => description = 'Updated description'}>
  Update Description
</button>
