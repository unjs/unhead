import { describe, it } from 'vitest'
import { processTemplateParams } from '../../src/utils/templateParams'

describe('processTemplateParams', () => {
  it('basic', async ({ bench }) => {
    await bench('basic', () => {
      processTemplateParams('%s %separator %siteName', {
        pageTitle: 'hello world',
        siteName: 'My Awesome Site',
      }, '/')
    }).run()
  })

  it('nested props', async ({ bench }) => {
    await bench('nested props', () => {
      processTemplateParams('%params.nested %anotherParams.nested', {
        pageTitle: 'hello world',
        siteName: 'My Awesome Site',
        params: {
          nested: 'yes',
        },
        anotherParams: {
          nested: 'another yes',
        },
      }, '/')
    }).run()
  })

  it('not found props', async ({ bench }) => {
    await bench('not found props', () => {
      processTemplateParams('%test %another %name %value', {
        pageTitle: 'hello world',
        siteName: 'My Awesome Site',
      }, '/')
    }).run()
  })

  it('with url', async ({ bench }) => {
    await bench('with url', () => {
      processTemplateParams('https://cdn.example.com/some%20image.jpg', {
        pageTitle: 'hello world',
        siteName: 'My Awesome Site',
      }, '/')
    }).run()
  })

  it('simple string', async ({ bench }) => {
    await bench('simple string', () => {
      processTemplateParams('My Awesome Simple String', {
        pageTitle: 'hello world',
        siteName: 'My Awesome Site',
      }, '/')
    }).run()
  })
})
