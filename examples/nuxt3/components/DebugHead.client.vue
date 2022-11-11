<script lang="ts" setup>
import type { Ref } from 'vue'
import { nextTick, onBeforeUnmount, ref } from 'vue'

const els: Ref<any> = ref(document.querySelectorAll('head > *'))
const head = ref([...document.querySelector('html').attributes])
const body = ref([...document.querySelector('body').attributes])

const filter = ref('')

const tagColour = (tag: string) => {
  switch (tag) {
    case 'META':
      return '#dcfce7'
    case 'LINK':
      return '#ffedd5'
    case 'STYLE':
      return '#e9d5ff'
    case 'SCRIPT':
    case 'NOSCRIPT':
      return '#ccfbf1'
    case 'HTML':
    case 'BODY':
      return 'white'
  }
  return '#e5e7eb'
}

let observer: MutationObserver

nextTick(() => {
  const fetchSchema = () => {
    els.value = [
      {
        tagName: 'HTML',
        attributes: [...document.querySelector('html').attributes],
      },
      {
        tagName: 'BODY',
        attributes: [...document.querySelector('body').attributes],
      },
      ...document.querySelectorAll('head > *'),
    ]
  }

  // Create an observer instance linked to the callback function
  observer = new MutationObserver(fetchSchema)

  observer.observe(document, {
    // this is aggressive and non-performant, but it's just for debugging
    childList: true,
    characterData: true,
    attributes: true,
    subtree: true,
  })

  fetchSchema()
})

onBeforeUnmount(() => {
  observer?.disconnect()
})

const setFilter = (val) => {
  filter.value = val
}
</script>

<template>
  <div class="debug-head">
    <div style="display: flex; margin: 20px 0 30px 0;">
      <div style="display: flex;">
        <button
          v-for="type in ['META', 'LINK', 'STYLE', 'SCRIPT']" class="debug-head__tag"
          style="width: 50px; cursor: pointer; margin: 0 5px;"
          :style="{ backgroundColor: !filter || filter === type ? tagColour(type) : '' }"
          @click="setFilter(type)"
        >
          {{ type }}
        </button>
        <button class="debug-head__tag" style="width: 50px; cursor: pointer; margin: 0 5px;" @click="setFilter(null)">
          RESET
        </button>
      </div>
    </div>
    <div v-for="el in els">
      <div v-if="!filter || el.tagName === filter" class="debug-head__inner">
        <div class="debug-head__tag" :style="{ backgroundColor: tagColour(el.tagName) }">
          {{ el.tagName }}
        </div>
        <div v-for="(attr, key) in el.attributes" :key="key" class="debug-head__attr">
          <span style="opacity: 0.6; font-size: 12px;">{{ attr.name }}</span>
          <span style="opacity: 0.9;">{{ attr.value || 'true' }}</span>
        </div>
        <div v-if="el.innerHTML" class="debug-head__html">
          <div v-if="el.tagName !== 'TITLE'">
            <div style="opacity: 0.6; font-size: 12px;">
              Inline
            </div>
          </div>
          {{ el.innerHTML }}
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.debug-head {
  background-color: white;
  margin: 0 auto;
  font-family: inherit, sans-serif;
  box-shadow: 0px 0px 12px rgba(0,0,0, 0.1);
  font-size: 0.9em;
  padding: 5px 20px;
  display: inline-block;
  max-width: 900px;
  min-width: 600px;
  border-radius: 20px;
}

.debug-head__inner {
  margin-bottom: 6px;
  padding-bottom: 10px;
  padding-top: 5px;
  display: flex;
  border-bottom: 1px #d3d3d352 solid;
}

.debug-head__tag {
  margin-right: 20px;
  font-size: 10px;
  width: 35px;
  text-align: center;
  border-radius: 4px;
  padding: 2px 4px;
  color: darkslategrey;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-basis: 35px;
}

.debug-head__attr {
  display: flex;
  flex-direction: column;
  margin-right: 20px;
}

.debug-head__html {
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}
</style>
