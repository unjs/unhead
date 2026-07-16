<script lang="ts">
import { useScript } from '../../src/composables'

interface Props {
  onCall: (value: string) => void
}

const { onCall }: Props = $props()
const script = useScript('//svelte-keyed.js', { trigger: 'manual' })

script.onLoaded(() => onCall('first'), { key: 'shared' })
script.onLoaded(() => onCall('second'), { key: 'shared' })
</script>
