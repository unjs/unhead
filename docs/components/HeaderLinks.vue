<script setup lang="ts">
import type { NavItem } from '@nuxt/content/dist/runtime/types'

const props = defineProps<{ modelValue: boolean; links: { to: string; label: string }[] }>()
const emit = defineEmits(['update:modelValue'])

const isDialogOpen = useVModel(props, 'modelValue', emit)

const navigation: Ref<NavItem[]> = inject('navigation')

const route = useRoute()
function isActive(item) {
  return computed(() => {
    return route.path.startsWith(item._path)
  })
}
</script>

<template>
  <div class="flex items-center justify-between gap-2 h-16">
    <div class="flex items-center gap-6">
      <div class="flex items-center gap-3">
        <NuxtLink to="/">
          <div class="flex items-center">
            <div class="flex items-center mr-3 mb-1">
              <icon name="lucide:triangle" class="text-black dark:text-white w-7 h-7" />
              <div class="ml-3">
                <h1 class="font-bold text-xl">
                  Unhead
                </h1>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <div class="flex space-x-5">
      <UButton v-for="(item, i) in navigation" :key="i" :to="item.children[0].children[0]._path" :variant="!isActive(item).value ? 'ghost' : 'outline'" class="md:block hidden">
        <span class="text-gray-700 dark:text-gray-200">{{ item.title }}</span>
      </UButton>
    </div>

    <div class="flex items-center justify-end -mr-1.5 gap-3">
      <DocsSearchButton class="ml-1.5 flex-1 lg:flex-none lg:w-48" />

      <div class="flex items-center lg:gap-1.5">
        <ColorModeButton />

        <UButton
          to="https://twitter.com/harlan_zw"
          target="_blank"
          color="gray"
          variant="ghost"
          class="hidden lg:inline-flex"
          icon="i-simple-icons-twitter"
        />

        <UButton
          to="https://github.com/harlan-zw"
          target="_blank"
          color="gray"
          variant="ghost"
          class="hidden lg:inline-flex"
          icon="i-simple-icons-github"
        />

        <UButton
          color="gray"
          variant="ghost"
          class="lg:hidden"
          :icon="isDialogOpen ? 'i-heroicons-x-mark-20-solid' : 'i-heroicons-bars-3-20-solid'"
          @click="isDialogOpen = !isDialogOpen"
        />
      </div>
    </div>
  </div>
</template>
