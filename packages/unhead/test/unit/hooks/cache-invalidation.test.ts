import { describe, expect, it } from 'vitest'
import { createHead } from '../../../src/server'

describe('resolver cache hook invalidation', () => {
  it('re-normalizes existing entries when normalize hooks are added and removed', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ title: 'Original' })

    expect(head.render().headTags).toContain('>Original</title>')

    let calls = 0
    const unhook = head.hooks.hook('entries:normalize', ({ tags }) => {
      calls++
      const title = tags.find(tag => tag.tag === 'title')
      if (title)
        title.textContent = 'Hooked'
    })

    expect(head.render().headTags).toContain('>Hooked</title>')
    expect(calls).toBe(1)

    // The normalized result is cached until either the entry or hook topology changes.
    expect(head.render().headTags).toContain('>Hooked</title>')
    expect(calls).toBe(1)

    unhook()
    expect(head.render().headTags).toContain('>Original</title>')
    expect(calls).toBe(1)
  })

  it('honors normalize hooks registered by entries:resolve in the same render', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ title: 'Original' })
    head.render()

    let installed = false
    head.hooks.hook('entries:resolve', () => {
      if (installed)
        return
      installed = true
      head.hooks.hook('entries:normalize', ({ tags }) => {
        const title = tags.find(tag => tag.tag === 'title')
        if (title)
          title.textContent = 'Installed during resolve'
      })
    })

    expect(head.render().headTags).toContain('>Installed during resolve</title>')
  })
})
