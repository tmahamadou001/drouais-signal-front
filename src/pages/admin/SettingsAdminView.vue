<script setup lang="ts">
/**
 * Les paramètres, repris de l'export Claude Design (planche « Paramètres »).
 *
 * La refonte change l'objet de l'écran. C'était un formulaire de onze blocs
 * dépliés en permanence, dans une colonne de 672 px : pour savoir quelles
 * catégories partaient par e-mail, il fallait faire défiler la page entière et
 * s'en souvenir. C'est maintenant une liste où chaque ligne dit son délai, son
 * destinataire et son état, et où l'on ouvre celle qu'on veut modifier.
 *
 * La colonne de droite répond à la question qu'on se pose vraiment en arrivant
 * ici : « qu'est-ce que ça change pour l'habitant, et qu'est-ce que j'ai oublié
 * de régler ? »
 *
 * Les deux autres onglets — Identité, Fonctionnalités — ne sont pas dans la
 * maquette mais restent : ils règlent des choses qu'aucun autre écran ne règle.
 * Ils vivent dans le sélecteur de l'en-tête, là où la maquette ne met rien.
 */
import { ref, onMounted, computed, watch } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { useAuthStore } from '@/stores/auth'
import { useApi } from '@/composables/useApi'
import type { TenantCategory } from '@/types/tenant'
import AppIcon from '@/components/AppIcon.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import { categoryGlyph } from '@/lib/categories'
import { RouterLink } from 'vue-router'

const tenantStore = useTenantStore()
const authStore = useAuthStore()
const { apiFetch } = useApi()

type Tab = 'categories' | 'identity' | 'features'

const activeTab = ref<Tab>('categories')

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'categories', label: 'Catégories',      icon: 'Tag' },
  { key: 'identity',   label: 'Identité',        icon: 'Palette' },
  { key: 'features',   label: 'Fonctionnalités', icon: 'Sliders' },
]

const saving = ref(false)
const saved = ref(false)
const error = ref<string | null>(null)

const form = ref({
  primary_color:         tenantStore.config?.primary_color         ?? '#1A56A0',
  feature_votes:         tenantStore.config?.feature_votes         ?? true,
  feature_ai_analysis:   tenantStore.config?.feature_ai_analysis   ?? true,
  feature_heatmap:       tenantStore.config?.feature_heatmap       ?? true,
  feature_weekly_report: tenantStore.config?.feature_weekly_report ?? true,
})

/**
 * La liste nationale, telle que cette commune l'a réglée.
 *
 * Elle ne s'ajoute ni ne se supprime. Le serveur rend les onze catégories
 * canoniques avec, pour chacune, ce que la mairie en a décidé. Une catégorie
 * qu'elle ne traite pas se désactive ; elle ne quitte pas la taxonomie, sans
 * quoi l'IA classerait un matelas dans une catégorie qui n'existe nulle part
 * ailleurs et aucune statistique inter-communes ne tiendrait.
 */
const categories = ref<TenantCategory[]>([])

/**
 * Le chargement de la liste.
 *
 * Il passe par le réseau, et la liste tombait d'un coup sur un écran vide qui
 * disait « Aucune catégorie disponible » entre-temps — un message qui ne veut
 * dire ça que lorsque la migration 026 n'a pas été jouée, et qui inquiète pour
 * rien le reste du temps.
 */
const categoriesLoading = ref(true)
const openSlug = ref<string | null>(null)
const filter = ref('')

/**
 * La liste complète, inactives comprises.
 *
 * `tenantStore.categories` la rend telle quelle depuis que le back-office
 * appelle `loadAllCategories()` : `GET /api/tenant/config`, lui, ne renvoie que
 * les actives — c'est ce dont l'application de l'habitant a besoin. Cet écran
 * est justement celui où l'on réactive une catégorie éteinte ; sans la liste
 * complète, elle disparaissait dès qu'elle était enregistrée comme ignorée.
 */
async function loadCategories() {
  categoriesLoading.value = true
  try {
    await tenantStore.loadAllCategories()
    categories.value = tenantStore.categories.map((category) => ({ ...category }))
  } finally {
    categoriesLoading.value = false
  }
}

function resetFromStore() {
  void loadCategories()
  form.value = {
    primary_color:         tenantStore.config?.primary_color         ?? '#1A56A0',
    feature_votes:         tenantStore.config?.feature_votes         ?? true,
    feature_ai_analysis:   tenantStore.config?.feature_ai_analysis   ?? true,
    feature_heatmap:       tenantStore.config?.feature_heatmap       ?? true,
    feature_weekly_report: tenantStore.config?.feature_weekly_report ?? true,
  }
  emailDraft.value = {}
}

onMounted(() => {
  resetFromStore()
  void loadHistory()
})

const visibleCategories = computed(() => {
  const needle = filter.value.trim().toLowerCase()
  if (!needle) return categories.value
  return categories.value.filter((category) =>
    `${category.label} ${category.description}`.toLowerCase().includes(needle)
  )
})

const activeCount = computed(() => categories.value.filter((category) => category.is_active).length)

const withRecipient = computed(
  () => categories.value.filter((category) => category.is_active && (category.service_emails ?? []).length > 0).length
)

/**
 * Les catégories traitées mais sans destinataire.
 *
 * C'est le seul avertissement de cet écran, et il vise un cas réel : une
 * catégorie active sans e-mail reçoit des signalements que personne n'est
 * prévenu de traiter. Ils ne sont pas perdus — ils attendent dans le
 * back-office — mais rien ne sort de la plateforme.
 */
const withoutRecipient = computed(() => activeCount.value - withRecipient.value)

const shortestSla = computed(() => {
  const active = categories.value.filter((category) => category.is_active)
  return active.length > 0 ? Math.min(...active.map((category) => category.sla_hours)) : null
})

const citizenVisible = computed(() => categories.value.filter((category) => category.is_active))

// ─── Destinataires ───────────────────────────────────────────────────────────

/**
 * La saisie en cours, par catégorie.
 *
 * Les adresses sont stockées en tableau ; le champ, lui, accepte une frappe
 * libre. Séparer les deux évite de recomposer la liste à chaque touche — ce qui
 * déplaçait le curseur dès qu'on tapait une virgule.
 */
const emailDraft = ref<Record<string, string>>({})

function addEmails(category: TenantCategory) {
  const raw = emailDraft.value[category.slug] ?? ''
  const added = raw.split(/[,;\s]+/).map((value) => value.trim()).filter((value) => value.includes('@'))
  if (added.length === 0) return

  const existing = category.service_emails ?? []
  category.service_emails = [...new Set([...existing, ...added])]
  emailDraft.value[category.slug] = ''
}

function removeEmail(category: TenantCategory, email: string) {
  category.service_emails = (category.service_emails ?? []).filter((value) => value !== email)
}

// ─── Historique ──────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string
  action: string
  created_at: string
}

/**
 * Les dernières modifications, lues dans les logs d'audit.
 *
 * La maquette montre une frise « Délai Voirie porté à 72 h ». Le log enregistre
 * l'action et la commune, pas le détail du champ modifié : la frise dit donc ce
 * qui a été touché et quand, sans inventer le reste.
 */
const history = ref<HistoryEntry[]>([])

const HISTORY_LABELS: Record<string, string> = {
  'tenant_categories.updated': 'Catégories modifiées',
  'tenant_config.updated':     'Réglages modifiés',
}

async function loadHistory() {
  try {
    const data = await apiFetch<{ data: HistoryEntry[] }>('/api/audit/logs?limit=15')
    history.value = data.data.filter((entry) => entry.action in HISTORY_LABELS).slice(0, 3)
  } catch {
    history.value = []
  }
}

const lastChange = computed(() => history.value[0]?.created_at ?? null)

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Enregistrement ──────────────────────────────────────────────────────────

/** Un seul bouton : il enregistre ce que l'onglet ouvert a modifié. */
async function save() {
  saving.value = true
  error.value = null

  try {
    if (activeTab.value === 'categories') {
      await apiFetch('/api/tenant/categories', {
        method: 'PUT',
        body: {
          // Le slug est national et ne se négocie pas : le serveur refuse tout
          // ce qu'il ne reconnaît pas. Seules les décisions de la commune montent.
          categories: categories.value.map((category) => ({
            slug:          category.slug,
            label:         category.label,
            isActive:      category.is_active,
            sortOrder:     category.sort_order,
            slaHours:      category.sla_hours,
            serviceName:   category.service_name ?? null,
            serviceEmails: category.service_emails ?? [],
          })),
        },
      })
      // Le magasin pour le reste de l'application, la liste complète pour
      // cet écran : les deux ne rendent pas la même chose.
      await Promise.all([tenantStore.load(), loadCategories()])
    } else {
      await tenantStore.updateConfig(form.value, authStore.accessToken ?? '')
    }

    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
    void loadHistory()
  } catch (err: any) {
    error.value = err.message ?? 'Erreur lors de l’enregistrement'
  } finally {
    saving.value = false
  }
}

const FEATURES = [
  { key: 'feature_votes',         label: 'Confirmations citoyennes', desc: 'Un habitant sur place peut confirmer un signalement existant', icon: 'ThumbsUp' },
  { key: 'feature_ai_analysis',   label: 'Analyse IA des photos',    desc: 'Catégorisation automatique de la photo à l’envoi',            icon: 'Sparkles' },
  { key: 'feature_heatmap',       label: 'Carte de chaleur',         desc: 'Visualisation des zones les plus signalées',                   icon: 'Flame' },
  { key: 'feature_weekly_report', label: 'Rapport hebdomadaire',     desc: 'Synthèse envoyée par e-mail chaque semaine',                   icon: 'Mail' },
] as const

watch(activeTab, () => { openSlug.value = null })
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">

    <AdminPageHeader>
      <template #actions>
        <div class="flex flex-none rounded-[10px] bg-status-pending-bg p-[3px]">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            class="flex h-8 flex-none items-center gap-[7px] rounded-lg px-3 text-xs font-semibold leading-none transition-colors"
            :class="activeTab === tab.key
              ? 'bg-white text-ink shadow-[0_1px_2px_rgba(15,43,74,.10)]'
              : 'text-muted hover:text-ink'"
            @click="activeTab = tab.key"
          >
            <AppIcon :name="tab.icon" :size="14" :stroke-width="activeTab === tab.key ? 2 : 1.75" />
            {{ tab.label }}
          </button>
        </div>

        <div
          v-if="lastChange"
          class="hidden flex-none items-center gap-[7px] whitespace-nowrap text-xs font-medium leading-none text-muted xl:flex"
        >
          <AppIcon name="History" :size="15" :stroke-width="1.75" />
          Dernière modification le {{ formatDate(lastChange) }}
        </div>

        <button
          class="flex h-[38px] flex-none items-center rounded-[10px] border border-line bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:bg-canvas"
          @click="resetFromStore"
        >
          Annuler
        </button>

        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 transition-colors hover:bg-brand-800 disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          <AppIcon v-if="saving" name="Loader2" :size="16" :stroke-width="2.5" class="animate-spin text-white" />
          <AppIcon v-else-if="saved" name="Check" :size="16" :stroke-width="2.5" class="text-white" />
          <AppIcon v-else name="Check" :size="16" :stroke-width="2.5" class="text-white" />
          <span class="whitespace-nowrap text-[13px] font-semibold leading-none text-white">
            {{ saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Sauvegarder' }}
          </span>
        </button>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-7 py-[22px] xl:flex-row xl:overflow-hidden">

      <!--
        ─── Colonne principale ────────────────────────────────────────────

        `flex-1` **seulement à partir de `xl`**, et c'est tout le sujet.

        À deux colonnes, la carte occupe la hauteur et sa liste défile à
        l'intérieur : c'est le dessin voulu. En dessous de `xl`, les blocs
        s'empilent et c'est la page qui défile — mais la carte restait un
        enfant flexible dans un conteneur borné, donc elle se faisait
        comprimer. Sur une fenêtre de 1130 px, la liste recevait 153 px pour
        693 px de contenu : deux catégories et demie sur onze, et un tableau
        qui semblait vide.

        `flex-none` ci-dessous : un enfant de flexbox rétrécit par défaut
        (`flex-shrink: 1`), et c'est exactement le piège déjà rencontré sur
        les lignes de `DataTable`.
      -->
      <div class="flex min-w-0 flex-none flex-col overflow-hidden rounded-[14px] border border-line bg-white xl:flex-1">

        <div
          v-if="error"
          class="flex flex-none items-start gap-2.5 border-b border-[#F3C9C9] bg-status-danger-bg px-[18px] py-3.5"
        >
          <AppIcon name="TriangleAlert" :size="16" class="mt-px flex-none text-status-danger" />
          <p class="text-[13px] leading-[1.4] text-status-danger">{{ error }}</p>
        </div>

        <!-- ─── Catégories ────────────────────────────────────────────────── -->
        <template v-if="activeTab === 'categories'">
          <div class="flex flex-none items-start gap-3.5 border-b border-line p-[18px]">
            <div class="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="Tag" :size="19" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-[5px]">
              <div class="flex items-center gap-[9px]">
                <div class="text-base font-semibold leading-[1.2] text-brand-900">Catégories</div>
                <div class="whitespace-nowrap text-xs font-medium leading-none tabular-nums text-muted">
                  {{ categoriesLoading
                    ? 'chargement…'
                    : `${categories.length} catégories · ${activeCount} traitées` }}
                </div>
              </div>
              <p class="max-w-[720px] text-[13px] leading-[1.5] text-muted">
                La liste est nationale : c’est elle que l’IA utilise pour classer les photos, et
                c’est ce qui rend vos chiffres comparables à ceux des autres communes. Vous
                choisissez ce que vous traitez, comment vous le nommez et qui le reçoit.
              </p>
            </div>
            <label class="flex h-[34px] flex-none items-center gap-2 rounded-[10px] border border-line px-3">
              <AppIcon name="Search" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
              <input
                v-model="filter"
                type="search"
                placeholder="Filtrer"
                class="w-[110px] min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
              />
            </label>
          </div>

          <!-- En-tête de colonnes -->
          <div
            class="hidden h-[38px] flex-none items-center gap-3.5 whitespace-nowrap border-b border-line bg-canvas px-[18px] lg:grid"
            style="grid-template-columns: 34px minmax(0,1fr) 92px 200px 96px 24px"
          >
            <div />
            <div class="text-[11px] font-semibold leading-none tracking-[0.06em] text-muted">CATÉGORIE</div>
            <div class="text-[11px] font-semibold leading-none tracking-[0.06em] text-muted">DÉLAI</div>
            <div class="text-[11px] font-semibold leading-none tracking-[0.06em] text-muted">TRANSMISSION</div>
            <div class="text-right text-[11px] font-semibold leading-none tracking-[0.06em] text-muted">ÉTAT</div>
            <div />
          </div>

          <!-- Le défilement interne n'a de sens que quand la carte a une
               hauteur à remplir, c'est-à-dire à partir de `xl`. En dessous,
               la liste se déploie et la page défile. -->
          <div class="min-h-0 xl:flex-1 xl:overflow-y-auto">

            <!-- Lignes fantômes : la forme de la liste, à la bonne hauteur,
                 pour que rien ne saute quand les vraies arrivent. -->
            <template v-if="categoriesLoading">
              <div
                v-for="index in 8"
                :key="`skeleton-${index}`"
                class="grid items-center gap-3.5 border-b border-hairline px-[18px] py-3.5"
                style="grid-template-columns: 34px minmax(0,1fr) 92px 200px 96px 24px"
              >
                <AppSkeleton class="h-[34px] w-[34px] rounded-[10px]" />
                <div class="flex flex-col gap-1.5">
                  <AppSkeleton class="h-3 w-40 rounded" />
                  <AppSkeleton class="h-2.5 w-64 rounded" />
                </div>
                <AppSkeleton class="h-3 w-10 rounded" />
                <AppSkeleton class="h-3 w-28 rounded" />
                <AppSkeleton class="ml-auto h-[22px] w-[38px] rounded-full" />
                <div />
              </div>
            </template>

            <template v-for="category in visibleCategories" v-else :key="category.slug">

              <!-- Ligne dépliée -->
              <div
                v-if="openSlug === category.slug"
                class="flex flex-col gap-4 border-b border-brand-100 bg-brand-50 p-[18px]"
              >
                <div
                  class="grid items-center gap-3.5"
                  style="grid-template-columns: 34px minmax(0,1fr) 96px 24px"
                >
                  <div class="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-white">
                    <AppIcon :name="categoryGlyph(category.slug, category.label)" :size="17" :stroke-width="1.75" class="text-brand-700" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-[15px] font-semibold leading-[1.3] text-ink">{{ category.label }}</div>
                    <div class="truncate text-xs leading-[1.3] text-muted">{{ category.description }}</div>
                  </div>
                  <label class="flex cursor-pointer items-center justify-end gap-2">
                    <span
                      class="whitespace-nowrap text-[11px] font-semibold leading-none"
                      :class="category.is_active ? 'text-status-done-fg' : 'text-faint'"
                    >
                      {{ category.is_active ? 'Traitée' : 'Ignorée' }}
                    </span>
                    <span
                      class="relative flex h-[22px] w-[38px] flex-none items-center rounded-full p-0.5 transition-colors"
                      :class="category.is_active ? 'bg-brand-700' : 'bg-line'"
                    >
                      <input v-model="category.is_active" type="checkbox" class="sr-only" />
                      <span
                        class="h-[18px] w-[18px] rounded-full bg-white transition-transform"
                        :class="category.is_active ? 'translate-x-4' : 'translate-x-0'"
                      />
                    </span>
                  </label>
                  <button class="flex justify-end" @click="openSlug = null">
                    <AppIcon name="ChevronUp" :size="17" :stroke-width="2" class="text-brand-700" />
                  </button>
                </div>

                <div class="grid items-end gap-3.5 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div class="flex flex-col gap-[7px]">
                    <label class="whitespace-nowrap text-xs font-semibold leading-none text-muted">
                      NOM AFFICHÉ AUX HABITANTS
                    </label>
                    <input
                      v-model="category.label"
                      :placeholder="category.description"
                      class="h-[42px] rounded-[10px] border border-brand-100 bg-white px-3.5 text-sm text-ink outline-none focus:border-brand-700"
                    />
                  </div>
                  <div class="flex flex-col gap-[7px]">
                    <label class="whitespace-nowrap text-xs font-semibold leading-none text-muted">
                      DÉLAI INDICATIF
                    </label>
                    <div class="flex h-[42px] items-center justify-between rounded-[10px] border border-brand-100 bg-white px-3.5">
                      <input
                        v-model.number="category.sla_hours"
                        type="number"
                        min="1"
                        class="w-full min-w-0 bg-transparent text-sm tabular-nums text-ink outline-none"
                      />
                      <span class="flex-none text-[13px] font-medium text-muted">heures</span>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-3.5">
                  <div class="flex items-center gap-[9px]">
                    <AppIcon name="Mail" :size="16" :stroke-width="1.75" class="flex-none text-brand-700" />
                    <div class="whitespace-nowrap text-[13px] font-semibold leading-none text-brand-900">
                      Transmission automatique
                    </div>
                    <div
                      v-if="(category.service_emails ?? []).length > 0"
                      class="ml-auto flex flex-none items-center gap-1.5 whitespace-nowrap text-xs font-semibold leading-none text-status-done-fg"
                    >
                      <AppIcon name="CircleCheck" :size="14" :stroke-width="2" />
                      {{ (category.service_emails ?? []).length }}
                      destinataire{{ (category.service_emails ?? []).length > 1 ? 's' : '' }}
                    </div>
                  </div>

                  <div class="grid gap-3.5 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <input
                      v-model="category.service_name"
                      placeholder="Nom du service (ex. Centre technique municipal)"
                      class="h-11 rounded-[10px] border border-brand-100 bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
                    />
                    <div class="flex min-h-[44px] flex-wrap items-center gap-2 rounded-[10px] border border-brand-100 bg-white px-2.5 py-2">
                      <span
                        v-for="email in category.service_emails ?? []"
                        :key="email"
                        class="inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-50 px-2 py-[5px] text-xs font-medium leading-none text-brand-900"
                      >
                        {{ email }}
                        <button :aria-label="`Retirer ${email}`" @click="removeEmail(category, email)">
                          <AppIcon name="X" :size="13" :stroke-width="2" class="text-muted hover:text-ink" />
                        </button>
                      </span>
                      <input
                        v-model="emailDraft[category.slug]"
                        placeholder="Ajouter une adresse…"
                        class="min-w-[160px] flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
                        @keydown.enter.prevent="addEmails(category)"
                        @blur="addEmails(category)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Ligne repliée -->
              <button
                v-else
                class="grid w-full items-center gap-3.5 border-b border-hairline px-[18px] py-3.5 text-left transition-colors hover:bg-canvas"
                style="grid-template-columns: 34px minmax(0,1fr) 92px 200px 96px 24px"
                @click="openSlug = category.slug"
              >
                <div
                  class="flex h-[34px] w-[34px] items-center justify-center rounded-[10px]"
                  :class="category.is_active ? 'bg-brand-50' : 'bg-canvas'"
                >
                  <AppIcon
                    :name="categoryGlyph(category.slug, category.label)"
                    :size="17" :stroke-width="1.75"
                    :class="category.is_active ? 'text-brand-700' : 'text-faint'"
                  />
                </div>

                <div class="min-w-0">
                  <div
                    class="truncate text-sm font-semibold leading-[1.3]"
                    :class="category.is_active ? 'text-ink' : 'text-muted'"
                  >
                    {{ category.label }}
                  </div>
                  <div class="truncate text-xs leading-[1.3] text-faint">{{ category.description }}</div>
                </div>

                <div
                  class="hidden whitespace-nowrap text-[13px] font-medium leading-none tabular-nums lg:block"
                  :class="category.is_active ? 'text-ink' : 'text-faint'"
                >
                  {{ category.sla_hours }} h
                </div>

                <div class="hidden min-w-0 items-center gap-[7px] lg:flex">
                  <AppIcon
                    :name="(category.service_emails ?? []).length > 0 ? 'MailCheck' : 'MailX'"
                    :size="14" :stroke-width="1.75"
                    :class="(category.service_emails ?? []).length > 0 ? 'flex-none text-status-success' : 'flex-none text-line'"
                  />
                  <span
                    class="truncate text-xs font-medium leading-none"
                    :class="(category.service_emails ?? []).length > 0 ? 'text-ink' : 'text-faint'"
                  >
                    {{ category.service_name || ((category.service_emails ?? []).length > 0
                      ? `${(category.service_emails ?? []).length} destinataire(s)`
                      : 'Aucun destinataire') }}
                  </span>
                </div>

                <div class="flex items-center justify-end gap-2">
                  <span
                    class="hidden whitespace-nowrap text-[11px] font-semibold leading-none lg:block"
                    :class="category.is_active ? 'text-status-done-fg' : 'text-faint'"
                  >
                    {{ category.is_active ? 'Traitée' : 'Ignorée' }}
                  </span>
                  <span
                    class="relative flex h-[22px] w-[38px] flex-none items-center rounded-full p-0.5 transition-colors"
                    :class="category.is_active ? 'bg-brand-700' : 'bg-line'"
                    @click.stop="category.is_active = !category.is_active"
                  >
                    <span
                      class="h-[18px] w-[18px] rounded-full bg-white transition-transform"
                      :class="category.is_active ? 'translate-x-4' : 'translate-x-0'"
                    />
                  </span>
                </div>

                <div class="flex justify-end">
                  <AppIcon name="ChevronDown" :size="17" :stroke-width="2" class="text-faint" />
                </div>
              </button>
            </template>

            <!-- Vide : ne peut arriver que si la migration 026 n'a pas été jouée. -->
            <div v-if="!categoriesLoading && categories.length === 0" class="flex flex-col items-center gap-3 px-5 py-12">
              <div class="flex h-12 w-12 items-center justify-center rounded-[14px] bg-canvas">
                <AppIcon name="Tag" :size="22" class="text-faint" />
              </div>
              <p class="text-sm text-muted">Aucune catégorie disponible.</p>
            </div>

            <div
              v-else-if="!categoriesLoading && visibleCategories.length === 0"
              class="flex items-center justify-center px-5 py-12 text-[13px] text-muted"
            >
              Aucune catégorie ne correspond à « {{ filter }} ».
            </div>
          </div>
        </template>

        <!-- ─── Identité ──────────────────────────────────────────────────── -->
        <template v-else-if="activeTab === 'identity'">
          <div class="flex flex-none items-start gap-3.5 border-b border-line p-[18px]">
            <div class="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="Palette" :size="19" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-[5px]">
              <div class="text-base font-semibold leading-[1.2] text-brand-900">Identité visuelle</div>
              <p class="max-w-[720px] text-[13px] leading-[1.5] text-muted">
                La couleur de la commune. Elle teinte l’application mobile et les e-mails envoyés
                aux habitants.
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-[7px] p-[18px]">
            <label class="text-xs font-semibold leading-none text-muted">COULEUR PRINCIPALE</label>
            <div class="flex items-center gap-3">
              <input
                v-model="form.primary_color"
                type="color"
                class="h-11 w-11 cursor-pointer rounded-[10px] border-0 bg-transparent p-0.5"
              />
              <div class="flex h-11 items-center gap-2.5 rounded-[10px] border border-line bg-canvas px-3.5">
                <span class="h-4 w-4 flex-none rounded-full" :style="{ background: form.primary_color }" />
                <span class="text-sm tabular-nums text-ink">{{ form.primary_color }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- ─── Fonctionnalités ───────────────────────────────────────────── -->
        <template v-else>
          <div class="flex flex-none items-start gap-3.5 border-b border-line p-[18px]">
            <div class="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="Sliders" :size="19" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-[5px]">
              <div class="text-base font-semibold leading-[1.2] text-brand-900">Fonctionnalités</div>
              <p class="max-w-[720px] text-[13px] leading-[1.5] text-muted">
                Ce que la commune active. Désactiver une fonctionnalité la retire du back-office
                et de l’application ; rien n’est supprimé.
              </p>
            </div>
          </div>

          <!-- Le défilement interne n'a de sens que quand la carte a une
               hauteur à remplir, c'est-à-dire à partir de `xl`. En dessous,
               la liste se déploie et la page défile. -->
          <div class="min-h-0 xl:flex-1 xl:overflow-y-auto">
            <label
              v-for="feature in FEATURES"
              :key="feature.key"
              class="flex cursor-pointer items-center justify-between gap-4 border-b border-hairline px-[18px] py-3.5 transition-colors hover:bg-canvas"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-brand-50">
                  <AppIcon :name="feature.icon" :size="17" :stroke-width="1.75" class="text-brand-700" />
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold leading-[1.3] text-ink">{{ feature.label }}</div>
                  <div class="truncate text-xs leading-[1.3] text-muted">{{ feature.desc }}</div>
                </div>
              </div>

              <span
                class="relative flex h-[22px] w-[38px] flex-none items-center rounded-full p-0.5 transition-colors"
                :class="(form as any)[feature.key] ? 'bg-brand-700' : 'bg-line'"
              >
                <input v-model="(form as any)[feature.key]" type="checkbox" class="sr-only" />
                <span
                  class="h-[18px] w-[18px] rounded-full bg-white transition-transform"
                  :class="(form as any)[feature.key] ? 'translate-x-4' : 'translate-x-0'"
                />
              </span>
            </label>
          </div>
        </template>
      </div>

      <!-- ─── Colonne de droite ───────────────────────────────────────────── -->
      <div class="flex flex-none flex-col gap-3.5 xl:w-[300px]">

        <div class="flex flex-col gap-3.5 rounded-[14px] bg-brand-900 p-[18px]">
          <div class="flex items-center justify-between">
            <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">
              CE QUE VOIENT LES HABITANTS
            </span>
            <AppIcon name="Smartphone" :size="16" :stroke-width="1.75" class="text-brand-500" />
          </div>
          <p class="text-[13px] leading-[1.55] text-brand-100">
            Seules les catégories traitées apparaissent dans l’application mobile. Les autres
            restent classées par l’IA mais ne sont pas proposées au choix.
          </p>
          <div class="flex flex-wrap gap-[7px]">
            <span
              v-for="category in citizenVisible.slice(0, 3)"
              :key="category.slug"
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-white/10 px-[9px] py-1.5 text-xs font-semibold leading-none text-white"
            >
              <AppIcon :name="categoryGlyph(category.slug, category.label)" :size="13" :stroke-width="1.75" />
              {{ category.label }}
            </span>
            <span
              v-if="citizenVisible.length > 3"
              class="inline-flex items-center rounded-lg bg-white/10 px-[9px] py-1.5 text-xs font-semibold leading-none text-white"
            >
              + {{ citizenVisible.length - 3 }} autres
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white p-[18px]">
          <div class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">RÉCAPITULATIF</div>

          <div class="flex items-center justify-between gap-3">
            <span class="whitespace-nowrap text-[13px] font-medium leading-none text-ink">Catégories traitées</span>
            <span class="whitespace-nowrap text-[13px] font-semibold leading-none tabular-nums text-ink">
              {{ activeCount }} / {{ categories.length }}
            </span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="whitespace-nowrap text-[13px] font-medium leading-none text-ink">Avec destinataire</span>
            <span
              class="whitespace-nowrap text-[13px] font-semibold leading-none tabular-nums"
              :class="withoutRecipient > 0 ? 'text-status-progress-fg' : 'text-status-done-fg'"
            >
              {{ withRecipient }} / {{ activeCount }}
            </span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="whitespace-nowrap text-[13px] font-medium leading-none text-ink">Délai le plus court</span>
            <span class="whitespace-nowrap text-[13px] font-semibold leading-none tabular-nums text-ink">
              {{ shortestSla === null ? '—' : `${shortestSla} h` }}
            </span>
          </div>

          <template v-if="withoutRecipient > 0">
            <div class="h-px bg-line" />
            <div class="flex items-start gap-2.5">
              <AppIcon name="TriangleAlert" :size="16" :stroke-width="1.75" class="mt-px flex-none text-status-progress-fg" />
              <p class="text-xs leading-[1.5] text-muted">
                {{ withoutRecipient }} catégorie{{ withoutRecipient > 1 ? 's' : '' }} traitée{{ withoutRecipient > 1 ? 's' : '' }}
                n’{{ withoutRecipient > 1 ? 'ont' : 'a' }} pas de destinataire : les signalements
                restent en attente dans le back-office sans être transmis.
              </p>
            </div>
          </template>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-3 rounded-[14px] border border-line bg-white p-[18px]">
          <div class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
            DERNIÈRES MODIFICATIONS
          </div>

          <div v-for="(entry, index) in history" :key="entry.id" class="flex gap-2.5">
            <span
              class="mt-[5px] h-[7px] w-[7px] flex-none rounded-full"
              :class="index === 0 ? 'bg-brand-700' : 'bg-line'"
            />
            <div>
              <div class="text-[13px] font-medium leading-[1.4] text-ink">
                {{ HISTORY_LABELS[entry.action] }}
              </div>
              <div class="text-[11px] font-medium leading-[1.4] tabular-nums text-faint">
                {{ formatDate(entry.created_at) }} · {{ formatTime(entry.created_at) }}
              </div>
            </div>
          </div>

          <p v-if="history.length === 0" class="text-[13px] leading-[1.5] text-muted">
            Aucun réglage n’a encore été modifié.
          </p>

          <RouterLink
            to="/admin/audit"
            class="mt-auto flex items-center gap-[7px] whitespace-nowrap text-xs font-semibold leading-none text-brand-700 hover:underline"
          >
            <AppIcon name="ScrollText" :size="15" :stroke-width="1.75" />
            Voir dans les logs d’audit
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
