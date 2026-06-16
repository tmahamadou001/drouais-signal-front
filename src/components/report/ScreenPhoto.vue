<script setup lang="ts">
import { ref } from 'vue'
import { compressImage } from '@/utils/image'
import AppIcon from '@/components/AppIcon.vue'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']

const emit = defineEmits<{
  photoSelected: [file: File, previewUrl: string]
  skip: []
}>()

const previewUrl = ref<string | null>(null)
const photoError = ref<string | null>(null)
const compressing = ref(false)
const cameraInputRef = ref<HTMLInputElement | null>(null)
const galleryInputRef = ref<HTMLInputElement | null>(null)

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  photoError.value = null

  if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    photoError.value = 'Format non supporté. Utilisez JPG, PNG ou WebP.'
    target.value = ''
    return
  }

  compressing.value = true
  try {
    const compressed = await compressImage(file)

    console.log('compressed', compressed);
    

    if (compressed.size > MAX_SIZE) {
      photoError.value = 'Photo trop volumineuse même après compression. Essayez une image plus légère.'
      target.value = ''
      return
    }

    const preview = URL.createObjectURL(compressed)
    previewUrl.value = preview
    emit('photoSelected', compressed, preview)
  } catch {
    photoError.value = 'Impossible de traiter cette photo. Essayez un autre format.'
    target.value = ''
  } finally {
    compressing.value = false
  }
}

function retryPhoto() {
  photoError.value = null
  previewUrl.value = null
}

function openCamera() {
  cameraInputRef.value?.click()
}

function openGallery() {
  galleryInputRef.value?.click()
}
</script>

<template>
  <div class="bg-gradient-to-b from-primary-50/30 to-white flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-md space-y-8">
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold text-dark">
          Signalez un problème en 1 photo
        </h1>
        <p class="text-neutral-500 text-sm">
          Prenez une photo du problème, l'IA fera le reste
        </p>
      </div>

      <!-- Preview Zone -->
      <div class="relative">
        <div
          v-if="!previewUrl"
          class="w-full aspect-[4/3] rounded-ds-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center"
        >
          <div class="text-center space-y-3">
            <AppIcon name="Camera" :size="64" :stroke-width="1.5" class="text-neutral-300 mx-auto" />
            <p class="text-sm text-neutral-400">Aucune photo sélectionnée</p>
          </div>
        </div>

        <div v-else class="relative w-full aspect-[4/3] rounded-ds-2xl overflow-hidden">
          <img
            :src="previewUrl"
            class="w-full h-full object-cover"
            alt="Aperçu de la photo"
          />
        </div>
      </div>

      <!-- Compression en cours -->
      <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0">
        <div v-if="compressing" class="flex items-center justify-center gap-2 py-2 text-sm text-neutral-500">
          <AppIcon name="Loader2" :size="16" class="animate-spin text-primary" />
          Optimisation de la photo…
        </div>
      </Transition>

      <!-- Photo error -->
      <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 -translate-y-1">
        <div v-if="photoError" class="rounded-ds-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
          <p class="text-sm text-orange-800 font-medium">{{ photoError }}</p>
          <div class="flex gap-2">
            <button
              @click="retryPhoto"
              class="flex-1 px-3 py-2 text-sm font-medium bg-white border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Choisir une autre photo
            </button>
            <button
              @click="emit('skip')"
              class="flex-1 px-3 py-2 text-sm font-medium bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors"
            >
              Continuer sans photo
            </button>
          </div>
        </div>
      </Transition>

      <!-- Action Buttons -->
      <div v-if="!photoError" class="space-y-3">
        <!-- Camera Button -->
        <button
          @click="openCamera"
          class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-ds-lg font-semibold hover:bg-primary-600 active:scale-98 transition-all shadow-lg shadow-primary/20"
        >
          <AppIcon name="Camera" :size="24" />
          <span>Prendre une photo</span>
        </button>

        <!-- Gallery Button -->
        <button
          @click="openGallery"
          class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-dark border-2 border-neutral-200 rounded-ds-lg font-semibold hover:border-primary hover:bg-primary-50/30 active:scale-98 transition-all"
        >
          <AppIcon name="Image" :size="24" />
          <span>Choisir dans la galerie</span>
        </button>

        <!-- Skip Button -->
        <button
          @click="emit('skip')"
          class="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm text-neutral-500 border border-dashed border-neutral-300 rounded-ds-lg hover:border-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-all"
        >
          <AppIcon name="ArrowRight" :size="16" />
          Continuer sans photo
        </button>
      </div>

      <!-- Hidden File Inputs -->
      <input
        ref="cameraInputRef"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        @change="handleFileSelect"
      />
      <input
        ref="galleryInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.active\:scale-98:active {
  transform: scale(0.98);
}
</style>
