<script setup>
import { ref } from 'vue'

const message = ref('')

// Simulate slow component load
await new Promise(resolve => setTimeout(resolve, 5000))
message.value = 'Component loaded after 1 second delay!'
</script>

<template>
  <div class="slow-component">
    <h2>{{ message }}</h2>
    <p>This component took 5 second to load</p>
  </div>
</template>

<style scoped>
.slow-component {
  padding: 2rem;
  margin: 1rem 0;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #ddd;
}
</style>
