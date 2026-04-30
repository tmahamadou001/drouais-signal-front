<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{
  open: boolean
  imageUrl: string
  alt?: string
}>()

const emit = defineEmits<{
  close: []
}>()

// Fermer avec Escape
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click="$emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/90" />

        <!-- Contenu -->
        <div
          class="relative max-w-7xl max-h-[90vh] w-full mx-4"
          @click.stop
        >
          <!-- Bouton fermer -->
          <button
            @click="$emit('close')"
            class="absolute -top-12 right-0 w-10 h-10
                   rounded-full bg-white/10 hover:bg-white/20
                   text-white flex items-center justify-center
                   transition-colors backdrop-blur-sm"
            aria-label="Fermer"
          >
            <AppIcon name="X" :size="24" />
          </button>

          <!-- Image -->
          <img
            :src="imageUrl"
            :alt="alt || 'Photo'"
            class="w-full h-full object-contain rounded-lg"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.3s ease;
}

.lightbox-enter-active > div:last-child,
.lightbox-leave-active > div:last-child {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lightbox-enter-from > div:last-child,
.lightbox-leave-to > div:last-child {
  transform: scale(0.9);
  opacity: 0;
}
</style>
