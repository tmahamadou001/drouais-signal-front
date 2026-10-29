<script setup lang="ts">
/**
 * Les gestes qui font avancer — ou reculer — un signalement.
 *
 * Trois familles, volontairement séparées :
 *
 *  - **transmettre** est sur sa propre ligne. Ce n'est pas une étape du
 *    traitement mais une délégation ; à côté de « Prendre en charge », elle
 *    laisserait croire qu'il faut choisir entre les deux ;
 *  - **avancer** est l'action principale, pleine largeur ;
 *  - **revenir en arrière** est discret, à la ligne, derrière un menu. C'est un
 *    rattrapage d'erreur : nécessaire, jamais mis en avant.
 *
 * Et « Marquer résolu » passe par une confirmation, parce que c'est le seul
 * geste qu'on ne peut pas défaire.
 */
import { ref, computed } from 'vue'
import type { Report, ReportStatus } from '@/types'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import { STATUS_PILLS, isFinal, rollbackTargets } from '@/lib/reportStatus'

const props = defineProps<{
  report: Report
  loading: boolean
  /** Destinataires déjà configurés sur la catégorie du signalement. */
  configuredRecipients: string[]
}>()

const emit = defineEmits<{
  updateStatus: [status: ReportStatus, comment?: string]
  transmit: []
}>()

const rollbackOpen = ref(false)
const resolveOpen = ref(false)

const targets = computed(() => rollbackTargets(props.report.status))

const final = computed(() => isFinal(props.report.status))

/**
 * Transmettre a un sens tant que le signalement n'est pas clos.
 *
 * Y compris s'il est déjà pris en charge : l'agent découvre que ça relève de la
 * régie, ou le premier envoi n'a rien donné. Le statut, lui, ne recule pas —
 * c'est le serveur qui s'en assure.
 */
const canTransmit = computed(() => !final.value)

const transmitLabel = computed(() =>
  props.configuredRecipients.length > 0
    ? `Transmettre à ${props.configuredRecipients.length > 1 ? 'ces services' : 'ce service'}`
    : 'Transmettre à un service…'
)

function rollbackTo(status: ReportStatus) {
  rollbackOpen.value = false
  emit('updateStatus', status, `Retour à « ${STATUS_PILLS[status].label} »`)
}

function confirmResolve() {
  resolveOpen.value = false
  emit('updateStatus', 'resolu')
}
</script>

<template>
  <!-- Clos : plus rien à proposer, et il vaut mieux le dire que laisser des
       boutons inertes. -->
  <div
    v-if="final"
    class="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3"
  >
    <AppIcon name="CircleCheck" :size="17" :stroke-width="2" class="flex-none text-status-success" />
    <p class="text-xs leading-[1.4] text-muted">
      <span class="font-semibold text-ink">Signalement résolu.</span>
      Son statut n’est plus modifiable — l’habitant en a été informé.
    </p>
  </div>

  <template v-else>
    <button
      v-if="canTransmit"
      class="flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
      @click="emit('transmit')"
    >
      <AppIcon name="Send" :size="15" :stroke-width="2" />
      {{ transmitLabel }}
    </button>

    <div class="flex items-center gap-2.5 whitespace-nowrap">
      <button
        v-if="report.status === 'en_attente' || report.status === 'transmis'"
        class="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
        :disabled="loading"
        @click="emit('updateStatus', 'pris_en_charge')"
      >
        <AppIcon name="Wrench" :size="17" :stroke-width="2" />
        Prendre en charge
      </button>

      <button
        class="flex h-[46px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
        :class="report.status === 'pris_en_charge' ? 'flex-1' : 'flex-none'"
        :disabled="loading"
        @click="resolveOpen = true"
      >
        <AppIcon name="CircleCheck" :size="17" :stroke-width="2" class="text-status-success" />
        Marquer résolu
      </button>
    </div>

    <!-- Le rattrapage d'erreur : discret, mais là. -->
    <div v-if="targets.length > 0" class="relative flex justify-center">
      <button
        class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-white hover:text-ink"
        @click="rollbackOpen = !rollbackOpen"
      >
        <AppIcon name="Undo2" :size="13" :stroke-width="2" />
        Revenir à une étape précédente
      </button>

      <div
        v-if="rollbackOpen"
        class="absolute bottom-full z-10 mb-1.5 flex w-[248px] flex-col overflow-hidden rounded-xl border border-line bg-white py-1 shadow-ds-lg"
      >
        <button
          v-for="status in targets"
          :key="status"
          class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:bg-canvas"
          @click="rollbackTo(status)"
        >
          <AppIcon :name="STATUS_PILLS[status].icon" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
          {{ STATUS_PILLS[status].label }}
        </button>
        <p class="border-t border-line px-3 pb-1 pt-2 text-[11px] leading-[1.4] text-faint">
          Le retour est enregistré dans le journal d’audit.
        </p>
      </div>
    </div>
  </template>

  <!-- La seule action irréversible de l'écran mérite d'être annoncée avant,
       pas découverte après. -->
  <AppModal
    :open="resolveOpen"
    title="Marquer ce signalement résolu"
    description="L’habitant sera prévenu que son signalement est traité. Le statut deviendra définitif : il ne pourra plus être modifié ni ramené en arrière."
    confirm-text="Marquer résolu"
    cancel-text="Annuler"
    :loading="loading"
    @confirm="confirmResolve"
    @cancel="resolveOpen = false"
    @close="resolveOpen = false"
  />
</template>
