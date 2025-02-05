import { useScript } from '@unhead/scripts/react'
import {useRef} from "react";

export function ScriptComponent() {
  const shouldLoad = useRef(false)
  const script = useScript<{
    isTrackingEnabled: boolean
  }>({
    src: 'https://cdn.usefathom.com/script.js',
    ['data-site']: 'BRDEJWKJ',
  }, {
    trigger: shouldLoad,
    use: () => window.fathom,
  })
  script.onLoaded((instance) => {
    console.log('Script loaded', instance.isTrackingEnabled)
  })
  return (<div className="mb-10">
      <div>Script status: {script.status}</div>
   <button onClick={() => script.load()}>Load Script</button>
  </div>
  )
}
