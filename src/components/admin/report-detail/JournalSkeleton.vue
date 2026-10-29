<script setup lang="ts">
/**
 * La forme du journal pendant que l'historique arrive.
 *
 * Sans lui, l'onglet affichait « Aucun changement de statut pour l'instant »
 * tant que la requête n'avait pas répondu — une phrase fausse, montrée au
 * moment précis où l'agent l'attend le moins. C'est la même erreur que l'écran
 * corrige déjà ailleurs : un état vide n'est pas un état de chargement.
 *
 * Deux cartes, à la géométrie de celles qu'elles remplacent, pour que rien ne
 * saute quand les vraies arrivent.
 */
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
</script>

<template>
  <section class="flex flex-none flex-col gap-2.5" aria-busy="true">
    <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
      JOURNAL DU TRAITEMENT
    </span>

    <div class="flex flex-col gap-2">
      <div
        v-for="row in 2"
        :key="row"
        class="flex items-start gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3"
      >
        <AppSkeleton class="h-7 w-7 flex-none rounded-lg" />

        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <AppSkeleton class="h-3 w-28 rounded" />
            <AppSkeleton class="h-3 w-20 rounded" />
            <AppSkeleton class="ml-auto h-3 w-20 flex-none rounded" />
          </div>
          <AppSkeleton class="h-3 w-4/5 rounded" />
        </div>
      </div>
    </div>
  </section>
</template>
