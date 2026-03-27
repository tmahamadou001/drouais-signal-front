<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_CONFIG, type ReportCategory } from '@/types'

const props = withDefaults(defineProps<{
  category: ReportCategory
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const config = computed(() => CATEGORY_CONFIG[props.category])

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-8 h-8 text-base'
    case 'md': return 'w-10 h-10 text-lg'
    case 'lg': return 'w-14 h-14 text-2xl'
  }
})
</script>

<template>
  <div
    class="rounded-ds-lg flex items-center justify-center flex-shrink-0"
    :class="sizeClasses"
    :style="{ backgroundColor: config.color + '15' }"
  >
    {{ config.emoji }}
  </div>
</template>
