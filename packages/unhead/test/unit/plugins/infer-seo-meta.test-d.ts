import type { SSRHeadPayload } from '../../../src/server'
import { expectTypeOf, it } from 'vitest'
import { createHead as createClientHead } from '../../../src/client'
import { createHead as createLegacyClientHead, createServerHead as createLegacyServerHead } from '../../../src/legacy'
import { InferSeoMetaPlugin, PromisesPlugin } from '../../../src/plugins'
import { createHead as createServerHead } from '../../../src/server'
import { createUnhead } from '../../../src/unhead'

it('registers built-in factories on ordinary typed heads', () => {
  const server = createServerHead({ plugins: [InferSeoMetaPlugin(), PromisesPlugin] })
  const client = createClientHead({ plugins: [InferSeoMetaPlugin(), PromisesPlugin] })
  const core = createUnhead(() => {})
  core.use(InferSeoMetaPlugin())
  core.use(PromisesPlugin)
  server.use(InferSeoMetaPlugin())
  server.use(PromisesPlugin)
  client.use(InferSeoMetaPlugin())
  client.use(PromisesPlugin)
  server.use(InferSeoMetaPlugin()(server))
  server.use(PromisesPlugin(server))
  client.use(InferSeoMetaPlugin()(client))
  client.use(PromisesPlugin(client))
  core.use(InferSeoMetaPlugin()(core))
  core.use(PromisesPlugin(core))
  server.push({ title: 'Title' })

  expectTypeOf(server.render()).toEqualTypeOf<SSRHeadPayload>()
  expectTypeOf(client.render()).toEqualTypeOf<boolean>()
  expectTypeOf(core.render()).toEqualTypeOf<void>()
})

it('preserves custom input with promises and legacy factories', () => {
  interface CustomInput { customTitle: Promise<string> }
  const server = createServerHead<CustomInput>({ disableDefaults: true, plugins: [PromisesPlugin] })
  const client = createClientHead<CustomInput>({ plugins: [PromisesPlugin] })
  const legacyServer = createLegacyServerHead<CustomInput>({ disableDefaults: true })
  const legacyClient = createLegacyClientHead<CustomInput>()
  server.use(PromisesPlugin(server))
  client.use(PromisesPlugin(client))
  // @ts-expect-error inferred metadata pushes standard entries, which require standard input
  InferSeoMetaPlugin()(server)
  server.push({ customTitle: Promise.resolve('Title') })
  client.push({ customTitle: Promise.resolve('Title') })

  expectTypeOf(server.render()).toEqualTypeOf<SSRHeadPayload>()
  expectTypeOf(client.render()).toEqualTypeOf<boolean>()
  expectTypeOf(legacyServer.render()).toEqualTypeOf<SSRHeadPayload>()
  expectTypeOf(legacyClient.render()).toEqualTypeOf<boolean>()
  expectTypeOf(createLegacyServerHead().render()).toEqualTypeOf<SSRHeadPayload>()
  expectTypeOf(createLegacyClientHead().render()).toEqualTypeOf<boolean>()
})
