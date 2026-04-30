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
  categories.value = tenantStore.categories
    .map(c => ({ ...c }))
})

async function saveConfig() {
  saving.value = true
  error.value = null
  try {
    await tenantStore.updateConfig(
      form.value,
      authStore.accessToken ?? ''
    )
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
  error.value = null
  try {
    await apiFetch('/api/tenant/categories', {
      method: 'PUT',
      body: {
        categories: categories.value.map(c => ({
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
  {
    key: 'feature_anonymous_reports',
    label: 'Signalements anonymes',
    desc: 'Autoriser les signalements sans compte',
  },
  {
    key: 'feature_votes',
    label: 'Votes citoyens',
    desc: 'Les citoyens peuvent voter sur les signalements',
  },
  {
    key: 'feature_ai_analysis',
    label: 'Analyse IA des photos',
    desc: 'Catégorisation automatique par Gemini',
  },
  {
    key: 'feature_heatmap',
    label: 'Carte de chaleur',
    desc: 'Visualisation des zones à problèmes',
  },
  {
    key: 'feature_weekly_report',
    label: 'Rapport hebdomadaire',
    desc: 'Envoi automatique par email chaque semaine',
  },
] as const
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-2xl mx-auto px-4 py-6
                sm:px-6 sm:py-8 space-y-5">

      <!-- Header -->
      <div class="pb-1">
        <h1 class="text-xl font-bold text-gray-900
                   sm:text-2xl">
          Paramètres
        </h1>
        <p class="text-sm text-gray-400 mt-0.5">
          {{ tenantStore.name }}
        </p>
      </div>

      <!-- Erreur globale -->
      <div
        v-if="error"
        class="flex items-start gap-2.5 p-4
               bg-red-50 border border-red-100
               rounded-2xl"
      >
        <svg class="w-4 h-4 text-red-400 flex-shrink-0
                    mt-0.5"
             fill="none" stroke="currentColor"
             stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round"
                stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866
               1.5.217 3.374 1.948 3.374h14.71c1.73
               0 2.813-1.874 1.948-3.374L13.949
               3.378c-.866-1.5-3.032-1.5-3.898
               0L2.697 16.126zM12 15.75h.007v.008
               H12v-.008z"/>
        </svg>
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <!-- ─── Identité visuelle ─────────────────── -->
      <section class="bg-white rounded-2xl border
                      border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b
                    border-gray-100">
          <h2 class="text-sm font-semibold
                     text-gray-900">
            Identité visuelle
          </h2>
        </div>

        <div class="px-5 py-4 space-y-4">

          <!-- Couleur primaire -->
          <div>
            <label class="block text-xs font-medium
                          text-gray-500 mb-2">
              Couleur principale
            </label>
            <div class="flex items-center gap-3">
              <div class="relative">
                <input
                  v-model="form.primary_color"
                  type="color"
                  class="w-10 h-10 rounded-xl
                         cursor-pointer border-0
                         p-0.5 bg-transparent"
                />
              </div>
              <div class="flex items-center gap-2
                          bg-gray-50 border
                          border-gray-200 rounded-xl
                          px-3 py-2">
                <div
                  class="w-4 h-4 rounded-full
                         flex-shrink-0"
                  :style="{
                    background: form.primary_color
                  }"
                />
                <span class="text-sm font-mono
                             text-gray-700">
                  {{ form.primary_color }}
                </span>
              </div>
            </div>
          </div>

          <!-- Message d'accueil -->
          <div>
            <label class="block text-xs font-medium
                          text-gray-500 mb-2">
              Message d'accueil
              <span class="text-gray-400
                           font-normal ml-1">
                — optionnel
              </span>
            </label>
            <textarea
              v-model="form.welcome_message"
              rows="3"
              placeholder="Bienvenue sur OnSignale..."
              class="w-full px-4 py-3 rounded-xl
                     border border-gray-200
                     text-sm text-gray-900
                     placeholder-gray-300
                     outline-none resize-none
                     focus:border-primary
                     focus:ring-2
                     focus:ring-primary/10
                     transition-all"
            />
          </div>
        </div>
      </section>

      <!-- ─── Fonctionnalités ───────────────────── -->
      <section class="bg-white rounded-2xl border
                      border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b
                    border-gray-100">
          <h2 class="text-sm font-semibold
                     text-gray-900">
            Fonctionnalités
          </h2>
        </div>

        <div class="divide-y divide-gray-50">
          <label
            v-for="f in features"
            :key="f.key"
            class="flex items-center justify-between
                   gap-4 px-5 py-3.5
                   hover:bg-gray-50/60
                   cursor-pointer transition-colors"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium
                        text-gray-900 leading-none
                        mb-0.5">
                {{ f.label }}
              </p>
              <p class="text-xs text-gray-400
                        leading-snug">
                {{ f.desc }}
              </p>
            </div>

            <!-- Toggle switch -->
            <div class="flex-shrink-0">
              <div
                class="relative w-10 h-5.5 rounded-full
                       transition-colors duration-200"
                :class="(form as any)[f.key]
                  ? 'bg-primary'
                  : 'bg-gray-200'"
              >
                <input
                  v-model="(form as any)[f.key]"
                  type="checkbox"
                  class="sr-only"
                />
                <div
                  class="absolute top-0.5
                         w-4.5 h-4.5 bg-white
                         rounded-full shadow-sm
                         transition-transform
                         duration-200"
                  :class="(form as any)[f.key]
                    ? 'translate-x-5'
                    : 'translate-x-0.5'"
                />
              </div>
            </div>
          </label>
        </div>
      </section>

      <!-- Bouton save config -->
      <div class="flex items-center gap-3">
        <button
          @click="saveConfig"
          :disabled="saving"
          class="flex-1 flex items-center
                 justify-center gap-2
                 py-3 bg-primary text-white
                 font-semibold rounded-xl
                 hover:bg-primary/90
                 disabled:opacity-50
                 transition-all text-sm"
        >
          <span
            v-if="saving"
            class="w-4 h-4 border-2 border-white
                   border-t-transparent rounded-full
                   animate-spin"
          />
          {{
            saving
              ? 'Sauvegarde...'
              : 'Sauvegarder la configuration'
          }}
        </button>

        <Transition name="fade">
          <div
            v-if="saved"
            class="flex items-center gap-1.5
                   text-green-600 text-sm
                   font-medium flex-shrink-0"
          >
            <svg class="w-4 h-4" fill="none"
                 stroke="currentColor"
                 stroke-width="2.5"
                 viewBox="0 0 24 24">
              <path stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            Sauvegardé
          </div>
        </Transition>
      </div>

      <!-- ─── Catégories ────────────────────────── -->
      <section class="bg-white rounded-2xl border
                      border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100
                    flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold
                       text-gray-900">
              Catégories
            </h2>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ categories.length }} catégorie{{
                categories.length > 1 ? 's' : ''
              }}
            </p>
          </div>
          <button
            @click="addCategory"
            class="flex items-center gap-1.5
                   text-xs font-semibold text-primary
                   bg-primary/8 hover:bg-primary/15
                   px-3 py-1.5 rounded-lg
                   transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none"
                 stroke="currentColor"
                 stroke-width="2.5"
                 viewBox="0 0 24 24">
              <path stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            Ajouter
          </button>
        </div>

        <!-- Liste des catégories -->
        <div class="divide-y divide-gray-50">
          <div
            v-for="(cat, i) in categories"
            :key="i"
            class="px-5 py-3.5"
          >
            <!-- Ligne principale -->
            <div class="flex items-center gap-2.5">

              <!-- Icône emoji -->
              <input
                v-model="cat.icon"
                class="w-10 h-10 text-center text-xl
                       bg-gray-50 border border-gray-200
                       rounded-xl outline-none
                       focus:border-primary
                       transition-colors flex-shrink-0"
              />

              <!-- Label -->
              <input
                v-model="cat.label"
                placeholder="Nom de la catégorie"
                class="flex-1 min-w-0 px-3 py-2.5
                       bg-gray-50 border border-gray-200
                       rounded-xl text-sm text-gray-900
                       placeholder-gray-300
                       outline-none
                       focus:border-primary
                       focus:bg-white
                       transition-all"
              />

              <!-- Couleur -->
              <div class="relative flex-shrink-0">
                <input
                  v-model="cat.color"
                  type="color"
                  class="w-10 h-10 rounded-xl
                         cursor-pointer border
                         border-gray-200 p-0.5
                         bg-white"
                />
              </div>

              <!-- Supprimer -->
              <button
                @click="removeCategory(i)"
                class="w-8 h-8 flex items-center
                       justify-center text-gray-300
                       hover:text-red-400
                       hover:bg-red-50 rounded-lg
                       transition-colors flex-shrink-0"
              >
                <svg class="w-4 h-4" fill="none"
                     stroke="currentColor"
                     stroke-width="2"
                     viewBox="0 0 24 24">
                  <path stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Options secondaires -->
            <div class="flex items-center gap-4 mt-2.5
                        pl-0.5">
              <!-- SLA -->
              <div class="flex items-center gap-1.5">
                <label class="text-xs text-gray-400">
                  SLA
                </label>
                <input
                  v-model.number="cat.sla_hours"
                  type="number"
                  min="1"
                  placeholder="168"
                  class="w-16 px-2 py-1 bg-gray-50
                         border border-gray-200
                         rounded-lg text-xs
                         text-center text-gray-700
                         outline-none
                         focus:border-primary
                         transition-colors"
                />
                <span class="text-xs text-gray-400">h</span>
              </div>

              <!-- Actif toggle -->
              <label class="flex items-center gap-2
                            cursor-pointer">
                <div
                  class="relative w-8 h-4 rounded-full
                         transition-colors duration-200"
                  :class="cat.is_active
                    ? 'bg-primary'
                    : 'bg-gray-200'"
                >
                  <input
                    v-model="cat.is_active"
                    type="checkbox"
                    class="sr-only"
                  />
                  <div
                    class="absolute top-0.5
                           w-3 h-3 bg-white
                           rounded-full shadow-sm
                           transition-transform
                           duration-200"
                    :class="cat.is_active
                      ? 'translate-x-4'
                      : 'translate-x-0.5'"
                  />
                </div>
                <span class="text-xs text-gray-500">
                  {{ cat.is_active ? 'Active' : 'Inactive' }}
                </span>
              </label>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="categories.length === 0"
            class="px-5 py-8 text-center"
          >
            <p class="text-sm text-gray-400">
              Aucune catégorie.
              <button
                @click="addCategory"
                class="text-primary font-medium
                       hover:underline ml-1"
              >
                En ajouter une
              </button>
            </p>
          </div>
        </div>

        <!-- Footer save catégories -->
        <div class="px-5 py-4 border-t border-gray-100
                    bg-gray-50/50 flex items-center
                    gap-3">
          <button
            @click="saveCategories"
            :disabled="savingCat"
            class="flex-1 flex items-center
                   justify-center gap-2
                   py-2.5 border border-primary
                   text-primary font-semibold
                   rounded-xl hover:bg-primary/5
                   disabled:opacity-50
                   transition-all text-sm"
          >
            <span
              v-if="savingCat"
              class="w-4 h-4 border-2 border-primary
                     border-t-transparent rounded-full
                     animate-spin"
            />
            {{
              savingCat
                ? 'Sauvegarde...'
                : 'Sauvegarder les catégories'
            }}
          </button>

          <Transition name="fade">
            <div
              v-if="savedCat"
              class="flex items-center gap-1.5
                     text-green-600 text-sm
                     font-medium flex-shrink-0"
            >
              <svg class="w-4 h-4" fill="none"
                   stroke="currentColor"
                   stroke-width="2.5"
                   viewBox="0 0 24 24">
                <path stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"/>
              </svg>
              Sauvegardé
            </div>
          </Transition>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Toggle switch dimensions custom */
.h-5\.5 { height: 1.375rem; }
.w-4\.5 { width: 1.125rem; }
.h-4\.5 { height: 1.125rem; }
</style>