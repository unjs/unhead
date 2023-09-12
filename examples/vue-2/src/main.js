import Vue from 'vue'
import { UnheadPlugin } from '@unhead/vue/vue2'
import { createHead } from '@unhead/vue'
import App from './App.vue'

Vue.config.productionTip = false

const head = createHead()

Vue.use(UnheadPlugin);

new Vue({
  render: h => h(App),
  unhead: head,
}).$mount('#app')
