<script setup lang="ts">
/**
 * La marque qui s'écrit, au chargement de la page de connexion.
 *
 * La boucle se trace comme si on la traçait soi-même, puis le point ambre
 * apparaît : l'animation montre le geste que le service nomme. Elle se joue
 * **une fois** — la version en boucle du kit est réservée aux présentations,
 * et une marque qui se redessine en permanence derrière un formulaire se
 * regarde au lieu de se remplir.
 *
 * Le trait n'est pas un `stroke` mais une surface d'épaisseur variable : il
 * s'appuie au départ et s'affine à la levée, ce qu'aucune épaisseur constante
 * ne rend. On ne peut donc pas le dévoiler par `stroke-dashoffset` directement.
 * D'où le masque : une ligne médiane épaisse, elle vraiment en `stroke`,
 * balayée par son offset, qui découvre la surface en dessous. Le dessin reste
 * exact, seule sa révélation est animée.
 *
 * Le point grandit par `transform: scale` plutôt que par son rayon : `r` n'est
 * animable en CSS que sur les navigateurs récents, une échelle l'est partout.
 */
import { MARK_MAIN, MARK_TONES, type MarkTone } from '@/lib/markGeometry'

withDefaults(defineProps<{ size?: number; tone?: MarkTone }>(), {
  size: 120,
  tone: 'white',
})

const mark = MARK_MAIN
const tones = MARK_TONES
</script>

<template>
  <svg
    viewBox="-20 -20 140 140"
    class="brand-draw block flex-none"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    aria-label="OnSignale"
  >
    <defs>
      <mask id="brand-draw-mask" maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="140">
        <path
          class="brand-draw__reveal"
          :d="mark.center"
          fill="none"
          stroke="#FFFFFF"
          :stroke-width="mark.maskStroke"
          stroke-linecap="round"
          stroke-linejoin="round"
          :style="{
            strokeDasharray: mark.centerLength,
            '--mark-length': mark.centerLength,
          }"
        />
      </mask>
    </defs>

    <g mask="url(#brand-draw-mask)">
      <path :d="mark.fill" :fill="tones[tone].stroke" />
      <circle
        v-for="cap in mark.caps"
        :key="`${cap[0]}-${cap[1]}`"
        :cx="cap[0]"
        :cy="cap[1]"
        :r="cap[2]"
        :fill="tones[tone].stroke"
      />
    </g>

    <circle
      class="brand-draw__dot"
      :cx="mark.dot[0]"
      :cy="mark.dot[1]"
      :r="mark.dot[2]"
      :fill="tones[tone].dot"
    />
  </svg>
</template>

<style scoped>
/* Les durées et les courbes viennent de la charte, §2. */
.brand-draw__reveal {
  stroke-dashoffset: var(--mark-length);
  animation: brand-draw-loop 1.3s cubic-bezier(0.45, 0, 0.25, 1) 0.15s forwards;
}

.brand-draw__dot {
  transform-box: fill-box;
  transform-origin: center;
  transform: scale(0);
  animation: brand-draw-dot 0.4s ease-out 1.45s forwards;
}

@keyframes brand-draw-loop {
  to {
    stroke-dashoffset: 0;
  }
}

/* 0 → surimpression → rayon de la charte : le point se pose, il n'atterrit pas. */
@keyframes brand-draw-dot {
  0% {
    transform: scale(0);
  }
  55% {
    transform: scale(1.22);
  }
  100% {
    transform: scale(1);
  }
}

/*
 * « Réduire les animations » : l'état final, tout de suite. La charte le
 * demande, et c'est le seul réglage système que ce composant peut lire.
 */
@media (prefers-reduced-motion: reduce) {
  .brand-draw__reveal {
    animation: none;
    stroke-dashoffset: 0;
  }

  .brand-draw__dot {
    animation: none;
    transform: scale(1);
  }
}
</style>
