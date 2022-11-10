import { ref } from 'vue'

export function useChangeColour() {
  const counter = ref(0)
  const colour = ref('limegreen')

  const changeColour = () => {
    counter.value++
    switch (counter.value) {
      case 1:
        colour.value = 'red'
        break
      case 2:
        colour.value = 'limegreen'
        break
      case 3:
        colour.value = 'lightskyblue'
        break
      case 4:
        colour.value = 'yellow'
        break
      default:
        colour.value = 'aquamarine'
        counter.value = 0
    }
  }

  return {
    changeColour,
    colour,
  }
}
