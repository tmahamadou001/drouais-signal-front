<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useTenantCategories } from '@/composables/useTenantCategories'
import AppIcon from '@/components/AppIcon.vue'

const { getCategoryIcon, getCategoryLabel } = useTenantCategories()

const { apiFetch } = useApi()

const props = defineProps<{
  modelValue: File | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', file: File): void
  (e: 'analysis-complete', result: {
    category: string
    title: string
    description: string
    confidence: string
  }): void
}>()

const preview = ref<string | null>(null)
const isAnalyzing = ref(false)
const analysisResult = ref<any>(null)
const analysisError = ref(false)

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 1. Créer preview immédiatement
  preview.value = URL.createObjectURL(file)
  emit('update:modelValue', file)

  // 2. Lancer analyse en arrière-plan
  isAnalyzing.value = true
  analysisError.value = false
  analysisResult.value = null

  try {
    const formData = new FormData()
    formData.append('photo', file)

    // Timeout de 12 secondes
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const data = await apiFetch('/api/analyze-photo', {
      method: 'POST',
      body: formData,
      isFormData: true,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (data.error) {
      analysisError.value = true
    } else {
      analysisResult.value = data
    }
  } catch (e) {
    analysisError.value = true
  } finally {
    isAnalyzing.value = false
  }
}

function acceptSuggestion() {
  if (analysisResult.value) {
    emit('analysis-complete', analysisResult.value)
  }
}

function dismissSuggestion() {
  analysisResult.value = null
}

function removePhoto() {
  preview.value = null
  analysisResult.value = null
  analysisError.value = false
  emit('update:modelValue', null as any)
}
</script>

<template>
  <div>
    <!-- ÉTAT 1 — Avant upload -->
    <div v-if="!preview">
      <label
        class="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-neutral-300 rounded-ds-lg bg-neutral-50 hover:border-primary hover:bg-primary-50/30 transition-colors cursor-pointer"
      >
        <AppIcon name="Camera" :size="40" :stroke-width="1.5" class="text-neutral-400 mb-2" />
        <span class="text-sm text-neutral-500">Cliquez ou glissez une photo</span>
        <span class="text-xs text-neutral-400 mt-1">JPG, PNG, WEBP — max 5 Mo</span>
        <input
          type="file"
          accept="image/*"
          class="sr-only"
          @change="handleFileSelect"
        />
      </label>
    </div>

    <!-- ÉTAT 2, 3, 4 — Après upload -->
    <div v-else class="space-y-4">
      <div class="relative">
        <img :src="preview" class="w-full h-48 object-cover rounded-ds-lg" alt="Aperçu" />
        <button
          @click="removePhoto"
          class="absolute top-2 right-2 w-8 h-8 bg-dark/70 text-white rounded-full flex items-center justify-center hover:bg-dark transition-colors"
        >
          <AppIcon name="X" :size="16" />
        </button>

        <!-- ÉTAT 2 — Overlay analyse en cours -->
        <div
          v-if="isAnalyzing"
          class="absolute inset-0 bg-dark/60 rounded-ds-lg flex flex-col items-center justify-center"
        >
          <div class="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-white font-medium text-sm">Analyse de la photo en cours...</p>
          <p class="text-white/70 text-xs mt-1">L'IA identifie le type de problème</p>
        </div>
      </div>

      <!-- ÉTAT 3 — Résultat affiché -->
      <div
        v-if="analysisResult && !isAnalyzing"
        class="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-ds-xl p-5"
      >
        <div class="flex items-start gap-3 mb-4">
          <span class="text-2xl">✨</span>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-blue-900 mb-3">L'IA a détecté :</h3>

            <div class="space-y-3">
              <div>
                <p class="text-xs text-blue-700 font-medium mb-1">Catégorie :</p>
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-blue-200">
                  <span class="text-lg">{{ getCategoryIcon(analysisResult.category) }}</span>
                  <span class="text-sm font-semibold text-dark">
                    {{ getCategoryLabel(analysisResult.category) }}
                  </span>
                </div>
              </div>

              <div>
                <p class="text-xs text-blue-700 font-medium mb-1">Titre suggéré :</p>
                <p class="text-sm font-semibold text-dark">{{ analysisResult.title }}</p>
              </div>

              <div>
                <p class="text-xs text-blue-700 font-medium mb-1">Confiance :</p>
                <div class="flex items-center gap-1">
                  <span
                    v-for="i in 3"
                    :key="i"
                    class="w-2 h-2 rounded-full"
                    :class="
                      analysisResult.confidence === 'fort' && i <= 3 ? 'bg-green-500' :
                      analysisResult.confidence === 'moyen' && i <= 2 ? 'bg-orange-500' :
                      analysisResult.confidence === 'faible' && i <= 1 ? 'bg-red-500' :
                      'bg-neutral-300'
                    "
                  ></span>
                  <span class="text-xs font-medium text-blue-800 ml-2 capitalize">
                    {{ analysisResult.confidence }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex gap-2 mt-4">
              <button
                @click="acceptSuggestion"
                class="flex-1 px-4 py-2 bg-primary text-white rounded-ds font-semibold text-sm hover:bg-primary-600 transition-colors"
              >
                ✓ Utiliser cette suggestion
              </button>
              <button
                @click="dismissSuggestion"
                class="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-ds font-medium text-sm hover:bg-neutral-50 transition-colors"
              >
                Modifier
              </button>
            </div>

            <p
              v-if="analysisResult.confidence === 'faible'"
              class="text-xs text-neutral-500 mt-3 italic"
            >
              Suggestion incertaine — vérifiez la catégorie
            </p>
          </div>
        </div>
      </div>

      <!-- ÉTAT 4 — Erreur -->
      <div
        v-if="analysisError && !isAnalyzing"
        class="bg-neutral-50 border border-neutral-200 rounded-ds-lg p-4"
      >
        <p class="text-sm text-neutral-600">
          Analyse automatique indisponible — remplissez la catégorie manuellement
        </p>
      </div>
    </div>
  </div>
</template>
