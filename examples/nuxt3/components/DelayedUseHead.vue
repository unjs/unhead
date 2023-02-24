<script>
import { defineComponent } from 'vue';
import { useHead } from '#imports';
import { callWithNuxt } from '#app';
export default defineComponent({
  async setup() {
    const nuxtApp = useNuxtApp();

    const { data, refresh } = await useAsyncData(() => {
      return new Promise((resolve) => setTimeout(() => resolve({}), 1000));
    });

    callWithNuxt(nuxtApp, useHead, [{ title: 'Test' }]);
  },

  render() {
    return h('div', {}, 'Test');
  },
});
</script>
