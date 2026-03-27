<script setup lang="ts">
defineProps<{
  message: string
  icon?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
      <span class="text-2xl">{{ icon || '📭' }}</span>
    </div>
    <p class="text-neutral-500 text-sm max-w-xs">{{ message }}</p>
    <slot />
  </div>
</template>
