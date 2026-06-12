import { ref, onMounted } from 'vue'

export function useSwUpdate() {
  const hasUpdate = ref(false)
  let waitingWorker: ServiceWorker | null = null

  const isPwa = window.matchMedia('(display-mode: standalone)').matches

  function applyUpdate() {
    if (!waitingWorker) return
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  onMounted(() => {
    if (!isPwa || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then((registration) => {
      // Force la vérification d'une nouvelle version au montage
      registration.update()

      // SW déjà en attente au chargement (ex: onglet rouvert)
      if (registration.waiting) {
        waitingWorker = registration.waiting
        hasUpdate.value = true
      }

      // SW qui s'installe pendant la session
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = newWorker
            hasUpdate.value = true
          }
        })
      })
    })

    // Rechargement automatique quand le nouveau SW prend le contrôle
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  })

  return { hasUpdate, applyUpdate }
}
