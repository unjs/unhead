import { bench, describe } from 'vitest'
import { processTemplateParams } from '../../src/utils/templateParams'

describe('processTemplateParams', () => {
  bench('basic', () => {
    processTemplateParams('%s %separator %siteName', {
      pageTitle: 'hello world',
      siteName: 'My Awesome Site',
    }, '/')
  })

  bench('nested props', () => {
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
  })

  bench('not found props', () => {
    processTemplateParams('%test %another %name %value', {
      pageTitle: 'hello world',
      siteName: 'My Awesome Site',
    }, '/')
  })

  bench('with url', () => {
    processTemplateParams('https://cdn.example.com/some%20image.jpg', {
      pageTitle: 'hello world',
      siteName: 'My Awesome Site',
    }, '/')
  })

  bench('simple string', () => {
    processTemplateParams('My Awesome Simple String', {
      pageTitle: 'hello world',
      siteName: 'My Awesome Site',
    }, '/')
  })
})
