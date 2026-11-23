<script setup lang="ts">
/**
 * Les gestes qui font avancer — ou reculer — un signalement.
 *
 * Le bas du panneau est fixe : il prend le moins de place possible.
 *
 *  - **avancer** est l'action principale, sur une seule rangée de 36 px ;
 *  - **transmettre** reste à part, en lien discret sous elle. Ce n'est pas une
 *    étape du traitement mais une délégation ; à côté de « Prendre en charge »,
 *    elle laisserait croire qu'il faut choisir entre les deux ;
 *  - **le reste** — prévoir, corriger, fusionner, annuler, et **revenir en arrière**
 *    (un rattrapage d'erreur : nécessaire, jamais mis en avant) — est dans un seul
 *    menu « Plus d'actions ».
 *
 * Et « Marquer résolu » passe par une confirmation : le statut devient définitif,
 * et ne se quitte plus que par « Rouvrir », motif à l'appui.
 */
import { ref, computed, nextTick } from 'vue'
import type { Report, ReportStatus } from '@/types'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import LifecycleDialog, { type LifecycleMode } from './LifecycleDialog.vue'
import MergeDialog from './MergeDialog.vue'
import CategoryDialog from './CategoryDialog.vue'
import { useLifecycle } from '@/composables/useLifecycle'
import { useDismiss } from '@/composables/useDismiss'
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
  /** Une réouverture ou une planification a été enregistrée : recharger la fiche. */
  changed: []
}>()

const lifecycle = useLifecycle()
const moreOpen = ref(false)

/**
 * Le menu est rendu dans `body`, ancré au bouton — comme le « ⋯ » du tableau.
 *
 * Posé dans le pied du panneau, il passait **sous** la carte de localisation (les couches de Leaflet
 * montent jusqu'à z-index 1000) et se faisait rogner par le conteneur défilant. Il s'ouvre vers le
 * haut, le pied étant en bas de l'écran, et la liste défile si la place manque.
 */
const moreAnchor = ref<HTMLElement | null>(null)
const menuPosition = ref({ bottom: 0, right: 0, maxHeight: 360 })
useDismiss(moreAnchor, () => { moreOpen.value = false })

async function toggleMore() {
  moreOpen.value = !moreOpen.value
  if (!moreOpen.value) return
  await nextTick()
  const box = moreAnchor.value?.getBoundingClientRect()
  if (!box) return
  menuPosition.value = {
    bottom: window.innerHeight - box.top + 6,
    right: Math.max(8, window.innerWidth - box.right),
    maxHeight: Math.max(160, box.top - 14),
  }
}
const dialogMode = ref<LifecycleMode | null>(null)
const mergeOpen = ref(false)
const categoryOpen = ref(false)

function openOther(which: 'merge' | 'category') {
  moreOpen.value = false
  if (which === 'merge') mergeOpen.value = true
  else categoryOpen.value = true
}

async function onMerge(targetId: string) {
  if (await lifecycle.merge(props.report.id, targetId)) {
    mergeOpen.value = false
    emit('changed')
  }
}

async function onCategory(category: string) {
  if (await lifecycle.changeCategory(props.report.id, category)) {
    categoryOpen.value = false
    emit('changed')
  }
}

function openDialog(mode: LifecycleMode) {
  moreOpen.value = false
  dialogMode.value = mode
}

async function onLifecycleSubmit(payload: { text: string; date: string | null; target: 'en_attente' | 'pris_en_charge' }) {
  const mode = dialogMode.value
  if (!mode) return

  if (mode === 'annule' || mode === 'indesirable') {
    dialogMode.value = null
    emit('updateStatus', mode, payload.text)
    return
  }

  const ok = mode === 'reopen'
    ? await lifecycle.reopen(props.report.id, payload.text, payload.target)
    : await lifecycle.plan(props.report.id, payload.date, payload.text || null)

  if (ok) {
    dialogMode.value = null
    emit('changed')
  }
}

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
    ? `Transmettre à ${props.configuredRecipients.length > 1 ? 'ces intervenants' : 'cet intervenant'}`
    : 'Transmettre à un intervenant extérieur…'
)

function rollbackTo(status: ReportStatus) {
  moreOpen.value = false
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
    <p class="flex-1 text-xs leading-[1.4] text-muted">
      <span class="font-semibold text-ink">Signalement {{ STATUS_PILLS[report.status].label.toLowerCase() }}.</span>
      Son statut n’est plus modifiable ; on peut le rouvrir, motif à l’appui.
    </p>
    <button
      class="h-8 flex-none rounded-lg border border-line px-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-50"
      :disabled="loading" data-testid="reopen" @click="openDialog('reopen')"
    >
      Rouvrir
    </button>
  </div>

  <template v-else>
    <!-- Une seule rangée pour ce qu'on fait vingt fois par jour : avancer. -->
    <div class="flex items-center gap-2 whitespace-nowrap">
      <button
        v-if="report.status === 'en_attente' || report.status === 'transmis'"
        class="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-brand-700 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
        :disabled="loading"
        data-testid="take"
        @click="emit('updateStatus', 'pris_en_charge')"
      >
        <AppIcon name="Wrench" :size="15" :stroke-width="2" />
        Prendre en charge
      </button>

      <button
        class="flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
        :class="report.status === 'pris_en_charge' ? 'flex-1' : 'flex-none'"
        :disabled="loading"
        data-testid="resolve"
        @click="resolveOpen = true"
      >
        <AppIcon name="CircleCheck" :size="15" :stroke-width="2" class="text-status-success" />
        Marquer résolu
      </button>
    </div>

    <!-- Le reste tient sur une ligne discrète : transmettre (une délégation, pas
         une étape — d'où sa place à part) et tout ce qui sort du parcours. -->
    <div class="relative flex items-center justify-between gap-2">
      <button
        v-if="canTransmit"
        class="flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
        data-testid="transmit"
        @click="emit('transmit')"
      >
        <AppIcon name="Send" :size="13" :stroke-width="2" class="flex-none" />
        <span class="truncate">{{ transmitLabel }}</span>
      </button>
      <span v-else />

      <div ref="moreAnchor" class="flex-none">
      <button
        class="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-white hover:text-ink"
        data-testid="more-actions" aria-haspopup="menu" :aria-expanded="moreOpen" @click="toggleMore"
      >
        <AppIcon name="Ellipsis" :size="14" :stroke-width="2" />
        Plus d’actions
      </button>

      <Teleport to="body">
      <div
        v-if="moreOpen"
        role="menu"
        class="font-ui fixed z-[90] flex w-[260px] flex-col overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-ds-lg"
        :style="{ bottom: `${menuPosition.bottom}px`, right: `${menuPosition.right}px`, maxHeight: `${menuPosition.maxHeight}px` }"
        data-testid="more-menu"
      >
        <button role="menuitem" class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas" data-testid="open-plan" @click="openDialog('plan')">
          <AppIcon name="CalendarClock" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
          {{ report.planned_for ? 'Modifier la date d’intervention' : 'Prévoir l’intervention' }}
        </button>
        <button role="menuitem" class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas" data-testid="open-category" @click="openOther('category')">
          <AppIcon name="Tag" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
          Corriger la catégorie
        </button>
        <button role="menuitem" class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas" data-testid="open-merge" @click="openOther('merge')">
          <AppIcon name="GitMerge" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
          Fusionner avec un autre…
        </button>
        <button role="menuitem" class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas" data-testid="open-annule" @click="openDialog('annule')">
          <AppIcon name="CircleX" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
          Annuler le signalement
        </button>
        <button role="menuitem" class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas" data-testid="open-indesirable" @click="openDialog('indesirable')">
          <AppIcon name="ShieldAlert" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
          Classer comme indésirable
        </button>

        <!-- Le rattrapage d'erreur : dans le même menu, à part — nécessaire, jamais mis en avant. -->
        <template v-if="targets.length > 0">
          <p class="mt-1 border-t border-line px-3 pb-1 pt-2 text-[11px] font-semibold tracking-[0.06em] text-faint" data-testid="rollback-title">REVENIR À UNE ÉTAPE PRÉCÉDENTE</p>
          <button
            v-for="status in targets"
            :key="status"
            role="menuitem"
            class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:bg-canvas"
            :data-testid="`rollback-${status}`"
            @click="rollbackTo(status)"
          >
            <AppIcon :name="STATUS_PILLS[status].icon" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
            {{ STATUS_PILLS[status].label }}
          </button>
          <p class="px-3 pb-1 text-[11px] leading-[1.4] text-faint">Le retour est enregistré dans le journal d’audit.</p>
        </template>
      </div>
      </Teleport>
      </div>
    </div>
  </template>

  <LifecycleDialog
    :open="dialogMode !== null" :mode="dialogMode ?? 'plan'" :saving="lifecycle.saving.value || loading"
    :current-date="report.planned_for" @close="dialogMode = null" @submit="onLifecycleSubmit"
  />

  <MergeDialog :open="mergeOpen" :report-id="report.id" :saving="lifecycle.saving.value" @close="mergeOpen = false" @merge="onMerge" />
  <CategoryDialog :open="categoryOpen" :current="report.category" :saving="lifecycle.saving.value" @close="categoryOpen = false" @submit="onCategory" />

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
