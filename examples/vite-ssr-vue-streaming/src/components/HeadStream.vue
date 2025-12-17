<script lang="ts">
import { h } from 'vue'

/**
 * Renders a marker that triggers head updates during streaming SSR.
 * Place this after async components that call useHead/useServerHead.
 */
export default {
  setup() {
    return () => h('script', { innerHTML: '<!--[unhead-ssr]-->' })
  }
}
</script>
