<script setup lang="ts">
/**
 * Ce qui est déjà signalé autour du point.
 *
 * Averti, jamais bloqué : deux problèmes peuvent voisiner — un lampadaire et
 * un nid-de-poule sur le même trottoir — et c'est l'agent qui sait. Un blocage
 * le pousserait à déplacer l'épingle pour contourner l'écran, ce qui fausserait
 * la seule donnée qui compte vraiment ici.
 */
import AppIcon from '@/components/AppIcon.vue'
import { statusLabel } from '@/lib/reportStatus'
import type { DuplicateReport } from '@/composables/useCreateReport'

defineProps<{ duplicates: DuplicateReport[] }>()
</script>

<template>
  <div v-if="duplicates.length > 0" class="rounded-[10px] border border-warning-200 bg-warning-50 p-3">
    <div class="mb-2 flex items-center gap-2">
      <AppIcon name="TriangleAlert" :size="14" class="text-warning-600" />
      <p class="text-[12px] font-semibold text-warning-700">
        {{ duplicates.length === 1 ? 'Un signalement proche existe déjà' : `${duplicates.length} signalements proches existent déjà` }}
      </p>
    </div>

    <ul class="flex flex-col gap-1.5">
      <li
        v-for="duplicate in duplicates"
        :key="duplicate.id"
        class="flex items-center gap-2 text-[12px] leading-[1.4] text-ink"
      >
        <span class="truncate font-medium">{{ duplicate.title }}</span>
        <span class="flex-none text-muted">· {{ duplicate.distance_meters }} m</span>
        <span class="flex-none text-muted">· {{ statusLabel(duplicate.status) }}</span>
      </li>
    </ul>

    <p class="mt-2 text-[11px] leading-[1.5] text-warning-700">
      Vous pouvez enregistrer quand même — deux problèmes peuvent se trouver au même endroit.
    </p>
  </div>
</template>
