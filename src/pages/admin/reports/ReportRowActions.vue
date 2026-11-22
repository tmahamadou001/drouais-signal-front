<script setup lang="ts">
/**
 * Les gestes rapides d'une ligne : la faire avancer, la trier (⋯), la supprimer.
 *
 * Un signalement résolu n'a plus d'étape suivante — l'emplacement reste occupé
 * par un espace de même taille, pour que la colonne ne se décale pas d'une
 * ligne à l'autre.
 */
import { computed, nextTick, ref } from 'vue'
import type { Report, ReportStatus } from '@/types'
import AppIcon from '@/components/AppIcon.vue'
import { nextStatus, isClosed } from '@/lib/reportStatus'
import { useDismiss } from '@/composables/useDismiss'

const props = defineProps<{
  report: Report
  loading: boolean
  /** La suppression engage la commune : elle reste à l'administrateur. */
  canDelete: boolean
}>()

const emit = defineEmits<{ advance: [status: ReportStatus]; remove: []; lifecycle: ['annule' | 'indesirable' | 'merge'] }>()

const next = computed(() => nextStatus(props.report.status))

/**
 * Le menu « ⋯ » : fusionner, annuler, classer indésirable.
 *
 * Il est rendu dans `body`, positionné sur le bouton : la table défile et rogne ses
 * débordements, et un menu posé dans la cellule disparaissait sous la dernière ligne.
 * Un signalement clos n'en a pas — on le rouvre depuis sa fiche.
 */
const canTriage = computed(() => !isClosed(props.report.status))
const open = ref(false)
const anchor = ref<HTMLElement | null>(null)
const position = ref({ top: 0, right: 0 })
useDismiss(anchor, () => { open.value = false })

async function toggle() {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  const rect = anchor.value?.getBoundingClientRect()
  if (rect) position.value = { top: rect.bottom + 6, right: window.innerWidth - rect.right }
}

function choose(mode: 'annule' | 'indesirable' | 'merge') {
  open.value = false
  emit('lifecycle', mode)
}
</script>

<template>
  <div class="flex items-center justify-end gap-1" @click.stop>
    <button
      v-if="next"
      class="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-brand-100 bg-white transition-colors hover:bg-brand-50 disabled:opacity-50"
      :disabled="loading"
      :title="next === 'resolu' ? 'Marquer résolu' : 'Prendre en charge'"
      @click="emit('advance', next)"
    >
      <AppIcon
        :name="next === 'resolu' ? 'CircleCheck' : 'Wrench'"
        :size="15" :stroke-width="1.75" class="text-brand-700"
      />
    </button>
    <span v-else class="h-[30px] w-[30px]" />

    <div v-if="canTriage" ref="anchor" class="flex-none">
      <button
        class="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line bg-white transition-colors hover:bg-canvas"
        title="Fusionner, annuler, classer indésirable" aria-haspopup="menu" :aria-expanded="open" data-testid="row-more"
        @click="toggle"
      >
        <AppIcon name="Ellipsis" :size="15" :stroke-width="1.75" class="text-muted" />
      </button>
      <Teleport to="body">
        <div
          v-if="open" role="menu" class="font-ui fixed z-[70] flex w-[220px] flex-col rounded-xl border border-line bg-white py-1 shadow-ds-lg"
          :style="{ top: `${position.top}px`, right: `${position.right}px` }" data-testid="row-menu"
        >
          <button role="menuitem" class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas" data-testid="row-merge" @click="choose('merge')">
            <AppIcon name="GitMerge" :size="14" :stroke-width="1.75" class="text-muted" /> Fusionner avec un autre…
          </button>
          <button role="menuitem" class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas" data-testid="row-annule" @click="choose('annule')">
            <AppIcon name="CircleX" :size="14" :stroke-width="1.75" class="text-muted" /> Annuler
          </button>
          <button role="menuitem" class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas" data-testid="row-indesirable" @click="choose('indesirable')">
            <AppIcon name="ShieldAlert" :size="14" :stroke-width="1.75" class="text-muted" /> Classer indésirable
          </button>
        </div>
      </Teleport>
    </div>

    <!-- Rouge au repos, pas seulement au survol : une suppression est
         irréversible, et la couleur est ce qui fait hésiter une demi-seconde
         avant de cliquer. -->
    <button
      v-if="canDelete"
      class="group flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-status-danger-bg transition-colors hover:bg-status-danger"
      title="Supprimer"
      @click="emit('remove')"
    >
      <AppIcon
        name="Trash2" :size="15" :stroke-width="1.75"
        class="text-status-danger transition-colors group-hover:text-white"
      />
    </button>
  </div>
</template>
