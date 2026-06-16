import { ref } from 'vue'

const hasUpdate = ref(false)
let waitingWorker: ServiceWorker | null = null
let initialized = false

function applyUpdate() {
  if (!waitingWorker) return
  waitingWorker.postMessage({ type: 'SKIP_WAITING' })
}

const UPDATE_INTERVAL_MS = 30 * 60 * 1000

function init() {
  if (initialized || typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  const isPwa = window.matchMedia('(display-mode: standalone)').matches
  if (!isPwa) return

  initialized = true

  navigator.serviceWorker.ready.then((registration) => {
    registration.update()

    if (registration.waiting) {
      waitingWorker = registration.waiting
      hasUpdate.value = true
    }

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

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update()
      }
    })

    setInterval(() => registration.update(), UPDATE_INTERVAL_MS)
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

export function useSwUpdate() {
  init()
  return { hasUpdate, applyUpdate }
}
