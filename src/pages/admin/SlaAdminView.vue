<script setup lang="ts">
/**
 * L'écran de performance, repris de l'export Claude Design
 * (`design/admin-onsignale.screens.html`, deuxième planche).
 *
 * Deux partis pris de la maquette valent d'être dits :
 *
 *  - **les graphiques sont dessinés en CSS**, pas par Chart.js. Ce sont six
 *    paires de barres et cinq jauges : la bibliothèque coûtait 180 kio, un
 *    canevas impossible à sélectionner et une deuxième palette à tenir
 *    d'accord avec celle du design. Elle a donc quitté cet écran ;
 *  - **chaque chiffre porte sa référence.** « 6 j 12 h » ne dit pas s'il faut
 *    s'inquiéter ; « 6 j 12 h / objectif 5 j » si.
 *
 * Le filtre par catégorie de la maquette n'est pas implémenté : l'API de
 * performance agrège sur toute la commune et ne prend qu'une période. Le
 * simuler côté client donnerait des taux calculés sur cinq lignes en prétendant
 * qu'ils portent sur la période entière.
 */
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useTenantStore } from '@/stores/tenant'
import DataTable, { type DataColumn } from '@/components/DataTable.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import ScopeNote from '@/pages/admin/performance/ScopeNote.vue'
import CategoryGlyph from '@/components/admin/CategoryGlyph.vue'
import FilterSelect from '@/components/admin/FilterSelect.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import { ACK_TARGET_DAYS, RESOLVE_TARGET_DAYS } from '@/composables/useServiceTargets'

interface CategorySla {
  /** Slug canonique — ajouté par la migration 031. */
  slug: string
  label: string
  icon: string
  sla_hours: number
  report_count: number
  resolved_count: number
  avg_resolve_hours: number | null
  sla_compliance_rate: number | null
}

interface MonthlyBucket {
  month: string
  created: number
  resolved: number
}

interface PerformanceData {
  period_days: number
  total_reports: number
  resolved_reports: number
  resolution_rate: number
  avg_time_to_ack_hours: number | null
  avg_time_to_resolve_hours: number | null
  sla_compliance_rate: number | null
  by_category: CategorySla[]
  monthly: MonthlyBucket[]
}

const { apiFetch } = useApi()
const tenantStore = useTenantStore()

const data = ref<PerformanceData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const period = ref<string | number>(30)

const PERIODS = [
  { value: 30,  label: '30 derniers jours' },
  { value: 90,  label: '3 derniers mois' },
  { value: 180, label: '6 derniers mois' },
  { value: 365, label: '12 derniers mois' },
]

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await apiFetch<PerformanceData>(`/api/admin/performance?days=${period.value}`)
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur inconnue'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ─── Mise en forme ───────────────────────────────────────────────────────────

/**
 * Un délai en heures, coupé en valeur et unité.
 *
 * La maquette pose le nombre en 34 px et l'unité en 15 px : ce sont deux
 * éléments, pas une chaîne. Au-delà de 24 h l'unité de lecture devient le jour
 * — « 156 h » ne se compare à rien, « 6 j 12 h » se compare à un lundi.
 */
function splitDelay(hours: number | null): { value: string; unit: string } {
  if (hours === null) return { value: '—', unit: '' }
  if (hours < 24) return { value: String(Math.round(hours)), unit: 'h' }

  const days = Math.floor(hours / 24)
  const rest = Math.round(hours % 24)

  // « 7 j 00 h » se lit deux fois plus lentement que « 7 j » pour dire la même
  // chose. Les délais visés tombent presque tous sur un nombre entier de jours.
  if (rest === 0) return { value: `${days} j`, unit: '' }

  return { value: `${days} j ${String(rest).padStart(2, '0')}`, unit: 'h' }
}

/** Le même délai sur une ligne, pour la table et l'export. */
function formatDelay(hours: number | null): string {
  const { value, unit } = splitDelay(hours)
  return unit ? `${value} ${unit}` : value
}

function formatTarget(days: number): string {
  return `objectif ${days} j`
}

/**
 * L'avancement d'une jauge de délai.
 *
 * Objectif ÷ réalisé, et non l'inverse : la barre est pleine quand la promesse
 * est tenue, et se vide à mesure qu'on s'en éloigne. Un délai deux fois trop
 * long donne une demi-barre, pas une barre qui déborde.
 */
function targetRatio(actualHours: number | null, targetDays: number): number {
  if (!actualHours) return 0
  return Math.min((targetDays * 24) / actualHours, 1) * 100
}

const ackDelay = computed(() => splitDelay(data.value?.avg_time_to_ack_hours ?? null))
const resolveDelay = computed(() => splitDelay(data.value?.avg_time_to_resolve_hours ?? null))

const ackOnTarget = computed(() =>
  (data.value?.avg_time_to_ack_hours ?? Infinity) <= ACK_TARGET_DAYS * 24
)
const resolveOnTarget = computed(() =>
  (data.value?.avg_time_to_resolve_hours ?? Infinity) <= RESOLVE_TARGET_DAYS * 24
)

/** Les catégories dont le délai moyen dépasse le délai que la commune s'est fixé. */
const categoriesOverSla = computed(() =>
  (data.value?.by_category ?? []).filter(
    (row) => row.avg_resolve_hours !== null && row.avg_resolve_hours > row.sla_hours
  ).length
)

// ─── Évolution mensuelle ─────────────────────────────────────────────────────

const monthlyMax = computed(() =>
  Math.max(1, ...(data.value?.monthly ?? []).flatMap((bucket) => [bucket.created, bucket.resolved]))
)

/** Les trois graduations de l'axe : 0, la moitié, le maximum. */
const monthlyTicks = computed(() => [
  monthlyMax.value,
  Math.round(monthlyMax.value / 2),
  0,
])

function monthLabel(iso: string): string {
  const [year, month] = iso.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', { month: 'short' })
}

function barHeight(value: number): string {
  return `${(value / monthlyMax.value) * 100}%`
}

// ─── Délai moyen face au SLA ─────────────────────────────────────────────────

/**
 * Les cinq catégories les plus signalées, mesurées ou non.
 *
 * Elles y figurent même sans aucune résolution : le délai visé est un réglage
 * de la commune, il existe avant la première mesure, et un panneau vide
 * laissait croire que la configuration n'avait pas été prise en compte. Seule
 * la barre manque alors — une catégorie sans résolution n'a pas de délai moyen,
 * et la tracer à zéro la ferait passer pour la mieux tenue de la commune.
 */
const slaCategories = computed(() => (data.value?.by_category ?? []).slice(0, 5))

/** L'échelle commune aux cinq jauges — sans quoi elles ne se comparent pas. */
const slaScale = computed(() =>
  Math.max(1, ...slaCategories.value.flatMap((row) => [row.avg_resolve_hours ?? 0, row.sla_hours]))
)

function slaWidth(hours: number): string {
  return `${Math.min((hours / slaScale.value) * 100, 100)}%`
}

// ─── Table ───────────────────────────────────────────────────────────────────

const COLUMNS: DataColumn[] = [
  { key: 'label',               label: 'CATÉGORIE' },
  { key: 'report_count',        label: 'SIGNALEMENTS', width: '108px' },
  { key: 'resolved_count',      label: 'RÉSOLUS',      width: '96px' },
  { key: 'avg_resolve_hours',   label: 'DÉLAI MOYEN',  width: '116px' },
  { key: 'sla_hours',           label: 'DÉLAI VISÉ',   width: '96px' },
  { key: 'sla_compliance_rate', label: 'RESPECT',      width: '148px' },
  { key: 'status',              label: 'STATUT',       width: '116px' },
]

/**
 * En dessous de trois résolutions, un taux ne veut rien dire.
 *
 * Une catégorie avec un seul signalement résolu affiche 0 % ou 100 % selon ce
 * seul cas. La maquette le dit « À suivre » plutôt que « Critique », et elle a
 * raison : ce n'est pas un mauvais résultat, c'est une absence de résultat.
 */
const MIN_SAMPLE = 3

function slaStatus(row: CategorySla): { label: string; icon: string; classes: string } {
  if (row.resolved_count < MIN_SAMPLE || row.sla_compliance_rate === null) {
    return { label: 'À suivre', icon: 'Clock', classes: 'bg-status-pending-bg text-status-pending-fg' }
  }
  if (row.sla_compliance_rate >= 80) {
    return { label: 'Tenu', icon: 'CircleCheck', classes: 'bg-status-done-bg text-status-done-fg' }
  }
  if (row.sla_compliance_rate >= 60) {
    return { label: 'Limite', icon: 'Clock', classes: 'bg-status-progress-bg text-status-progress-fg' }
  }
  return { label: 'Critique', icon: 'TriangleAlert', classes: 'bg-status-danger-bg text-status-danger' }
}

function complianceColor(row: CategorySla): string {
  if (row.resolved_count < MIN_SAMPLE) return 'bg-neutral-400'
  if ((row.sla_compliance_rate ?? 0) >= 80) return 'bg-status-success'
  if ((row.sla_compliance_rate ?? 0) >= 60) return 'bg-status-progress-dot'
  return 'bg-status-danger'
}

const periodLabel = computed(
  () => PERIODS.find((entry) => entry.value === period.value)?.label ?? ''
)

/** L'export porte sur le détail par catégorie — ce que la page a réellement. */
function exportCsv() {
  const header = ['Catégorie', 'Signalements', 'Résolus', 'Délai moyen', 'Délai visé', 'Respect des SLA']
  const rows = (data.value?.by_category ?? []).map((row) => [
    row.label,
    String(row.report_count),
    String(row.resolved_count),
    formatDelay(row.avg_resolve_hours),
    formatDelay(row.sla_hours),
    row.sla_compliance_rate === null ? '' : `${row.sla_compliance_rate} %`,
  ])

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n')

  // BOM : sans lui Excel lit le CSV en latin-1 et massacre les accents.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `performance-${tenantStore.slug}-${period.value}j.csv`
  link.click()

  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">

    <AdminPageHeader>
      <template #actions>
        <FilterSelect
          v-model="period"
          :options="PERIODS"
          icon="Calendar"
          menu-width="180px"
          @update:model-value="load"
        />
        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 transition-colors hover:bg-brand-800"
          @click="exportCsv"
        >
          <AppIcon name="Download" :size="16" :stroke-width="2" class="text-white" />
          <span class="text-[13px] font-semibold leading-none text-white">Exporter</span>
        </button>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-7 py-[22px]">

      <div
        v-if="error"
        class="flex-none rounded-[14px] border border-[#F3C9C9] bg-status-danger-bg px-[18px] py-4 text-sm text-status-danger"
      >
        {{ error }}
      </div>

      <ScopeNote />

      <!-- Chargement : la forme de la page, pas un tourniquet au centre -->
      <template v-if="loading">
        <div class="grid flex-none grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div
            v-for="i in 4"
            :key="i"
            class="flex h-[118px] flex-col justify-center gap-2.5 rounded-[14px] border border-line bg-white px-[18px]"
          >
            <AppSkeleton class="h-3 w-24 rounded" />
            <AppSkeleton class="h-7 w-16 rounded" />
          </div>
        </div>
        <div class="grid flex-none grid-cols-1 gap-3.5 lg:grid-cols-2">
          <div
            v-for="i in 2"
            :key="i"
            class="flex h-[268px] flex-col gap-3.5 rounded-[14px] border border-line bg-white p-[18px]"
          >
            <AppSkeleton class="h-3.5 w-40 rounded" />
            <!-- Des barres de longueurs décroissantes : la forme d'un
                 classement, pas un aplat qui ne dit rien de ce qui arrive. -->
            <AppSkeleton
              v-for="(width, index) in ['w-full', 'w-10/12', 'w-8/12', 'w-6/12', 'w-4/12']"
              :key="index"
              :class="`h-7 rounded ${width}`"
            />
          </div>
        </div>
      </template>

      <template v-else-if="data">

        <!-- ─── Les quatre compteurs ──────────────────────────────────────── -->
        <div class="grid flex-none grid-cols-2 gap-3.5 lg:grid-cols-4">

          <div class="flex flex-col gap-3.5 rounded-[14px] bg-brand-900 px-[18px] py-4">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">TAUX DE RÉSOLUTION</span>
              <AppIcon name="CircleCheck" :size="16" :stroke-width="1.75" class="text-brand-500" />
            </div>
            <div class="flex items-end justify-between gap-2.5">
              <div class="flex items-baseline gap-[3px]">
                <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white">
                  {{ data.resolution_rate }}
                </span>
                <span class="text-[15px] font-semibold leading-none text-brand-500">%</span>
              </div>
              <span class="whitespace-nowrap text-xs font-semibold leading-none tabular-nums text-status-success-soft">
                {{ data.resolved_reports }} / {{ data.total_reports }} signalements
              </span>
            </div>
            <div class="h-1 overflow-hidden rounded-sm bg-white/[0.16]">
              <div class="h-1 rounded-sm bg-status-success" :style="{ width: `${data.resolution_rate}%` }" />
            </div>
          </div>

          <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">DÉLAI PRISE EN CHARGE</span>
              <AppIcon name="Clock" :size="16" :stroke-width="1.75" class="text-neutral-400" />
            </div>
            <div class="flex items-end justify-between gap-2.5">
              <div class="flex items-baseline gap-[3px]">
                <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
                  {{ ackDelay.value }}
                </span>
                <span class="text-[15px] font-semibold leading-none text-muted">{{ ackDelay.unit }}</span>
              </div>
              <span
                class="whitespace-nowrap text-xs font-semibold leading-none tabular-nums"
                :class="ackOnTarget ? 'text-status-done-fg' : 'text-status-progress-fg'"
              >
                {{ formatTarget(ACK_TARGET_DAYS) }}
              </span>
            </div>
            <div class="h-1 overflow-hidden rounded-sm bg-status-pending-bg">
              <div
                class="h-1 rounded-sm"
                :class="ackOnTarget ? 'bg-status-success' : 'bg-status-progress-dot'"
                :style="{ width: `${targetRatio(data.avg_time_to_ack_hours, ACK_TARGET_DAYS)}%` }"
              />
            </div>
          </div>

          <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">DÉLAI RÉSOLUTION</span>
              <AppIcon name="Wrench" :size="16" :stroke-width="1.75" class="text-status-progress-dot" />
            </div>
            <div class="flex items-end justify-between gap-2.5">
              <div class="flex items-baseline gap-[3px]">
                <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
                  {{ resolveDelay.value }}
                </span>
                <span class="text-[15px] font-semibold leading-none text-muted">{{ resolveDelay.unit }}</span>
              </div>
              <span
                class="whitespace-nowrap text-xs font-semibold leading-none tabular-nums"
                :class="resolveOnTarget ? 'text-status-done-fg' : 'text-status-progress-fg'"
              >
                {{ formatTarget(RESOLVE_TARGET_DAYS) }}
              </span>
            </div>
            <div class="h-1 overflow-hidden rounded-sm bg-status-pending-bg">
              <div
                class="h-1 rounded-sm"
                :class="resolveOnTarget ? 'bg-status-success' : 'bg-status-progress-dot'"
                :style="{ width: `${targetRatio(data.avg_time_to_resolve_hours, RESOLVE_TARGET_DAYS)}%` }"
              />
            </div>
          </div>

          <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">RESPECT DES SLA</span>
              <AppIcon name="Target" :size="16" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="flex items-end justify-between gap-2.5">
              <div class="flex items-baseline gap-[3px]">
                <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
                  {{ data.sla_compliance_rate ?? '—' }}
                </span>
                <span v-if="data.sla_compliance_rate !== null" class="text-[15px] font-semibold leading-none text-muted">%</span>
              </div>
              <span
                class="whitespace-nowrap text-xs font-semibold leading-none tabular-nums"
                :class="categoriesOverSla > 0 ? 'text-status-progress-fg' : 'text-status-done-fg'"
              >
                {{ categoriesOverSla > 0
                  ? `${categoriesOverSla} catégorie${categoriesOverSla > 1 ? 's' : ''} en écart`
                  : 'aucun écart' }}
              </span>
            </div>
            <div class="h-1 overflow-hidden rounded-sm bg-status-pending-bg">
              <div class="h-1 rounded-sm bg-brand-700" :style="{ width: `${data.sla_compliance_rate ?? 0}%` }" />
            </div>
          </div>
        </div>

        <!-- ─── Les deux panneaux ─────────────────────────────────────────── -->
        <div class="grid flex-none grid-cols-1 gap-3.5 lg:grid-cols-2">

          <!-- Évolution mensuelle -->
          <div class="flex h-[268px] flex-col gap-4 rounded-[14px] border border-line bg-white p-[18px]">
            <div class="flex items-start justify-between gap-3">
              <div class="flex flex-col gap-[3px]">
                <div class="text-[15px] font-semibold leading-[1.2] text-brand-900">Évolution mensuelle</div>
                <div class="text-xs font-medium leading-none text-muted">Signalements créés et résolus</div>
              </div>
              <div class="flex flex-none items-center gap-3.5">
                <div class="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold leading-none text-ink">
                  <span class="h-2.5 w-2.5 rounded-[3px] bg-brand-700" />Créés
                </div>
                <div class="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold leading-none text-ink">
                  <span class="h-2.5 w-2.5 rounded-[3px] bg-status-success" />Résolus
                </div>
              </div>
            </div>

            <div class="flex min-h-0 flex-1 gap-3.5">
              <!-- L'axe. `padding-bottom` = la hauteur des étiquettes de mois,
                   pour que le 0 tombe sur la ligne de base et non sous elle. -->
              <div class="flex w-[26px] flex-none flex-col justify-between pb-[19px] text-right">
                <div
                  v-for="tick in monthlyTicks"
                  :key="tick"
                  class="text-[11px] font-medium leading-none tabular-nums text-faint"
                >
                  {{ tick }}
                </div>
              </div>

              <div class="relative flex min-w-0 flex-1 flex-col">
                <div class="absolute inset-x-0 top-0 flex h-[calc(100%-19px)] flex-col justify-between">
                  <div class="h-px bg-hairline" />
                  <div class="h-px bg-hairline" />
                  <div class="h-px bg-line" />
                </div>

                <div class="relative flex min-h-0 flex-1 gap-2">
                  <div
                    v-for="bucket in data.monthly"
                    :key="bucket.month"
                    class="flex min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    <div class="flex w-full flex-1 items-end justify-center gap-1.5">
                      <div
                        class="w-5 rounded-t-md bg-brand-700"
                        :style="{ height: barHeight(bucket.created) }"
                        :title="`${bucket.created} créé(s)`"
                      />
                      <div
                        class="w-5 rounded-t-md bg-status-success"
                        :style="{ height: barHeight(bucket.resolved) }"
                        :title="`${bucket.resolved} résolu(s)`"
                      />
                    </div>
                    <div class="whitespace-nowrap text-[11px] font-medium leading-none text-muted">
                      {{ monthLabel(bucket.month) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Délai moyen face au SLA -->
          <div class="flex h-[268px] flex-col gap-4 rounded-[14px] border border-line bg-white p-[18px]">
            <div class="flex items-start justify-between gap-3">
              <div class="flex flex-col gap-[3px]">
                <div class="text-[15px] font-semibold leading-[1.2] text-brand-900">Délai moyen face au SLA</div>
                <div class="text-xs font-medium leading-none text-muted">Par catégorie, en heures</div>
              </div>
              <div class="flex flex-none items-center gap-1.5 whitespace-nowrap text-xs font-semibold leading-none text-ink">
                <span class="h-3 w-0.5 bg-brand-900" />SLA configuré
              </div>
            </div>

            <div class="flex min-h-0 flex-1 flex-col justify-between">
              <div
                v-for="row in slaCategories"
                :key="row.slug"
                class="grid items-center gap-3"
                style="grid-template-columns: 96px minmax(0, 1fr) 92px"
              >
                <div class="truncate text-[13px] font-medium leading-none text-ink">{{ row.label }}</div>

                <!-- Le trait sombre est le SLA : la barre doit être lue par
                     rapport à lui, pas par rapport au bord du cadre. Sans
                     résolution sur la période, le trait reste seul — le délai
                     visé est configuré, il n'est simplement pas encore mesuré. -->
                <div class="relative h-[22px] rounded-md bg-canvas">
                  <div
                    v-if="row.avg_resolve_hours !== null"
                    class="absolute inset-y-0 left-0 rounded-md"
                    :class="row.avg_resolve_hours > row.sla_hours ? 'bg-status-progress-dot' : 'bg-brand-700'"
                    :style="{ width: slaWidth(row.avg_resolve_hours) }"
                  />
                  <div
                    class="absolute -top-[3px] -bottom-[3px] w-0.5 bg-brand-900"
                    :style="{ left: slaWidth(row.sla_hours) }"
                    :title="`Délai visé : ${row.sla_hours} h`"
                  />
                </div>

                <div
                  v-if="row.avg_resolve_hours !== null"
                  class="whitespace-nowrap text-right text-xs font-semibold leading-none tabular-nums"
                  :class="row.avg_resolve_hours > row.sla_hours ? 'text-status-progress-fg' : 'text-status-done-fg'"
                >
                  {{ Math.round(row.avg_resolve_hours) }} h / {{ row.sla_hours }} h
                </div>
                <div
                  v-else
                  class="whitespace-nowrap text-right text-xs font-medium leading-none tabular-nums text-faint"
                  title="Aucun signalement résolu sur la période"
                >
                  — / {{ row.sla_hours }} h
                </div>
              </div>

              <div
                v-if="slaCategories.length === 0"
                class="flex flex-1 items-center justify-center text-[13px] text-muted"
              >
                Aucune catégorie configurée.
              </div>
            </div>
          </div>
        </div>

        <!-- ─── Détail par catégorie ──────────────────────────────────────── -->
        <div class="flex min-h-0 flex-none flex-col overflow-hidden rounded-[14px] border border-line bg-white">
          <div class="flex h-[54px] flex-none items-center gap-2.5 whitespace-nowrap border-b border-line px-[18px]">
            <div class="text-[15px] font-semibold leading-none text-brand-900">Détail par catégorie</div>
            <div class="ml-auto flex-none text-xs font-medium leading-none tabular-nums text-muted">
              {{ data.total_reports }} signalement{{ data.total_reports > 1 ? 's' : '' }} d’habitants sur {{ periodLabel.toLowerCase() }}
            </div>
          </div>

          <DataTable
            :columns="COLUMNS"
            :rows="data.by_category"
            row-key="slug"
            empty-icon="TrendingUp"
            empty-message="Aucune donnée pour cette période."
          >
            <template #cell-label="{ row }">
              <div class="flex min-w-0 items-center gap-[11px]">
                <CategoryGlyph :category="row.slug" :label="row.label" />
                <span class="truncate text-sm font-semibold leading-[1.3] text-ink">{{ row.label }}</span>
              </div>
            </template>

            <template #cell-report_count="{ row }">
              <span class="text-[13px] font-medium leading-none tabular-nums text-ink">{{ row.report_count }}</span>
            </template>

            <template #cell-resolved_count="{ row }">
              <span class="text-[13px] font-medium leading-none tabular-nums text-ink">{{ row.resolved_count }}</span>
            </template>

            <template #cell-avg_resolve_hours="{ row }">
              <span class="whitespace-nowrap text-[13px] font-medium leading-none tabular-nums text-ink">
                {{ formatDelay(row.avg_resolve_hours) }}
              </span>
            </template>

            <template #cell-sla_hours="{ row }">
              <span class="whitespace-nowrap text-[13px] font-medium leading-none tabular-nums text-muted">
                {{ formatDelay(row.sla_hours) }}
              </span>
            </template>

            <template #cell-sla_compliance_rate="{ row }">
              <div v-if="row.sla_compliance_rate !== null" class="flex items-center gap-[9px]">
                <div class="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-status-pending-bg">
                  <div class="h-1.5 rounded-[3px]" :class="complianceColor(row)" :style="{ width: `${row.sla_compliance_rate}%` }" />
                </div>
                <span class="flex-none whitespace-nowrap text-xs font-semibold leading-none tabular-nums text-ink">
                  {{ row.sla_compliance_rate }} %
                </span>
              </div>
              <span v-else class="text-[13px] text-faint">—</span>
            </template>

            <template #cell-status="{ row }">
              <span
                class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-[5px] text-xs font-semibold leading-none"
                :class="slaStatus(row).classes"
              >
                <AppIcon :name="slaStatus(row).icon" :size="13" :stroke-width="2" />
                {{ slaStatus(row).label }}
              </span>
            </template>
          </DataTable>
        </div>
      </template>
    </div>
  </div>
</template>
