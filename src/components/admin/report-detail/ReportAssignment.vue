<script setup lang="ts">
/**
 * À qui est confié ce signalement.
 *
 * Une barre sous l'en-tête, visible sur **toutes** les vues : savoir qui a le
 * signalement ne se cloisonne pas, pas plus que le statut. Un signalement que
 * personne n'a le dit en orange, parce que c'est ce qui attend quelqu'un.
 *
 * Les membres de l'équipe qui ne peuvent pas assigner (un observateur) voient
 * l'information sans le bouton : un bouton grisé inviterait à chercher comment
 * l'activer.
 */
import AppIcon from '@/components/AppIcon.vue'
import { computed } from 'vue'
import type { TeamView } from '@/types/team'

const props = defineProps<{ team: TeamView | null; canAct: boolean; closed: boolean }>()

/**
 * Ce que les habitants ont dit, d'un coup d'œil : « 4 toujours là · 1 plus là ».
 * Silencieux tant que personne n'a voté — une ligne de zéros n'apprend rien.
 */
const votesLine = computed(() => {
  const votes = props.team?.votes
  if (!votes) return null
  const parts = [
    votes.toujours_la ? `${votes.toujours_la} toujours là` : null,
    votes.plus_la ? `${votes.plus_la} plus là` : null,
    votes.suivre ? `${votes.suivre} suivent` : null,
    votes.merci ? `${votes.merci} merci${votes.merci > 1 ? 's' : ''}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? `Habitants : ${parts.join(' · ')}` : null
})
const emit = defineEmits<{ assign: [] }>()
</script>

<template>
  <div
    v-if="team"
    class="flex flex-none items-center gap-3 border-b border-line px-[22px] py-3"
    :class="!team.assignee && !team.service && !closed ? 'bg-status-pending-bg' : 'bg-white'"
    data-testid="report-assignment"
  >
    <span class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-canvas">
      <AppIcon :name="team.assignee ? 'UserCheck' : 'UserPlus'" :size="15" :stroke-width="1.75" class="text-brand-700" />
    </span>

    <div class="min-w-0 flex-1">
      <p v-if="team.assignee" class="truncate text-[13px] font-bold leading-tight text-brand-900" data-testid="assignee-name">
        {{ team.assignee.name ?? 'Un ancien collègue' }}
      </p>
      <p v-else-if="team.service" class="truncate text-[13px] font-bold leading-tight text-brand-900">Service {{ team.service.name }}</p>
      <p v-else class="text-[13px] font-bold leading-tight text-ink" data-testid="to-assign">À assigner</p>

      <p class="mt-0.5 truncate text-xs leading-tight text-muted">
        <template v-if="team.assignee && team.service">Service {{ team.service.name }}</template>
        <template v-else-if="!team.assignee && !team.service && !closed">Personne n’a encore ce signalement.</template>
        <template v-else-if="team.assignee">Aucun service rattaché</template>
      </p>
      <p v-if="votesLine" class="mt-0.5 truncate text-xs font-medium leading-tight text-brand-700" data-testid="votes-line">{{ votesLine }}</p>
    </div>

    <button
      v-if="canAct && !closed"
      class="h-8 flex-none rounded-[10px] border border-line bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-canvas"
      data-testid="open-assign"
      @click="emit('assign')"
    >
      {{ team.assignee || team.service ? 'Modifier' : 'Assigner' }}
    </button>
  </div>
</template>
