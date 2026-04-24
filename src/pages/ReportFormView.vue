<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReportStore } from '@/stores/report'
import { useApi } from '@/composables/useApi'
import StepIndicator from '@/components/report/StepIndicator.vue'
import ScreenAuthChoice from '@/components/report/ScreenAuthChoice.vue'
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

const onAuthModeSelected = (mode: 'authenticated' | 'anonymous') => {
  if (mode === 'anonymous') {
    store.setAuthMode(true)
  } else {
    store.setAuthMode(false)
  }
}

const onPhotoSelected = async (file: File, previewUrl: string) => {
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

const onSubmitSuccess = (id: string, anonymousToken?: string) => {
  if (anonymousToken) {
    router.push(`/signalement/suivi/${anonymousToken}`)
  } else {
    router.push(`/signalement/${id}`)
  }
}
</script>

<template>
  <div>
    <!-- Screen 1: Auth Choice -->
    <ScreenAuthChoice
      v-if="store.currentScreen === 1"
      @mode-selected="onAuthModeSelected"
    />

    <!-- Screens 2-4: Report form (after auth choice) -->
    <div v-else>
      <!-- Step Indicator (écran 2-5 = steps 1-4) -->
      <StepIndicator :current-step="(store.currentScreen - 1) as 1 | 2 | 3 | 4" />

      <!-- Screen 2: Photo Capture -->
      <ScreenPhoto
        v-if="store.currentScreen === 2"
        @photo-selected="onPhotoSelected"
      />

      <!-- Screen 3: AI Analysis Loading -->
      <ScreenAnalyzing
        v-else-if="store.currentScreen === 3"
        :preview-url="store.photoPreviewUrl"
      />

      <!-- Screen 4: Validation / Correction -->
      <ScreenValidate
        v-else-if="store.currentScreen === 4"
        @validated="store.validateAndGeolocate()"
        @back="store.goToScreen(2)"
      />

      <!-- Screen 5: Geolocation + Submit -->
      <ScreenGeolocate
        v-else-if="store.currentScreen === 5"
        :is-anonymous="store.isAnonymous"
        :anonymous-email="store.anonymousEmail"
        @submitted="onSubmitSuccess"
        @back="store.goToScreen(4)"
      />
    </div>
  </div>
</template>
