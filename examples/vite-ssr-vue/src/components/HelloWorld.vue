<script setup lang="ts">
import { ref } from 'vue'
import { useHead } from '@unhead/vue'

defineProps<{ msg: string }>()

const count = ref(0)

useHead({
  title: () => count.value ? `Count: ${count.value}` : undefined,
})

useHead({
  // Title injection
  title: '</title><script>alert("title XSS")</' + 'script>',
  titleTemplate: '%s - <script>alert("template")</' + 'script>',

// Meta tag vectors
  meta: [
// SVG-based XSS
    { name: 'description', content: '<svg><script>alert("svg")<' + '/script><' + '/svg>' },
// Attribute injection
    { name: 'keywords" onload="alert("attr")', content: 'SEO keywords' },
// Unicode escape sequence
    { name: 'author', content: '\\u003Cscript\\u003Ealert("unicode")\\u003C/script\\u003E' },
// Character encoding attack
    { 'http-equiv': 'content-type', content: 'text/html; charset=UTF-7; X-XSS-Protection: "0";' },
// Case variation bypass
    { name: 'viewport', content: '<ScRiPt>alert("case")</' + 'ScRiPt>' },
// Emoji obfuscation
    { name: 'robots', content: '📝➡️<script>alert("emoji")</' + 'script>' },
// innerHTML attempt (shouldn't work)
    { name: 'generator', innerHTML: '<script>alert("meta-inner")</' + 'script>' }
  ],

// Link attacks
  link: [
// Javascript protocol
    { rel: 'stylesheet', href: 'javascript:alert("js-protocol")' },
// Data URI
    { rel: 'icon', href: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgieHNzIik8L3NjcmlwdD4=' },
// Protocol switching
    { rel: 'dns-prefetch', href: '//evil.com/xss.js' },
// HTML-encoded colon
    { rel: 'preconnect', href: 'javascript&#58;alert("encoded")' },
// Other protocol
    { rel: 'prefetch', href: 'vbscript:alert("vbscript")' }
  ],

// Script attacks
  script: [
// Template literal with closing script
    { innerHTML: `
const template = \`
${'<' + '/script>'}
<img src=x onerror="alert('template-literal')">
${'<' + 'script>'}
\`;
      console.log(template);
    ` },
// Null byte insertion
    { innerHTML: `console.log("Null byte attack: \\0')<\\/script><script>alert('null-byte')<\\/script>")` },
// String concatenation bypass
    { innerHTML: `console.log("</scr"+"ipt><script>alert('concat')</' + 'script>")` },
// mXSS payload
    { innerHTML: `var xss = '<img src="1" onerror="alert(\\'mxss\\')" />';` },
// JSON with devalue (should be properly escaped)
    { type: 'application/json', innerHTML: JSON.stringify({ payload: '</' + 'script><script>alert("json")</' +'script>' }) }
  ],

// Style attacks
  style: [
// CSS expression
    { innerHTML: `body { color: expression(alert('css-expression')) }` },
// CSS url injection
    { innerHTML: `body { background: url('javascript:alert("css-url")') }` }
  ],

// HTML attributes
  htmlAttrs: {
    'onload': 'alert("html-event")',
    'data-attr': '"><script>alert("html-attr")</' + 'script>'
  },

// Body attributes
  bodyAttrs: {
    'data-custom': `x" onmouseover="alert('body-attr')" data-x="`
  },

// Base attack
  base: { href: 'javascript:alert("base")' }
})
</script>

<template>
<h1>{{ msg }}</h1>

<div class="card">
  <button type="button" @click="count++">count is {{ count }}</button>
  <p>
    Edit
    <code>components/HelloWorld.vue</code> to test HMR
  </p>
</div>

<p>
  Check out
  <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
  >create-vue</a
  >, the official Vue + Vite starter
</p>
<p>
  Install
  <a href="https://github.com/johnsoncodehk/volar" target="_blank">Volar</a>
  in your IDE for a better DX
</p>
<p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
