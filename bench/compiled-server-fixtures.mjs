// Fixtures for bench/compiled-server.bench.ts. The caller passes the modules in.

function ok(result) {
  if (result._tag !== 'Ok')
    throw new Error(`fixture input did not compile: ${result.reason}`)
  return result.tags
}

function mediumEntry(i, description) {
  return {
    meta: [
      { name: `description-${i}`, content: description },
      { property: 'og:image', content: `/image-${i}.png` },
    ],
    link: [{ rel: 'preload', as: 'script', href: `/_nuxt/chunk-${i}.js` }],
    script: [{ type: 'application/ld+json', innerHTML: { '@context': 'https://schema.org', '@type': 'WebPage', 'name': `Page ${i}` } }],
  }
}

const COUNT = 40
const SEO = {
  title: 'Perf benchmark',
  titleTemplate: '%s %separator %siteName',
  description: 'SSR perf benchmark',
  ogTitle: 'Perf benchmark',
  ogImage: '/og.png',
  twitterCard: 'summary_large_image',
}

export function createFixtures(m) {
  const { compileTags, dynamicValue, unpackMeta, useSeoMeta } = m
  const seoInput = title => ({
    title,
    titleTemplate: SEO.titleTemplate,
    meta: unpackMeta({ description: SEO.description, ogTitle: SEO.ogTitle, ogImage: SEO.ogImage, twitterCard: SEO.twitterCard }),
  })

  // The medium shape of bench/perf-ci.mjs. Inputs sit at process scope for every path,
  // so the v3 numbers are its best case and the ratio is conservative.
  const mediumFirst = { title: 'Perf benchmark', templateParams: { separator: '-', siteName: 'Unhead' } }
  const mediumEntries = Array.from({ length: COUNT }, (_, i) => mediumEntry(i, `Description ${i}`))
  const mediumFirstTags = ok(compileTags(mediumFirst))
  const mediumTagSets = mediumEntries.map(input => ok(compileTags(input)))
  const seoTags = ok(compileTags(seoInput(SEO.title)))
  const renderOptions = { omitLineBreaks: true }

  // the same shape with values: one description per entry, and the title
  const dynamicValueTagSets = Array.from({ length: COUNT }, (_, i) => ok(compileTags({
    meta: [
      { name: `description-${i}`, content: dynamicValue(0) },
      { property: 'og:image', content: `/image-${i}.png` },
    ],
    link: [{ rel: 'preload', as: 'script', href: `/_nuxt/chunk-${i}.js` }],
    script: [{ type: 'application/ld+json', innerHTML: { '@context': 'https://schema.org', '@type': 'WebPage', 'name': `Page ${i}` } }],
  }, { valueCount: 1 })))
  const seoValueTags = ok(compileTags(seoInput(dynamicValue(0)), { valueCount: 1 }))

  const titles = ['Perf benchmark', 'Another page', 'Third "quoted" title']
  const descriptions = Array.from({ length: COUNT }, (_, i) => titles.map(title => `${title} ${i}`))
  const valueArrays = descriptions.map(row => row.map(text => [text]))
  const titleArrays = titles.map(title => [title])
  const looseValues = titles.map((_, t) => Array.from({ length: COUNT }, (_, i) => mediumEntry(i, descriptions[i][t])))
  let tick = 0

  const mediumV3 = (input = mediumEntries, title = SEO.title) => {
    const head = m.createV3Head({ disableDefaults: true })
    head.push(mediumFirst)
    for (let i = 0; i < COUNT; i++)
      head.push(input[i])
    useSeoMeta(head, { ...SEO, title })
    return m.renderV3(head, renderOptions)
  }

  const pushMedium = (head) => {
    head.push(mediumFirstTags)
    for (let i = 0; i < COUNT; i++)
      head.push(mediumTagSets[i])
    head.push(seoTags)
  }

  const pushMediumValue = (head, t) => {
    head.push(mediumFirstTags)
    for (let i = 0; i < COUNT; i++)
      head.push(dynamicValueTagSets[i], { values: valueArrays[i][t] })
    head.push(seoValueTags, { values: titleArrays[t] })
  }

  // Nuxt shape: appHead through init, TemplateParamsPlugin, one page useHead, one useSeoMeta
  const appHead = {
    htmlAttrs: { lang: 'en' },
    meta: [{ charset: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    titleTemplate: '%s %separator %siteName',
    templateParams: { separator: '|', siteName: 'My Site' },
    link: [{ rel: 'icon', href: '/favicon.ico' }],
  }
  const page = {
    title: 'Blog post',
    meta: [{ name: 'description', content: 'A post on %siteName' }],
    link: [{ rel: 'canonical', href: 'https://example.com/blog/post' }],
    script: [{ type: 'application/ld+json', innerHTML: { '@type': 'BlogPosting', 'headline': 'Blog post' } }],
  }
  const nuxtSeo = { ogTitle: 'Blog post', ogImage: '/og.png', twitterCard: 'summary_large_image', description: 'A post' }
  const nuxtSeoTags = ok(compileTags({ meta: unpackMeta(nuxtSeo) }))
  const appHeadTags = ok(compileTags(appHead))
  const pageTags = ok(compileTags(page))
  const pageValueTags = ok(compileTags({
    title: dynamicValue(0),
    meta: [{ name: 'description', content: dynamicValue(1) }],
    link: [{ rel: 'canonical', key: 'canonical', href: dynamicValue(2) }],
    script: page.script,
  }, { valueCount: 3 }))
  const pageValues = titles.map((title, i) => ({
    array: [title, `A post about ${title}`, `https://example.com/blog/${i}`],
    input: {
      title,
      meta: [{ name: 'description', content: `A post about ${title}` }],
      link: [{ rel: 'canonical', key: 'canonical', href: `https://example.com/blog/${i}` }],
      script: page.script,
    },
  }))
  const nuxtPlugins = [m.TemplateParamsPlugin]
  const nuxtSeoInput = { ...nuxtSeo }

  // a default @nuxtjs/seo site also registers InferSeoMetaPlugin
  const seoPlugins = () => [m.TemplateParamsPlugin, m.InferSeoMetaPlugin()]

  const nuxtV3 = (input, plugins = nuxtPlugins) => {
    const head = m.createV3Head({ plugins, init: [appHead] })
    head.push(input)
    useSeoMeta(head, nuxtSeoInput)
    return m.renderV3(head)
  }

  const groups = [
    {
      name: 'medium',
      tier: 'memo',
      v3: () => mediumV3(),
      compiled() {
        const head = m.createCompiledHead({ disableDefaults: true })
        pushMedium(head)
        return m.renderCompiled(head, renderOptions)
      },
    },
    {
      name: 'medium',
      tier: 'value',
      v3: (t = tick++ % 3) => mediumV3(looseValues[t], titles[t]),
      compiled(t = tick++ % 3) {
        const head = m.createCompiledHead({ disableDefaults: true })
        pushMediumValue(head, t)
        return m.renderCompiled(head, renderOptions)
      },
    },
    {
      name: 'medium',
      tier: 'mixed',
      v3: () => mediumV3(),
      // one entry in five stays loose
      compiled() {
        const head = m.createCompiledHead({ disableDefaults: true })
        head.push(mediumFirstTags)
        for (let i = 0; i < COUNT; i++)
          head.push(i % 5 ? mediumTagSets[i] : mediumEntries[i])
        head.push(seoTags)
        return m.renderCompiled(head, renderOptions)
      },
    },
    {
      name: 'nuxt',
      tier: 'memo',
      v3: () => nuxtV3(page),
      compiled() {
        const head = m.createCompiledHead({ plugins: nuxtPlugins, init: [appHeadTags] })
        head.push(pageTags)
        head.push(nuxtSeoTags)
        return m.renderCompiled(head)
      },
    },
    {
      name: 'nuxt',
      tier: 'value',
      v3: (t = tick++ % 3) => nuxtV3(pageValues[t].input),
      compiled(t = tick++ % 3) {
        const head = m.createCompiledHead({ plugins: nuxtPlugins, init: [appHeadTags] })
        head.push(pageValueTags, { values: pageValues[t].array })
        head.push(nuxtSeoTags)
        return m.renderCompiled(head)
      },
    },
    {
      name: 'nuxt',
      tier: 'mixed',
      v3: () => nuxtV3(page),
      // the page useHead stays loose
      compiled() {
        const head = m.createCompiledHead({ plugins: nuxtPlugins, init: [appHeadTags] })
        head.push(page)
        head.push(nuxtSeoTags)
        return m.renderCompiled(head)
      },
    },
    {
      name: 'nuxt seo',
      tier: 'memo',
      v3: () => nuxtV3(page, seoPlugins()),
      compiled() {
        const head = m.createCompiledHead({ plugins: seoPlugins(), init: [appHeadTags] })
        head.push(pageTags)
        head.push(nuxtSeoTags)
        return m.renderCompiled(head)
      },
    },
    {
      name: 'nuxt seo',
      tier: 'value',
      v3: (t = tick++ % 3) => nuxtV3(pageValues[t].input, seoPlugins()),
      compiled(t = tick++ % 3) {
        const head = m.createCompiledHead({ plugins: seoPlugins(), init: [appHeadTags] })
        head.push(pageValueTags, { values: pageValues[t].array })
        head.push(nuxtSeoTags)
        return m.renderCompiled(head)
      },
    },
  ]
  return groups
}
