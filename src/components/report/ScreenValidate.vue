<script setup lang="ts">
import { ref, computed } from 'vue'
import { useReportStore } from '@/stores/report'
import { useTenantCategories } from '@/composables/useTenantCategories'
import CategoryPicker from './CategoryPicker.vue'
import AppIcon from '@/components/AppIcon.vue'

const { categories, getCategoryIcon, getCategoryLabel } = useTenantCategories()

const emit = defineEmits<{
  validated: []
  back: []
}>()

const store = useReportStore()

const showCategoryPicker = ref(false)
const editingTitle = ref(false)
const editingDescription = ref(false)

const titleInputRef = ref<HTMLInputElement | null>(null)
const descriptionInputRef = ref<HTMLTextAreaElement | null>(null)

const confidence = computed(() => store.aiResult?.confidence || 'faible')
const isAiAssisted = computed(() => !!store.aiResult && !store.aiError)

const confidenceConfig = {
  fort: {
    color: 'blue',
    label: 'Élevée',
    dots: '●●●',
    borderClass: 'border-blue-400',
    bgClass: 'bg-blue-50',
    message: 'L\'IA a détecté :',
  },
  moyen: {
    color: 'orange',
    label: 'Moyenne',
    dots: '●●○',
    borderClass: 'border-orange-400',
    bgClass: 'bg-orange-50',
    message: 'Vérifiez que les informations sont correctes',
  },
  faible: {
    color: 'gray',
    label: 'Faible',
    dots: '●○○',
    borderClass: 'border-neutral-300',
    bgClass: 'bg-neutral-50',
    message: 'L\'IA n\'a pas pu identifier le problème sur cette photo. Remplissez manuellement.',
  },
}

const config = computed(() => confidenceConfig[confidence.value])

function enableTitleEdit() {
  editingTitle.value = true
  setTimeout(() => titleInputRef.value?.focus(), 50)
}

function enableDescriptionEdit() {
  editingDescription.value = true
  setTimeout(() => descriptionInputRef.value?.focus(), 50)
}

function disableTitleEdit() {
  editingTitle.value = false
}

function disableDescriptionEdit() {
  editingDescription.value = false
}

function openCategoryPicker() {
  showCategoryPicker.value = true
}

function validate() {
  if (!store.category || !store.title.trim()) {
    return
  }
  emit('validated')
}

const canValidate = computed(() => {
  return store.category && store.title.trim()
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
        <AppIcon name="ChevronLeft" :size="20" />
        <span>Retour</span>
      </button>

      <!-- Photo miniature -->
      <div v-if="store.photoPreviewUrl" class="w-full aspect-video rounded-ds-lg overflow-hidden shadow-md">
        <img :src="store.photoPreviewUrl" class="w-full h-full object-cover" alt="Photo du signalement" />
      </div>

      <!-- AI Confidence Badge -->
      <div
        v-if="isAiAssisted"
        class="flex items-center gap-3 p-4 rounded-ds-lg"
        :class="config.bgClass"
      >
        <span class="text-2xl">✨</span>
        <div class="flex-1">
          <p class="font-semibold text-dark">{{ config.message }}</p>
          <p class="text-sm text-neutral-600">
            Confiance : <span class="font-mono">{{ config.dots }}</span> {{ config.label }}
          </p>
        </div>
      </div>

      <!-- Warning for low confidence (only when AI failed, not when photo was skipped) -->
      <div
        v-else-if="store.aiError"
        class="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-ds-lg"
      >
        <AppIcon name="TriangleAlert" :size="24" class="text-orange-600 flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="font-semibold text-orange-900">{{ config.message }}</p>
        </div>
      </div>

      <!-- Form Fields -->
      <div class="space-y-5">
        <!-- Category Field -->
        <div>
          <label class="block text-sm font-medium text-dark mb-2">
            Catégorie <span class="text-red-500">*</span>
          </label>
          
          <!-- High/Medium Confidence: Display with edit icon -->
          <button
            v-if="confidence !== 'faible' && store.category"
            @click="openCategoryPicker"
            class="w-full flex items-center justify-between p-4 rounded-ds-lg border-2 transition-all hover:border-primary"
            :class="[config.borderClass, config.bgClass]"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ getCategoryIcon(store.category) }}</span>
              <span class="font-semibold text-dark">
                {{ getCategoryLabel(store.category) }}
              </span>
              <AppIcon name="Pencil" :size="16" class="text-primary" />
            </div>
            <AppIcon name="ChevronRight" :size="20" class="text-neutral-400" />
          </button>

          <!-- Low Confidence: Category selector -->
          <div v-else class="grid grid-cols-2 gap-3">
            <button
              v-for="cat in categories"
              :key="cat.slug"
              @click="store.updateCategory(cat.slug)"
              class="flex flex-col items-center justify-center p-4 rounded-ds-lg border-2 transition-all hover:scale-105 active:scale-95"
              :class="
                store.category === cat.slug
                  ? 'border-primary bg-primary-50'
                  : 'border-neutral-200 hover:border-primary/50'
              "
            >
              <span class="text-3xl mb-1">{{ cat.icon }}</span>
              <span class="text-sm font-semibold text-center" :class="store.category === cat.slug ? 'text-primary' : 'text-dark'">
                {{ cat.label }}
              </span>
            </button>
          </div>
        </div>

        <!-- Title Field -->
        <div>
          <label class="block text-sm font-medium text-dark mb-2">
            Titre du signalement <span class="text-red-500">*</span>
          </label>

          <!-- High Confidence: Display mode with edit -->
          <div
            v-if="confidence === 'fort' && !editingTitle"
            @click="enableTitleEdit"
            class="flex items-center justify-between p-4 rounded-ds-lg border-2 cursor-text transition-all hover:border-primary"
            :class="[config.borderClass, config.bgClass]"
          >
            <span class="font-medium text-dark">{{ store.title }}</span>
            <AppIcon name="Pencil" :size="16" class="text-primary flex-shrink-0" />
          </div>

          <!-- Edit mode or Medium/Low confidence -->
          <input
            v-else
            ref="titleInputRef"
            v-model="store.title"
            type="text"
            placeholder="Ex : Nid-de-poule dangereux"
            class="w-full px-4 py-3 rounded-ds-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            :class="confidence === 'moyen' ? [config.borderClass] : 'border-neutral-300'"
            @blur="disableTitleEdit"
          />
        </div>

        <!-- Description Field -->
        <div>
          <label class="block text-sm font-medium text-dark mb-2">
            Description <span class="text-neutral-400 font-normal">(optionnel)</span>
          </label>

          <!-- High Confidence: Display mode with edit -->
          <div
            v-if="confidence === 'fort' && !editingDescription && store.description"
            @click="enableDescriptionEdit"
            class="flex items-start justify-between p-4 rounded-ds-lg border-2 cursor-text transition-all hover:border-primary"
            :class="[config.borderClass, config.bgClass]"
          >
            <p class="text-dark flex-1">{{ store.description }}</p>
            <AppIcon name="Pencil" :size="16" class="text-primary flex-shrink-0 mt-1 ml-2" />
          </div>

          <!-- Edit mode or Medium/Low confidence -->
          <textarea
            v-else
            ref="descriptionInputRef"
            v-model="store.description"
            rows="3"
            placeholder="Décrivez le problème en quelques mots..."
            class="w-full px-4 py-3 rounded-ds-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            :class="confidence === 'moyen' ? [config.borderClass] : 'border-neutral-300'"
            @blur="disableDescriptionEdit"
          />
        </div>
      </div>

      <!-- Action Button -->
      <button
        @click="validate"
        :disabled="!canValidate"
        class="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-ds-lg font-semibold transition-all"
        :class="
          canValidate
            ? 'bg-primary text-white hover:bg-primary-600 active:scale-98 shadow-lg shadow-primary/20'
            : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
        "
      >
        <span>{{ confidence === 'fort' ? 'Valider et localiser' : 'Confirmer et localiser' }}</span>
        <AppIcon name="ChevronRight" :size="20" />
      </button>

      <!-- Unlock all fields link (only for high confidence) -->
      <button
        v-if="confidence === 'fort'"
        @click="editingTitle = true; editingDescription = true"
        class="w-full text-center text-sm text-neutral-500 hover:text-primary transition-colors"
      >
        Modifier toutes les informations ↓
      </button>
    </div>

    <!-- Category Picker Modal -->
    <CategoryPicker
      v-if="showCategoryPicker"
      v-model="store.category"
      @close="showCategoryPicker = false"
    />
  </div>
</template>

<style scoped>
.active\:scale-98:active {
  transform: scale(0.98);
}
</style>
