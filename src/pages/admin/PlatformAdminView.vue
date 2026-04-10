<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'

const { apiFetch } = useApi()

const tenants = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const showCreateForm = ref(false)
const creating = ref(false)

const newTenant = ref({
  slug: '',
  name: '',
  cityName: '',
  contactEmail: '',
  plan: 'starter',
  primaryColor: '#1A56A0',
})

const stats = computed(() => ({
  active: tenants.value.filter((t) => t.status === 'active').length,
  trial: tenants.value.filter((t) => t.status === 'trial').length,
  demo: tenants.value.filter((t) => t.status === 'demo').length,
  suspended: tenants.value.filter((t) => t.status === 'suspended').length,
  total: tenants.value.length,
}))

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  demo: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
}

const loadTenants = async () => {
  loading.value = true
  error.value = null
  try {
    tenants.value = await apiFetch('/api/tenant/all',
      {
        cache: { maxAge: 600_000 } // Cache 10 minutes
      }
    )
  } catch (err: any) {
    error.value = err.message ?? 'Erreur chargement'
  } finally {
    loading.value = false
  }
}

const updateStatus = async (tenantId: string, status: string) => {
  try {
    await apiFetch(`/api/tenant/${tenantId}/status`, {
      method: 'PATCH',
      body: { status },
    })
    await loadTenants()
  } catch (err: any) {
    error.value = err.message
  }
}

const createTenant = async () => {
  if (!newTenant.value.slug || !newTenant.value.name || !newTenant.value.cityName) return
  creating.value = true
  try {
    await apiFetch('/api/tenant', {
      method: 'POST',
      body: newTenant.value,
    })
    showCreateForm.value = false
    newTenant.value = { slug: '', name: '', cityName: '', contactEmail: '', plan: 'starter', primaryColor: '#1A56A0' }
    await loadTenants()
  } catch (err: any) {
    error.value = err.message
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  loadTenants()
})
</script>

<template>
  <div class="p-4 md:p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-display font-bold text-gray-900">Plateforme</h1>
        <p class="text-sm text-gray-500 mt-1">Super Admin — gestion de tous les tenants</p>
      </div>
      <button
        @click="showCreateForm = !showCreateForm"
        class="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
      >
        <span class="text-lg leading-none">+</span>
        Nouvelle ville
      </button>
    </div>

    <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Formulaire création -->
    <div
      v-if="showCreateForm"
      class="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4"
    >
      <h2 class="font-semibold text-gray-800">Créer un nouveau tenant</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Slug (unique)</label>
          <input
            v-model="newTenant.slug"
            placeholder="ex: la-loupe"
            class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Nom de la ville</label>
          <input
            v-model="newTenant.name"
            placeholder="ex: Ville de La Loupe"
            class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Nom de la commune</label>
          <input
            v-model="newTenant.cityName"
            placeholder="ex: La Loupe"
            class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Email contact</label>
          <input
            v-model="newTenant.contactEmail"
            type="email"
            placeholder="contact@ville.fr"
            class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Plan</label>
          <select
            v-model="newTenant.plan"
            class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none"
          >
            <option value="starter">Starter</option>
            <option value="agglo">Agglo</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Couleur primaire</label>
          <div class="flex items-center gap-2">
            <input
              v-model="newTenant.primaryColor"
              type="color"
              class="h-9 w-14 rounded-lg cursor-pointer border border-gray-200"
            />
            <span class="text-xs text-gray-500 font-mono">{{ newTenant.primaryColor }}</span>
          </div>
        </div>
      </div>
      <div class="flex gap-3">
        <button
          @click="createTenant"
          :disabled="creating || !newTenant.slug || !newTenant.name || !newTenant.cityName"
          class="px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 text-sm"
        >
          {{ creating ? 'Création...' : 'Créer' }}
        </button>
        <button
          @click="showCreateForm = false"
          class="px-6 py-2.5 border border-neutral-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 text-sm"
        >
          Annuler
        </button>
      </div>
    </div>

    <!-- Stats globales -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div
        v-for="stat in [
          { label: 'Actifs', value: stats.active, color: 'text-green-600' },
          { label: 'Trial', value: stats.trial, color: 'text-yellow-600' },
          { label: 'Suspendus', value: stats.suspended, color: 'text-red-600' },
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
        ]"
        :key="stat.label"
        class="bg-white rounded-2xl border border-neutral-200 p-4"
      >
        <p class="text-xs text-gray-500">{{ stat.label }}</p>
        <p class="text-3xl font-bold mt-1" :class="stat.color">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Table tenants -->
    <div class="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Chargement...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th class="text-left px-4 py-3 font-semibold text-neutral-600">Ville</th>
            <th class="text-left px-4 py-3 font-semibold text-neutral-600 hidden sm:table-cell">Statut</th>
            <th class="text-left px-4 py-3 font-semibold text-neutral-600 hidden md:table-cell">Plan</th>
            <th class="text-center px-4 py-3 font-semibold text-neutral-600 hidden lg:table-cell">Signalements</th>
            <th class="text-right px-4 py-3 font-semibold text-neutral-600">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tenant in tenants"
            :key="tenant.id"
            class="border-b border-neutral-100 hover:bg-neutral-50"
          >
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{{ tenant.name }}</p>
              <p class="text-xs text-gray-400">{{ tenant.slug }}.onsignale.fr</p>
            </td>
            <td class="px-4 py-3 hidden sm:table-cell">
              <span
                class="px-2.5 py-1 rounded-full text-xs font-medium"
                :class="statusColors[tenant.status] ?? 'bg-gray-100 text-gray-600'"
              >
                {{ tenant.status }}
              </span>
            </td>
            <td class="px-4 py-3 hidden md:table-cell text-gray-500">{{ tenant.plan }}</td>
            <td class="px-4 py-3 hidden lg:table-cell text-center text-gray-500">
              {{ tenant.reports_count?.[0]?.count ?? 0 }}
            </td>
            <td class="px-4 py-3 text-right">
              <select
                :value="tenant.status"
                @change="updateStatus(tenant.id, ($event.target as HTMLSelectElement).value)"
                class="text-xs border border-neutral-200 rounded-lg px-2 py-1 bg-white"
              >
                <option value="trial">Trial</option>
                <option value="active">Actif</option>
                <option value="demo">Démo</option>
                <option value="suspended">Suspendu</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
