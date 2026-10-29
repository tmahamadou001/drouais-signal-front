<script setup lang="ts">
/**
 * Le parc : toutes les collectivités de la plateforme.
 *
 * Écran de super-administration, et le dernier écrit en palette Tailwind brute
 * — `bg-green-100`, `text-primary`, `border-neutral-200` — avec son formulaire
 * en accordéon, son bandeau d'erreur en ligne et ses statuts affichés en clair
 * dans la langue de la base : la colonne disait `trial`, `suspended`.
 *
 * Deux choses changent au-delà des jetons :
 *
 *  - **le formulaire passe en modale.** Il s'ouvrait au-dessus du tableau et
 *    repoussait vers le bas la liste dans laquelle on vérifie justement que la
 *    commune n'existe pas déjà ;
 *  - **suspendre demande confirmation.** C'est le seul geste de cet écran qui
 *    coupe l'accès d'une mairie entière, et il se faisait par une liste
 *    déroulante — un pixel de trop et le contrat d'un client changeait d'état.
 */
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import DataTable, { type DataColumn } from '@/components/DataTable.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import PlatformStatsCards from '@/pages/admin/platform/PlatformStatsCards.vue'
import CreateTenantDialog, { type NewTenant } from '@/pages/admin/platform/CreateTenantDialog.vue'
import { tenantStatusInfo, planLabel, ASSIGNABLE_TENANT_STATUSES } from '@/lib/tenantStatus'

interface PlatformTenant {
  id: string
  slug: string
  name: string
  status: string
  plan: string
  reports_count?: { count: number }[]
}

const { apiFetch, invalidateCachePattern } = useApi()
const toast = useToast()

const tenants = ref<PlatformTenant[]>([])
const loading = ref(true)
const creating = ref(false)
const createOpen = ref(false)

/** La suspension en attente de confirmation. */
const suspending = ref<PlatformTenant | null>(null)

const COLUMNS: DataColumn[] = [
  { key: 'name',          label: 'COLLECTIVITÉ' },
  { key: 'status',        label: 'STATUT',       width: '150px' },
  { key: 'plan',          label: 'PLAN',         width: '120px' },
  { key: 'reports_count', label: 'SIGNALEMENTS', width: '130px' },
  { key: 'actions',       label: 'STATUT',       width: '160px', align: 'right' },
]

const stats = computed(() => ({
  active: tenants.value.filter((one) => one.status === 'active').length,
  trial: tenants.value.filter((one) => one.status === 'trial').length,
  demo: tenants.value.filter((one) => one.status === 'demo').length,
  suspended: tenants.value.filter((one) => one.status === 'suspended').length,
  total: tenants.value.length,
}))

const takenSlugs = computed(() => tenants.value.map((one) => one.slug))

function reason(err: unknown, fallback: string): string {
  const message = (err as { message?: string })?.message
  return message && message !== 'Failed to fetch' ? message : fallback
}

async function load() {
  loading.value = true
  try {
    tenants.value = await apiFetch<PlatformTenant[]>('/api/tenant/all', {
      cache: { maxAge: 600_000 },
    })
  } catch (err) {
    toast.error('Parc indisponible', reason(err, 'Rechargez la page dans un instant.'))
  } finally {
    loading.value = false
  }
}

function refresh() {
  invalidateCachePattern(/^\/api\/tenant\/all/)
  return load()
}

async function setStatus(tenant: PlatformTenant, status: string) {
  if (status === tenant.status) return

  // Suspendre coupe l'accès d'une mairie entière : on le demande deux fois.
  if (status === 'suspended') {
    suspending.value = tenant
    return
  }

  await applyStatus(tenant, status)
}

async function applyStatus(tenant: PlatformTenant, status: string) {
  try {
    await apiFetch(`/api/tenant/${tenant.id}/status`, { method: 'PATCH', body: { status } })
    await refresh()
    toast.success(`${tenant.name} · ${tenantStatusInfo(status).label}`)
  } catch (err) {
    toast.error('Changement de statut impossible', reason(err, 'Réessayez dans un instant.'))
    // La liste garde l'ancienne valeur : la recharger remet le sélecteur droit.
    await refresh()
  }
}

async function confirmSuspend() {
  if (!suspending.value) return
  const tenant = suspending.value
  suspending.value = null
  await applyStatus(tenant, 'suspended')
}

async function createTenant(tenant: NewTenant) {
  creating.value = true
  try {
    await apiFetch('/api/tenant', { method: 'POST', body: tenant })
    await refresh()
    toast.success(`${tenant.name} créée`, `${tenant.slug}.onsignale.fr`)
    createOpen.value = false
  } catch (err) {
    toast.error('Création impossible', reason(err, 'Vérifiez les champs saisis.'))
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">
    <AdminPageHeader>
      <template #actions>
        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 transition-colors hover:bg-brand-800"
          @click="createOpen = true"
        >
          <AppIcon name="Plus" :size="16" :stroke-width="2" class="text-white" />
          <span class="text-[13px] font-semibold leading-none text-white">Nouvelle collectivité</span>
        </button>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-hidden px-7 py-[22px]">
      <PlatformStatsCards :stats="stats" />

      <DataTable
        :columns="COLUMNS"
        :rows="tenants"
        row-key="id"
        :loading="loading"
        :skeleton-rows="8"
        :total="tenants.length"
        :visible-count="tenants.length"
        item-label="collectivités"
        empty-icon="Globe"
        empty-message="Aucune collectivité sur la plateforme."
      >
        <template #cell-name="{ row }">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold leading-[1.3] text-ink">{{ row.name }}</div>
            <div class="truncate text-xs leading-[1.3] text-muted">{{ row.slug }}.onsignale.fr</div>
          </div>
        </template>

        <template #cell-status="{ row }">
          <span
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-[5px] text-xs font-semibold leading-none"
            :class="tenantStatusInfo(row.status).classes"
          >
            <AppIcon :name="tenantStatusInfo(row.status).icon" :size="13" :stroke-width="2" />
            {{ tenantStatusInfo(row.status).label }}
          </span>
        </template>

        <template #cell-plan="{ row }">
          <span class="truncate text-[13px] font-medium leading-none text-muted">
            {{ planLabel(row.plan) }}
          </span>
        </template>

        <template #cell-reports_count="{ row }">
          <span class="text-[13px] font-semibold leading-none tabular-nums text-ink">
            {{ row.reports_count?.[0]?.count ?? 0 }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <select
            :value="row.status"
            class="h-[30px] rounded-lg border border-line bg-white px-2 text-xs font-medium text-ink outline-none focus:border-brand-700"
            @change="setStatus(row, ($event.target as HTMLSelectElement).value)"
            @click.stop
          >
            <option v-for="status in ASSIGNABLE_TENANT_STATUSES" :key="status" :value="status">
              {{ tenantStatusInfo(status).label }}
            </option>
          </select>
        </template>
      </DataTable>
    </div>

    <CreateTenantDialog
      :open="createOpen"
      :creating="creating"
      :taken-slugs="takenSlugs"
      @close="createOpen = false"
      @submit="createTenant"
    />

    <AppModal
      :open="suspending !== null"
      title="Suspendre cette collectivité"
      :description="`${suspending?.name ?? 'Cette commune'} perdra l’accès au back-office, et ses habitants ne pourront plus déposer de signalement. Les données sont conservées.`"
      confirm-text="Suspendre"
      cancel-text="Annuler"
      confirm-variant="danger"
      @confirm="confirmSuspend"
      @cancel="suspending = null; void refresh()"
      @close="suspending = null; void refresh()"
    />
  </div>
</template>
