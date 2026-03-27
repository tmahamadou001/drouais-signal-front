<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  photoSelected: [file: File, previewUrl: string]
}>()

const previewUrl = ref<string | null>(null)
const cameraInputRef = ref<HTMLInputElement | null>(null)
const galleryInputRef = ref<HTMLInputElement | null>(null)

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1200
      let w = img.width
      let h = img.height
      
      if (w > MAX || h > MAX) {
        if (w > h) {
          h = (h * MAX) / w
          w = MAX
        } else {
          w = (w * MAX) / h
          h = MAX
        }
      }
      
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        0.85
      )
      
      URL.revokeObjectURL(url)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    
    img.src = url
  })
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Créer preview immédiatement
  const preview = URL.createObjectURL(file)
  previewUrl.value = preview

  // Compresser l'image
  const compressedFile = await compressImage(file)
  
  // Émettre l'événement avec le fichier compressé
  emit('photoSelected', compressedFile, preview)
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

      <!-- Action Buttons -->
      <div class="space-y-3">
        <!-- Camera Button -->
        <button
          @click="openCamera"
          class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-ds-lg font-semibold hover:bg-primary-600 active:scale-98 transition-all shadow-lg shadow-primary/20"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>Prendre une photo</span>
        </button>

        <!-- Gallery Button -->
        <button
          @click="openGallery"
          class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-dark border-2 border-neutral-200 rounded-ds-lg font-semibold hover:border-primary hover:bg-primary-50/30 active:scale-98 transition-all"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>Choisir dans la galerie</span>
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
