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
  // Le store rattrape ses propres erreurs réseau et les expose dans `error` ;
  // un imprévu ne doit pas pour autant laisser la page sur l'écran d'attente,
  // qui resterait affiché pour toujours faute de montage.
  try {
    await tenantStore.load()
  } catch (error) {
    console.error('Tenant bootstrap failed:', error)
  }

  app.mount('#app')
  dismissBoot()
}

/**
 * Retire l'écran d'attente posé dans `index.html`.
 *
 * Il se fond en 200 ms plutôt que de disparaître d'un coup : l'application
 * monte parfois en quelques dizaines de millisecondes, et une marque qui
 * clignote se remarque plus qu'un fondu.
 */
function dismissBoot() {
  const boot = document.getElementById('boot')
  if (!boot) return
  boot.classList.add('is-done')
  setTimeout(() => boot.remove(), 200)
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
