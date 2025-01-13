<script lang="ts" setup>
import type { modules } from '../../../src/const'
import { toRefs } from 'vue'
import { humanNumber } from '~/composables/format'
import { useModule } from '~/composables/module'

const { version = true, module: _module, slug, size = 'md' } = defineProps<{
  module?: any
  slug?: typeof modules[number]['slug']
  size?: 'sm' | 'md' | 'lg'
  version?: boolean
}>()

// as refs
const propsAsRefs = toRefs(reactive({
  module: _module,
  slug,
  size,
  version,
}))

const module = _module ? propsAsRefs.module : useModule(propsAsRefs.slug)

const iconAttrs = computed(() => {
  switch (size) {
    case 'sm': return { class: 'w-4 h-4' }
    case 'md': return { class: 'w-6 h-6' }
    case 'lg': return { class: 'w-5 h-5' }
    default: return {}
  }
})

const windowSize = ref(8)
const chartWidth = ref(250)
const container = useTemplateRef('container')
onMounted(() => {
  chartWidth.value = container.value.$el.offsetWidth
})
</script>

<template>
  <NuxtLink ref="container" :to="`/docs/${module.slug}/getting-started/introduction`" class="group hover:shadow-[0_0_15px_5px_rgba(20,255,209,0.05)] transition-all relative min-w-[250px] inline-flex transition-all flex-col rounded-lg font-bold border bg-gradient-to-r from-sky-700/10 to-blue-700/20 border-sky-700/20 px-2 py-2 gap-1" @mouseenter="windowSize = 1" @mouseleave="windowSize = 8">
    <div class="z-1 flex flex-col justify-between h-full">
      <div>
        <div class="flex justify-between">
          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center gap-1">
              <div class="flex items-center gap-1">
                <UIcon v-if="module.icon" dynamic :name="module.icon" class="text-blue-500 dark:text-blue-300" v-bind="iconAttrs" />{{ module.label }}
                <UTooltip text="Latest version">
                  <UBadge v-if="version" variant="soft" size="sm" color="secondary" class="ml-1">
                    {{ module.version }}
                  </UBadge>
                </UTooltip>
              </div>
              <div>
                <div class="flex items-end gap-2">
                  <div>
                    <UTooltip text="Downloads in last 90 days.">
                      <div class="justify-end dark:text-neutral-500 text-[10px] text-neutral-700/75 inline-flex items-center gap-[2px]">
                        <UIcon name="i-carbon-download" class="w-3 h-3 " />
                        <div class="font-mono font-normal">
                          {{ humanNumber(module.totalDownloads90) }}
                        </div>
                      </div>
                    </UTooltip>
                  </div>
                </div>
              </div>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 font-normal">
              {{ module.description }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
