<script setup lang="ts">
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
    <defs>
      <linearGradient id="modernGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FBBF24" />
        <stop offset="100%" style="stop-color:#f0db4f" />
      </linearGradient>
      <!-- Mask for the cutout version -->
      <mask id="cutoutMask">
        <rect width="100%" height="100%" fill="white" />
        <path d="M12 32 L1 32 L15 15 Z" fill="black" />
      </mask>
    </defs>

    <!-- U shape -->
    <path
      fill="none"
      stroke="url(#modernGradient)"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="3"
      d="M6 4v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4"
      mask="url(#cutoutMask)"
    />
  </svg>
  Unhead
</template>
