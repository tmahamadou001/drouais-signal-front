<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReportStore } from '@/stores/report'
import { useApi } from '@/composables/useApi'
import StepIndicator from '@/components/report/StepIndicator.vue'
import ScreenPhoto from '@/components/report/ScreenPhoto.vue'
import ScreenAnalyzing from '@/components/report/ScreenAnalyzing.vue'
import ScreenValidate from '@/components/report/ScreenValidate.vue'
import ScreenGeolocate from '@/components/report/ScreenGeolocate.vue'

const router = useRouter()
const { apiFetch } = useApi()
const store = useReportStore()

// Nettoyer le store au démontage du composant
onUnmounted(() => {
  store.reset()
})

async function onPhotoSelected(file: File, previewUrl: string) {
  store.setPhoto(file, previewUrl)
  store.aiLoading = true

  try {
    const formData = new FormData()
    formData.append('photo', file)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const data = await apiFetch('/api/analyze-photo', {
      method: 'POST',
      body: formData,
      isFormData: true,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (data.error || data.confidence === 'faible') {
      store.setAiError()
    } else {
      store.setAiResult(data)
    }
  } catch (err) {
    console.error('Erreur analyse photo:', err)
    store.setAiError()
  }
}

function onSubmitSuccess(id: string) {
  router.push(`/signalement/${id}`)
}
</script>

<template>
  <div>
    <!-- Step Indicator -->
    <StepIndicator :current-step="store.currentScreen" />

    <!-- Screen 1: Photo Capture -->
    <ScreenPhoto
      v-if="store.currentScreen === 1"
      @photo-selected="onPhotoSelected"
    />

    <!-- Screen 2: AI Analysis Loading -->
    <ScreenAnalyzing
      v-else-if="store.currentScreen === 2"
      :preview-url="store.photoPreviewUrl"
    />

    <!-- Screen 3: Validation / Correction -->
    <ScreenValidate
      v-else-if="store.currentScreen === 3"
      @validated="store.validateAndGeolocate()"
      @back="store.goToScreen(1)"
    />

    <!-- Screen 4: Geolocation + Submit -->
    <ScreenGeolocate
      v-else-if="store.currentScreen === 4"
      @submitted="onSubmitSuccess"
      @back="store.goToScreen(3)"
    />
  </div>
</template>
