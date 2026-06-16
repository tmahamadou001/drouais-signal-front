<script setup lang="ts">
import { useSwUpdate } from '@/composables/useSwUpdate'
import AppIcon from './AppIcon.vue'

const { hasUpdate, applyUpdate } = useSwUpdate()
</script>

<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="hasUpdate"
      class="fixed bottom-0 left-0 right-0 z-50 p-3 pb-safe"
    >
      <div class="max-w-md mx-auto bg-dark text-white rounded-ds-lg shadow-ds-xl px-4 py-3 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-7 h-7 bg-primary rounded-full flex items-center justify-center shrink-0">
            <AppIcon name="RefreshCw" :size="14" class="text-white" :stroke-width="2.5" />
          </div>
          <p class="text-sm font-medium truncate">Mise à jour disponible</p>
        </div>
        <button
          @click="applyUpdate"
          class="shrink-0 bg-white text-dark text-sm font-semibold px-3 py-1.5 rounded-ds hover:bg-neutral-100 transition-colors"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  </Transition>
</template>
