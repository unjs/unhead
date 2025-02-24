((w, c) => {
  c.log('Script -- Loading')
  w.myScript = (arg) => {
    c.log(`Script -- Executed -- ${arg}`)
  }
  c.log('Script -- Loaded')
})(window, console)
