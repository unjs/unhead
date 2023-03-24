import { processTemplateParams } from 'unhead'
import { describe, it } from 'vitest'

describe('templateParams', () => {
  it('uri encoding', async () => {
    const input = 'https://firebasestorage.googleapis.com/v0/b/buuger.appspot.com/o/accounts%2Ffotobuukmy%2Fseries%2Fwedding-studio%2Fbuuks%2Fapril-film-studio%2Fcover.jpg?alt=media&token=8b93a6d5-dec2-4f28-9792-4568d73eeb5b'
    const res = processTemplateParams(input, {})
    expect(res).toEqual(input)
  })

  it('null params', async () => {
    const res = processTemplateParams('Something %nullish', {
      nullish: null,
    })
    expect(res).toMatchInlineSnapshot('"Something"')
  })
})
