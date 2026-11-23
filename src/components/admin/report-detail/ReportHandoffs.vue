<script setup lang="ts">
/**
 * Où ce signalement est parti hors de la mairie.
 *
 * Un intervenant extérieur — régie, prestataire, syndic — n'a pas de compte : on ne le voit
 * dans aucune équipe. Sans ce bloc, un signalement transmis mais que personne n'a en interne
 * se lisait comme « À assigner » tout court, et rien n'indiquait qu'il était déjà chez quelqu'un.
 *
 * Silencieux tant qu'il n'y a rien : une ligne « aucune transmission » sur chaque fiche serait du bruit.
 */
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { handoffName, handoffStateLabel, handoffTone } from '@/lib/handoff'
import type { TeamView } from '@/types/team'

const props = defineProps<{ team: TeamView | null }>()

const handoffs = computed(() => props.team?.handoffs ?? [])

const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
</script>

<template>
  <section
    v-if="handoffs.length > 0"
    class="flex flex-none flex-col gap-2 border-b border-line bg-white px-[22px] py-3"
    data-testid="report-handoffs"
  >
    <h3 class="flex items-center gap-1.5 text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
      <AppIcon name="Send" :size="12" :stroke-width="2" />
      TRANSMIS À UN INTERVENANT EXTÉRIEUR
    </h3>

    <ul class="flex flex-col gap-2">
      <li v-for="handoff in handoffs" :key="handoff.id" class="flex min-w-0 items-start gap-2.5" data-testid="handoff-row">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[13px] font-bold leading-tight text-brand-900">{{ handoffName(handoff) }}</p>
          <p class="mt-0.5 truncate text-xs leading-tight text-muted">{{ handoff.recipient }} · envoyé le {{ day(handoff.sentAt) }}</p>
        </div>
        <span class="flex-none text-xs font-semibold leading-tight" :class="handoffTone(handoff.state)" data-testid="handoff-state">
          {{ handoffStateLabel(handoff.state) }}
        </span>
      </li>
    </ul>
  </section>
</template>
