<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  label?: string
}>(), {
  size: 'md',
  label: 'Chargement…',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12">
    <div
      class="border-2 border-neutral-200 border-t-primary rounded-full animate-spin"
      :class="{
        'w-5 h-5': size === 'sm',
        'w-8 h-8': size === 'md',
        'w-12 h-12': size === 'lg',
      }"
    />
    <p v-if="label" class="text-sm text-neutral-500">{{ label }}</p>
  </div>
</template>
