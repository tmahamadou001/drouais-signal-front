<script setup lang="ts">
import { ref } from 'vue'
import { compressImage } from '@/utils/image'

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
            <svg
              class="w-16 h-16 text-neutral-300 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
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
          <svg class="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
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
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Prendre une photo</span>
        </button>

        <!-- Gallery Button -->
        <button
          @click="openGallery"
          class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-dark border-2 border-neutral-200 rounded-ds-lg font-semibold hover:border-primary hover:bg-primary-50/30 active:scale-98 transition-all"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Choisir dans la galerie</span>
        </button>

        <!-- Skip Button -->
        <button
          @click="emit('skip')"
          class="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm text-neutral-500 border border-dashed border-neutral-300 rounded-ds-lg hover:border-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
