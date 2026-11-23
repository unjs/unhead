import type { Component, JSX } from 'solid-js'
import { createComponent, createEffect, createSignal, onMount, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { useHead } from '../../src'

// Components without JSX, so one source runs with the server and the client builds of Solid.
// `Dynamic` renders an element that hydration claims through its `data-hk` key.
function el(id: string, children: () => unknown) {
  return createComponent(Dynamic, {
    component: 'div',
    id,
    get children() {
      return children()
    },
  })
}

// `createComponent` picks the keyed overload of `Show`, so this names the plain one
const PlainShow = Show as Component<{ when: boolean, fallback: JSX.Element, children: JSX.Element }>

function when(condition: () => boolean, fallback: string, Child: Component) {
  return createComponent(PlainShow, {
    get when() {
      return condition()
    },
    fallback,
    get children() {
      return createComponent(Child, {})
    },
  })
}

// Fresh state for each render, so the server and the client start from the same values
export function createFixture() {
  const [title, setTitle] = createSignal('One')
  const [showChild, setShowChild] = createSignal(true)
  const [page, setPage] = createSignal<'first' | 'next'>('first')
  const [mounted, setMounted] = createSignal(false)

  const Child: Component = () => {
    useHead({ meta: [{ name: 'child', content: 'yes' }] })
    return el('child', () => 'child')
  }

  const NextPage: Component = () => {
    useHead({ title: 'Next page' })
    onMount(() => {
      useHead({ meta: [{ name: 'next-mounted', content: 'yes' }] })
    })
    return el('next', () => 'next')
  }

  const ClientChild: Component = () => {
    useHead({ meta: [{ name: 'client-child', content: 'yes' }] })
    return el('client-child', () => 'client child')
  }

  const apps = {
    Home: () => {
      useHead({ title: 'Home', meta: [{ name: 'description', content: 'desc' }] })
      return el('home', () => 'home')
    },
    Signal: () => {
      const entry = useHead({ title: title() })
      createEffect(() => {
        entry.patch({ title: title() })
      })
      return el('signal', () => title())
    },
    Getter: () => {
      useHead({ title: () => title() })
      return el('getter', () => 'getter')
    },
    Parent: () => {
      useHead({ title: 'Parent' })
      return el('parent', () => when(showChild, 'gone', Child))
    },
    MountPush: () => {
      onMount(() => {
        useHead({ meta: [{ name: 'mounted', content: 'yes' }] })
      })
      return el('mount-push', () => 'x')
    },
    ShowAfterMount: () => {
      onMount(() => setMounted(true))
      return el('show-after-mount', () => when(mounted, 'waiting', ClientChild))
    },
    Navigation: () => {
      useHead({ title: 'First page' })
      return el('navigation', () => when(() => page() === 'next', 'first', NextPage))
    },
  } satisfies Record<string, Component>

  return { apps, setTitle, setShowChild, setPage }
}

export type LazyAppName = keyof ReturnType<typeof createFixture>['apps']
