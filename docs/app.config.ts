export default defineAppConfig({
  site: {
    title: 'Unhead',
    description: 'Universal document <head> tag manager. Framework agnostic. Platform agnostic.',
    locale: 'en',
  },
  siteTitle: 'Unhead',
  locale: 'en',
  docus: {
    title: 'Unhead',
    name: 'Unhead',
    description: 'Universal document <head> tag manager. Framework agnostic. Platform agnostic.',
    url: 'https://unhead.harlanzw.com/',
    layout: 'default',
    socials: {
      twitter: '@harlan_zw',
      github: 'unjs/unhead',
    },
    github: {
      owner: 'unjs',
      repo: 'unhead',
      branch: 'main',
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
  }
})
