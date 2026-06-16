<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Logs d'audit</h1>
        <p class="text-gray-600 mt-2">Historique de toutes les actions effectuées sur la plateforme</p>
      </div>

      <!-- Filtres -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Recherche -->
          <div class="lg:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Email, ID, contenu..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @input="debouncedSearch"
            />
          </div>

          <!-- Filtre tenant (super admin uniquement) -->
          <div v-if="isSuperAdmin">
            <label class="block text-sm font-medium text-gray-700 mb-2">Tenant</label>
            <select
              v-model="filters.tenant"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @change="loadLogs"
            >
              <option value="">Tous les tenants</option>
              <option v-for="tenant in tenants" :key="tenant.slug" :value="tenant.slug">
                {{ tenant.name }}
              </option>
            </select>
          </div>

          <!-- Filtre action -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              v-model="filters.action"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @change="loadLogs"
            >
              <option value="">Toutes les actions</option>
              <option v-for="action in actions" :key="action" :value="action">
                {{ formatAction(action) }}
              </option>
            </select>
          </div>

          <!-- Filtre utilisateur -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Utilisateur</label>
            <input
              v-model="filters.user"
              type="text"
              placeholder="Email utilisateur"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @input="debouncedSearch"
            />
          </div>

          <!-- Période -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Date début</label>
            <input
              v-model="filters.startDate"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @change="loadLogs"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
            <input
              v-model="filters.endDate"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @change="loadLogs"
            />
          </div>

          <!-- Bouton reset -->
          <div class="flex items-end">
            <button
              @click="resetFilters"
              class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- Table -->
      <AppTable
        :columns="tableColumns"
        :data="logs"
        row-key="id"
        :loading="loading"
        empty-message="Aucun log d'audit trouvé"
      >
        <!-- Date -->
        <template #cell-created_at="{ row }">
          <span class="text-sm text-gray-900">{{ formatDate(row.created_at) }}</span>
        </template>

        <!-- Utilisateur -->
        <template #cell-user="{ row }">
          <div>
            <div class="text-sm font-medium text-gray-900">{{ row.user_email || 'Anonyme' }}</div>
            <div class="text-sm text-gray-500">{{ row.user_role || '-' }}</div>
          </div>
        </template>

        <!-- Action -->
        <template #cell-action="{ row }">
          <span :class="getActionBadgeClass(row.action)" class="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap inline-block">
            {{ formatAction(row.action) }}
          </span>
        </template>

        <!-- Tenant (super admin uniquement) -->
        <template #cell-tenant_slug="{ row }">
          <span class="text-sm text-gray-900">{{ row.tenant_slug || '-' }}</span>
        </template>

        <!-- Détails -->
        <template #cell-metadata="{ row }">
          <AppTruncate
            :text="formatMetadata(row.metadata)"
            :max-length="35"
          />
        </template>

        <!-- IP -->
        <template #cell-ip_address="{ row }">
          <span class="text-sm text-gray-500">{{ row.ip_address || '-' }}</span>
        </template>

        <!-- Footer avec pagination -->
        <template #footer>
          <div class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div class="text-sm text-gray-700">
              Affichage de {{ (pagination.page - 1) * pagination.limit + 1 }} à 
              {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
              sur {{ pagination.total }} résultats
            </div>
            <div class="flex gap-2">
              <AppButton
                variant="secondary"
                size="sm"
                @click="previousPage"
                :disabled="pagination.page === 1"
              >
                Précédent
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                @click="nextPage"
                :disabled="pagination.page >= pagination.totalPages"
              >
                Suivant
              </AppButton>
            </div>
          </div>
        </template>
      </AppTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useApi } from '@/composables/useApi'
import AppTable from '@/components/AppTable.vue'
import AppButton from '@/components/AppButton.vue'
import AppTruncate from '@/components/AppTruncate.vue'

const { apiFetch } = useApi()

const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.isSuperAdmin)

// Colonnes du tableau
const tableColumns = computed(() => {
  const columns: Array<{
    key: string
    label: string
    align?: 'left' | 'center' | 'right'
    width?: string
  }> = [
    { key: 'created_at', label: 'Date', align: 'left' as const, width: '140px' },
    { key: 'user', label: 'Utilisateur', align: 'left' as const, width: '220px' },
    { key: 'action', label: 'Action', align: 'left' as const, width: '180px' },
  ]
  
  if (isSuperAdmin.value) {
    columns.push({ key: 'tenant_slug', label: 'Tenant', align: 'left' as const, width: '120px' })
  }
  
  columns.push(
    { key: 'ip_address', label: 'IP', align: 'left' as const, width: '130px' },
    { key: 'metadata', label: 'Détails', align: 'left' as const },
  )
  
  return columns
})

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

interface Tenant {
  slug: string
  name: string
}

const logs = ref<AuditLog[]>([])
const tenants = ref<Tenant[]>([])
const actions = ref<string[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const filters = ref({
  search: '',
  tenant: '',
  user: '',
  action: '',
  startDate: '',
  endDate: '',
})

const pagination = ref({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0,
})

let debounceTimer: number | null = null

const debouncedSearch = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    pagination.value.page = 1
    loadLogs()
  }, 500)
}

const loadLogs = async () => {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams({
      page: pagination.value.page.toString(),
      limit: pagination.value.limit.toString(),
    })

    if (filters.value.search) params.append('search', filters.value.search)
    if (filters.value.tenant) params.append('tenant', filters.value.tenant)
    if (filters.value.user) params.append('user', filters.value.user)
    if (filters.value.action) params.append('action', filters.value.action)
    if (filters.value.startDate) params.append('startDate', filters.value.startDate)
    if (filters.value.endDate) params.append('endDate', filters.value.endDate)

    const data = await apiFetch(`/api/audit/logs?${params}`)
    logs.value = data.data
    pagination.value = data.pagination
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const loadTenants = async () => {
  if (!isSuperAdmin.value) return

  try {
    const data = await apiFetch('/api/audit/tenants')
    tenants.value = data.tenants
  } catch (err) {
    console.error('Erreur chargement tenants:', err)
  }
}

const loadActions = async () => {
  try {
    const data = await apiFetch('/api/audit/actions')
    actions.value = data.actions
  } catch (err) {
    console.error('Erreur chargement actions:', err)
  }
}

const resetFilters = () => {
  filters.value = {
    search: '',
    tenant: '',
    user: '',
    action: '',
    startDate: '',
    endDate: '',
  }
  pagination.value.page = 1
  loadLogs()
}

const previousPage = () => {
  if (pagination.value.page > 1) {
    pagination.value.page--
    loadLogs()
  }
}

const nextPage = () => {
  if (pagination.value.page < pagination.value.totalPages) {
    pagination.value.page++
    loadLogs()
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatAction = (action: string) => {
  const labels: Record<string, string> = {
    'user.created': 'Compte créé',
    'user.invited': 'Utilisateur invité',
    'report.status_changed': 'Statut modifié',
    'report.deleted': 'Signalement supprimé',
    'report.created': 'Signalement créé',
    'report.bulk_deleted': 'Suppression multiple',
    'report.service_notified': 'Service notifié',
    'tenant.created': 'Tenant créé',
    'tenant.status_changed': 'Statut tenant modifié',
    'tenant_config.updated': 'Config modifiée',
    'tenant_categories.updated': 'Catégories modifiées',
  }
  return labels[action] || action
}

const getActionBadgeClass = (action: string) => {
  if (action.includes('deleted')) return 'bg-red-100 text-red-800'
  if (action.includes('created')) return 'bg-green-100 text-green-800'
  if (action.includes('updated') || action.includes('changed')) return 'bg-blue-100 text-blue-800'
  if (action.includes('invited')) return 'bg-purple-100 text-purple-800'
  if (action.includes('service_notified')) return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-gray-800'
}

const formatMetadata = (metadata: Record<string, any>) => {
  if (!metadata || Object.keys(metadata).length === 0) return '-'
  return  JSON.stringify(metadata).replace(/,/g, ', ')
}

onMounted(() => {
  loadLogs()
  loadTenants()
  loadActions()
})
</script>
