<script setup lang="ts">
/**
 * Les logs d'audit, repris de l'export Claude Design (planche « Logs d'audit »).
 *
 * Deux changements de fond par rapport à la version précédente :
 *
 *  - **les filtres tiennent sur une ligne.** Ils occupaient un bloc de six
 *    champs étiquetés qui poussait la table sous la ligne de flottaison ; or on
 *    vient ici pour lire des lignes, pas pour remplir un formulaire ;
 *  - **chaque action porte son dessin et sa couleur.** « Signalement supprimé »
 *    et « Signalement créé » se distinguent d'un coup d'œil dans une colonne
 *    qui, sinon, est un mur de texte gris.
 *
 * Les quatre compteurs viennent de `GET /api/audit/stats`, qui n'est pas filtré
 * par commune : cet écran est réservé au super administrateur, et ces chiffres
 * portent sur la plateforme entière. L'en-tête de la carte le dit.
 */
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useApi } from '@/composables/useApi'
import DataTable, { type DataColumn } from '@/components/DataTable.vue'
import { PAGE_SIZE } from '@/composables/usePageSize'
import AppIcon from '@/components/AppIcon.vue'
import { describeMetadata } from '@/lib/auditMetadata'
import { auditActionInfo } from '@/lib/auditActions'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import FilterSelect from '@/components/admin/FilterSelect.vue'

const { apiFetch } = useApi()
const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.isSuperAdmin)

interface AuditLog {
  id: string
  user_email: string | null
  user_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  tenant_slug: string | null
  created_at: string
  metadata: Record<string, any>
  ip_address: string | null
  user_agent: string | null
}

interface AuditStats {
  totalLogs: number
  actionStats: Record<string, number>
  period: string
}

const logs = ref<AuditLog[]>([])
const tenants = ref<{ slug: string; name: string }[]>([])
const actions = ref<string[]>([])
const stats = ref<AuditStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const search = ref('')
const filterTenant = ref<string | number>('')
const filterAction = ref<string | number>('')
const filterUser = ref('')
const startDate = ref('')
const endDate = ref('')

const pagination = ref({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })

// ─── Vocabulaire des actions ─────────────────────────────────────────────────

const actionOptions = computed(() => [
  { value: '', label: 'Toutes les actions' },
  ...actions.value.map((action) => ({ value: action, label: auditActionInfo(action).label })),
])

const tenantOptions = computed(() => [
  { value: '', label: 'Tous les tenants' },
  ...tenants.value.map((tenant) => ({ value: tenant.slug, label: tenant.name })),
])

// ─── Compteurs ───────────────────────────────────────────────────────────────

const countOf = (...keys: string[]) =>
  keys.reduce((sum, key) => sum + (stats.value?.actionStats[key] ?? 0), 0)

const summary = computed(() => [
  { key: 'total',    label: 'entrées sur la période',  value: stats.value?.totalLogs ?? 0,                            icon: 'List',      tint: 'bg-brand-50 text-brand-700' },
  { key: 'created',  label: 'signalements créés',      value: countOf('report.created'),                              icon: 'Plus',      tint: 'bg-status-done-bg text-status-done-fg' },
  { key: 'status',   label: 'changements de statut',   value: countOf('report.status_changed'),                       icon: 'RefreshCw', tint: 'bg-status-progress-bg text-status-progress-fg' },
  { key: 'deleted',  label: 'suppressions',            value: countOf('report.deleted', 'report.bulk_deleted'),       icon: 'Trash2',    tint: 'bg-status-danger-bg text-[#B42222]' },
])

// ─── Chargement ──────────────────────────────────────────────────────────────

let debounceTimer: number | null = null

function debouncedSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    pagination.value.page = 1
    void loadLogs()
  }, 500)
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

async function loadLogs() {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams({
      page: String(pagination.value.page),
      limit: String(pagination.value.limit),
    })

    if (search.value) params.append('search', search.value)
    if (filterTenant.value) params.append('tenant', String(filterTenant.value))
    if (filterUser.value) params.append('user', filterUser.value)
    if (filterAction.value) params.append('action', String(filterAction.value))
    if (startDate.value) params.append('startDate', startDate.value)
    if (endDate.value) params.append('endDate', endDate.value)

    const data = await apiFetch<{ data: AuditLog[]; pagination: typeof pagination.value }>(
      `/api/audit/logs?${params}`
    )
    logs.value = data.data
    pagination.value = data.pagination
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  if (!isSuperAdmin.value) return
  try {
    stats.value = await apiFetch<AuditStats>('/api/audit/stats')
  } catch {
    stats.value = null
  }
}

async function loadTenants() {
  if (!isSuperAdmin.value) return
  try {
    const data = await apiFetch<{ tenants: { slug: string; name: string }[] }>('/api/audit/tenants')
    tenants.value = data.tenants
  } catch (err) {
    console.error('Erreur chargement tenants:', err)
  }
}

async function loadActions() {
  try {
    const data = await apiFetch<{ actions: string[] }>('/api/audit/actions')
    actions.value = data.actions
  } catch (err) {
    console.error('Erreur chargement actions:', err)
  }
}

function applyFilters() {
  pagination.value.page = 1
  void loadLogs()
}

const hasFilters = computed(() =>
  Boolean(search.value || filterTenant.value || filterAction.value || filterUser.value || startDate.value || endDate.value)
)

function resetFilters() {
  search.value = ''
  filterTenant.value = ''
  filterAction.value = ''
  filterUser.value = ''
  startDate.value = ''
  endDate.value = ''
  applyFilters()
}

function goToPage(page: number) {
  if (page < 1 || page > pagination.value.totalPages) return
  pagination.value.page = page
  void loadLogs()
}

onMounted(() => {
  void loadLogs()
  void loadStats()
  void loadTenants()
  void loadActions()
})

// ─── Mise en forme ───────────────────────────────────────────────────────────

/** La date sur deux lignes : le jour se compare, l'heure se lit ensuite. */
function dateParts(value: string): { day: string; time: string } {
  const date = new Date(value)
  return {
    day: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }
}

/**
 * La ligne dépliée, s'il y en a une.
 *
 * Une seule à la fois : ouvrir un détail referme le précédent. Un tableau où
 * plusieurs lignes s'étendent devient impossible à parcourir, et on vient ici
 * pour comparer des entrées, pas pour les empiler.
 */
const expandedId = ref<string | null>(null)

function toggle(log: AuditLog) {
  expandedId.value = expandedId.value === log.id ? null : log.id
}

/** Le détail complet d'une entrée : tout ce que la ligne ne peut pas montrer. */
function fullDetail(log: AuditLog) {
  const fields = describeMetadata(log.metadata)

  return [
    ...fields,
    { key: 'entity', label: 'Objet', value: `${log.entity_type}${log.entity_id ? ` · ${log.entity_id}` : ''}`, primary: false },
    { key: 'ip', label: 'Adresse IP', value: log.ip_address || '—', primary: false },
    { key: 'agent', label: 'Navigateur', value: log.user_agent || '—', primary: false },
  ]
}

/**
 * Les cinq premières colonnes sont dimensionnées au plus juste pour laisser
 * `DÉTAILS` respirer : c'est elle qui porte les pastilles de métadonnées, et
 * c'est la seule dont le contenu varie d'une action à l'autre. Les autres
 * affichent des formats connus — une date, une adresse e-mail, un libellé
 * d'action, un slug, une adresse IP — qu'on peut mesurer une fois pour toutes.
 */
const COLUMNS = computed<DataColumn[]>(() => [
  { key: 'created_at', label: 'DATE',        width: '120px' },
  { key: 'user',       label: 'UTILISATEUR', width: '216px' },
  { key: 'action',     label: 'ACTION',      width: '172px' },
  ...(isSuperAdmin.value ? [{ key: 'tenant_slug', label: 'COMMUNE', width: '96px' }] : []),
  { key: 'ip_address', label: 'IP',          width: '88px' },
  { key: 'metadata',   label: 'DÉTAILS' },
])
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">

    <AdminPageHeader>
      <template #actions>
        <div class="flex h-8 flex-none items-center gap-[7px] rounded-[10px] bg-brand-50 px-[11px]">
          <AppIcon name="ShieldCheck" :size="15" :stroke-width="1.75" class="text-brand-700" />
          <span class="whitespace-nowrap text-xs font-semibold leading-none text-brand-700">
            Accès restreint
          </span>
        </div>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-7 py-[22px]">

      <!-- Filtres -->
      <div class="flex flex-none flex-wrap items-center gap-2.5">
        <label class="flex h-[38px] w-full max-w-[380px] flex-1 items-center gap-[9px] rounded-[10px] border border-line bg-white px-3">
          <AppIcon name="Search" :size="16" :stroke-width="1.75" class="flex-none text-muted" />
          <input
            v-model="search"
            type="search"
            placeholder="E-mail, identifiant, contenu…"
            class="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
            @input="debouncedSearch"
          />
        </label>

        <FilterSelect
          v-if="isSuperAdmin"
          v-model="filterTenant"
          :options="tenantOptions"
          icon="Building2"
          menu-width="200px"
          @update:model-value="applyFilters"
        />

        <FilterSelect
          v-model="filterAction"
          :options="actionOptions"
          icon="Activity"
          menu-width="220px"
          @update:model-value="applyFilters"
        />

        <label class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] border border-line bg-white px-3">
          <AppIcon name="User" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
          <input
            v-model="filterUser"
            type="search"
            placeholder="Tous les utilisateurs"
            class="w-[150px] min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
            @input="debouncedSearch"
          />
        </label>

        <label class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] border border-line bg-white px-3">
          <AppIcon name="Calendar" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
          <input
            v-model="startDate"
            type="date"
            class="bg-transparent text-[13px] tabular-nums text-ink outline-none"
            @change="applyFilters"
          />
          <span class="text-[13px] text-faint">–</span>
          <input
            v-model="endDate"
            type="date"
            class="bg-transparent text-[13px] tabular-nums text-ink outline-none"
            @change="applyFilters"
          />
        </label>

        <button
          v-if="hasFilters"
          class="ml-auto flex flex-none items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold leading-none text-brand-700 hover:underline"
          @click="resetFilters"
        >
          <AppIcon name="RotateCcw" :size="15" :stroke-width="2" />
          Réinitialiser
        </button>
      </div>

      <!-- Compteurs de la plateforme -->
      <div v-if="stats" class="grid flex-none grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div
          v-for="card in summary"
          :key="card.key"
          class="flex items-center gap-3 rounded-[14px] border border-line bg-white px-4 py-3.5"
        >
          <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" :class="card.tint">
            <AppIcon :name="card.icon" :size="18" :stroke-width="1.75" />
          </div>
          <div class="min-w-0">
            <div class="text-xl font-bold leading-[1.1] tabular-nums text-ink">
              {{ card.value.toLocaleString('fr-FR') }}
            </div>
            <div class="truncate text-xs font-medium leading-[1.3] text-muted">
              {{ card.label }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        class="flex-none rounded-[14px] border border-[#F3C9C9] bg-status-danger-bg px-[18px] py-4 text-sm text-status-danger"
      >
        {{ error }}
      </div>

      <DataTable
        :columns="COLUMNS"
        :rows="logs"
        row-key="id"
        :loading="loading"
        :skeleton-rows="PAGE_SIZE"
        empty-icon="ScrollText"
        empty-message="Aucune entrée ne correspond à ces filtres."
        :page="pagination.page"
        :page-size="pagination.limit"
        :total="pagination.total"
        item-label="entrées"
        :expanded-key="expandedId"
        @page-change="goToPage"
        @row-click="toggle"
      >
        <template #cell-created_at="{ row }">
          <div class="flex flex-col gap-[3px]">
            <span class="whitespace-nowrap text-[13px] font-semibold leading-none tabular-nums text-ink">
              {{ dateParts(row.created_at).day }}
            </span>
            <span class="whitespace-nowrap text-[11px] font-medium leading-none tabular-nums text-muted">
              {{ dateParts(row.created_at).time }}
            </span>
          </div>
        </template>

        <template #cell-user="{ row }">
          <div class="min-w-0">
            <div class="truncate text-[13px] font-semibold leading-[1.3] text-ink">
              {{ row.user_email || 'Anonyme' }}
            </div>
            <div class="truncate text-[11px] font-medium leading-[1.3] text-muted">
              {{ row.user_role || '—' }}
            </div>
          </div>
        </template>

        <template #cell-action="{ row }">
          <span
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-[5px] text-xs font-semibold leading-none"
            :class="auditActionInfo(row.action).classes"
          >
            <AppIcon :name="auditActionInfo(row.action).icon" :size="13" :stroke-width="2" />
            {{ auditActionInfo(row.action).label }}
          </span>
        </template>

        <template #cell-tenant_slug="{ row }">
          <span class="truncate text-[13px] font-medium leading-none text-ink">
            {{ row.tenant_slug || '—' }}
          </span>
        </template>

        <template #cell-ip_address="{ row }">
          <span class="truncate text-xs font-medium leading-none tabular-nums text-muted">
            {{ row.ip_address || '—' }}
          </span>
        </template>

        <!-- Les métadonnées en paires étiquetées : « Nouveau statut · Résolu »
             plutôt que `{"new_status":"resolu"}` tronqué à soixante caractères. -->
        <template #cell-metadata="{ row }">
          <div class="flex min-w-0 items-center gap-1.5">
            <span
              v-for="field in describeMetadata(row.metadata).slice(0, 2)"
              :key="field.key"
              class="flex min-w-0 items-baseline gap-1 whitespace-nowrap rounded-md bg-canvas px-2 py-1 text-[11px] leading-none"
            >
              <span class="flex-none font-medium text-faint">{{ field.label }}</span>
              <span class="truncate font-semibold text-ink">{{ field.value }}</span>
            </span>

            <span
              v-if="describeMetadata(row.metadata).length > 2"
              class="flex-none whitespace-nowrap text-[11px] font-medium leading-none text-faint"
            >
              +{{ describeMetadata(row.metadata).length - 2 }}
            </span>

            <span
              v-if="describeMetadata(row.metadata).length === 0"
              class="text-xs text-faint"
            >
              —
            </span>

            <AppIcon
              :name="expandedId === row.id ? 'ChevronDown' : 'ChevronRight'"
              :size="16" :stroke-width="1.75"
              class="ml-auto flex-none text-faint"
            />
          </div>
        </template>

        <!-- Le détail complet, sous la ligne : tout ce qui a été enregistré,
             sans rogner les colonnes pour toutes les autres entrées. -->
        <template #row-detail="{ row }">
          <div class="grid gap-x-8 gap-y-3 border-b border-hairline bg-canvas px-[18px] py-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="field in fullDetail(row)" :key="field.key" class="flex min-w-0 flex-col gap-1">
              <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.06em] text-muted">
                {{ field.label.toUpperCase() }}
              </span>
              <span class="break-words text-[13px] leading-[1.4] text-ink">{{ field.value }}</span>
            </div>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>
