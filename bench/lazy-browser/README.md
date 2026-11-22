# Lazy head first click benchmark

Build and serve the fixture from the repository root.

```sh
pnpm exec vite build --config bench/lazy-browser/vite.config.ts
pnpm exec vite preview --config bench/lazy-browser/vite.config.ts --port 4173 --strictPort
```

Open `http://localhost:4173/` for eager head. Add `?head=on-click` to start loading in the click handler. Add `?head=lazy` to give the browser a paint opportunity first.

Each mode receives the same server-rendered title and 40 metadata entries. The click changes the visible heading immediately and patches those head entries. Repeat with a fresh page for each click. Use the same CPU and network settings for all modes.

Read `document.querySelector('output').dataset.nextPaint` for the browser's first interaction duration in milliseconds. Check that the tab title becomes **Next page**. In a Chrome performance trace, use the `page-click` and `head-load-start` marks to locate the work.
