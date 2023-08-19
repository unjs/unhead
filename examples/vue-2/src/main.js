import Vue from 'vue'
import { Vue2ProvideUnheadPlugin, VueHeadMixin, createHead } from '@unhead/vue'
import App from './App.vue'

Vue.config.productionTip = false

const head = createHead()
Vue.use(Vue2ProvideUnheadPlugin, head)
Vue.use(head)
Vue.mixin(VueHeadMixin)

new Vue({
  render: h => h(App),
}).$mount('#app')
