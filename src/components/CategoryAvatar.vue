<script setup lang="ts">
defineProps<{
  category?: string
  class?: string
}>()
</script>

<template>
  <div
    :class="$props.class"
    class="flex flex-col items-center justify-center gap-3 select-none bg-neutral-100"
    role="img"
    aria-label="Signalement sans photo"
  >
    <svg
      class="w-12 h-12 text-neutral-300"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <!-- Camera body -->
      <rect x="4" y="14" width="40" height="28" rx="4" fill="currentColor" opacity="0.4" />
      <!-- Lens ring -->
      <circle cx="24" cy="28" r="9" stroke="currentColor" stroke-width="2.5" fill="none" opacity="0.6" />
      <!-- Lens inner -->
      <circle cx="24" cy="28" r="4.5" fill="currentColor" opacity="0.3" />
      <!-- Viewfinder bump -->
      <rect x="17" y="9" width="14" height="7" rx="2" fill="currentColor" opacity="0.35" />
      <!-- Flash dot -->
      <circle cx="37" cy="20" r="2.5" fill="currentColor" opacity="0.45" />
      <!-- Diagonal slash -->
      <line x1="8" y1="8" x2="40" y2="42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.25" />
    </svg>
    <span class="text-xs font-medium text-neutral-400 tracking-wide">Aucune photo</span>
  </div>
</template>
