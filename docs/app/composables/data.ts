import type { NavItem } from '@nuxt/content'
import { computedAsync, queryCollectionNavigation, useAsyncData } from '#imports'
import { camelCase, titleCase } from 'scule'
import { selectedFramework } from './nav'

export function movingAverage(data: number[], windowSize: number) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1) // Determine the start of the window
    const windowData = data.slice(start, i + 1) // Get the data for the window
    const sum = windowData.reduce((sum, point) => sum + point, 0) // Sum the downloads in the window
    const avg = sum / windowData.length // Calculate the average
    result.push(avg) // Add the moving average to the result
  }
  return result
}

function mapPath(data, node = 0) {
  if (node < 2) {
    return mapPath(data[0].children, node + 1)
  }
  return [...data.map((item) => {
    if (item.children?.length && !item.page) {
      item.title = titleCase(item.title)
      item.children = mapPath(item.children, node + 1)
    }
    return {
      ...item,
      children: item.children ? [...item.children] : undefined,
      _path: item.path,
    }
  })]
}
function transformAsTopNav(tree: NavItem) {
  return tree?.children?.map((child) => {
    if (child.path.endsWith('installation')) {
      child.icon = 'i-ph-rocket-launch-duotone'
    }
    else if (child.path.endsWith('troubleshooting')) {
      child.icon = 'i-ph-hammer-duotone'
    }
    else if (child.path.endsWith('introduction')) {
      child.icon = 'i-ph-text-align-center-duotone'
    }
    if (child.children?.length) {
      return false
    }
    return child
  }).filter(Boolean) || []
}

export async function useDocsNav() {
  const route = useRoute()
  const collection = camelCase(route.path.split('/').slice(0, 3).join('-'))
  // const module = useModule()
  // if (!module.value) {
  //   return ref({ files: [], nav: { top: [], bottom: [] } })
  // }
  const start = Date.now()
  let searchTiming: number
  let navTiming: number
  console.log('use docs nav')
  const dataAsync = computedAsync(async () => {
    const [{ data: files }, { data: res }] = await Promise.all([
      useAsyncData('search', async () => {
        const files = await queryCollectionSearchSections(collection)
        searchTiming = Date.now() - start
        return files
      }),
      useAsyncData(`navigation-head`, async () => {
        const nav = await queryCollectionNavigation(collection)
        navTiming = Date.now() - start
        return nav
      }, {
        default: () => [],
      }),
    ])
    console.log({ files, res })
    return { files, res }
  })
  return computed(() => {
    if (!dataAsync.value) {
      return null
    }
    const lang = selectedFramework.value || route.path.split('/')[3]
    const { files, res } = dataAsync.value
    console.log('recomputing nav', res.value)
    const nav = mapPath([...res.value])
    const top = transformAsTopNav(([...nav]).find(n => n.path.endsWith(`/${lang}`)))
    const mergedItems = ([...nav])
      .filter(n => n.path.endsWith(`/${lang}`) && n.children?.length)
      .flatMap(n => n.children)
      .filter(n => n.children?.length)
      .map((n) => {
        n.children = n.children.map((c) => {
          return { ...c, tag: lang }
        })
        return n
      })

    const bottom = [
      ...([...nav])
        .filter(n => (!n.path.endsWith('/vue') && !n.path.endsWith('/typescript') && !n.path.endsWith('/react'))),
      ...mergedItems,
    ]
      // merge all /guide paths
      .reduce((acc, n) => {
        if (n.path.endsWith('/guides')) {
          const idx = acc.findIndex(a => a.path.endsWith('/guides'))
          if (idx > -1) {
            acc[idx].children.unshift(...n.children)
          }
          else {
            acc.push(n)
          }
        }
        else {
          acc.push(n)
        }
        return acc
      }, [])
      .map((m) => {
        if (m.path.includes('/api')) {
          m.icon = 'i-vscode-icons-file-type-typescript-official'
          m.title = 'API'
        }
        else if (m.path.includes('/releases')) {
          m.icon = 'i-noto-sparkles'
          m.title = 'Releases'
        }
        else if (m.path.includes('/migration-guide')) {
          m.icon = 'i-noto-globe-with-meridians'
          m.title = 'Migration Guides'
        }
        else if (m.path.includes('/guides')) {
          m.icon = 'i-carbon-notebook'
          m.title = 'Guides'
        }
        if (m.children?.length) {
          m.children = m.children.map((c) => {
            if (c.children?.length === 1) {
              c = c.children[0]
            }
            return c
          })
          m.children = m.children.map((c) => {
            if (c.path.includes('/api/config')) {
              c.icon = 'i-vscode-icons-file-type-typescript-official'
              c.title = 'nuxt.config.ts'
            }
            else if (c.path.includes('/api/schema')) {
              c.icon = 'i-vscode-icons-file-type-typescript-official'
              c.title = 'runtime/types.ts'
            }
            else if (c.title.endsWith('()')) {
              c.html = true
              m.icon = 'i-vscode-icons-file-type-typescript-official'
              const [fnName] = c.title.split('()')
              c.title = `<code class="language-ts shiki shiki-themes github-light github-light material-theme-palenight" language="ts"><span style="--shiki-light: #6F42C1; --shiki-default: #6F42C1; --shiki-dark: #82AAFF;">${fnName}</span><span style="--shiki-light: #24292E; --shiki-default: #24292E; --shiki-dark: #BABED8;">()</span></code>`
            }
            else if (c.title.startsWith('<') && c.title.endsWith('>') && !c.title.includes('<code')) {
              const inner = c.title.slice(1, -1)
              c.html = true
              c.title = `<code class="language-ts shiki shiki-themes github-light github-light material-theme-palenight" language="ts"><span class="line" line="2"><span style="--shiki-light: #24292E; --shiki-default: #24292E; --shiki-dark: #89DDFF;">  &lt;</span><span style="--shiki-light: #22863A; --shiki-default: #22863A; --shiki-dark: #F07178;">${inner}</span><span style="--shiki-light: #24292E; --shiki-default: #24292E; --shiki-dark: #89DDFF;"> /&gt;
</span></span></code>`
            }
            if (c.children?.length === 1) {
              c = c.children[0]
            }
            return c
          })
        }
        return m
      })
    const navFlat = nav.flatMap((n) => {
      if (n.children?.length) {
        return n.children
      }
      return n
    })
    return { files, navFlat, top, bottom, searchTiming, navTiming }
  })
}
