<script setup lang="ts">
/**
 * Ce que la semaine a donné, au gabarit des autres écrans.
 *
 * Elles n'apparaissent qu'après un aperçu : ces chiffres coûtent une agrégation
 * complète côté serveur, et les charger à l'ouverture de l'écran ferait payer à
 * chaque visite un calcul dont la moitié des visites n'a que faire — on vient
 * souvent ici pour ajouter un destinataire.
 */
import AppIcon from '@/components/AppIcon.vue'
import type { WeeklyStats } from '@/composables/useWeeklyReport'

defineProps<{ stats: WeeklyStats }>()

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
</script>

<template>
  <div class="flex flex-none flex-col gap-3.5">
    <p class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
      SEMAINE DU {{ longDate(stats.period.from).toUpperCase() }} AU {{ longDate(stats.period.to).toUpperCase() }}
    </p>

    <div class="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <div class="flex flex-col gap-3.5 rounded-[14px] bg-brand-900 px-[18px] py-4">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">NOUVEAUX</span>
          <AppIcon name="Inbox" :size="16" :stroke-width="1.75" class="text-brand-500" />
        </div>
        <div class="flex items-end justify-between gap-2.5">
          <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white">
            {{ stats.new_reports }}
          </span>
          <span
            v-if="stats.vs_last_week !== 0"
            class="flex items-center gap-1 whitespace-nowrap text-xs font-semibold leading-none tabular-nums"
            :style="{ color: stats.vs_last_week > 0 ? '#EF9F27' : '#7FD8B8' }"
          >
            <AppIcon :name="stats.vs_last_week > 0 ? 'ArrowUpRight' : 'ArrowDownRight'" :size="13" :stroke-width="2.5" />
            {{ stats.vs_last_week > 0 ? '+' : '' }}{{ stats.vs_last_week }} vs sem. préc.
          </span>
          <span v-else class="whitespace-nowrap text-xs font-semibold leading-none text-brand-500">
            stable
          </span>
        </div>
      </div>

      <div
        v-for="card in [
          { label: 'RÉSOLUS',       value: stats.resolved,    icon: 'CircleCheck', tint: 'text-status-success',      hint: 'cette semaine' },
          { label: 'EN COURS',      value: stats.in_progress, icon: 'Wrench',      tint: 'text-status-progress-dot', hint: 'en traitement' },
          { label: 'EN RETARD',     value: stats.overdue,     icon: 'AlarmClock',  tint: 'text-status-danger',       hint: 'au-delà du délai' },
        ]"
        :key="card.label"
        class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">{{ card.label }}</span>
          <AppIcon :name="card.icon" :size="16" :stroke-width="1.75" :class="card.tint" />
        </div>
        <div class="flex items-end justify-between gap-2.5">
          <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
            {{ card.value }}
          </span>
          <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">{{ card.hint }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
