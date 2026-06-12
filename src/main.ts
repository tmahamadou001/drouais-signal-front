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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' })

      // Messages entrants du SW (ex: AUTH_REDIRECT)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NAVIGATE') {
          window.location.href = event.data.url
        }
      })
    } catch (error) {
      console.error('Error registering SW:', error)
    }
  })
}
