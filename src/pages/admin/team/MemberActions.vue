<script setup lang="ts">
/**
 * Ce qu'on peut faire d'un membre, derrière un menu.
 *
 * Six actions en boutons sur chaque ligne feraient une colonne plus large que
 * le nom qu'elle accompagne. Elles sont rares — on invite une fois, on change
 * un rôle deux fois par an — et un menu est le bon prix pour ça.
 *
 * Le changement de rôle est **dans** le menu, sans modale : la boîte de
 * dialogue demandait de confirmer un choix déjà fait dans une liste
 * déroulante, ce qui est un clic de plus pour rien.
 */
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { ASSIGNABLE_ROLES, ROLES, type TeamRole } from '@/lib/roles'
import type { TeamMember } from '@/composables/useTeam'

const props = defineProps<{
  member: TeamMember
  /**
   * Ouvert ou non — décidé par la page, pas par la ligne.
   *
   * Chaque ligne gardait son propre état : ouvrir le menu d'un membre ne
   * refermait pas celui du précédent, et les deux se chevauchaient. Un seul
   * identifiant ouvert à la fois, tenu par l'écran, est la seule façon d'en
   * être sûr — une ligne ne sait rien de ses voisines.
   */
  open: boolean
  /** Ce membre est-il le dernier administrateur actif de la commune ? */
  isLastAdmin: boolean
  /** Le compte qui regarde — on ne se révoque pas soi-même. */
  isSelf: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  toggle: []
  changeRole: [role: TeamRole]
  setActive: [isActive: boolean]
  revoke: []
  resend: []
}>()

/**
 * Pourquoi certains gestes sont retirés.
 *
 * Écrit plutôt que deviné : un menu où les options disparaissent sans raison
 * donne l'impression d'un bug. Le serveur refuse de toute façon (409
 * `last_admin`) — ceci évite de le découvrir par une erreur.
 */
const blocked = computed(() => {
  if (props.isLastAdmin) return 'Dernier administrateur de la commune.'
  if (props.isSelf) return 'C’est votre propre compte.'
  return null
})

function pick(action: () => void) {
  emit('toggle')
  action()
}
</script>

<template>
  <div class="relative flex justify-end" @click.stop>
    <button
      class="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line bg-white transition-colors hover:bg-canvas disabled:opacity-40"
      :disabled="loading"
      title="Actions"
      @click="emit('toggle')"
    >
      <AppIcon name="MoreHorizontal" :size="16" :stroke-width="2" class="text-muted" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-[34px] z-20 flex w-[248px] flex-col overflow-hidden rounded-xl border border-line bg-white py-1 text-left shadow-ds-lg"
    >
      <!-- Relancer : la seule action que la page peut suggérer d'elle-même. -->
      <button
        v-if="member.status === 'invited'"
        class="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-canvas"
        @click="pick(() => emit('resend'))"
      >
        <AppIcon name="Send" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
        Renvoyer l’invitation
      </button>

      <p class="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">
        Rôle
      </p>
      <button
        v-for="role in ASSIGNABLE_ROLES"
        :key="role"
        class="flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-canvas disabled:opacity-40"
        :class="member.role === role ? 'font-semibold text-brand-700' : 'font-medium text-ink'"
        :disabled="member.role === role || (isLastAdmin && role !== 'admin')"
        @click="pick(() => emit('changeRole', role))"
      >
        <AppIcon :name="ROLES[role].icon" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
        {{ ROLES[role].label }}
        <AppIcon
          v-if="member.role === role"
          name="Check" :size="14" :stroke-width="2" class="ml-auto flex-none text-brand-700"
        />
      </button>

      <div class="my-1 h-px bg-line" />

      <button
        v-if="member.status === 'suspended'"
        class="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-canvas"
        @click="pick(() => emit('setActive', true))"
      >
        <AppIcon name="RotateCcw" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
        Rétablir l’accès
      </button>
      <button
        v-else
        class="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-status-danger transition-colors hover:bg-status-danger-bg disabled:opacity-40"
        :disabled="Boolean(blocked)"
        @click="pick(() => emit('revoke'))"
      >
        <AppIcon name="Ban" :size="15" :stroke-width="1.75" class="flex-none" />
        Révoquer l’accès
      </button>

      <p v-if="blocked" class="border-t border-line px-3 pb-1 pt-2 text-[11px] leading-[1.4] text-faint">
        {{ blocked }}
      </p>
    </div>
  </div>
</template>
