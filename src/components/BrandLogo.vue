<script setup lang="ts">
/**
 * La marque OnSignale — « Le coup de feutre ».
 *
 * Une boucle tracée à la main qui se referme puis s'échappe vers le haut à
 * droite, autour d'un point ambre : le geste qu'on fait quand on entoure un
 * problème sur une photo. Elle remplace le bouclier, qui promettait de la
 * protection là où le service promet du traitement.
 *
 * Elle vit ici plutôt qu'en balisage recopié dans chaque écran. Elle l'était
 * dans la barre latérale et dans la coque d'authentification, et une des deux
 * copies avait déjà disparu sans que rien ne le signale — un logo absent ne
 * casse aucun test.
 *
 * C'est la seule image vectorielle écrite à la main du client : toutes les
 * icônes passent par `AppIcon` et lucide. Un logo n'est pas une icône, il
 * n'existe dans aucune bibliothèque.
 */
import { computed } from 'vue'
import {
  MARK_MAIN,
  MARK_SMALL,
  MARK_TONES,
  SMALL_MARK_THRESHOLD_PX,
  type MarkTone,
} from '@/lib/markGeometry'

const props = withDefaults(defineProps<{ size?: number; tone?: MarkTone; small?: boolean }>(), {
  size: 30,
  tone: 'navy',
  small: false,
})

const geometry = computed(() =>
  props.small || props.size < SMALL_MARK_THRESHOLD_PX ? MARK_SMALL : MARK_MAIN,
)

const palette = computed(() => MARK_TONES[props.tone])
</script>

<template>
  <svg
    viewBox="0 0 100 100"
    class="block flex-none"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    aria-label="OnSignale"
  >
    <path :d="geometry.fill" :fill="palette.stroke" />
    <circle
      v-for="cap in geometry.caps"
      :key="`${cap[0]}-${cap[1]}`"
      :cx="cap[0]"
      :cy="cap[1]"
      :r="cap[2]"
      :fill="palette.stroke"
    />
    <circle :cx="geometry.dot[0]" :cy="geometry.dot[1]" :r="geometry.dot[2]" :fill="palette.dot" />
  </svg>
</template>
