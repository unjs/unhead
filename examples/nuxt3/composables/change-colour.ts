export function useChangeColour() {
  const counter = ref(2)
  const nextColour = ref('lightskyblue')
  const colour = ref('limegreen')

  const changeColour = () => {
    counter.value++
    switch (counter.value) {
      case 1:
        colour.value = 'red'
        nextColour.value = 'limegreen'
        return
      case 2:
        colour.value = 'limegreen'
        nextColour.value = 'lightskyblue'
        return
      case 3:
        colour.value = 'lightskyblue'
        nextColour.value = 'yellow'
        return
      case 4:
        colour.value = 'yellow'
        nextColour.value = 'aquamarine'
        return
      default:
        colour.value = 'aquamarine'
        nextColour.value = 'red'
        counter.value = 0
    }
  }

  return {
    nextColour,
    changeColour,
    colour,
  }
}
