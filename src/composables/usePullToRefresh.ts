import { ref, onMounted, onUnmounted } from 'vue'

const THRESHOLD = 72  // px à tirer pour déclencher le refresh
const MAX_PULL  = 110 // px max d'élastique visuel

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const isPulling    = ref(false)
  const pullDistance = ref(0)
  const isRefreshing = ref(false)

  let startY = 0

  function onTouchStart(e: TouchEvent) {
    // N'active le pull-to-refresh que si on est tout en haut de la page
    if (window.scrollY > 0) return
    startY = e.touches[0].clientY
  }

  function onTouchMove(e: TouchEvent) {
    if (window.scrollY > 0 || isRefreshing.value) return
    const diff = e.touches[0].clientY - startY
    if (diff > 0) {
      isPulling.value = true
      // Résistance progressive : plus on tire, moins ça avance vite
      pullDistance.value = Math.min(diff * 0.5, MAX_PULL)
    }
  }

  async function onTouchEnd() {
    if (!isPulling.value) return

    if (pullDistance.value >= THRESHOLD && !isRefreshing.value) {
      isRefreshing.value = true
      pullDistance.value = THRESHOLD // maintient l'indicateur visible pendant le refresh
      try {
        await onRefresh()
      } finally {
        isRefreshing.value = false
      }
    }

    isPulling.value    = false
    pullDistance.value = 0
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchend',   onTouchEnd)
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove',  onTouchMove)
    document.removeEventListener('touchend',   onTouchEnd)
  })

  return { isPulling, pullDistance, isRefreshing }
}
