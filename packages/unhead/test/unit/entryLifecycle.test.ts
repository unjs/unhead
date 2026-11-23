import { createClientHeadWithContext, createServerHeadWithContext } from '../util'

function createDeferred() {
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<void>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { promise, reject, resolve }
}

describe('entry lifecycle hooks', () => {
  it('can suppress pushes until an integration unfreezes entries', () => {
    let frozen = true
    const head = createServerHeadWithContext({
      hooks: {
        'entries:beforePush': (ctx) => {
          if (frozen)
            ctx.shouldPush = false
        },
      },
    })

    const ignored = head.push({ title: 'plugin title' })
    expect(head.entries).toHaveLength(0)

    frozen = false
    ignored.patch({ title: 'late plugin title' })
    expect(head.entries).toHaveLength(0)

    head.push({ title: 'component title' })
    expect(head.entries).toHaveLength(1)
  })

  it('defers client disposal until every registered promise settles', async () => {
    const navigation = createDeferred()
    const suspense = createDeferred()
    let hookCalls = 0
    const head = createClientHeadWithContext({
      render: () => false,
      hooks: {
        'entries:beforeDispose': (ctx) => {
          hookCalls++
          ctx.defer(navigation.promise)
          ctx.defer(suspense.promise)
        },
      },
    })
    const entry = head.push({ title: 'Current page' })

    entry.dispose()
    entry.dispose()
    expect(hookCalls).toBe(1)
    expect(head.entries).toHaveLength(1)

    navigation.resolve()
    await navigation.promise
    await Promise.resolve()
    expect(head.entries).toHaveLength(1)

    suspense.resolve()
    await suspense.promise
    await Promise.resolve()
    await Promise.resolve()
    expect(head.entries).toHaveLength(0)
  })

  it('disposes after a deferred promise rejects', async () => {
    const navigation = createDeferred()
    const head = createClientHeadWithContext({
      render: () => false,
      hooks: {
        'entries:beforeDispose': ctx => ctx.defer(navigation.promise),
      },
    })
    const entry = head.push({ title: 'Current page' })

    entry.dispose()
    navigation.reject(new Error('navigation failed'))
    await expect(navigation.promise).rejects.toThrow('navigation failed')
    await Promise.resolve()
    await Promise.resolve()

    expect(head.entries).toHaveLength(0)
  })
})
