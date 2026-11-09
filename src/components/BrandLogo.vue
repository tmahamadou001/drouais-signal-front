<script setup lang="ts">
/**
 * La marque OnSignale, version **courte** : l'anneau et le point.
 *
 * Un anneau — la vie ordinaire de la commune — interrompu par un point ambre,
 * le problème qu'on remarque. Le point prend la place du morceau manquant.
 *
 * Réservée aux endroits où la place manque : favicon, avatar, pastille. Dans
 * un en-tête, c'est `BrandWordmark` qu'il faut, où l'anneau devient le « O »
 * du nom. La charte interdit d'écrire « OnSignale » à côté de cette marque :
 * deux O, l'un dessiné, l'autre typographique.
 *
 * C'est la seule image vectorielle écrite à la main du client — toutes les
 * icônes passent par `AppIcon` et lucide. Un logo n'est pas une icône, il
 * n'existe dans aucune bibliothèque.
 */
import { computed } from 'vue'
import { DOT, MARK_TONES, RING, VIEW_BOX, type MarkTone } from '@/lib/markGeometry'

const props = withDefaults(defineProps<{ size?: number; tone?: MarkTone }>(), {
  size: 30,
  tone: 'navy',
})

const palette = computed(() => MARK_TONES[props.tone])
</script>

<template>
  <svg
    :viewBox="VIEW_BOX"
    class="block flex-none"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    aria-label="OnSignale"
  >
    <path
      :d="RING.d"
      fill="none"
      :stroke="palette.fg"
      :stroke-width="RING.strokeWidth"
      stroke-linecap="round"
    />
    <circle :cx="DOT.cx" :cy="DOT.cy" :r="DOT.r" :fill="palette.dot" />
  </svg>
</template>
