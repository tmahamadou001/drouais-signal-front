<script setup lang="ts">
/**
 * Ce qu'on lit en premier : l'état, puis le titre.
 *
 * L'état avant le titre, et non l'inverse : la question d'un agent qui ouvre
 * une fiche n'est pas « de quoi s'agit-il » — la ligne du tableau vient de le
 * lui dire — mais « où en est-on, et est-ce que ça presse ».
 */
import type { Report } from '@/types'
import AppIcon from '@/components/AppIcon.vue'
import { statusPill } from '@/lib/reportStatus'

defineProps<{
  report: Report
  overdue: boolean
  overdueDays: number
}>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-[7px]">
      <span
        class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-[5px] text-xs font-semibold leading-none"
        :class="statusPill(report.status).classes"
      >
        <AppIcon :name="statusPill(report.status).icon" :size="13" :stroke-width="2" />
        {{ statusPill(report.status).label }}
      </span>
      <span
        v-if="overdue"
        class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-status-danger-bg px-2.5 py-[5px] text-xs font-semibold leading-none text-[#B42222]"
      >
        <AppIcon name="AlarmClock" :size="13" :stroke-width="2" />
        En retard de {{ overdueDays }} j
      </span>
      <span
        v-if="report.ai_assisted"
        class="whitespace-nowrap rounded-lg bg-brand-50 px-2.5 py-[5px] text-xs font-semibold leading-none text-brand-700"
        title="Catégorisé par l’IA"
      >
        IA
      </span>
    </div>

    <h3 class="text-[19px] font-bold leading-[1.3] text-ink">
      {{ report.title }}
    </h3>
  </div>
</template>
