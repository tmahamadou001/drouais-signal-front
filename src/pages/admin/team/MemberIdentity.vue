<script setup lang="ts">
/**
 * Le membre : ses initiales, son nom, son adresse.
 *
 * La teinte de la pastille vient du **rôle**, pas d'un tirage sur
 * l'identifiant. Six couleurs vives choisies au hasard — rose, violet,
 * turquoise — ne se voyaient nulle part ailleurs dans le back-office et ne
 * disaient rien : à couleur égale, autant qu'elle porte l'information qu'on
 * cherche de toute façon dans la colonne d'à côté.
 */
import { computed } from 'vue'
import { roleInfo } from '@/lib/roles'
import type { TeamMember } from '@/composables/useTeam'

const props = defineProps<{ member: TeamMember }>()

const displayName = computed(() => {
  const full = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ')
  return full || props.member.email?.split('@')[0] || 'Membre sans nom'
})

const initials = computed(() => {
  const { first_name: first, last_name: last, email } = props.member
  if (first && last) return (first[0] + last[0]).toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  if (email) return email.slice(0, 2).toUpperCase()
  return '??'
})
</script>

<template>
  <div class="flex min-w-0 items-center gap-[11px]">
    <div
      class="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-bold"
      :class="roleInfo(member.role).classes"
    >
      {{ initials }}
    </div>
    <div class="min-w-0">
      <div class="truncate text-sm font-semibold leading-[1.3] text-ink">{{ displayName }}</div>
      <div class="truncate text-xs leading-[1.3] text-muted">{{ member.email ?? '—' }}</div>
    </div>
  </div>
</template>
