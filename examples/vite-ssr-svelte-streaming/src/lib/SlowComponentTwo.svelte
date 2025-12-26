<script lang="ts">
import { useHead } from '@unhead/svelte'
import { HeadStream } from '@unhead/svelte/stream/server'

interface Props {
  data: { message: string }
}

let { data }: Props = $props()

useHead({
  title: 'S2 - Loaded',
  meta: [
    { property: 'og:title', content: 'Second Slow Component' },
  ],
})
</script>

<div class="slow-component" style="margin-left: 1rem;">
  <p>Slow component two: {data.message}</p>
  {@html HeadStream()}
</div>
