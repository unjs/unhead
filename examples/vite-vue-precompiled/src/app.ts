import { createSSRApp, defineComponent } from 'vue'
import App from './App.vue'

export function createApp() {
  return createSSRApp(defineComponent(App))
}
