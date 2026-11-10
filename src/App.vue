<script setup lang="ts">
/**
 * La coque de l'application.
 *
 * Elle ne contient plus d'en-tête ni de pied de page. Le web d'OnSignale est un
 * back-office : sa navigation est la barre latérale d'`AdminLayout`, et les
 * trois pages qui restent hors administration — la connexion, le suivi d'un
 * signalement depuis un e-mail, les mentions légales — portent la leur.
 *
 * Ce qui vivait ici était l'en-tête public de la v1, commenté depuis, mais dont
 * la balise `<header>` vide continuait à dessiner une barre collante et un
 * liseré en haut de chaque page.
 */
import { watch } from 'vue'
import { Analytics } from '@vercel/analytics/vue'
import { RouterView, useRoute } from 'vue-router'
import { useTenantStore } from '@/stores/tenant'
import TenantNotFoundView from '@/pages/TenantNotFoundView.vue'

const tenantStore = useTenantStore()
const route = useRoute()

// Une nouvelle page se lit depuis le haut.
watch(() => route.path, () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
})

/**
 * Le titre et les métadonnées de partage, une fois la commune connue.
 *
 * Ils parlent au citoyen : les seules URL d'OnSignale qui se partagent sont
 * celles d'un signalement, envoyées par e-mail et ouvertes hors de l'app.
 */
function updateMeta(cityName: string) {
  const title = `OnSignale — Signalement urbain à ${cityName}`
  const description = `Signalez un problème urbain à ${cityName} en quelques clics. Voirie, éclairage, déchets… les services techniques s'en occupent.`

  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description)
}

watch(
  () => tenantStore.config?.city_name ?? tenantStore.name,
  (cityName) => { if (cityName) updateMeta(cityName) },
  { immediate: true }
)
</script>

<template>
  <Analytics />

  <div class="flex min-h-screen flex-col">
    <main class="flex flex-1 flex-col">
      <!-- Une commune introuvable n'a rien à dire d'une page qui n'en
           dépend pas : mentions légales, signalement public, lien de suivi,
           lien de service. Voir `meta.tenantless` dans `router/routes.ts`. -->
      <TenantNotFoundView v-if="tenantStore.error && !route.meta.tenantless" />
      <RouterView v-else v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>
