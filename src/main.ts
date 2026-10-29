import { createApp } from 'vue'
import { pinia } from './stores/pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import './assets/admin.css'
import { useTenantStore } from './stores/tenant'

const bootstrap = async () => {
  const app = createApp(App)

  app.use(pinia)
  app.use(router)

  const tenantStore = useTenantStore()
  await tenantStore.load()

  app.mount('#app')
}

bootstrap()

/**
 * L'enregistrement survit à la PWA, volontairement.
 *
 * `public/sw.js` est devenu une pierre tombale : il se désinscrit et vide les
 * caches de ses prédécesseurs. Un navigateur porteur de l'ancien worker le
 * récupérerait de lui-même à la visite suivante, mais l'enregistrer ici rend la
 * bascule immédiate et couvre les cas où la revérification automatique tarde.
 *
 * À retirer en même temps que `public/sw.js`, dans plusieurs mois.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((error) => console.error('Error registering SW:', error))
  })
}
