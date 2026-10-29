<script setup lang="ts">
/**
 * L'état du parc, au gabarit des autres écrans.
 *
 * Quatre chiffres sans contexte — « Actifs 3 », « Trial 1 » — ne disaient pas
 * s'il fallait faire quelque chose. Chacun porte maintenant sa mention, et
 * « suspendus » se teinte seulement quand il y en a : un zéro en rouge attire
 * l'œil sur une bonne nouvelle.
 */
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  stats: { active: number; trial: number; demo: number; suspended: number; total: number }
}>()
</script>

<template>
  <div class="grid flex-none grid-cols-2 gap-3.5 lg:grid-cols-4">
    <div class="flex flex-col gap-3.5 rounded-[14px] bg-brand-900 px-[18px] py-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">COLLECTIVITÉS</span>
        <AppIcon name="Globe" :size="16" :stroke-width="1.75" class="text-brand-500" />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white">
          {{ stats.total }}
        </span>
        <span class="whitespace-nowrap text-xs font-semibold leading-none text-brand-500">
          sur la plateforme
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">ACTIVES</span>
        <AppIcon name="CircleCheck" :size="16" :stroke-width="1.75" class="text-status-success" />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
          {{ stats.active }}
        </span>
        <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">clientes</span>
      </div>
    </div>

    <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">EN ESSAI</span>
        <AppIcon name="Hourglass" :size="16" :stroke-width="1.75" class="text-status-progress-dot" />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <span class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
          {{ stats.trial }}
        </span>
        <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">
          {{ stats.demo > 0 ? `+ ${stats.demo} en démo` : 'aucune démo' }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white px-[18px] py-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">SUSPENDUES</span>
        <AppIcon
          name="Ban" :size="16" :stroke-width="1.75"
          :class="stats.suspended > 0 ? 'text-status-danger' : 'text-neutral-400'"
        />
      </div>
      <div class="flex items-end justify-between gap-2.5">
        <!-- Un zéro en rouge attirerait l'œil sur une bonne nouvelle. -->
        <span
          class="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums"
          :class="stats.suspended > 0 ? 'text-status-danger' : 'text-ink'"
        >
          {{ stats.suspended }}
        </span>
        <span class="whitespace-nowrap text-xs font-semibold leading-none text-muted">
          {{ stats.suspended > 0 ? 'accès coupé' : 'aucune coupure' }}
        </span>
      </div>
    </div>
  </div>
</template>
