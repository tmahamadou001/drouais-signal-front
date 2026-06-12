import { onMounted, onUnmounted } from 'vue'

/**
 * Déclenche `onVisible` quand l'utilisateur revient sur l'onglet/app,
 * uniquement si les données sont considérées comme périmées (> staleAfter ms).
 * Retourne `markFetched()` à appeler après chaque chargement réussi.
 */
export function usePageVisibility(onVisible: () => void, staleAfter = 30_000) {
  let lastFetchedAt = 0  // 0 = jamais chargé, déclenche toujours au premier retour

  function markFetched() {
    lastFetchedAt = Date.now()
  }

  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return
    if (Date.now() - lastFetchedAt > staleAfter) {
      onVisible()
      markFetched()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return { markFetched }
}
