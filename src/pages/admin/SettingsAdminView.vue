<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { useAuthStore } from '@/stores/auth'
import { useApi } from '@/composables/useApi'
import type { TenantCategory } from '@/types/tenant'

const tenantStore = useTenantStore()
const authStore = useAuthStore()
const { apiFetch } = useApi()

const saving = ref(false)
const savingCat = ref(false)
const saved = ref(false)
const savedCat = ref(false)
const error = ref<string | null>(null)

const form = ref({
  primary_color: tenantStore.config?.primary_color ?? '#1A56A0',
  welcome_message: tenantStore.config?.welcome_message ?? '',
  feature_anonymous_reports: tenantStore.config?.feature_anonymous_reports ?? true,
  feature_votes: tenantStore.config?.feature_votes ?? true,
  feature_ai_analysis: tenantStore.config?.feature_ai_analysis ?? true,
  feature_heatmap: tenantStore.config?.feature_heatmap ?? true,
  feature_weekly_report: tenantStore.config?.feature_weekly_report ?? true,
})

const categories = ref<(Omit<TenantCategory, 'id' | 'tenant_id'> & { id?: string })[]>([])

onMounted(() => {
  categories.value = tenantStore.categories.map((c) => ({ ...c }))
})

async function saveConfig() {
  saving.value = true
  error.value = null
  try {
    await tenantStore.updateConfig(form.value, authStore.accessToken ?? '')
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (err: any) {
    error.value = err.message ?? 'Erreur sauvegarde'
  } finally {
    saving.value = false
  }
}

async function saveCategories() {
  savingCat.value = true
  try {
    await apiFetch('/api/tenant/categories', {
      method: 'PUT',
      body: {
        categories: categories.value.map((c) => ({
          slug: c.slug,
          label: c.label,
          icon: c.icon,
          color: c.color,
          description: c.description,
          isActive: c.is_active,
          sortOrder: c.sort_order,
          slaHours: c.sla_hours,
        })),
      },
    })
    await tenantStore.load()
    savedCat.value = true
    setTimeout(() => { savedCat.value = false }, 3000)
  } catch (err: any) {
    error.value = err.message ?? 'Erreur catégories'
  } finally {
    savingCat.value = false
  }
}

function addCategory() {
  categories.value.push({
    slug: `cat_${Date.now()}`,
    label: 'Nouvelle catégorie',
    icon: '📌',
    color: '#6B7280',
    is_active: true,
    sort_order: categories.value.length,
    sla_hours: 168,
  })
}

function removeCategory(index: number) {
  categories.value.splice(index, 1)
}

const features = [
  { key: 'feature_anonymous_reports', label: 'Signalements anonymes' },
  { key: 'feature_votes', label: 'Votes citoyens' },
  { key: 'feature_ai_analysis', label: "Analyse IA des photos" },
  { key: 'feature_heatmap', label: 'Carte de chaleur' },
  { key: 'feature_weekly_report', label: 'Rapport hebdomadaire' },
] as const
</script>

<template>
  <div class="p-4 md:p-6 space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-display font-bold text-gray-900">Paramètres</h1>
      <p class="text-sm text-gray-500 mt-1">{{ tenantStore.name }}</p>
    </div>

    <div
      v-if="error"
      class="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
    >
      {{ error }}
    </div>

    <!-- Identité visuelle -->
    <section class="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
      <h2 class="text-base font-semibold text-gray-800">Identité visuelle</h2>
      <div class="flex items-center gap-3">
        <input
          v-model="form.primary_color"
          type="color"
          class="h-10 w-16 rounded-lg cursor-pointer border border-gray-200"
        />
        <span class="text-sm text-gray-500 font-mono">{{ form.primary_color }}</span>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Message d'accueil</label>
        <textarea
          v-model="form.welcome_message"
          rows="3"
          placeholder="Bienvenue sur OnSignale..."
          class="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none resize-none focus:border-primary text-sm"
        />
      </div>
    </section>

    <!-- Fonctionnalités -->
    <section class="bg-white rounded-2xl border border-neutral-200 p-6 space-y-2">
      <h2 class="text-base font-semibold text-gray-800 mb-3">Fonctionnalités</h2>
      <label
        v-for="f in features"
        :key="f.key"
        class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
      >
        <span class="text-sm font-medium text-gray-700">{{ f.label }}</span>
        <input
          v-model="(form as any)[f.key]"
          type="checkbox"
          class="w-5 h-5 accent-primary"
        />
      </label>
    </section>

    <!-- Bouton sauvegarde config -->
    <div class="flex items-center gap-3">
      <button
        @click="saveConfig"
        :disabled="saving"
        class="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
      >
        {{ saving ? 'Sauvegarde...' : 'Sauvegarder la configuration' }}
      </button>
      <span v-if="saved" class="text-green-600 font-medium text-sm">✅ Sauvegardé</span>
    </div>

    <!-- Catégories -->
    <section class="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-800">Catégories</h2>
        <button
          @click="addCategory"
          class="text-sm text-primary font-medium hover:underline"
        >
          + Ajouter
        </button>
      </div>

      <div class="space-y-2">
        <div
          v-for="(cat, i) in categories"
          :key="i"
          class="flex items-center gap-2 p-3 border border-neutral-200 rounded-xl"
        >
          <input
            v-model="cat.icon"
            class="w-10 text-center text-xl border border-gray-200 rounded-lg p-1"
          />
          <input
            v-model="cat.label"
            placeholder="Label"
            class="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm outline-none focus:border-primary"
          />
          <input
            v-model="cat.color"
            type="color"
            class="h-9 w-10 rounded-lg cursor-pointer border border-gray-200"
          />
          <input
            v-model.number="cat.sla_hours"
            type="number"
            placeholder="SLA h"
            class="w-20 px-2 py-2 rounded-lg border border-neutral-200 text-xs text-center outline-none"
          />
          <label class="flex items-center gap-1 text-xs text-gray-500">
            <input v-model="cat.is_active" type="checkbox" class="accent-primary" />
            Actif
          </label>
          <button
            @click="removeCategory(i)"
            class="text-red-400 hover:text-red-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="saveCategories"
          :disabled="savingCat"
          class="flex-1 py-2.5 border border-primary text-primary rounded-xl font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors text-sm"
        >
          {{ savingCat ? 'Sauvegarde...' : 'Sauvegarder les catégories' }}
        </button>
        <span v-if="savedCat" class="text-green-600 font-medium text-sm">✅ Sauvegardé</span>
      </div>
    </section>
  </div>
</template>
