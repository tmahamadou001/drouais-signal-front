<script setup lang="ts">
/**
 * Qui a ce signalement, dans la liste.
 *
 * Un signalement que personne n'a est dit « À assigner » en orange : c'est ce qui
 * attend quelqu'un, et le laisser neutre le ferait lire comme une colonne vide.
 *
 * Et s'il a été **transmis à un intervenant extérieur** — réglé sur la catégorie ou fait à la main —,
 * une seconde ligne le dit, avec où il en est : sans elle, un signalement que personne n'a en
 * interne se lisait comme oublié alors qu'il était chez la régie.
 */
import { computed } from 'vue'
import type { Report } from '@/types'
import AppIcon from '@/components/AppIcon.vue'
import { handoffName, handoffShortLabel, handoffStateLabel, handoffTone } from '@/lib/handoff'

const props = defineProps<{
  report: Report
  /** Nom du responsable, ou `null` s'il a quitté l'équipe. */
  assigneeName: string | null
  serviceName: string | null
  serviceColor: string | null
  closed: boolean
}>()

const initials = computed(() =>
  (props.assigneeName ?? '')
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
)

const assigned = computed(() => Boolean(props.report.assignee_id))
const external = computed(() => props.report.external ?? null)
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1" data-testid="assignee-cell">
   <div class="flex min-w-0 items-center gap-2">
    <template v-if="assigned">
      <span class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
        {{ initials || '?' }}
      </span>
      <span class="min-w-0">
        <span class="block truncate text-[13px] font-medium leading-tight text-ink">{{ assigneeName ?? 'Ancien collègue' }}</span>
        <span v-if="serviceName" class="block truncate text-[11px] leading-tight text-muted">{{ serviceName }}</span>
      </span>
    </template>
    <span v-else-if="serviceName" class="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ink">
      <span class="h-2 w-2 flex-none rounded-full bg-neutral-300" :style="serviceColor ? { backgroundColor: serviceColor } : {}" />
      <span class="truncate">{{ serviceName }}</span>
    </span>
    <span v-else-if="!closed" class="text-[13px] font-semibold text-status-progress-fg" data-testid="to-assign-cell">À assigner</span>
    <span v-else class="text-[13px] text-faint">—</span>
   </div>

   <p
     v-if="external"
     class="flex min-w-0 items-center gap-1 text-[11px] font-semibold leading-tight"
     :class="handoffTone(external.state)"
     :title="`${handoffName(external)} · ${handoffStateLabel(external.state)}`"
     data-testid="external-line"
   >
     <AppIcon name="Send" :size="11" :stroke-width="2" class="flex-none" />
     <span class="truncate">{{ handoffName(external) }} · {{ handoffShortLabel(external.state) }}</span>
   </p>
  </div>
</template>
