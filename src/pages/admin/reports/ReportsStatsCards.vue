<script setup lang="ts">
/**
 * Les quatre compteurs de tête.
 *
 * Chacun porte son contexte : « 21 en attente » ne dit pas s'il faut
 * s'inquiéter, « dont 7 en retard » si. Les chiffres viennent de
 * `GET /api/admin/stats` — ils portent sur la totalité des signalements de la
 * commune, quand la table n'en montre qu'une page.
 */
import AppIcon from '@/components/AppIcon.vue'
import type { AdminStats } from '@/composables/useReportsList'

const props = defineProps<{ stats: AdminStats }>()

/** La part d'un statut dans le total, en pourcentage de largeur de barre. */
function share(value: number): string {
  return `${props.stats.total ? (value / props.stats.total) * 100 : 0}%`
}
</script>

<template>
  <div class="grid flex-none grid-cols-2 gap-3.5 lg:grid-cols-4">
    <div class="flex flex-col gap-3.5 rounded-[14px] bg-brand-900 px-[18px] py-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">TOTAL</span>
        <AppIcon name="Layers" :size="16" :stroke-width="1.75" class="text-brand-500" />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white">
          {{ stats.total }}
        </span>
        <span
          v-if="stats.new_this_week > 0"
          class="flex items-center gap-1 whitespace-nowrap text-xs font-semibold leading-none tabular-nums"
          style="color: #7FD8B8"
        >
          <AppIcon name="ArrowUpRight" :size="13" :stroke-width="2.5" />
          +{{ stats.new_this_week }} cette semaine
        </span>
        <span v-else class="whitespace-nowrap text-xs font-semibold leading-none text-brand-500">
          aucun cette semaine
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">EN ATTENTE</span>
        <AppIcon name="Clock" :size="16" :stroke-width="1.75" class="text-neutral-400" />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
          {{ stats.en_attente }}
        </span>
        <span
          v-if="stats.overdue > 0"
          class="whitespace-nowrap text-xs font-semibold leading-none tabular-nums text-status-progress-fg"
        >
          dont {{ stats.overdue }} en retard
        </span>
        <span v-else class="whitespace-nowrap text-xs font-semibold leading-none text-muted">
          aucun en retard
        </span>
      </div>
      <div class="h-1 overflow-hidden rounded-sm bg-status-pending-bg">
        <div class="h-1 rounded-sm bg-neutral-400" :style="{ width: share(stats.en_attente) }" />
      </div>
    </div>

    <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">PRIS EN CHARGE</span>
        <AppIcon name="Wrench" :size="16" :stroke-width="1.75" class="text-status-progress-dot" />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
          {{ stats.pris_en_charge }}
        </span>
        <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">
          en cours de traitement
        </span>
      </div>
      <div class="h-1 overflow-hidden rounded-sm bg-status-pending-bg">
        <div class="h-1 rounded-sm bg-status-progress-dot" :style="{ width: share(stats.pris_en_charge) }" />
      </div>
    </div>

    <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">RÉSOLU</span>
        <AppIcon name="CircleCheck" :size="16" :stroke-width="1.75" class="text-status-success" />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
          {{ stats.resolu }}
        </span>
        <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">
          {{ stats.resolved_this_month > 0 ? `${stats.resolved_this_month} ce mois-ci` : 'aucun ce mois-ci' }}
        </span>
      </div>
      <div class="h-1 overflow-hidden rounded-sm bg-status-pending-bg">
        <div class="h-1 rounded-sm bg-status-success" :style="{ width: share(stats.resolu) }" />
      </div>
    </div>
  </div>
</template>
