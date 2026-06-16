<script setup lang="ts">
import AppIcon from './AppIcon.vue'

export interface TabItem {
  key: string
  label: string
  icon?: string
  badge?: number
}

const props = defineProps<{
  tabs: TabItem[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [key: string]
}>()
</script>

<template>
  <div
    role="tablist"
    class="flex gap-1 p-1 bg-gray-100 rounded-xl"
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      role="tab"
      :aria-selected="modelValue === tab.key"
      @click="emit('update:modelValue', tab.key)"
      class="relative flex items-center gap-1.5 px-3.5 py-2
             rounded-[10px] text-sm font-medium
             transition-all duration-200 outline-none
             focus-visible:ring-2 focus-visible:ring-primary/40"
      :class="modelValue === tab.key
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/60'"
    >
      <AppIcon v-if="tab.icon" :name="tab.icon" :size="14" />
      {{ tab.label }}
      <span
        v-if="tab.badge !== undefined && tab.badge > 0"
        class="ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold
               rounded-full leading-none"
        :class="modelValue === tab.key
          ? 'bg-primary/10 text-primary'
          : 'bg-gray-200 text-gray-500'"
      >
        {{ tab.badge }}
      </span>
    </button>
  </div>
</template>
