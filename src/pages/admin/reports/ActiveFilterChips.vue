<script setup lang="ts">
/**
 * Les filtres en vigueur, dits en toutes lettres et retirables d'un clic.
 *
 * Une liste filtrée qu'on ne sait plus filtrer est la panne la plus discrète d'un
 * tableau : « pourquoi n'y a-t-il que trois lignes ? » Cette ligne répond, et ne
 * prend de place que lorsqu'il y a quelque chose à répondre.
 */
import AppIcon from '@/components/AppIcon.vue'

export interface ActiveChip { key: string; label: string }

defineProps<{ chips: ActiveChip[] }>()
const emit = defineEmits<{ remove: [key: string]; clear: [] }>()
</script>

<template>
  <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-1.5" data-testid="active-filters" aria-label="Filtres actifs">
    <button
      v-for="chip in chips" :key="chip.key"
      class="flex h-7 items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 pl-3 pr-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
      :data-testid="`chip-${chip.key}`" :aria-label="`Retirer le filtre : ${chip.label}`"
      @click="emit('remove', chip.key)"
    >
      {{ chip.label }}
      <AppIcon name="X" :size="12" :stroke-width="2.5" />
    </button>
    <button class="h-7 rounded-full px-2.5 text-xs font-semibold text-muted underline-offset-2 hover:text-ink hover:underline" data-testid="clear-filters" @click="emit('clear')">
      Tout effacer
    </button>
  </div>
</template>
