<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary' | 'warning'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
  confirmVariant: 'primary',
  loading: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  close: []
}>()

const confirmButtonClass = computed(() => {
  const base = 'px-4 py-2 rounded-ds font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  
  switch (props.confirmVariant) {
    case 'danger':
      return `${base} bg-red-600 text-white hover:bg-red-700`
    case 'warning':
      return `${base} bg-warning text-white hover:bg-warning-600`
    case 'primary':
    default:
      return `${base} bg-primary text-white hover:bg-primary-600`
  }
})

const handleConfirm = () => {
  if (!props.loading) {
    emit('confirm')
  }
}

const handleCancel = () => {
  if (!props.loading) {
    emit('cancel')
  }
}

const handleBackdropClick = () => {
  if (!props.loading) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          class="absolute inset-0 bg-dark/50 backdrop-blur-sm" 
          @click="handleBackdropClick"
        />
        
        <div class="relative bg-white rounded-ds-xl shadow-2xl max-w-md w-full overflow-hidden">
          <div class="p-6">
            <h3 class="text-lg font-bold text-dark mb-2">{{ title }}</h3>
            <p v-if="description" class="text-sm text-neutral-600 leading-relaxed">
              {{ description }}
            </p>
            
            <slot />
          </div>
          
          <div class="bg-neutral-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-neutral-200">
            <button
              @click="handleCancel"
              :disabled="loading"
              class="px-4 py-2 rounded-ds text-sm font-medium text-neutral-700 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ cancelText }}
            </button>
            <button
              @click="handleConfirm"
              :disabled="loading"
              :class="confirmButtonClass"
            >
              <span v-if="loading" class="inline-flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Chargement...
              </span>
              <span v-else>{{ confirmText }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
</style>
