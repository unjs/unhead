import { hashTag } from '../../src/utils/dedupe'

describe('hashTag', () => {
  it('serializes fallback tag props in sorted order', () => {
    expect(hashTag({
      tag: 'link',
      props: {
        rel: 'stylesheet',
        href: '/_nuxt/app.css',
        crossorigin: true as any,
      },
    })).toBe('link:crossorigin:true,href:/_nuxt/app.css,rel:stylesheet')
    // prop order must not affect the hash (#823)
    expect(hashTag({
      tag: 'script',
      props: { defer: true as any, src: '/app.js' },
    })).toBe(hashTag({
      tag: 'script',
      props: { src: '/app.js', defer: true as any },
    }))
  })

  it('ignores inherited props', () => {
    const props = Object.create({ inherited: 'ignored' })
    props.src = '/_nuxt/app.js'
    expect(hashTag({ tag: 'script', props })).toBe('script:src:/_nuxt/app.js')
  })

  it('preserves the empty props fallback', () => {
    expect(hashTag({ tag: 'link', props: {} })).toBe('link:')
  })

  it('preserves explicit tag identities', () => {
    expect(hashTag({ tag: 'script', props: {}, _h: 'hash' })).toBe('hash')
    expect(hashTag({ tag: 'meta', props: {}, _d: 'dedupe' })).toBe('dedupe')
    expect(hashTag({ tag: 'style', props: {}, innerHTML: 'body{}' })).toBe('body{}')
  })
})
