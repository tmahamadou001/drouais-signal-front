import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

/**
 * Le lien d'un e-mail d'équipe (« on vous confie un signalement »), côté web.
 *
 * L'e-mail pointe sur `/signalement/<id>?equipe=<commune>` : c'est le chemin que l'application mobile revendique, donc
 * le lien l'ouvre sur un téléphone où elle est installée. Sur un ordinateur — ou sans l'app — c'est cette route web qui
 * répond, et un membre de l'équipe n'a rien à faire sur la page publique d'un signalement : on l'envoie au back-office,
 * sur ce signalement. La garde d'accès fait le reste (connexion, puis retour ici).
 */
export function teamLinkRedirect(to: Pick<RouteLocationNormalized, 'params' | 'query'>): RouteLocationRaw | true {
  if (!to.query.equipe) return true
  return { path: '/admin/signalements', query: { open: String(to.params.id) }, replace: true }
}
