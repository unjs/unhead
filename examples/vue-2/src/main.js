import Vue from 'vue'
import App from './App.vue'
import { createHead, Vue2ProvideUnheadPlugin } from "@unhead/vue"


Vue.config.productionTip = false

const head = createHead()
Vue.use(Vue2ProvideUnheadPlugin, head)
Vue.use(head)

new Vue({
  render: h => h(App),
}).$mount('#app')
