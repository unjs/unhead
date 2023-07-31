<script setup lang="ts">
const { navigation } = useContent()
const { hasDocSearch } = useDocSearch()
const hasDialog = computed(() => navigation.value?.length > 1)

const color = useColorMode()
</script>

<template>
  <header :class="{ 'has-dialog': hasDialog, 'has-doc-search': hasDocSearch }">
    <Container fluid>
      <section class="left">
        <AppHeaderDialog v-if="hasDialog" />
        <AppHeaderLogo />
      </section>

      <section class="center">
        <AppHeaderLogo v-if="hasDialog" />
        <AppHeaderNavigation />
        <div class="hidden lg:flex">
          <AppSearch />
        </div>
      </section>

      <section class="right">
        <LegoGithubStar v-slot="{ stars }" repo="unjs/unhead" class="hidden 2xl:flex mr-5 group border dark:bg-gray-900 dark:hover:bg-gray-700 hover:bg-gray-200 dark:bg-gray-900 bg-gray-100 transition rounded-lg text-sm justify-center">
          <div class="flex items-center transition rounded-l px-2 py-1 space-x-1">
            <Icon name="uil:star" class="group-hover:op75 " />
            <div>Star</div>
          </div>
          <div class="px-2 py-1 dark:bg-black bg-white rounded-r-lg">
            {{ stars }}
          </div>
        </LegoGithubStar>
        <ThemeSelect />
        <div class="hidden lg:flex">
          <AppSocialIcons />
        </div>
      </section>
    </Container>
  </header>
</template>

<style scoped lang="ts">
css({
':deep(.icon)': {
  width: '{space.5}',
  height: '{space.5}'
},

'.navbar-logo': {
'.left &': {
'.has-dialog &': {
  display: 'none',
'@lg': {
  display: 'block'
}
},
},
'.center &': {
  display: 'block',
'@lg': {
  display: 'none'
}
}
},

header: {
  backdropFilter: '{elements.backdrop.filter}',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  width: '100%',
  borderBottom: '1px solid {color.gray.100}',
  backgroundColor: '{elements.backdrop.background}',
  height: '{docus.header.height}',

'@dark': {
  borderBottom: '1px solid {color.gray.900}',
},

'.container': {
  display: 'grid',
  height: '100%',
  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
  gap: '2rem'
},

section: {
  display: 'flex',
  alignItems: 'center',
  flex: 'none',
'&.left': {
  gridColumn: 'span 3 / span 3'
},
'&.center': {
  gridColumn: 'span 6 / span 6',
  justifyContent: 'center',
  flex: '1',
'nav': {
  display: 'none',
'@sm': {
  display: 'flex'
}
}
},
'&.right': {
  display: 'none',
  gridColumn: 'span 3 / span 3',
  justifyContent: 'flex-end',
  alignItems: 'center',
  flex: 'none',
  gap: '{space.4}',
'@sm': {
  display: 'flex'
}
}
}
}
})
</style>
