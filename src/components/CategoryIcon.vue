<script setup lang="ts">
import { computed } from 'vue'
import { useTenantCategories } from '@/composables/useTenantCategories'

const props = withDefaults(defineProps<{
  category: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const { getCategoryIcon, getCategoryColor } = useTenantCategories()

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
    :style="{ backgroundColor: getCategoryColor(category) + '15' }"
  >
    {{ getCategoryIcon(category) }}
  </div>
</template>
