import { renderSSRHead } from '@unhead/ssr'
import { createHead, useSeoMeta } from 'unhead'
import { describe, it } from 'vitest'

describe('useSeoMeta', () => {
  it('themeColor array', async () => {
    const head = createHead()

    useSeoMeta({
      themeColor: [
        { content: 'cyan', media: '(prefers-color-scheme: light)' },
        { content: 'black', media: '(prefers-color-scheme: dark)' },
      ],
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="theme-color" content="cyan" media="(prefers-color-scheme: light)">
      <meta name="theme-color" content="black" media="(prefers-color-scheme: dark)">",
        "htmlAttrs": "",
      }
    `)
  })

  it('themeColor string', async () => {
    const head = createHead()

    useSeoMeta({
      themeColor: 'cyan',
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="theme-color" content="cyan">",
        "htmlAttrs": "",
      }
    `)
  })

  it('twitter image', async () => {
    const head = createHead()

    useSeoMeta({
      twitterImage: [
        {
          url: '/twitter-image.png',
          alt: 'test',
          width: 100,
          height: 100,
        },
        {
          url: '/twitter-image2.png',
          alt: 'test',
          width: 100,
          height: 100,
        },
      ],
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="twitter:image" content="/twitter-image.png">
      <meta name="twitter:image:alt" content="test">
      <meta name="twitter:image:width" content="100">
      <meta name="twitter:image:height" content="100">
      <meta name="twitter:image" content="/twitter-image2.png">
      <meta name="twitter:image:alt" content="test">
      <meta name="twitter:image:width" content="100">
      <meta name="twitter:image:height" content="100">",
        "htmlAttrs": "",
      }
    `)
  })

  it('removing with null', async () => {
    const head = createHead()

    useSeoMeta({
      description: 'test',
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="description" content="test">",
        "htmlAttrs": "",
      }
    `)

    useSeoMeta({
      description: null,
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": "",
      }
    `)
  })

  it('string object', async () => {
    const head = createHead()
    useSeoMeta({
      robots: 'noindex, nofollow',
    })
    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="robots" content="noindex, nofollow">",
        "htmlAttrs": "",
      }
    `)
  })

  it('robots falsy', async () => {
    const head = createHead()
    useSeoMeta({
      robots: {
        index: true,
        nofollow: false,
        noindex: false,
        maxSnippet: -1,
      },
    })
    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="robots" content="index, max-snippet:-1">",
        "htmlAttrs": "",
      }
    `)
  })

  it('generates correct meta tags', async () => {
    const head = createHead()
    const dateString = new Date(0).toISOString()

    useSeoMeta({
      appleItunesApp: {
        appId: 'id',
        appArgument: 'https://example.com',
      },
      appleMobileWebAppCapable: 'yes',
      appleMobileWebAppStatusBarStyle: 'black',
      appleMobileWebAppTitle: 'Title',
      applicationName: 'Name',
      articleAuthor: ['https://example.com/some.html', 'https://example.com/one.html'],
      articleExpirationTime: dateString,
      articleModifiedTime: dateString,
      articlePublishedTime: dateString,
      articleSection: 'Technology',
      articleTag: ['Apple', 'Steve Jobs'],
      author: 'Name',
      bookAuthor: ['https://example.com/some.html', 'https://example.com/one.html'],
      bookIsbn: '978-3-16-148410-0',
      bookReleaseDate: dateString,
      bookTag: ['Apple', 'Steve Jobs'],
      charset: 'utf-8',
      colorScheme: 'normal',
      contentSecurityPolicy: {
        baseUri: 'https://example.com',
        childSrc: '\'none\'',
        connectSrc: '\'none\'',
        defaultSrc: '\'none\'',
        fontSrc: '\'none\'',
        formAction: '\'none\'',
        frameAncestors: '\'none\'',
        imgSrc: '\'none\'',
        manifestSrc: '\'none\'',
        mediaSrc: '\'none\'',
        objectSrc: '\'none\'',
        prefetchSrc: '\'none\'',
        reportTo: '\'none\'',
        reportUri: '\'none\'',
        requireSriFor: '\'none\'',
        requireTrustedTypesFor: '\'none\'',
        sandbox: '\'none\'',
        scriptSrc: '\'none\'',
        scriptSrcAttr: '\'none\'',
        scriptSrcElem: '\'none\'',
        styleSrc: '\'none\'',
        styleSrcAttr: '\'none\'',
        styleSrcElem: '\'none\'',
        trustedTypes: '\'none\'',
        upgradeInsecureRequests: '\'none\'',
        workerSrc: '\'none\'',
      },
      contentType: 'text/html; charset=utf-8',
      creator: 'Name',
      defaultStyle: 'style',
      description: 'Description',
      fbAppId: 'id',
      formatDetection: 'telephone=no',
      generator: 'Generator',
      google: 'nopagereadaloud',
      googlebot: 'notranslate',
      googleSiteVerification: 'key',
      mobileWebAppCapable: 'yes',
      msapplicationConfig: 'config',
      msapplicationTileColor: '#fff',
      msapplicationTileImage: 'https://example.com',
      ogAudio: [{
        secureUrl: 'https://example.com',
        type: 'audio/mpeg',
        url: 'https://example.com',
      }],
      ogAudioSecureUrl: 'https://example.com',
      ogAudioType: 'audio/mpeg',
      ogAudioUrl: 'https://example.com',
      ogDescription: 'Description',
      ogDeterminer: 'auto',
      ogImage: [{
        alt: 'First',
        height: 1337,
        secureUrl: 'https://example.com',
        type: 'image/gif',
        url: 'https://example.com',
        width: 1337,
      }],
      ogImageAlt: 'Second',
      ogImageHeight: 1337,
      ogImageSecureUrl: 'https://example.com',
      ogImageType: 'image/gif',
      ogImageUrl: 'https://example.com',
      ogImageWidth: 1337,
      ogLocale: 'en-US',
      ogLocaleAlternate: 'de-DE',
      ogSiteName: 'Name',
      ogTitle: 'Title',
      ogType: 'article',
      ogUrl: 'https://example.com',
      ogVideo: [{
        alt: 'Alt',
        height: 1337,
        secureUrl: 'https://example.com',
        type: 'application/x-shockwave-flash',
        url: 'https://example.com',
        width: 1337,
      }],
      ogVideoAlt: 'Alt',
      ogVideoHeight: 1337,
      ogVideoSecureUrl: 'https://example.com',
      ogVideoType: 'application/x-shockwave-flash',
      ogVideoUrl: 'https://example.com',
      ogVideoWidth: 1337,
      profileFirstName: 'Firstname',
      profileGender: 'male',
      profileLastName: 'Lastname',
      profileUsername: 'Username',
      publisher: 'Name',
      rating: 'adult',
      referrer: 'no-referrer',
      refresh: {
        seconds: 1,
        url: 'https://example.com',
      },
      robots: {
        all: true,
        follow: true,
        index: true,
        indexifembedded: true,
        maxImagePreview: 'large',
        maxSnippet: 1,
        maxVideoPreview: 2,
        noarchive: true,
        nofollow: true,
        noimageindex: true,
        noindex: true,
        none: true,
        nositelinkssearchbox: true,
        nosnippet: true,
        notranslate: true,
        unavailable_after: dateString,
      },
      themeColor: '#fff',
      title: 'Title',
      titleTemplate: '%s',
      twitterAppIdGoogleplay: 'id',
      twitterAppIdIpad: 'id',
      twitterAppIdIphone: 'id',
      twitterAppNameGoogleplay: 'name',
      twitterAppNameIpad: 'name',
      twitterAppNameIphone: 'name',
      twitterAppUrlGoogleplay: 'https://example.com',
      twitterAppUrlIpad: 'https://example.com',
      twitterAppUrlIphone: 'https://example.com',
      twitterCard: 'summary_large_image',
      twitterCreator: '@username',
      twitterCreatorId: 'id',
      twitterData1: 'data1',
      twitterData2: 'data2',
      twitterDescription: 'Description',
      twitterImage: 'https://example.com',
      twitterImageAlt: 'Alt',
      twitterImageHeight: 1337,
      twitterImageType: 'image/gif',
      twitterImageWidth: 1337,
      twitterLabel1: 'label1',
      twitterLabel2: 'label2',
      twitterPlayer: 'https://example.com',
      twitterPlayerHeight: 1337,
      twitterPlayerStream: 'https://example.com',
      twitterPlayerWidth: 1337,
      twitterSite: '@username',
      twitterSiteId: 'id',
      twitterTitle: 'Title',
      viewport: 'width=device-width, initial-scale=1',
      xUaCompatible: 'IE=edge',
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta http-equiv="content-security-policy" content="base-uri https://example.com; child-src 'none'; connect-src 'none'; default-src 'none'; font-src 'none'; form-action 'none'; frame-ancestors 'none'; img-src 'none'; manifest-src 'none'; media-src 'none'; object-src 'none'; prefetch-src 'none'; report-to 'none'; report-uri 'none'; require-sri-for 'none'; require-trusted-types-for 'none'; sandbox 'none'; script-src 'none'; script-src-attr 'none'; script-src-elem 'none'; style-src 'none'; style-src-attr 'none'; style-src-elem 'none'; trusted-types 'none'; upgrade-insecure-requests 'none'; worker-src 'none'">
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Title</title>
      <meta property="article:author" content="https://example.com/some.html">
      <meta property="article:author" content="https://example.com/one.html">
      <meta property="article:tag" content="Apple">
      <meta property="article:tag" content="Steve Jobs">
      <meta property="book:author" content="https://example.com/some.html">
      <meta property="book:author" content="https://example.com/one.html">
      <meta property="book:tag" content="Apple">
      <meta property="book:tag" content="Steve Jobs">
      <meta property="og:audio" content="https://example.com">
      <meta property="og:audio:type" content="audio/mpeg">
      <meta property="og:audio:secure_url" content="https://example.com">
      <meta property="og:image" content="https://example.com">
      <meta property="og:image:alt" content="First">
      <meta property="og:image:type" content="image/gif">
      <meta property="og:image:width" content="1337">
      <meta property="og:image:height" content="1337">
      <meta property="og:image:secure_url" content="https://example.com">
      <meta property="og:video" content="https://example.com">
      <meta property="og:video:alt" content="Alt">
      <meta property="og:video:type" content="application/x-shockwave-flash">
      <meta property="og:video:width" content="1337">
      <meta property="og:video:height" content="1337">
      <meta property="og:video:secure_url" content="https://example.com">
      <meta name="apple-itunes-app" content="app-id=id, app-argument=https://example.com">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black">
      <meta name="apple-mobile-web-app-title" content="Title">
      <meta name="application-name" content="Name">
      <meta property="article:expiration_time" content="1970-01-01T00:00:00.000Z">
      <meta property="article:modified_time" content="1970-01-01T00:00:00.000Z">
      <meta property="article:published_time" content="1970-01-01T00:00:00.000Z">
      <meta property="article:section" content="Technology">
      <meta name="author" content="Name">
      <meta property="book:isbn" content="978-3-16-148410-0">
      <meta property="book:release_date" content="1970-01-01T00:00:00.000Z">
      <meta name="color-scheme" content="normal">
      <meta http-equiv="content-type" content="text/html; charset=utf-8">
      <meta name="creator" content="Name">
      <meta http-equiv="default-style" content="style">
      <meta name="description" content="Description">
      <meta property="fb:app_id" content="id">
      <meta name="format-detection" content="telephone=no">
      <meta name="generator" content="Generator">
      <meta name="google" content="nopagereadaloud">
      <meta name="googlebot" content="notranslate">
      <meta name="google-site-verification" content="key">
      <meta name="mobile-web-app-capable" content="yes">
      <meta name="msapplication-Config" content="config">
      <meta name="msapplication-TileColor" content="#fff">
      <meta name="msapplication-TileImage" content="https://example.com">
      <meta property="og:audio:secure_url" content="https://example.com">
      <meta property="og:audio:type" content="audio/mpeg">
      <meta property="og:audio" content="https://example.com">
      <meta property="og:description" content="Description">
      <meta property="og:determiner" content="auto">
      <meta property="og:image:alt" content="Second">
      <meta property="og:image:height" content="1337">
      <meta property="og:image:secure_url" content="https://example.com">
      <meta property="og:image:type" content="image/gif">
      <meta property="og:image" content="https://example.com">
      <meta property="og:image:width" content="1337">
      <meta property="og:locale" content="en-US">
      <meta property="og:locale:alternate" content="de-DE">
      <meta property="og:site_name" content="Name">
      <meta property="og:title" content="Title">
      <meta property="og:type" content="article">
      <meta property="og:url" content="https://example.com">
      <meta property="og:video:alt" content="Alt">
      <meta property="og:video:height" content="1337">
      <meta property="og:video:secure_url" content="https://example.com">
      <meta property="og:video:type" content="application/x-shockwave-flash">
      <meta property="og:video" content="https://example.com">
      <meta property="og:video:width" content="1337">
      <meta property="profile:first_name" content="Firstname">
      <meta property="profile:gender" content="male">
      <meta property="profile:last_name" content="Lastname">
      <meta property="profile:username" content="Username">
      <meta name="publisher" content="Name">
      <meta name="rating" content="adult">
      <meta name="referrer" content="no-referrer">
      <meta http-equiv="refresh" content="1;url=https://example.com">
      <meta name="robots" content="all, follow, index, indexifembedded, max-image-preview:large, max-snippet:1, max-video-preview:2, noarchive, nofollow, noimageindex, noindex, none, nositelinkssearchbox, nosnippet, notranslate, unavailable_after:1970-01-01T00:00:00.000Z">
      <meta name="theme-color" content="#fff">
      <meta name="twitter:app:id:googleplay" content="id">
      <meta name="twitter:app:id:ipad" content="id">
      <meta name="twitter:app:id:iphone" content="id">
      <meta name="twitter:app:name:googleplay" content="name">
      <meta name="twitter:app:name:ipad" content="name">
      <meta name="twitter:app:name:iphone" content="name">
      <meta name="twitter:app:url:googleplay" content="https://example.com">
      <meta name="twitter:app:url:ipad" content="https://example.com">
      <meta name="twitter:app:url:iphone" content="https://example.com">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:creator" content="@username">
      <meta name="twitter:creator:id" content="id">
      <meta name="twitter:data1" content="data1">
      <meta name="twitter:data2" content="data2">
      <meta name="twitter:description" content="Description">
      <meta name="twitter:image" content="https://example.com">
      <meta name="twitter:image:alt" content="Alt">
      <meta name="twitter:image:height" content="1337">
      <meta name="twitter:image:type" content="image/gif">
      <meta name="twitter:image:width" content="1337">
      <meta name="twitter:label1" content="label1">
      <meta name="twitter:label2" content="label2">
      <meta name="twitter:player" content="https://example.com">
      <meta name="twitter:player:height" content="1337">
      <meta name="twitter:player:stream" content="https://example.com">
      <meta name="twitter:player:width" content="1337">
      <meta name="twitter:site" content="@username">
      <meta name="twitter:site:id" content="id">
      <meta name="twitter:title" content="Title">
      <meta http-equiv="x-ua-compatible" content="IE=edge">",
        "htmlAttrs": "",
      }
    `)
  })

  it('arrayable meta tags', async () => {
    const head = createHead()
    useSeoMeta({
      ogAudio: [{
        secureUrl: 'https://example.com',
        type: 'audio/mpeg',
        url: 'https://example.com',
      }],
      ogImage: [{
        alt: 'First',
        height: 1337,
        secureUrl: 'https://first.com',
        type: 'image/gif',
        url: 'https://first.com',
        width: 1337,
      }, {
        alt: 'Second',
        height: 1337,
        secureUrl: 'https://second.com',
        type: 'image/gif',
        url: 'https://second.com',
        width: 1337,
      }],
      ogVideo: [{
        alt: 'Alt',
        height: 1337,
        secureUrl: 'https://example.com',
        type: 'application/x-shockwave-flash',
        url: 'https://example.com',
        width: 1337,
      }],
      twitterImage: [
        {
          url: 'https://example.com',
          alt: 'Alt',
          width: 1337,
          height: 1337,
          type: 'image/gif',
        },
      ],
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta property="og:audio" content="https://example.com">
      <meta property="og:audio:type" content="audio/mpeg">
      <meta property="og:audio:secure_url" content="https://example.com">
      <meta property="og:image" content="https://first.com">
      <meta property="og:image:alt" content="First">
      <meta property="og:image:type" content="image/gif">
      <meta property="og:image:width" content="1337">
      <meta property="og:image:height" content="1337">
      <meta property="og:image:secure_url" content="https://first.com">
      <meta property="og:image" content="https://second.com">
      <meta property="og:image:alt" content="Second">
      <meta property="og:image:type" content="image/gif">
      <meta property="og:image:width" content="1337">
      <meta property="og:image:height" content="1337">
      <meta property="og:image:secure_url" content="https://second.com">
      <meta property="og:video" content="https://example.com">
      <meta property="og:video:alt" content="Alt">
      <meta property="og:video:type" content="application/x-shockwave-flash">
      <meta property="og:video:width" content="1337">
      <meta property="og:video:height" content="1337">
      <meta property="og:video:secure_url" content="https://example.com">
      <meta name="twitter:image" content="https://example.com">
      <meta name="twitter:image:alt" content="Alt">
      <meta name="twitter:image:type" content="image/gif">
      <meta name="twitter:image:width" content="1337">
      <meta name="twitter:image:height" content="1337">",
        "htmlAttrs": "",
      }
    `)
  })

  it('object meta tags', async () => {
    const head = createHead()
    useSeoMeta({
      ogAudio: {
        secureUrl: 'https://example.com',
        type: 'audio/mpeg',
        url: 'https://example.com',
      },
      ogImage: {
        alt: 'First',
        height: 1337,
        secureUrl: 'https://first.com',
        type: 'image/gif',
        url: 'https://first.com',
        width: 1337,
      },
      ogVideo: {
        alt: 'Alt',
        height: 1337,
        secureUrl: 'https://example.com',
        type: 'application/x-shockwave-flash',
        url: 'https://example.com',
        width: 1337,
      },
      twitterImage: {
        url: 'https://example.com',
        alt: 'Alt',
        width: 1337,
        height: 1337,
        type: 'image/gif',
      },
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta property="og:audio" content="https://example.com">
      <meta property="og:audio:type" content="audio/mpeg">
      <meta property="og:audio:secure_url" content="https://example.com">
      <meta property="og:image" content="https://first.com">
      <meta property="og:image:alt" content="First">
      <meta property="og:image:type" content="image/gif">
      <meta property="og:image:width" content="1337">
      <meta property="og:image:height" content="1337">
      <meta property="og:image:secure_url" content="https://first.com">
      <meta property="og:video" content="https://example.com">
      <meta property="og:video:alt" content="Alt">
      <meta property="og:video:type" content="application/x-shockwave-flash">
      <meta property="og:video:width" content="1337">
      <meta property="og:video:height" content="1337">
      <meta property="og:video:secure_url" content="https://example.com">
      <meta name="twitter:image" content="https://example.com">
      <meta name="twitter:image:alt" content="Alt">
      <meta name="twitter:image:type" content="image/gif">
      <meta name="twitter:image:width" content="1337">
      <meta name="twitter:image:height" content="1337">",
        "htmlAttrs": "",
      }
    `)
  })
})
