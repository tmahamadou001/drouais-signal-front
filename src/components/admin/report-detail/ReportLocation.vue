<script setup lang="ts">
/**
 * Où c'est, et comment y aller.
 *
 * La carte était une vignette muette : elle montrait un marqueur sans jamais
 * dire l'adresse ni offrir d'y conduire. Un agent qui ouvre cette fiche part
 * parfois sur le terrain — l'itinéraire existait déjà sur l'écran des services
 * extérieurs, et manquait au seul endroit où les agents municipaux passent.
 */
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import MapView from '@/components/MapView.vue'

const props = defineProps<{
  lat: number
  lng: number
  category: string
  address: string | null
}>()

const mapsUrl = computed(
  () => `https://www.google.com/maps/search/?api=1&query=${props.lat},${props.lng}`
)
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- `min-height` à zéro : le défaut de 300 px de `MapView` visait une carte
         de page et faisait déborder cette vignette, le marqueur tombant sous
         le cadre. -->
    <div class="h-[220px] overflow-hidden rounded-xl border border-line">
      <MapView
        :center="[lat, lng]"
        :zoom="16"
        min-height="0"
        :selected-position="{ lat, lng, category }"
      />
    </div>

    <div class="flex items-start gap-2 text-[13px] leading-[1.35]">
      <AppIcon name="MapPin" :size="14" :stroke-width="1.75" class="mt-px flex-none text-muted" />
      <span class="min-w-0 flex-1 text-ink">{{ address || 'Position sans adresse connue' }}</span>
    </div>

    <a
      :href="mapsUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-line text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
    >
      <AppIcon name="Navigation" :size="14" :stroke-width="1.75" />
      Ouvrir l’itinéraire
    </a>
  </div>
</template>
