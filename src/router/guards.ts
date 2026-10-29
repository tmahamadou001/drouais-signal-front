import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { hasAtLeast, type TeamRole } from '@/lib/roles'

/**
 * La décision d'accès, séparée du routeur.
 *
 * Elle vit ici pour être testable sans monter l'application : le routeur charge
 * ses pages à la demande, et les éprouver reviendrait à importer Supabase,
 * Leaflet et la moitié du client pour vérifier une condition sur un rôle.
 *
 * Ce n'est pas un raffinement : ces gardes renvoyaient vers une route nommée
 * `home` qui n'existe dans aucune table. `router.push` rejetait en silence, et
 * on restait devant un écran auquel on n'avait plus droit — c'est exactement le
 * genre d'erreur qu'un test attrape et qu'une relecture laisse passer.
 */

/** Ce que le garde a besoin de savoir du compte courant. */
export interface AccessState {
  isAuthenticated: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  /** Le rôle détenu dans la commune courante, `null` si aucun. */
  role: string | null
}

export function resolveAccess(
  to: Pick<RouteLocationNormalized, 'meta' | 'fullPath'>,
  auth: AccessState
): RouteLocationRaw | undefined {
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }

  /**
   * Le niveau exigé par l'écran.
   *
   * `minRole` a remplacé `requiresAdmin`, qui fermait le back-office entier aux
   * rôles `agent` et `observer` : ils recevaient leur invitation, choisissaient
   * un mot de passe, et se faisaient éjecter à la connexion. Chaque écran dit
   * maintenant ce qu'il demande — voir, traiter, ou régler.
   */
  const minRole = to.meta.minRole as TeamRole | undefined

  // Connecté, mais pas assez haut : renvoyé à la connexion avec `denied`, qui
  // fait afficher la raison plutôt qu'un rebond silencieux.
  if (minRole && !hasAtLeast(auth.role, minRole)) {
    // Un membre de la commune qui n'a simplement pas accès à *cet* écran est
    // ramené à celui qu'il a — l'expulser vers la connexion lui ferait croire
    // que sa session a expiré.
    return hasAtLeast(auth.role, 'observer')
      ? { name: 'AdminReports' }
      : { name: 'auth', query: { denied: '1' } }
  }

  if (to.meta.requiresSuperAdmin && !auth.isSuperAdmin) {
    return { name: 'AdminReports' }
  }

  // Un membre de l'équipe n'a rien à faire sur l'écran de connexion. Un compte
  // sans droits, lui, y reste : c'est le seul endroit où il peut se reconnecter
  // sous une autre identité, et l'en chasser ferait une boucle.
  if (to.meta.guestOnly && hasAtLeast(auth.role, 'observer')) {
    return { name: 'AdminReports' }
  }

  return undefined
}
