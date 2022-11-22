import { defineTheme } from '@nuxt-themes/config'

export default defineTheme({
  title: 'unhead',
  name: 'unhead',
  description: 'Tiny, full-featured universal document <head> manager, for everyone.',
  url: 'https://unhead.harlanzw.com/',
  layout: 'default',
  socials: {
    twitter: '@harlan_zw',
    github: 'unjs/unhead',
  },
  github: {
    root: 'content',
    edit: true,
  },
  aside: {
    level: 1,
    filter: [],
  },
  header: {
    title: false,
    logo: true,
  },
  cover: {
    src: 'https://unhead.harlanzw.com/og.png',
  },
  footer: {
    credits: {
      icon: 'IconDocus',
      text: 'Powered by Docus',
      href: 'https://docus.com',
    },
  },
})
