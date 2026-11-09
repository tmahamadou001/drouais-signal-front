<script setup lang="ts">
/**
 * La marque OnSignale, version **longue** : l'anneau remplace le « O ».
 *
 * C'est la version des en-têtes — barre latérale, page de connexion,
 * documents. Le nom reprend donc à « n », et l'anneau tient la place du O :
 * le logo et le nom ne font qu'un.
 *
 * Les proportions sont en `em` de la taille du nom, donc indépendantes de la
 * taille d'affichage. `baselineOffsetEm` corrige l'optique — un disque aligné
 * géométriquement sur la ligne de base paraît flotter.
 *
 * Instrument Sans Bold est exigée par la charte, et pas seulement par goût :
 * l'écart et la taille de l'anneau sont mesurés sur cette police. C'est la
 * police par défaut de l'admin, donc `font-sans` suffit.
 */
import BrandLogo from './BrandLogo.vue'
import { MARK_TONES, MARK_TOP_EM, WORDMARK, type MarkTone } from '@/lib/markGeometry'

const props = withDefaults(defineProps<{ height?: number; tone?: MarkTone }>(), {
  height: 22,
  tone: 'navy',
})
</script>

<template>
  <span class="inline-flex w-fit items-start" role="img" aria-label="OnSignale">
    <BrandLogo
      :size="props.height * WORDMARK.markSizeEm"
      :tone="props.tone"
      :style="{
        marginRight: `${props.height * WORDMARK.gapEm}px`,
        marginTop: `${props.height * MARK_TOP_EM}px`,
      }"
    />
    <span
      class="font-sans font-bold"
      :style="{
        fontSize: `${props.height}px`,
        lineHeight: 1,
        letterSpacing: `${WORDMARK.letterSpacingEm}em`,
        color: MARK_TONES[props.tone].fg,
      }"
    >{{ WORDMARK.text }}</span>
  </span>
</template>
