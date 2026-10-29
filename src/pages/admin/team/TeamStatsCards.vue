<script setup lang="ts">
/**
 * Les quatre compteurs de l'écran Équipe, au gabarit des autres pages.
 *
 * Chacun porte son contexte, comme ceux des signalements : « 4 membres » ne
 * dit pas s'il y a quelque chose à faire, « dont 1 invitation en attente » si.
 */
import AppIcon from '@/components/AppIcon.vue'
import type { TeamMember } from '@/composables/useTeam'

const props = defineProps<{ members: TeamMember[] }>()

const count = (predicate: (member: TeamMember) => boolean) =>
  props.members.filter(predicate).length
</script>

<template>
  <div class="grid flex-none grid-cols-2 gap-3.5 lg:grid-cols-4">
    <div class="flex flex-col gap-3.5 rounded-[14px] bg-brand-900 px-[18px] py-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">ÉQUIPE</span>
        <AppIcon name="Users" :size="16" :stroke-width="1.75" class="text-brand-500" />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white">
          {{ count((member) => member.status === 'active') }}
        </span>
        <span
          v-if="count((member) => member.status === 'invited') > 0"
          class="whitespace-nowrap text-xs font-semibold leading-none tabular-nums"
          style="color: #EF9F27"
        >
          {{ count((member) => member.status === 'invited') }} invitation{{ count((member) => member.status === 'invited') > 1 ? 's' : '' }} en attente
        </span>
        <span v-else class="whitespace-nowrap text-xs font-semibold leading-none text-brand-500">
          tout le monde a rejoint
        </span>
      </div>
    </div>

    <div
      v-for="card in [
        { role: 'admin',    label: 'ADMINISTRATEURS', icon: 'Shield', hint: 'règlent la commune' },
        { role: 'agent',    label: 'AGENTS',          icon: 'Wrench', hint: 'traitent les signalements' },
        { role: 'observer', label: 'OBSERVATEURS',    icon: 'Eye',    hint: 'consultent sans modifier' },
      ]"
      :key="card.role"
      class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4"
    >
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">{{ card.label }}</span>
        <AppIcon :name="card.icon" :size="16" :stroke-width="1.75" class="text-neutral-400" />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
          {{ count((member) => member.role === card.role && member.status !== 'suspended') }}
        </span>
        <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">{{ card.hint }}</span>
      </div>
    </div>
  </div>
</template>
