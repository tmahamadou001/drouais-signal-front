<script setup lang="ts">
/**
 * Ce qu'on peut faire d'une sélection.
 *
 * Dans l'ordre où on les emploie : prendre en charge en interne, confier à un
 * service, trier (fusionner, annuler, classer indésirable), supprimer. Le dernier
 * est le seul en rouge plein — il est irréversible et porte sur plusieurs lignes.
 */
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  loading: boolean
  /** La suppression engage la commune : elle reste à l'administrateur. */
  canDelete: boolean
}>()

defineEmits<{ takeCharge: []; transmit: []; remove: []; lifecycle: ['annule' | 'indesirable' | 'merge'] }>()
</script>

<template>
  <button
    class="flex h-8 flex-none items-center gap-[7px] rounded-lg bg-brand-700 px-[11px] text-xs font-semibold leading-none text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
    :disabled="loading"
    @click="$emit('takeCharge')"
  >
    <AppIcon name="Wrench" :size="14" :stroke-width="2" />
    Prendre en charge
  </button>

  <!-- Le cas qui l'appelle : une tournée de la régie, sept lampadaires éteints
       dans le même quartier. Les ouvrir un à un pour répéter sept fois le même
       geste était la seule façon de le faire. -->
  <button
    class="flex h-8 flex-none items-center gap-[7px] rounded-lg border border-line bg-white px-[11px] text-xs font-semibold leading-none text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-50"
    :disabled="loading"
    @click="$emit('transmit')"
  >
    <AppIcon name="Send" :size="14" :stroke-width="2" />
    Transmettre
  </button>

  <!-- Le tri de fin de journée : ce qui ne sera pas traité, et les doublons. -->
  <button
    class="flex h-8 flex-none items-center gap-[7px] rounded-lg border border-line bg-white px-[11px] text-xs font-semibold leading-none text-ink transition-colors hover:bg-canvas disabled:opacity-50"
    :disabled="loading" data-testid="bulk-merge" @click="$emit('lifecycle', 'merge')"
  >
    <AppIcon name="GitMerge" :size="14" :stroke-width="2" />
    Fusionner
  </button>
  <button
    class="flex h-8 flex-none items-center gap-[7px] rounded-lg border border-line bg-white px-[11px] text-xs font-semibold leading-none text-ink transition-colors hover:bg-canvas disabled:opacity-50"
    :disabled="loading" data-testid="bulk-annule" @click="$emit('lifecycle', 'annule')"
  >
    <AppIcon name="CircleX" :size="14" :stroke-width="2" />
    Annuler
  </button>
  <button
    class="flex h-8 flex-none items-center gap-[7px] rounded-lg border border-line bg-white px-[11px] text-xs font-semibold leading-none text-ink transition-colors hover:bg-canvas disabled:opacity-50"
    :disabled="loading" data-testid="bulk-indesirable" @click="$emit('lifecycle', 'indesirable')"
  >
    <AppIcon name="ShieldAlert" :size="14" :stroke-width="2" />
    Indésirable
  </button>

  <button
    v-if="canDelete"
    class="flex h-8 flex-none items-center gap-[7px] rounded-lg bg-status-danger px-[11px] text-xs font-semibold leading-none text-white transition-colors hover:bg-[#B42222]"
    @click="$emit('remove')"
  >
    <AppIcon name="Trash2" :size="14" :stroke-width="2" />
    Supprimer
  </button>
</template>
