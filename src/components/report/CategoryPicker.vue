<script setup lang="ts">
import { CATEGORY_CONFIG, type ReportCategory } from '@/types'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  close: []
}>()

const categories: Array<{ key: ReportCategory; emoji: string; label: string }> = [
  { key: 'voirie', emoji: '🚧', label: CATEGORY_CONFIG.voirie.label },
  { key: 'eclairage', emoji: '💡', label: CATEGORY_CONFIG.eclairage.label },
  { key: 'dechets', emoji: '🗑️', label: CATEGORY_CONFIG.dechets.label },
  { key: 'autre', emoji: '❓', label: CATEGORY_CONFIG.autre.label },
]

function selectCategory(key: string) {
  emit('update:modelValue', key)
  emit('close')
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-t-ds-2xl sm:rounded-ds-2xl w-full max-w-md p-6 space-y-4 animate-slide-up"
    >
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-dark">Choisir une catégorie</h3>
        <button
          @click="emit('close')"
          class="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors"
        >
          <svg class="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Categories Grid -->
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="cat in categories"
          :key="cat.key"
          @click="selectCategory(cat.key)"
          class="flex flex-col items-center justify-center p-6 rounded-ds-lg border-2 transition-all hover:scale-105 active:scale-95"
          :class="
            modelValue === cat.key
              ? 'border-primary bg-primary-50'
              : 'border-neutral-200 hover:border-primary/50 hover:bg-neutral-50'
          "
        >
          <span class="text-4xl mb-2">{{ cat.emoji }}</span>
          <span
            class="text-sm font-semibold text-center"
            :class="modelValue === cat.key ? 'text-primary' : 'text-dark'"
          >
            {{ cat.label }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
</style>
