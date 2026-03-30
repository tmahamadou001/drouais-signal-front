<script setup lang="ts">
import { computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  name: string
  size?: number
  strokeWidth?: number
}>(), {
  size: 20,
  strokeWidth: 1.75
})

const IconComponent = computed(() => {
  const icon = (LucideIcons as any)[props.name]
  if (!icon) {
    console.warn(`AppIcon: icône "${props.name}" introuvable`)
    return (LucideIcons as any)['HelpCircle']
  }
  return icon
})
</script>

<template>
  <component
    :is="IconComponent"
    :size="size"
    :stroke-width="strokeWidth"
  />
</template>
