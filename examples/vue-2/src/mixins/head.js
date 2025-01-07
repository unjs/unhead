export default {
  head(){
    console.log('mixing head')
    return {
      title : "newMixinFromTitle",
      bodyAttrs: {
        style: 'background-color: red;'
      }
    }
  }
}
