<script setup lang="ts">
/**
 * Les communes sans mairie — réservé au super-administrateur.
 *
 * Des habitants y signalent, sans que leur mairie ait accès à la plateforme.
 * Deux régimes depuis la migration 040 : **silencieuse**, où rien n'est publié,
 * et **publique**, où les habitants se lisent entre eux et ferment eux-mêmes ce
 * qui a été réparé.
 *
 * L'écran a donc deux usages, et c'est pourquoi il montre plus que deux
 * chiffres. Il prépare un rendez-vous commercial — combien d'administrés, sur
 * quels sujets — et il sert à **décider d'ouvrir une commune**, ce qui demande
 * de savoir si le fonds vaut une page publique. Cette décision n'est jamais
 * automatique : c'est un geste, pris commune par commune, tracé dans l'audit.
 */
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import AppIcon from '@/components/AppIcon.vue'
import DataTable, { type DataColumn } from '@/components/DataTable.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import CommuneDetail from '@/components/admin/prospects/CommuneDetail.vue'
import PublicationDialog from '@/components/admin/prospects/PublicationDialog.vue'
import { isOpen, totals, type Commune } from '@/lib/communePipeline'

const { apiFetch } = useApi()
const toast = useToast()

const COLUMNS: DataColumn[] = [
  { key: 'name',           label: 'COMMUNE' },
  { key: 'mode',           label: 'MODE',          width: '150px' },
  { key: 'report_count',   label: 'SIGNALEMENTS',  width: '130px' },
  { key: 'waitlist_count', label: 'EN ATTENTE',    width: '120px' },
  { key: 'created_at',     label: 'PREMIER DÉPÔT', width: '150px' },
  { key: 'actions',        label: '',              width: '150px' },
]

const communes = ref<Commune[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const expanded = ref<string | null>(null)

/** La commune dont on s'apprête à changer la visibilité, et dans quel sens. */
const pending = ref<Commune | null>(null)
const submitting = ref(false)

const sums = computed(() => totals(communes.value))

const load = async (fresh = false) => {
  loading.value = true
  error.value = null
  try {
    const rows = await apiFetch('/api/tenant/prospects', {
      cache: fresh ? undefined : { maxAge: 300_000 },
    })

    // Une réponse qui n'est pas une liste ne doit pas faire exploser l'écran
    // au premier calcul de total : l'erreur se lit mieux vide qu'en page blanche.
    communes.value = Array.isArray(rows) ? rows : []
  } catch (err: any) {
    error.value = err.message ?? 'Chargement impossible'
  } finally {
    loading.value = false
  }
}

/**
 * La bascule elle-même.
 *
 * Le serveur fait le reste — publier ou dépublier l'historique, et l'écrire
 * dans l'audit. On recharge sans cache : les chiffres de l'écran viennent de
 * changer, et montrer l'ancien état après un geste pareil serait le pire des
 * moments pour servir une réponse en cache.
 */
const applyPublication = async () => {
  const commune = pending.value
  if (!commune) return

  const opening = !isOpen(commune)
  submitting.value = true

  try {
    await apiFetch(`/api/tenant/${commune.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: opening ? 'community' : 'prospect' }),
    })

    toast.success(
      opening
        ? `${commune.name} est ouverte au public.`
        : `${commune.name} est repassée au silence.`
    )
    pending.value = null
    await load(true)
  } catch (err: any) {
    toast.error(err.message ?? 'La bascule a échoué.')
  } finally {
    submitting.value = false
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(load)
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">
    <AdminPageHeader />

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-hidden px-7 py-[22px]">
      <p class="max-w-3xl flex-none text-[13px] leading-[1.5] text-muted">
        Des habitants y signalent déjà, sans que leur mairie ait accès à la plateforme. Leurs
        signalements restent invisibles — sauf dans les communes ouvertes au public, où les
        habitants se lisent entre eux et où personne de la mairie ne répond.
      </p>

      <div class="grid flex-none grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">COMMUNES</span>
            <AppIcon name="Building2" :size="16" :stroke-width="1.75" class="text-neutral-400" />
          </div>
          <div class="flex items-end justify-between gap-2.5">
            <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
              {{ sums.communes }}
            </span>
            <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">sans mairie</span>
          </div>
        </div>

        <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">OUVERTES AU PUBLIC</span>
            <AppIcon name="Eye" :size="16" :stroke-width="1.75" class="text-neutral-400" />
          </div>
          <div class="flex items-end justify-between gap-2.5">
            <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
              {{ sums.open }}
            </span>
            <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">
              sur {{ sums.reports }} signalements
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-3.5 rounded-[14px] bg-brand-900 px-[18px] py-4">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">HABITANTS EN ATTENTE</span>
            <AppIcon name="Mail" :size="16" :stroke-width="1.75" class="text-brand-500" />
          </div>
          <div class="flex items-end justify-between gap-2.5">
            <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white">
              {{ sums.waitlist }}
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
        :rows="communes"
        row-key="id"
        :loading="loading"
        :skeleton-rows="6"
        :expanded-key="expanded"
        empty-icon="Handshake"
        empty-message="Aucune commune sans mairie pour le moment."
        @row-click="(row: Commune) => (expanded = expanded === row.id ? null : row.id)"
      >
        <template #cell-name="{ row }">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold leading-[1.3] text-ink">{{ row.name }}</div>
            <div class="truncate font-mono text-xs leading-[1.3] text-muted">
              {{ row.insee_codes.join(', ') || row.slug }}
            </div>
          </div>
        </template>

        <!-- Le mode d'abord, avant les volumes : c'est ce qu'on vient vérifier. -->
        <template #cell-mode="{ row }">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="isOpen(row)
              ? 'bg-status-progress-bg text-status-progress-fg'
              : 'bg-status-pending-bg text-status-pending-fg'"
          >
            <AppIcon :name="isOpen(row) ? 'Eye' : 'EyeOff'" :size="13" :stroke-width="1.9" />
            {{ isOpen(row) ? 'Publique' : 'Silencieuse' }}
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

        <template #cell-actions="{ row }">
          <button
            type="button"
            class="rounded-ds border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-neutral-100"
            @click.stop="pending = row"
          >
            {{ isOpen(row) ? 'Refermer' : 'Ouvrir au public' }}
          </button>
        </template>

        <template #row-detail="{ row }">
          <CommuneDetail :commune="row" />
        </template>
      </DataTable>
    </div>

    <PublicationDialog
      :commune="pending"
      :opening="pending ? !isOpen(pending) : true"
      :loading="submitting"
      @confirm="applyPublication"
      @cancel="pending = null"
    />
  </div>
</template>
