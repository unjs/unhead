import Vue from 'vue'
import App from './App.vue'
import { createHead, UnheadVue2Plugin } from "@unhead/vue"


Vue.config.productionTip = false

const head = createHead()
Vue.use(UnheadVue2Plugin, head)
Vue.use(head)

new Vue({
  render: h => h(App),
}).$mount('#app')
