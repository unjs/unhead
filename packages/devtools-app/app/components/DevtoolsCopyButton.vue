<script setup lang="ts">
const { text } = defineProps<{
  text: string
}>()

const { copy, copied } = useCopy()
</script>

<template>
  <UTooltip :text="copied ? 'Copied!' : 'Copy'">
    <UButton
      :icon="copied ? 'i-carbon-checkmark' : 'i-carbon-copy'"
      :aria-label="copied ? 'Copied' : 'Copy to clipboard'"
      size="xs"
      variant="ghost"
      color="neutral"
      :class="copied ? 'text-green-500' : ''"
      @click="copy(text)"
    />
  </UTooltip>
</template>
