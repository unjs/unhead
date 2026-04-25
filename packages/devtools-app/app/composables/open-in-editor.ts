/**
 * Trigger Vite's built-in editor-launching endpoint. Source strings come from
 * `transformSourceLocations` in the bundler and are already in the
 * `file:line` form Vite expects.
 */
export function openInEditor(source: string | undefined | null): void {
  if (!source)
    return
  // Vite serves `/__open-in-editor` from its dev server during development.
  // We can't use this composable from the static export, but the devtools
  // dock only renders inside the Vite dev server iframe so it's always
  // available when this is called.
  const url = `/__open-in-editor?file=${encodeURIComponent(source)}`
  fetch(url).catch((err) => {
    console.warn('[unhead devtools] open-in-editor failed:', err)
  })
}
