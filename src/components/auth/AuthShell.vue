<script setup lang="ts">
/**
 * La coque des écrans d'authentification, reprise de l'export Claude Design
 * (planches « Connexion » et « Mot de passe oublié »).
 *
 * Le panneau sombre de gauche dit à qui s'adresse cet écran. Il n'est pas
 * décoratif : le web d'OnSignale ne s'adresse plus qu'aux agents municipaux,
 * l'habitant passe par l'application mobile, et un habitant qui atterrit ici
 * doit comprendre en une phrase qu'il n'est pas au bon endroit.
 *
 * Il disparaît sous 1024 px — sur un portable de mairie, la moitié de l'écran
 * ne peut pas servir à une phrase d'accueil.
 */
import { computed } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import BrandLogoDraw from '@/components/BrandLogoDraw.vue'

const tenant = useTenantStore()

/**
 * Le seul chiffre que cet écran peut montrer honnêtement.
 *
 * La maquette en affiche trois — signalements suivis, délai moyen, catégories
 * actives. Les deux premiers viennent d'API réservées aux comptes connectés, et
 * personne ne l'est ici. Les inventer donnerait un écran qui ment dès la porte
 * d'entrée ; les publier demanderait d'exposer les chiffres d'une commune sans
 * authentification, ce qui n'est pas une décision d'affichage.
 */
const activeCategoryCount = computed(() => tenant.activeCategories.length)
</script>

<template>
  <div class="font-ui flex min-h-[100dvh] bg-canvas">

    <!-- Panneau d'identité -->
    <!-- Une part de l'écran plutôt qu'une largeur fixe. À 520 px, le panneau
         se faisait écraser par la colonne du formulaire dès qu'on dépassait le
         portable : la moitié gauche portait une phrase, la droite un bloc de
         404 px perdu au milieu de 900. Le plancher garde la mise en page lisible
         sur un écran étroit, le plafond l'empêche de devenir une affiche. -->
    <aside class="hidden w-[44%] min-w-[460px] max-w-[760px] flex-none flex-col bg-brand-900 px-12 py-14 lg:flex">

      <!-- Le panneau marine est le seul endroit de l'admin où la marque
           dispose d'assez de place et d'assez de calme pour s'écrire. -->
      <div class="flex items-center gap-3">
        <BrandLogoDraw :size="52" tone="white" />
        <div class="text-[18px] font-bold leading-none tracking-[-0.01em] text-white">OnSignale</div>
      </div>

      <div class="mt-auto flex flex-col gap-[18px]">
        <h2 class="text-[34px] font-bold leading-[1.2] tracking-[-0.02em] text-white xl:text-[40px]">
          Espace<br>des services techniques
        </h2>
        <p class="max-w-[420px] text-[15px] leading-[1.55] text-brand-100 xl:text-base">
          Les signalements des habitants arrivent ici. Vous les qualifiez, les affectez
          et suivez leur résolution.
        </p>
      </div>

      <div class="mt-auto flex flex-col gap-3.5">
        <div class="h-px bg-white/[0.12]" />
        <div v-if="activeCategoryCount > 0" class="flex flex-col gap-1">
          <div class="text-[22px] font-bold leading-none tabular-nums text-white">
            {{ activeCategoryCount }}
          </div>
          <div class="whitespace-nowrap text-xs font-medium leading-none text-brand-500">
            catégories traitées à {{ tenant.config?.city_name || tenant.name }}
          </div>
        </div>
      </div>
    </aside>

    <!-- Formulaire -->
    <main class="flex min-w-0 flex-1 flex-col items-center justify-center px-6 py-12">
      <div class="flex w-full max-w-[420px] flex-col gap-[26px]">
        <slot />
      </div>
    </main>
  </div>
</template>
