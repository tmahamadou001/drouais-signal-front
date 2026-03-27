<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReportStore } from '@/stores/report'
import { useGeolocation } from '@/composables/useGeolocation'
import { useApi } from '@/composables/useApi'
import { CATEGORY_CONFIG } from '@/types'
import MapView from '@/components/MapView.vue'

const emit = defineEmits<{
  submitted: []
  back: []
}>()

const store = useReportStore()
const geo = useGeolocation()
const { apiFetch } = useApi()

const position = ref<{ lat: number; lng: number } | null>(null)
const addressApprox = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  // Tenter de géolocaliser automatiquement
  const pos = await geo.getCurrentPosition()
  if (pos) {
    position.value = pos
    store.setLocation(pos.lat, pos.lng, '')
  }
})

function handleMapClick(coords: { lat: number; lng: number }) {
  position.value = coords
  store.setLocation(coords.lat, coords.lng, addressApprox.value)
}

async function handleSubmit() {
  if (!position.value || !store.category || !store.title.trim() || !store.photoFile) {
    return
  }

  submitting.value = true
  error.value = null

  try {
    const formData = new FormData()
    formData.append('title', store.title.trim())
    formData.append('category', store.category)
    formData.append('lat', position.value.lat.toString())
    formData.append('lng', position.value.lng.toString())

    if (store.description.trim()) {
      formData.append('description', store.description.trim())
    }
    if (addressApprox.value.trim()) {
      formData.append('address_approx', addressApprox.value.trim())
    }
    if (store.photoFile) {
      formData.append('photo', store.photoFile)
    }
    if (store.aiResult) {
      formData.append('ai_assisted', 'true')
    }

    const result = await apiFetch<{ id: string }>('/api/reports', {
      method: 'POST',
      body: formData,
      isFormData: true,
    })

    emit('submitted')
  } catch (err: any) {
    error.value = err.message || 'Une erreur est survenue lors de l\'envoi.'
  } finally {
    submitting.value = false
  }
}

const canSubmit = computed(() => {
  return position.value && store.category && store.title.trim() && !submitting.value
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-neutral-50 to-white p-6">
    <div class="w-full max-w-2xl mx-auto space-y-6">
      <!-- Back Button -->
      <button
        @click="emit('back')"
        class="flex items-center gap-2 text-primary font-medium hover:underline"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Retour</span>
      </button>

      <!-- Summary Card -->
      <div class="bg-white rounded-ds-xl border border-neutral-200 p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-neutral-600 mb-3">Résumé du signalement</h3>
        <div class="flex items-start gap-4">
          <!-- Photo miniature -->
          <div
            v-if="store.photoPreviewUrl"
            class="w-16 h-16 rounded-ds-lg overflow-hidden flex-shrink-0 shadow-sm"
          >
            <img :src="store.photoPreviewUrl" class="w-full h-full object-cover" alt="Photo" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xl">{{ CATEGORY_CONFIG[store.category as keyof typeof CATEGORY_CONFIG].emoji }}</span>
              <span class="text-xs font-semibold text-neutral-500 uppercase">
                {{ CATEGORY_CONFIG[store.category as keyof typeof CATEGORY_CONFIG].label }}
              </span>
            </div>
            <p class="font-semibold text-dark truncate">{{ store.title }}</p>
            <p v-if="store.description" class="text-sm text-neutral-500 line-clamp-2 mt-1">
              {{ store.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- Localisation Section -->
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-dark">Localisation</h3>

        <!-- Map -->
        <div class="rounded-ds-xl overflow-hidden shadow-md border border-neutral-200">
          <MapView
            :reports="[]"
            :center="position ? [position.lat, position.lng] : [48.7361, 1.3628]"
            :zoom="position ? 16 : 13"
            :interactive="true"
            :selected-position="position"
            :height="400"
            @map-click="handleMapClick"
          />
        </div>

        <!-- Position Info -->
        <div v-if="position" class="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-ds-lg">
          <svg class="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div class="flex-1">
            <p class="font-semibold text-green-900">Position détectée automatiquement</p>
            <p class="text-sm text-green-700 mt-1">
              Latitude: {{ position.lat.toFixed(6) }}, Longitude: {{ position.lng.toFixed(6) }}
            </p>
            <button
              @click="position = null"
              class="text-sm text-green-600 hover:text-green-800 font-medium mt-2 hover:underline"
            >
              Ajuster manuellement sur la carte
            </button>
          </div>
        </div>

        <div v-else class="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-ds-lg">
          <svg class="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="flex-1">
            <p class="font-semibold text-blue-900">Cliquez sur la carte</p>
            <p class="text-sm text-blue-700">
              Placez le marqueur à l'emplacement exact du problème
            </p>
          </div>
        </div>

        <!-- Address Input (optional) -->
        <div>
          <label class="block text-sm font-medium text-dark mb-2">
            Adresse approximative <span class="text-neutral-400 font-normal">(optionnel)</span>
          </label>
          <input
            v-model="addressApprox"
            type="text"
            placeholder="Ex : Rue Rotrou, Dreux"
            class="w-full px-4 py-3 rounded-ds-lg border-2 border-neutral-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-ds-lg"
      >
        <svg class="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="flex-1">
          <p class="font-semibold text-red-900">Erreur</p>
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>
      </div>

      <!-- Submit Button -->
      <button
        @click="handleSubmit"
        :disabled="!canSubmit"
        class="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-ds-lg font-semibold transition-all"
        :class="
          canSubmit
            ? 'bg-primary text-white hover:bg-primary-600 active:scale-98 shadow-lg shadow-primary/20'
            : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
        "
      >
        <svg
          v-if="submitting"
          class="w-5 h-5 animate-spin"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ submitting ? 'Envoi en cours...' : 'Envoyer le signalement' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.active\:scale-98:active {
  transform: scale(0.98);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
