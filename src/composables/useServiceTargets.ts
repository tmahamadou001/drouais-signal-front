/**
 * Les objectifs internes de la collectivité, en jours.
 *
 * Ils ne viennent pas de la base : contrairement au `sla_hours` d'une catégorie,
 * qui est un engagement par type de problème, ceux-ci sont la promesse globale
 * que le service se fait à lui-même. Ils vivent ici, en un seul endroit, parce
 * qu'ils étaient déjà écrits en dur dans la barre latérale et que l'écran de
 * performance allait en écrire une deuxième version.
 *
 * Le jour où une commune voudra les régler, c'est cette constante qui devient
 * une colonne de `tenant_configs` — et il n'y aura qu'un appelant à déplacer.
 */

/** Délai visé avant qu'un agent prenne le signalement en charge. */
export const ACK_TARGET_DAYS = 2

/** Délai visé entre le signalement et sa résolution. */
export const RESOLVE_TARGET_DAYS = 5
