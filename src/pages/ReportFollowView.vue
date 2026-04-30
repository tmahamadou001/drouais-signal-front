<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { useTenantStore } from '@/stores/tenant'
import { useReportStatuses } from '@/composables/useReportStatuses'
import AppIcon from '@/components/AppIcon.vue'

interface Report {
  id: string
  title: string
  category: string
  status: 'en_attente' | 'pris_en_charge' | 'resolu'
  created_at: string
  address_approx: string
  lat: number
  lng: number
  photo_url?: string
}

const route = useRoute()
const { apiFetch } = useApi()
const { getCategoryLabel } = useTenantCategories()
const { getStatusConfig } = useReportStatuses()
const tenantStore = useTenantStore()

const report = ref<Report | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const token = route.params.token as string

const steps = [
  { key: 'en_attente', label: 'Reçu' },
  { key: 'pris_en_charge', label: 'En traitement' },
  { key: 'resolu', label: 'Résolu' },
]

function getStepIndex(status: string): number {
  return steps.findIndex(s => s.key === status)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  try {
    const data = await apiFetch<Report>(`/api/reports/anonymous/${token}`)
    report.value = data
  } catch (err: any) {
    error.value = err.message || 'Signalement introuvable'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 px-4 py-10">
    <div class="max-w-lg mx-auto">

      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight mb-1">
          Suivi de signalement
        </h1>
        <p class="text-sm text-gray-500">
          {{ tenantStore.name }}
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center py-16 gap-3">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent
                    rounded-full animate-spin"/>
        <p class="text-sm text-gray-400">Chargement...</p>
      </div>

      <!-- Erreur -->
      <div v-else-if="error"
           class="bg-white border border-red-200 rounded-2xl p-6 text-center">
        <div class="w-12 h-12 bg-red-50 rounded-xl flex items-center
                    justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor"
               stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948
                 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949
                 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z
                 M12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>
        <p class="font-semibold text-gray-900 mb-1">Lien invalide</p>
        <p class="text-sm text-gray-500">
          Ce lien de suivi est peut-être expiré ou incorrect.
        </p>
      </div>

      <!-- Contenu -->
      <div v-else-if="report" class="space-y-4">

        <!-- Statut principal -->
        <div :class="[
          'rounded-2xl border p-5 flex items-center gap-4',
          getStatusConfig(report.status).tailwindBg,
          'border-gray-200',
        ]">
          <div :class="[
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            getStatusConfig(report.status).iconBg,
          ]">
            <AppIcon
              :name="getStatusConfig(report.status).icon"
              :size="20"
              :class="getStatusConfig(report.status).iconColor"
            />
          </div>
          <div>
            <p class="text-xs font-medium opacity-60 text-gray-600">
              Statut actuel
            </p>
            <p :class="[
              'text-base font-semibold',
              getStatusConfig(report.status).tailwindText
            ]">
              {{ getStatusConfig(report.status).label }}
            </p>
          </div>
        </div>

        <!-- Timeline de progression -->
        <div class="bg-white border border-gray-200 rounded-2xl p-5">
          <p class="text-xs font-medium text-gray-400 uppercase
                    tracking-wider mb-4">
            Progression
          </p>
          <div class="flex items-center">
            <template v-for="(step, index) in steps" :key="step.key">
              <div class="flex flex-col items-center flex-shrink-0">
                <div :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  'border-2 transition-colors',
                  index <= getStepIndex(report.status)
                    ? 'bg-primary border-primary'
                    : 'bg-white border-gray-200'
                ]">
                  <AppIcon v-if="index <= getStepIndex(report.status)" name="Check" class="w-4 h-4 text-white" />
                  <div v-else class="w-2 h-2 rounded-full bg-gray-200"/>
                </div>
                <span :class="[
                  'text-xs mt-2 font-medium',
                  index <= getStepIndex(report.status)
                    ? 'text-primary'
                    : 'text-gray-300'
                ]">
                  {{ step.label }}
                </span>
              </div>
              <!-- Ligne entre les steps -->
              <div v-if="index < steps.length - 1"
                   :class="[
                     'flex-1 h-0.5 mb-5 mx-1',
                     index < getStepIndex(report.status)
                       ? 'bg-primary'
                       : 'bg-gray-100'
                   ]"/>
            </template>
          </div>
        </div>

        <!-- Infos du signalement -->
        <div class="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Détails
          </p>

          <!-- Titre -->
          <div>
            <p class="text-lg font-semibold text-gray-900 leading-tight">
              {{ report.title }}
            </p>
          </div>

          <!-- Grille catégorie + date -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-xl p-3">
              <p class="text-xs text-gray-400 mb-1">Catégorie</p>
              <p class="text-sm font-medium text-gray-900">
                {{ getCategoryLabel(report.category) }}
              </p>
            </div>
            <div class="bg-gray-50 rounded-xl p-3">
              <p class="text-xs text-gray-400 mb-1">Signalé le</p>
              <p class="text-sm font-medium text-gray-900">
                {{ formatDate(report.created_at) }}
              </p>
            </div>
          </div>

          <!-- Localisation -->
          <div class="flex items-start gap-3 pt-1">
            <div class="w-7 h-7 bg-gray-100 rounded-lg flex items-center
                        justify-center flex-shrink-0 mt-0.5">
              <svg class="w-3.5 h-3.5 text-gray-500" fill="none"
                   stroke="currentColor" stroke-width="1.5"
                   viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z
                     M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5
                     17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">
                {{ report.address_approx || 'Localisation enregistrée' }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ report.lat.toFixed(5) }}, {{ report.lng.toFixed(5) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Photo -->
        <div v-if="report.photo_url"
             class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <img
            :src="report.photo_url"
            :alt="report.title"
            class="w-full max-h-72 object-cover"
          />
        </div>

        <!-- Note info -->
        <div class="flex items-start gap-3 bg-blue-50 border border-blue-100
                    rounded-2xl p-4">
          <AppIcon name="Info" class="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p class="text-xs text-blue-800 leading-relaxed">
            Conservez ce lien pour consulter l'avancement de votre
            signalement à tout moment.
          </p>
        </div>

      </div>
    </div>
  </div>
</template>