<template>
  <div class="flex items-center">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      class="mr-1 logo-svg"
    >
      <defs>
        <linearGradient id="modernGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FBBF24" />
          <stop offset="100%" style="stop-color:#f0db4f" />
        </linearGradient>
        <mask id="cutoutMask">
          <rect width="100%" height="100%" fill="white" />
          <path d="M12 32 L1 32 L15 15 Z" fill="black" />
        </mask>
      </defs>

      <path
        class="logo-path"
        stroke="url(#modernGradient)"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="3"
        fill="transparent"
        d="M6 4v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4"
        mask="url(#cutoutMask)"
      />
    </svg>
    <span
      v-for="(l, i) in 'Unhead'"
      :key="i"
      class="logo-letter"
      :style="{ animationDelay: `${0.8 + i * 0.1}s` }"
    >{{ l }}</span>
  </div>
</template>

<style scoped>
.logo-path {
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation: draw 1.5s ease forwards 0.3s;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

.logo-letter {
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
