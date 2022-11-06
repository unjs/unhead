<script setup lang="ts">
import GithubButton from 'vue-github-button'
// import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { onMounted, onUnmounted, ref, useColorMode, useDocSearch } from '#imports'

const onTop = ref(true)

const setOnTop = () => {
  if (window.pageYOffset <= 0)
    onTop.value = true
  else
    onTop.value = false
}

onMounted(() => {
  setOnTop()
  document.addEventListener('scroll', setOnTop)
})

onUnmounted(() => document.removeEventListener('scroll', setOnTop))

const color = useColorMode()
const githubColorScheme = computed(() => color.value === 'dark' ? 'no-preference: dark; light: dark; dark: dark;' : 'no-preference: light; light: light; dark: light;')

const { hasDocSearch } = useDocSearch()
</script>

<template>
<header class="h-header u-border-gray-100 sticky top-0 z-10 w-full border-b bg-white/95 backdrop-blur dark:bg-black/95">
  <div class="container mx-auto flex items-center justify-between px-5 lg:px-20 lg:grid h-full grid-cols-12 lg:gap-8">
    <div class="col-span-2 flex flex-none items-center lg:flex-none">
      <NavbarDialog />
      <NavbarLogo class="hidden lg:block" />
    </div>

    <div class="col-span-8 flex flex-1 items-center justify-center">
      <NavbarLogo class="lg:hidden" />
      <NavbarCenter class="hidden lg:flex" />
    </div>

    <div class="col-span-2 flex flex-none items-center justify-end lg:gap-4 lg:pl-4">
      <GithubButton class="hidden xl:inline h-[20px]" href="https://github.com/harlan-zw/unhead" :data-color-scheme="githubColorScheme" data-icon="octicon-star" data-show-count="true" aria-label="Star @vueuse/schema-org on GitHub">
        Star
      </GithubButton>
      <GithubButton class="hidden xl:inline h-[20px]" href="https://github.com/sponsors/harlan-zw" :data-color-scheme="githubColorScheme" data-icon="octicon-heart" aria-label="Sponsor @harlan-zw on GitHub">
        Sponsor
      </GithubButton>
<!--      <Menu>-->
<!--        <div class="hidden md:inline-block relative text-left">-->
<!--          <MenuButton class="inline-flex items-center w-full justify-center rounded-md px-2 py-2 text-sm hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">-->
<!--            v1.x-->
<!--            <icon name="mdi:chevron-down" class="ml-1 opacity-70 text-lg" />-->
<!--          </MenuButton>-->
<!--          <transition-->
<!--            enter-active-class="transition duration-100 ease-out"-->
<!--            enter-from-class="transform scale-95 opacity-0"-->
<!--            enter-to-class="transform scale-100 opacity-100"-->
<!--            leave-active-class="transition duration-75 ease-out"-->
<!--            leave-from-class="transform scale-100 opacity-100"-->
<!--            leave-to-class="transform scale-95 opacity-0"-->
<!--          >-->
<!--            <MenuItems class="absolute right-0 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">-->
<!--              <MenuItem v-slot="{ active }" class="p-1 w-full">-->
<!--                <a :class='{ "bg-green-300": active }' href="/account-settings" class="text-gray-900 group flex w-full items-center rounded-md px-2 py-2 text-sm">-->
<!--                  Visit v0.x Docs-->
<!--                </a>-->
<!--              </MenuItem>-->
<!--            </MenuItems>-->
<!--          </transition>-->
<!--        </div>-->
<!--      </Menu>-->
      <Search v-if="hasDocSearch" />
      <ThemeSelect :size="`h-5 w-5 ${hasDocSearch ? 'hidden lg:block' : ''}`" />
      <SocialIcons size="h-5 w-5 hidden lg:block" />
    </div>
  </div>
</header>
</template>
