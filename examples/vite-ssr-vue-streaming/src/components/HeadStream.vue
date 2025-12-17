<script lang="ts">
import { h } from 'vue'
export default {
  setup() {
    return () => {
      return h('script', {
        ['data-unhead-stream']: true,
        innerHTML: '<!--[unhead-stream]-->',
      })
    }
  }
}
</script>
