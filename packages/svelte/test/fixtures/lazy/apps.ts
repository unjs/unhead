import Home from './Home.svelte'
import MountPush from './MountPush.svelte'
import Navigation from './Navigation.svelte'
import Parent from './Parent.svelte'
import ShowAfterMount from './ShowAfterMount.svelte'
import Title from './Title.svelte'

// One map for both halves: the Vite SSR server compiles these for the server,
// and the test file compiles them for the client
export const apps = {
  Home,
  Title,
  Parent,
  ShowAfterMount,
  MountPush,
  Navigation,
}

export type LazyAppName = keyof typeof apps
