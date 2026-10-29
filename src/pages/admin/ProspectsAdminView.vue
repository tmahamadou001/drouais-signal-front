<script setup lang="ts">
/**
 * Les communes prospects — le pipeline commercial.
 *
 * Des habitants y signalent déjà, sans que leur mairie ait accès à OnSignale.
 * Leurs signalements sont collectés mais jamais publiés : afficher publiquement
 * l'inventaire des dégradations d'une commune qui n'a rien demandé fermerait le
 * marché qu'on cherche à ouvrir.
 *
 * Ce que cet écran remplace, c'est cette publication. Deux chiffres par commune
 * — combien de ses administrés ont signalé, combien attendent qu'elle rejoigne
 * la plateforme — et c'est avec eux qu'on va voir le maire.
 */
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import AppIcon from '@/components/AppIcon.vue'
import DataTable, { type DataColumn } from '@/components/DataTable.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'

interface Prospect {
  id: string
  slug: string
  name: string
  created_at: string
  insee_codes: string[]
  report_count: number
  waitlist_count: number
}

const { apiFetch } = useApi()

const COLUMNS: DataColumn[] = [
  { key: 'name',            label: 'COMMUNE' },
  { key: 'insee_codes',     label: 'CODE INSEE',          width: '150px' },
  { key: 'report_count',    label: 'SIGNALEMENTS',        width: '130px' },
  { key: 'waitlist_count',  label: 'EN ATTENTE',          width: '120px' },
  { key: 'created_at',      label: 'PREMIER SIGNALEMENT', width: '170px' },
]

const prospects = ref<Prospect[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const totals = computed(() => ({
  communes: prospects.value.length,
  reports: prospects.value.reduce((sum, p) => sum + p.report_count, 0),
  waitlist: prospects.value.reduce((sum, p) => sum + p.waitlist_count, 0),
}))

const loadProspects = async () => {
  loading.value = true
  error.value = null
  try {
    prospects.value = await apiFetch('/api/tenant/prospects', {
      cache: { maxAge: 300_000 },
    })
  } catch (err: any) {
    error.value = err.message ?? 'Chargement impossible'
  } finally {
    loading.value = false
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(loadProspects)
</script>

<template>
  <!-- Même gabarit que les signalements : en-tête commun, puis le contenu en
       pleine largeur. Une colonne centrée laissait la table étranglée au milieu
       d'un écran de bureau, et le back-office changeait de largeur d'un onglet
       à l'autre. -->
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">
    <AdminPageHeader />

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-hidden px-7 py-[22px]">
    <p class="max-w-3xl flex-none text-[13px] leading-[1.5] text-muted">
      Des habitants y signalent déjà, sans que leur mairie ait accès à la plateforme. Leurs
      signalements sont enregistrés mais ne sont publiés nulle part.
    </p>

    <!-- Les trois chiffres qui servent d'argumentaire.
         Même gabarit que les compteurs des autres écrans : chacun porte sa
         mention de contexte, et « habitants en attente » est mis en avant —
         c'est le seul des trois qui dit qu'on nous attend quelque part. -->
    <div class="grid flex-none grid-cols-1 gap-3.5 sm:grid-cols-3">
      <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">COMMUNES</span>
          <AppIcon name="Building2" :size="16" :stroke-width="1.75" class="text-neutral-400" />
        </div>
        <div class="flex items-end justify-between gap-2.5">
          <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
            {{ totals.communes }}
          </span>
          <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">non clientes</span>
        </div>
      </div>

      <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">SIGNALEMENTS REÇUS</span>
          <AppIcon name="Inbox" :size="16" :stroke-width="1.75" class="text-neutral-400" />
        </div>
        <div class="flex items-end justify-between gap-2.5">
          <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
            {{ totals.reports }}
          </span>
          <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">jamais publiés</span>
        </div>
      </div>

      <div class="flex flex-col gap-3.5 rounded-[14px] bg-brand-900 px-[18px] py-4">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">HABITANTS EN ATTENTE</span>
          <AppIcon name="Mail" :size="16" :stroke-width="1.75" class="text-brand-500" />
        </div>
        <div class="flex items-end justify-between gap-2.5">
          <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white">
            {{ totals.waitlist }}
          </span>
          <span class="whitespace-nowrap text-xs font-semibold leading-none text-brand-500">
            ont laissé leur adresse
          </span>
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
      :rows="prospects"
      row-key="id"
      :loading="loading"
      :skeleton-rows="6"
      empty-icon="Handshake"
      empty-message="Aucune commune prospect pour le moment."
    >
      <template #cell-name="{ row }">
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold leading-[1.3] text-ink">{{ row.name }}</div>
          <div class="truncate text-xs leading-[1.3] text-muted">{{ row.slug }}</div>
        </div>
      </template>

      <template #cell-insee_codes="{ row }">
        <span class="truncate font-mono text-xs text-muted">
          {{ row.insee_codes.join(', ') || '—' }}
        </span>
      </template>

      <template #cell-report_count="{ row }">
        <span class="text-[13px] font-semibold leading-none tabular-nums text-ink">
          {{ row.report_count }}
        </span>
      </template>

      <template #cell-waitlist_count="{ row }">
        <span
          v-if="row.waitlist_count > 0"
          class="flex items-center gap-1.5 text-[13px] font-semibold leading-none tabular-nums text-brand-700"
        >
          <AppIcon name="Mail" :size="15" :stroke-width="1.75" />
          {{ row.waitlist_count }}
        </span>
        <span v-else class="text-[13px] leading-none tabular-nums text-faint">0</span>
      </template>

      <template #cell-created_at="{ row }">
        <span class="whitespace-nowrap text-[13px] font-medium leading-none tabular-nums text-muted">
          {{ formatDate(row.created_at) }}
        </span>
      </template>
    </DataTable>

    </div>
  </div>
</template>
