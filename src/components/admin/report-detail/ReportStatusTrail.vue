<script setup lang="ts">
/**
 * La frise du traitement, avec ses dates.
 *
 * Trois pastilles sans date ne disent pas si la prise en charge date d'hier ou
 * du mois dernier. L'échéance est rappelée en tête parce que c'est elle qui
 * justifie le retard affiché à côté.
 */
import { computed } from 'vue'
import type { Report, StatusHistoryEntry, ReportStatus } from '@/types'
import AppIcon from '@/components/AppIcon.vue'
import { STATUS_PILLS } from '@/lib/reportStatus'

const props = defineProps<{
  report: Report
  history: StatusHistoryEntry[]
  overdue: boolean
}>()

const ALL_STEPS: { key: ReportStatus; label: string; icon: string }[] =
  (['en_attente', 'transmis', 'pris_en_charge', 'resolu'] as ReportStatus[]).map((key) => ({
    key,
    label: STATUS_PILLS[key].label,
    icon: STATUS_PILLS[key].icon,
  }))

/**
 * Les étapes que *ce* signalement traverse.
 *
 * « Transmis » n'est pas une étape obligatoire : c'est une branche. Un
 * signalement dont la catégorie n'a pas de destinataire est traité en interne
 * et ne passera jamais par là. L'afficher quand même donnait une frise
 * incohérente — l'agent cliquait « Prendre en charge » et voyait « Transmis »
 * se marquer comme franchi, alors que rien n'avait jamais été envoyé.
 */
const steps = computed(() => {
  const wasTransmitted =
    props.report.status === 'transmis' ||
    props.history.some((entry) => entry.new_status === 'transmis')

  return wasTransmitted ? ALL_STEPS : ALL_STEPS.filter((step) => step.key !== 'transmis')
})

const currentStep = computed(() => steps.value.findIndex((step) => step.key === props.report.status))

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

/**
 * La date de chaque étape.
 *
 * `en_attente` n'a pas d'entrée dans l'historique — c'est l'état de départ,
 * personne ne l'a « changé ». Sa date est donc celle du dépôt.
 */
function stepDate(step: ReportStatus): string | null {
  if (step === 'en_attente') return shortDate(props.report.created_at)
  const entry = props.history.find((item) => item.new_status === step)
  return entry ? shortDate(entry.changed_at) : null
}

/**
 * Ce qu'on écrit sous une étape.
 *
 * « à venir » ne se dit que d'une étape **pas encore atteinte**. Une étape
 * franchie dont on ignore la date écrit un tiret : on ne sait pas quand, on
 * sait que c'est arrivé.
 *
 * Le cas n'est pas théorique — la migration 034 avait renommé le statut de
 * signalements sans toucher à leur historique, et la frise annonçait « à
 * venir » sur l'étape en cours, en bleu (corrigé par la 036). Mais une frise
 * ne doit pas pouvoir se contredire parce qu'une donnée manque, quelle qu'en
 * soit la raison.
 */
function stepCaption(step: ReportStatus, index: number): string {
  const date = stepDate(step)
  if (date) return date
  return index <= currentStep.value ? '—' : 'à venir'
}
</script>

<template>
  <section class="flex flex-none flex-col gap-3.5 rounded-xl border border-line p-4">
    <!-- L'échéance n'est plus rappelée ici : elle se lit dans les faits, sous
         le délai de la catégorie qui la produit. Elle y était à trois cents
         pixels de la pastille « En retard » qui en découle — le même fait, dit
         deux fois, loin l'un de l'autre. -->
    <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
      SUIVI
    </span>

    <div class="flex items-start">
      <template v-for="(step, index) in steps" :key="step.key">
        <div
          v-if="index > 0"
          class="mt-4 h-[3px] flex-none basis-14 rounded-sm"
          :class="index <= currentStep ? 'bg-brand-700' : 'bg-line'"
        />
        <div class="flex min-w-0 flex-1 flex-col items-center gap-[7px]">
          <div
            class="flex h-[34px] w-[34px] items-center justify-center rounded-full"
            :class="index === currentStep
              ? (overdue && index < 2 ? 'border-2 border-status-progress-dot bg-status-progress-bg' : 'border-2 border-brand-700 bg-brand-50')
              : index < currentStep ? 'bg-status-done-bg' : 'bg-status-pending-bg'"
          >
            <AppIcon
              :name="step.icon" :size="17" :stroke-width="2"
              :class="index === currentStep
                ? (overdue && index < 2 ? 'text-status-progress-fg' : 'text-brand-700')
                : index < currentStep ? 'text-status-done-fg' : 'text-[#B7BCC5]'"
            />
          </div>
          <span
            class="whitespace-nowrap text-xs font-semibold leading-[1.2]"
            :class="index <= currentStep ? 'text-ink' : 'text-[#B7BCC5]'"
          >
            {{ step.label }}
          </span>
          <span
            class="whitespace-nowrap text-[11px] font-medium leading-none tabular-nums"
            :class="index <= currentStep ? 'text-muted' : 'text-[#C4C8D0]'"
          >
            {{ stepCaption(step.key, index) }}
          </span>
        </div>
      </template>
    </div>
  </section>
</template>
