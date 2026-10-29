<script setup lang="ts">
/**
 * Un bloc d'attente, avec un balayage qui le traverse.
 *
 * Les écrans utilisaient `animate-pulse` sur `bg-white` ou `bg-canvas`
 * (`#F6F7F9`) : sur un fond blanc, ce gris-là passe la moitié du cycle à être
 * invisible. Les cartes se lisaient comme des cadres vides, c'est-à-dire comme
 * un échec de rendu plutôt que comme un chargement.
 *
 * Donc : un fond réellement visible, et une bande claire qui le traverse. Le
 * mouvement dit « il se passe quelque chose » ; un fondu dit « l'affichage a un
 * problème ». C'est le pendant web de `mobile/src/ui/skeleton.tsx`, même durée
 * et même intention.
 *
 * Les dimensions et l'arrondi viennent de l'appelant — un bloc d'attente n'a de
 * sens que s'il a la géométrie de ce qu'il remplace.
 */
</script>

<template>
  <div class="app-skeleton bg-[#E3E7ED]" />
</template>

<style scoped>
.app-skeleton {
  position: relative;
  overflow: hidden;
}

.app-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.72) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: app-skeleton-sweep 1150ms ease-in-out infinite;
}

/* Une animation qui ne s'arrête jamais est exactement ce que ce réglage
   système vise. Le fond reste visible : l'attente se lit sans le mouvement. */
@media (prefers-reduced-motion: reduce) {
  .app-skeleton::after {
    animation: none;
  }
}

@keyframes app-skeleton-sweep {
  to {
    transform: translateX(100%);
  }
}
</style>
