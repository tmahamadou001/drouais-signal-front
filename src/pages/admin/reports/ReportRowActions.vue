<script setup lang="ts">
/**
 * Les deux gestes rapides d'une ligne : la faire avancer, la supprimer.
 *
 * Un signalement résolu n'a plus d'étape suivante — l'emplacement reste occupé
 * par un espace de même taille, pour que la colonne ne se décale pas d'une
 * ligne à l'autre.
 */
import { computed } from 'vue'
import type { Report, ReportStatus } from '@/types'
import AppIcon from '@/components/AppIcon.vue'
import { nextStatus } from '@/lib/reportStatus'

const props = defineProps<{
  report: Report
  loading: boolean
  /** La suppression engage la commune : elle reste à l'administrateur. */
  canDelete: boolean
}>()

const emit = defineEmits<{ advance: [status: ReportStatus]; remove: [] }>()

const next = computed(() => nextStatus(props.report.status))
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
