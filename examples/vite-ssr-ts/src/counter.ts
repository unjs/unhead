import { useHead } from 'unhead'

export function setupCounter(element: HTMLButtonElement) {
  let counter = 0
  const setCounter = (count: number) => {
    counter = count
    element.innerHTML = `count is ${counter}`
    console.log('use head')
    useHead(window.__UNHEAD__, {
      title: () => counter ? `count is ${counter}` : null,
    })
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)
}
