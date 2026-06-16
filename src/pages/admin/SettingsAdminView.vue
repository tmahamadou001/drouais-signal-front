<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { useAuthStore } from '@/stores/auth'
import { useApi } from '@/composables/useApi'
import type { TenantCategory } from '@/types/tenant'
import AppIcon from '@/components/AppIcon.vue'
import AppTabs from '@/components/AppTabs.vue'
import type { TabItem } from '@/components/AppTabs.vue'

const tenantStore = useTenantStore()
const authStore = useAuthStore()
const { apiFetch } = useApi()

// ─── Tab navigation ───────────────────────────────────────────────────────────

const activeTab = ref<'identity' | 'features' | 'categories'>('identity')

const tabs: TabItem[] = [
  { key: 'identity',   label: 'Identité',       icon: 'Palette' },
  { key: 'features',   label: 'Fonctionnalités', icon: 'Sliders' },
  { key: 'categories', label: 'Catégories',      icon: 'Tag' },
]

// ─── State ────────────────────────────────────────────────────────────────────

const saving    = ref(false)
const savingCat = ref(false)
const saved     = ref(false)
const savedCat  = ref(false)
const error     = ref<string | null>(null)

const form = ref({
  primary_color:              tenantStore.config?.primary_color              ?? '#1A56A0',
  welcome_message:            tenantStore.config?.welcome_message            ?? '',
  feature_anonymous_reports:  tenantStore.config?.feature_anonymous_reports  ?? true,
  feature_votes:              tenantStore.config?.feature_votes              ?? true,
  feature_ai_analysis:        tenantStore.config?.feature_ai_analysis        ?? true,
  feature_heatmap:            tenantStore.config?.feature_heatmap            ?? true,
  feature_weekly_report:      tenantStore.config?.feature_weekly_report      ?? true,
})

const categories = ref<(Omit<TenantCategory, 'id' | 'tenant_id'> & { id?: string })[]>([])

onMounted(() => {
  categories.value = tenantStore.categories.map(c => ({ ...c }))
})

// ─── Features list ────────────────────────────────────────────────────────────

const features = [
  {
    key:   'feature_anonymous_reports',
    label: 'Signalements anonymes',
    desc:  'Autoriser les signalements sans compte',
    icon:  'UserX',
  },
  {
    key:   'feature_votes',
    label: 'Votes citoyens',
    desc:  'Les citoyens peuvent voter sur les signalements',
    icon:  'ThumbsUp',
  },
  {
    key:   'feature_ai_analysis',
    label: 'Analyse IA des photos',
    desc:  'Catégorisation automatique par Gemini',
    icon:  'Sparkles',
  },
  {
    key:   'feature_heatmap',
    label: 'Carte de chaleur',
    desc:  'Visualisation des zones à problèmes',
    icon:  'MapPin',
  },
  {
    key:   'feature_weekly_report',
    label: 'Rapport hebdomadaire',
    desc:  'Envoi automatique par email chaque semaine',
    icon:  'BarChart2',
  },
] as const

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function saveConfig() {
  saving.value = true
  error.value  = null
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
  error.value     = null
  try {
    await apiFetch('/api/tenant/categories', {
      method: 'PUT',
      body: {
        categories: categories.value.map(c => ({
          slug:          c.slug,
          label:         c.label,
          icon:          c.icon,
          color:         c.color,
          description:   c.description,
          isActive:      c.is_active,
          sortOrder:     c.sort_order,
          slaHours:      c.sla_hours,
          serviceName:   c.service_name  ?? null,
          serviceEmails: c.service_emails ?? [],
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
    slug:      `cat_${Date.now()}`,
    label:     'Nouvelle catégorie',
    icon:      '📌',
    color:     '#6B7280',
    is_active: true,
    sort_order: categories.value.length,
    sla_hours:  168,
  })
}

function removeCategory(index: number) {
  categories.value.splice(index, 1)
}

// ─── Email inputs (raw string per slug, parsed on blur) ───────────────────────

const emailRawInputs = ref<Record<string, string>>({})

watch(categories, (cats) => {
  cats.forEach(c => {
    if (!(c.slug in emailRawInputs.value)) {
      emailRawInputs.value[c.slug] = (c.service_emails ?? []).join(', ')
    }
  })
}, { immediate: true })

function parseEmailsFromString(cat: typeof categories.value[0], value: string) {
  cat.service_emails = value
    .split(/[,;\s]+/)
    .map(e => e.trim())
    .filter(e => e.includes('@'))
  emailRawInputs.value[cat.slug] = cat.service_emails.join(', ')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

      <!-- Header -->
      <div class="mb-5">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          Paramètres
        </h1>
        <p class="text-sm text-gray-400 mt-0.5">
          {{ tenantStore.name }}
        </p>
      </div>

      <!-- Erreur globale -->
      <Transition name="fade">
        <div
          v-if="error"
          class="flex items-start gap-2.5 p-4 mb-5
                 bg-red-50 border border-red-100 rounded-2xl"
        >
          <AppIcon name="TriangleAlert" :size="16" class="text-red-400 flex-shrink-0 mt-0.5" />
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>
      </Transition>

      <!-- Tab bar -->
      <AppTabs
        v-model="activeTab"
        :tabs="tabs"
        class="mb-5"
      />

      <!-- ─── Onglet : Identité visuelle ──────────────────────────────────── -->
      <Transition name="tab" mode="out-in">
        <section
          v-if="activeTab === 'identity'"
          key="identity"
          class="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AppIcon name="Palette" :size="16" class="text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Identité visuelle</h2>
          </div>

          <div class="px-5 py-5 space-y-5">

            <!-- Couleur primaire -->
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-2">
                Couleur principale
              </label>
              <div class="flex items-center gap-3">
                <input
                  v-model="form.primary_color"
                  type="color"
                  class="w-10 h-10 rounded-xl cursor-pointer border-0 p-0.5 bg-transparent"
                />
                <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <div
                    class="w-4 h-4 rounded-full flex-shrink-0"
                    :style="{ background: form.primary_color }"
                  />
                  <span class="text-sm font-mono text-gray-700">{{ form.primary_color }}</span>
                </div>
              </div>
            </div>

            <!-- Message d'accueil -->
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-2">
                Message d'accueil
                <span class="text-gray-400 font-normal ml-1">— optionnel</span>
              </label>
              <textarea
                v-model="form.welcome_message"
                rows="3"
                placeholder="Bienvenue sur OnSignale..."
                class="w-full px-4 py-3 rounded-xl border border-gray-200
                       text-sm text-gray-900 placeholder-gray-300
                       outline-none resize-none
                       focus:border-primary focus:ring-2 focus:ring-primary/10
                       transition-all"
              />
            </div>
          </div>

          <!-- Footer save -->
          <div class="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <button
              @click="saveConfig"
              :disabled="saving"
              class="flex-1 flex items-center justify-center gap-2
                     py-2.5 bg-primary text-white font-semibold
                     rounded-xl hover:bg-primary/90
                     disabled:opacity-50 transition-all text-sm"
            >
              <AppIcon v-if="saving" name="Loader2" :size="16" class="animate-spin" />
              {{ saving ? 'Sauvegarde…' : 'Sauvegarder' }}
            </button>

            <Transition name="fade">
              <div
                v-if="saved"
                class="flex items-center gap-1.5 text-green-600 text-sm font-medium flex-shrink-0"
              >
                <AppIcon name="Check" :size="16" :stroke-width="2.5" />
                Sauvegardé
              </div>
            </Transition>
          </div>
        </section>
      </Transition>

      <!-- ─── Onglet : Fonctionnalités ────────────────────────────────────── -->
      <Transition name="tab" mode="out-in">
        <section
          v-if="activeTab === 'features'"
          key="features"
          class="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AppIcon name="Sliders" :size="16" class="text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Fonctionnalités</h2>
          </div>

          <div class="divide-y divide-gray-50">
            <label
              v-for="f in features"
              :key="f.key"
              class="flex items-center justify-between gap-4 px-5 py-4
                     hover:bg-gray-50/60 cursor-pointer transition-colors"
            >
              <div class="flex items-start gap-3 min-w-0">
                <div class="mt-0.5 p-1.5 rounded-lg bg-gray-100 flex-shrink-0">
                  <AppIcon :name="f.icon" :size="14" class="text-gray-500" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 leading-none mb-0.5">
                    {{ f.label }}
                  </p>
                  <p class="text-xs text-gray-400 leading-snug">{{ f.desc }}</p>
                </div>
              </div>

              <!-- Toggle switch -->
              <div class="flex-shrink-0">
                <div
                  class="relative w-10 h-[22px] rounded-full transition-colors duration-200"
                  :class="(form as any)[f.key] ? 'bg-primary' : 'bg-gray-200'"
                >
                  <input v-model="(form as any)[f.key]" type="checkbox" class="sr-only" />
                  <div
                    class="absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"
                    :class="(form as any)[f.key] ? 'translate-x-[22px]' : 'translate-x-[3px]'"
                  />
                </div>
              </div>
            </label>
          </div>

          <!-- Footer save -->
          <div class="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <button
              @click="saveConfig"
              :disabled="saving"
              class="flex-1 flex items-center justify-center gap-2
                     py-2.5 bg-primary text-white font-semibold
                     rounded-xl hover:bg-primary/90
                     disabled:opacity-50 transition-all text-sm"
            >
              <AppIcon v-if="saving" name="Loader2" :size="16" class="animate-spin" />
              {{ saving ? 'Sauvegarde…' : 'Sauvegarder' }}
            </button>

            <Transition name="fade">
              <div
                v-if="saved"
                class="flex items-center gap-1.5 text-green-600 text-sm font-medium flex-shrink-0"
              >
                <AppIcon name="Check" :size="16" :stroke-width="2.5" />
                Sauvegardé
              </div>
            </Transition>
          </div>
        </section>
      </Transition>

      <!-- ─── Onglet : Catégories ─────────────────────────────────────────── -->
      <Transition name="tab" mode="out-in">
        <section
          v-if="activeTab === 'categories'"
          key="categories"
          class="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <AppIcon name="Tag" :size="16" class="text-gray-400" />
              <div>
                <h2 class="text-sm font-semibold text-gray-900">Catégories</h2>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ categories.length }} catégorie{{ categories.length > 1 ? 's' : '' }}
                </p>
              </div>
            </div>
            <button
              @click="addCategory"
              class="flex items-center gap-1.5 text-xs font-semibold text-primary
                     bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              <AppIcon name="Plus" :size="14" :stroke-width="2.5" />
              Ajouter
            </button>
          </div>

          <!-- Liste -->
          <div class="divide-y divide-gray-50">
            <div
              v-for="(cat, i) in categories"
              :key="cat.slug"
              class="px-5 py-4 space-y-3"
            >
              <!-- Ligne principale -->
              <div class="flex items-center gap-2.5">
                <input
                  v-model="cat.icon"
                  class="w-10 h-10 text-center text-xl bg-gray-50 border border-gray-200
                         rounded-xl outline-none focus:border-primary transition-colors flex-shrink-0"
                />
                <input
                  v-model="cat.label"
                  placeholder="Nom de la catégorie"
                  class="flex-1 min-w-0 px-3 py-2.5 bg-gray-50 border border-gray-200
                         rounded-xl text-sm text-gray-900 placeholder-gray-300
                         outline-none focus:border-primary focus:bg-white transition-all"
                />
                <input
                  v-model="cat.color"
                  type="color"
                  class="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5 bg-white flex-shrink-0"
                />
                <button
                  @click="removeCategory(i)"
                  class="w-8 h-8 flex items-center justify-center text-gray-300
                         hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <AppIcon name="X" :size="16" />
                </button>
              </div>

              <!-- Options secondaires -->
              <div class="flex items-center gap-4 pl-0.5">
                <!-- SLA -->
                <div class="flex items-center gap-1.5">
                  <span class="text-xs text-gray-400">SLA</span>
                  <input
                    v-model.number="cat.sla_hours"
                    type="number"
                    min="1"
                    placeholder="168"
                    class="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg
                           text-xs text-center text-gray-700 outline-none
                           focus:border-primary transition-colors"
                  />
                  <span class="text-xs text-gray-400">h</span>
                </div>

                <!-- Actif toggle -->
                <label class="flex items-center gap-2 cursor-pointer">
                  <div
                    class="relative w-8 h-4 rounded-full transition-colors duration-200"
                    :class="cat.is_active ? 'bg-primary' : 'bg-gray-200'"
                  >
                    <input v-model="cat.is_active" type="checkbox" class="sr-only" />
                    <div
                      class="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200"
                      :class="cat.is_active ? 'translate-x-4' : 'translate-x-0.5'"
                    />
                  </div>
                  <span class="text-xs text-gray-500">
                    {{ cat.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </label>
              </div>

              <!-- Transmission automatique -->
              <div class="pt-2 border-t border-gray-100 space-y-2">
                <p class="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                  <AppIcon name="Mail" :size="13" />
                  Transmission automatique
                </p>
                <input
                  v-model="cat.service_name"
                  placeholder="Nom du service (ex : Police Municipale)"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg
                         text-xs text-gray-900 placeholder-gray-300
                         outline-none focus:border-primary focus:bg-white transition-all"
                />
                <input
                  v-model="emailRawInputs[cat.slug]"
                  @blur="parseEmailsFromString(cat, emailRawInputs[cat.slug])"
                  placeholder="Emails séparés par des virgules (ex : voirie@mairie.fr, tech@mairie.fr)"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg
                         text-xs text-gray-900 placeholder-gray-300
                         outline-none focus:border-primary focus:bg-white transition-all"
                />
                <p
                  v-if="(cat.service_emails ?? []).length > 0"
                  class="text-xs text-green-600 flex items-center gap-1"
                >
                  <AppIcon name="CheckCircle" :size="12" />
                  {{ (cat.service_emails ?? []).length }}
                  destinataire{{ (cat.service_emails ?? []).length > 1 ? 's' : '' }}
                  validé{{ (cat.service_emails ?? []).length > 1 ? 's' : '' }}
                </p>
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="categories.length === 0" class="px-5 py-10 text-center">
              <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <AppIcon name="Tag" :size="20" class="text-gray-300" />
              </div>
              <p class="text-sm text-gray-400">
                Aucune catégorie.
                <button @click="addCategory" class="text-primary font-medium hover:underline ml-1">
                  En ajouter une
                </button>
              </p>
            </div>
          </div>

          <!-- Footer save -->
          <div class="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <button
              @click="saveCategories"
              :disabled="savingCat"
              class="flex-1 flex items-center justify-center gap-2
                     py-2.5 border border-primary text-primary font-semibold
                     rounded-xl hover:bg-primary/5
                     disabled:opacity-50 transition-all text-sm"
            >
              <AppIcon v-if="savingCat" name="Loader2" :size="16" class="animate-spin" />
              {{ savingCat ? 'Sauvegarde…' : 'Sauvegarder les catégories' }}
            </button>

            <Transition name="fade">
              <div
                v-if="savedCat"
                class="flex items-center gap-1.5 text-green-600 text-sm font-medium flex-shrink-0"
              >
                <AppIcon name="Check" :size="16" :stroke-width="2.5" />
                Sauvegardé
              </div>
            </Transition>
          </div>
        </section>
      </Transition>

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

.tab-enter-active,
.tab-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tab-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.tab-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
