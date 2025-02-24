<script lang="ts">
import { useScript } from '../../src/composables'

const { src, trigger, use, warmupStrategy } = $props()

let scriptLoaded = $state(false)
let scriptError = $state(false)

let { onLoaded, onError } = useScript(src, {
    trigger: trigger === 'click' ? (load) => {
      window.addEventListener('click', () => load(), { once: true })
    } : undefined,
    use,
    warmupStrategy
  }
)
console.log('added script instance', src )

onLoaded(() => {
  console.log('loaded!')
  scriptLoaded = true
})

onError(() => {
  scriptError = true
  console.log('error!')
})
</script>

<button>Load Script</button>

{#if !scriptLoaded && !scriptError}
  <div>Loading...</div>
{/if}

{#if scriptLoaded}
  <div>Script Loaded</div>
{/if}

{#if scriptError}
  <div>Script Error</div>
{/if}
