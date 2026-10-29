<script setup lang="ts">
/**
 * La marque OnSignale : le bouclier et le repère.
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
withDefaults(defineProps<{ size?: number; radius?: number }>(), {
  size: 30,
  radius: 8,
})
</script>

<template>
  <svg
    viewBox="0 0 1024 1024"
    class="block flex-none"
    :style="{ width: `${size}px`, height: `${size}px`, borderRadius: `${radius}px` }"
    role="img"
    aria-label="OnSignale"
  >
    <rect width="1024" height="1024" fill="#1A56A0" />
    <path d="M512 168 L836 320 V566 C836 748 700 848 512 892 C324 848 188 748 188 566 V320 Z" fill="#F1F6FC" />
    <circle cx="512" cy="480" r="126" fill="#1A56A0" />
    <path d="M448 566 L576 566 L512 716 Z" fill="#1A56A0" />
  </svg>
</template>
