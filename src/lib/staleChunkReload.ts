/**
 * Un onglet resté ouvert pendant un déploiement.
 *
 * Chaque déploiement remplace les fichiers `assets/*-<empreinte>.js`. Un onglet
 * ouvert avant lui garde l'ancien `index.html` en mémoire, donc réclame des
 * fichiers qui n'existent plus — et comme `vercel.json` renvoie `index.html`
 * pour toute adresse inconnue, il reçoit du HTML à la place du script
 * (« MIME type text/html »). Le résultat se voit à la connexion : l'API répond
 * 200, la navigation vers l'écran suivant échoue, et la page ne bouge pas.
 *
 * Une fois rechargé, l'onglet prend la version courante. On ne le fait qu'**une
 * fois** par minute : si l'erreur persiste après rechargement, ce n'est plus un
 * onglet périmé, et boucler masquerait une vraie panne.
 */
const KEY = 'onsignale.stale-chunk-reload'
const WINDOW_MS = 60_000

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Unable to preload CSS')
  )
}

export function reloadOnceForStaleChunk(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
  reload: () => void,
  now = Date.now(),
): boolean {
  try {
    const last = Number(storage?.getItem(KEY) ?? 0)
    if (last && now - last < WINDOW_MS) return false
    storage?.setItem(KEY, String(now))
  } catch {
    // Stockage indisponible : on recharge quand même, une seule fois par chargement.
  }

  reload()
  return true
}
