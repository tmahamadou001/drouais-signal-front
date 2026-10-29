<script setup lang="ts">
/**
 * La barre de titre du back-office. Un seul composant, posé en tête de chaque
 * écran d'administration.
 *
 * Le titre vient du `meta` de la route, ce qui garantit qu'il dit la même chose
 * que l'entrée de barre latérale qui y mène.
 *
 * Elle porte un `z-30` : les menus qu'un écran y dépose doivent se dérouler
 * par-dessus le contenu, et une carte Leaflet empile ses propres calques
 * jusqu'à `z-index: 700`. Ce qu'un écran y ajoute — une
 * recherche, un export, un bouton d'invitation — passe par les deux slots.
 *
 * Pourquoi la page l'affiche elle-même plutôt que le layout : la première
 * version posait la barre dans `AdminLayout` et les pages y téléportaient leurs
 * contrôles. Vue plantait à chaque mise à jour (`emitsOptions` de `null`) —
 * téléporter dans le DOM d'un composant frère fait patcher des vnodes dont le
 * propriétaire n'est plus celui qui les a créés. Un slot passe la même chose
 * sans sortir de l'arbre de rendu.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => (route.meta.title as string | undefined) ?? 'Administration')
const subtitle = computed(() => route.meta.subtitle as string | undefined)
</script>

<template>
  <header class="font-ui relative z-30 flex h-[68px] flex-none items-center gap-4 border-b border-line bg-white px-7">
    <div class="flex flex-none flex-col gap-0.5">
      <h1 class="text-[17px] font-bold leading-tight tracking-[-0.01em] text-brand-900">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="text-xs font-medium leading-none text-muted">{{ subtitle }}</p>
    </div>

    <slot name="search" />

    <div v-if="$slots.actions" class="ml-auto flex flex-none items-center gap-2.5 whitespace-nowrap">
      <slot name="actions" />
    </div>
  </header>
</template>
