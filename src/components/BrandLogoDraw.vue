<script setup lang="ts">
/**
 * La marque qui s'écrit, au chargement de la page de connexion.
 *
 * L'anneau se trace depuis le bord droit de l'ouverture, le point ambre vient
 * s'y poser, puis le nom apparaît en glissant à sa place. L'animation montre
 * l'idée du logo plutôt qu'elle ne l'orne : la vie ordinaire se déroule, le
 * problème apparaît, et on le nomme.
 *
 * Elle se joue **une fois**. Le kit fournit une version en boucle, réservée aux
 * présentations : une marque qui se redessine sans fin derrière un formulaire
 * se regarde au lieu de se remplir.
 *
 * Le trait est un vrai `stroke`, donc le tracé s'anime directement par
 * `stroke-dashoffset` — sans le masque qu'exigeait le logo précédent, dont
 * l'épaisseur variait.
 */
import { DOT, MARK_TONES, MARK_TOP_EM, RING, VIEW_BOX, WORDMARK, type MarkTone } from '@/lib/markGeometry'

const props = withDefaults(defineProps<{ height?: number; tone?: MarkTone }>(), {
  height: 34,
  tone: 'white',
})
</script>

<template>
  <span class="brand-draw inline-flex w-fit items-start" role="img" aria-label="OnSignale">
    <svg
      :viewBox="VIEW_BOX"
      class="block flex-none"
      :style="{
        width: `${props.height * WORDMARK.markSizeEm}px`,
        height: `${props.height * WORDMARK.markSizeEm}px`,
        marginRight: `${props.height * WORDMARK.gapEm}px`,
        marginTop: `${props.height * MARK_TOP_EM}px`,
      }"
    >
      <path
        class="brand-draw__ring"
        :d="RING.d"
        fill="none"
        :stroke="MARK_TONES[props.tone].fg"
        :stroke-width="RING.strokeWidth"
        stroke-linecap="round"
        :style="{ strokeDasharray: RING.length, '--ring-length': RING.length }"
      />
      <circle
        class="brand-draw__dot"
        :cx="DOT.cx"
        :cy="DOT.cy"
        :r="DOT.r"
        :fill="MARK_TONES[props.tone].dot"
      />
    </svg>

    <span
      class="brand-draw__name font-sans font-bold"
      :style="{
        fontSize: `${props.height}px`,
        lineHeight: 1,
        letterSpacing: `${WORDMARK.letterSpacingEm}em`,
        color: MARK_TONES[props.tone].fg,
        '--name-shift': `${-props.height * 0.14}px`,
      }"
    >{{ WORDMARK.text }}</span>
  </span>
</template>

<style scoped>
/* Durées et courbes de la charte, §2. */
.brand-draw__ring {
  stroke-dashoffset: var(--ring-length);
  animation: brand-ring 1.2s cubic-bezier(0.45, 0, 0.25, 1) 0.15s forwards;
}

.brand-draw__dot {
  transform-box: fill-box;
  transform-origin: center;
  transform: scale(0);
  animation: brand-dot 0.4s ease-out 1.35s forwards;
}

.brand-draw__name {
  opacity: 0;
  transform: translateX(var(--name-shift));
  animation: brand-name 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) 1.65s forwards;
}

@keyframes brand-ring {
  to {
    stroke-dashoffset: 0;
  }
}

/* 0 → surimpression → rayon de la charte : le point se pose, il n'atterrit pas. */
@keyframes brand-dot {
  0% {
    transform: scale(0);
  }
  55% {
    transform: scale(1.28);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes brand-name {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/*
 * « Réduire les animations » : l'état final, tout de suite. La charte le
 * demande, et c'est le seul réglage système que ce composant peut lire.
 */
@media (prefers-reduced-motion: reduce) {
  .brand-draw__ring,
  .brand-draw__dot,
  .brand-draw__name {
    animation: none;
  }

  .brand-draw__ring {
    stroke-dashoffset: 0;
  }

  .brand-draw__dot {
    transform: scale(1);
  }

  .brand-draw__name {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
