<script lang="ts">
import { useScript } from '../../src/composables'

let { onLoaded } = useScript<{ init: () => void }>('https://cdn.jsdelivr.net/npm/confetti-js@0.0.18/dist/index.min.js', {
    use: () => (window as any).ExampleAPI,
  }
)

onLoaded((vm) => {
  console.log('on loaded!')
  vm.init()
})
</script>
