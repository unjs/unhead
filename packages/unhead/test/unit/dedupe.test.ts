import { hashTag } from '../../src/utils/dedupe'

describe('hashTag', () => {
  it('serializes fallback tag props in insertion order', () => {
    expect(hashTag({
      tag: 'link',
      props: {
        rel: 'stylesheet',
        href: '/_nuxt/app.css',
        crossorigin: true as any,
      },
    })).toBe('link:rel:stylesheet,href:/_nuxt/app.css,crossorigin:true')
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
