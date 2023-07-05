let routeEntry

export default defineNuxtRouteMiddleware((to, from) => {
  if (!routeEntry) {
    console.log('adding route entry')
    routeEntry = useHead({
      title: () => {
        console.log('title:', to.meta, String(to.meta.title))
        return String(to.meta.title)
      },
    })
  }
})
