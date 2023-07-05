import Vue from 'vue'
import { Vue2ProvideUnheadPlugin, createHead } from '@unhead/vue'
import App from './App.vue'

Vue.config.productionTip = false

const head = createHead()
Vue.use(Vue2ProvideUnheadPlugin, head)
Vue.use(head)

new Vue({
  render: h => h(App),
}).$mount('#app')
