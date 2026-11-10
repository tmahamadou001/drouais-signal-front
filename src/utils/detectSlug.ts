/**
 * La commune que l'adresse désigne — ou aucune.
 *
 * `dreux.onsignale.fr` ouvre Dreux. Mais toutes les pages n'appartiennent pas
 * à une commune : la page publique d'un signalement, le suivi d'un dépôt sans
 * compte, le lien remis à un service extérieur, les mentions légales, la
 * confidentialité et la suppression de données sont servis sur l'apex, et
 * n'ont pas de commune.
 *
 * Le repli était un **slug en dur** :
 *
 *     return import.meta.env.VITE_DEV_TENANT ?? 'dreux'
 *
 * `www.onsignale.fr` servait donc l'espace de Dreux à qui tapait le nom de
 * domaine du produit — les données d'une commune cliente, à l'adresse
 * principale, par accident.
 *
 * Le repli de développement est désormais conditionné à l'**hôte**, pas à la
 * présence d'une variable : `localhost` n'a pas de sous-domaine à lire, il lui
 * faut donc une commune. Lier le repli à `VITE_DEV_TENANT` seul rendait le
 * comportement de production dépendant de l'absence d'une variable de build —
 * une variable oubliée dans l'environnement Vercel, et l'apex reservait une
 * commune sans que rien ne le signale.
 */

/** Les hôtes où il n'y a pas de sous-domaine à lire, et jamais en production. */
const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0'])

export function detectSlug(): string | null {
  const hostname = window.location.hostname
  const parts = hostname.split('.')

  // `api` n'est pas une commune, et `www` est l'adresse du site de présentation.
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
    return parts[0]
  }

  if (DEV_HOSTS.has(hostname) || hostname.endsWith('.local')) {
    return import.meta.env.VITE_DEV_TENANT ?? null
  }

  return null
}
