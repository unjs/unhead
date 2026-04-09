export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber',
      neutral: 'stone',
    },
    badge: {
      defaultVariants: {
        variant: 'subtle' as const,
      },
    },
    card: {
      slots: {
        root: 'rounded-xl',
      },
    },
    tabs: {
      trigger: 'leading-8',
      label: 'font-medium',
      list: 'h-[48px] gap-5',
      variants: {
        size: { md: { trigger: 'px-0 pt-0' } },
      },
    },
    icons: {
      caution: 'i-carbon-warning-alt',
      copy: 'i-carbon-copy',
      dark: 'i-carbon-moon',
      document: 'i-carbon-document',
      external: 'i-carbon-launch',
      hash: 'i-carbon-hashtag',
      light: 'i-carbon-sun',
      menu: 'i-carbon-menu',
      next: 'i-carbon-arrow-right',
      note: 'i-carbon-information',
      prev: 'i-carbon-arrow-left',
      system: 'i-carbon-screen',
      tip: 'i-carbon-idea',
      warning: 'i-carbon-warning',
      chevronDoubleLeft: 'i-carbon-chevron-double-left',
      chevronDoubleRight: 'i-carbon-chevron-double-right',
      chevronDown: 'i-carbon-chevron-down',
      chevronLeft: 'i-carbon-chevron-left',
      chevronRight: 'i-carbon-chevron-right',
      arrowLeft: 'i-carbon-arrow-left',
      arrowRight: 'i-carbon-arrow-right',
      check: 'i-carbon-checkmark',
      close: 'i-carbon-close',
      ellipsis: 'i-carbon-overflow-menu-horizontal',
      loading: 'i-carbon-loading',
      minus: 'i-carbon-subtract',
      search: 'i-carbon-search',
    },
  },
})
