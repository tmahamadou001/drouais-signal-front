<script setup lang="ts">
/**
 * Ce que cette page compte, dit à voix haute.
 *
 * Depuis la migration 039, les délais ne portent que sur les signalements
 * **des habitants** : un signalement que la commune saisit elle-même, souvent
 * après coup et parfois le jour où elle le résout, afficherait un délai de
 * prise en charge nul et écraserait la moyenne. Mesurer le temps de réponse
 * d'une commune à elle-même n'a pas de sens.
 *
 * Mais un filtre muet est pire que pas de filtre : le total affiché ici serait
 * inférieur à celui de l'écran Signalements, quelqu'un s'en apercevrait, et
 * cesserait de faire confiance aux deux. Un chiffre qu'on ne peut pas
 * expliquer ne vaut rien — surtout celui qu'on présente en conseil municipal.
 */
import AppIcon from '@/components/AppIcon.vue'
</script>

<template>
  <div class="flex flex-none items-start gap-2.5 rounded-[10px] bg-brand-50 px-3.5 py-2.5">
    <AppIcon name="Info" :size="14" :stroke-width="1.75" class="mt-px flex-none text-brand-700" />
    <p class="text-[12px] leading-[1.5] text-brand-800">
      Ces délais ne portent que sur les signalements déposés par les habitants.
      Ceux que vous saisissez vous-même depuis le back-office sont comptés dans
      l’écran Signalements, mais pas chronométrés ici : ils sont souvent
      enregistrés après coup, ce qui fausserait les moyennes.
    </p>
  </div>
</template>
