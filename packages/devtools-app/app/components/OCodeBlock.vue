<script setup lang="ts">
import { useRenderCodeHighlight } from '../composables/shiki'

const { code, lang } = defineProps<{
  code: string
  lang: 'json' | 'xml' | 'js' | 'css'
}>()

const rendered = useRenderCodeHighlight(computed(() => code), lang)
</script>

<template>
  <pre
    v-if="rendered"
    class="code-block"
    v-html="rendered"
  />
  <pre v-else class="text-xs font-mono overflow-auto leading-relaxed">{{ code }}</pre>
</template>

<style scoped>
.code-block {
  font-size: 0.6875rem;
  line-height: 1.6;
  overflow: auto;
}
.code-block :deep(pre) {
  margin: 0;
  padding: 0.5rem 0.625rem;
  background: transparent !important;
}
.code-block :deep(code) {
  font-family: var(--font-mono);
}
</style>
