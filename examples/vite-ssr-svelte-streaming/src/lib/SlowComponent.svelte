<script lang="ts">
import { useHead } from '@unhead/svelte'
import { HeadStream } from '@unhead/svelte/stream/server'
import SlowComponentTwo from './SlowComponentTwo.svelte'

interface Props {
  data: { message: string }
}

let { data }: Props = $props()

useHead({
  title: 'S1 - Loaded',
  style: ['.slow-component { color: red; }'],
  link: [
    {
      key: 'preload',
      rel: 'stylesheet',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta1/css/all.min.css',
    },
  ],
  meta: [
    { name: 'description', content: 'This is a slow component' },
  ],
})
</script>

<div class="slow-component">
  <p>Slow component one: {data.message}</p>
  {@html HeadStream()}
  <SlowComponentTwo data={{ message: 'nested data' }} />
</div>
