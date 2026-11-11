/**
 * Les communes sans mairie, et ce qu'on peut en dire.
 *
 * Deux régimes cohabitent dans cet écran depuis la migration 040 :
 *
 *  - **silencieuse** — des habitants signalent, rien n'est publié ;
 *  - **publique** — la commune a été ouverte : les habitants se lisent entre
 *    eux, constatent les réparations, et personne de la mairie ne répond.
 *
 * Ce fichier ne contient que ce qui se calcule : le vocabulaire, les totaux,
 * et la règle qui décide si une commune mérite d'être ouverte. Tout cela est
 * du raisonnement, pas de l'affichage — et c'est ce qui doit être testé, parce
 * qu'une ouverture est irréversible dans les faits : refermer la page ne fait
 * pas oublier ce qui a été vu.
 */

export interface Commune {
  id: string
  slug: string
  name: string
  status: 'prospect' | 'community'
  created_at: string
  published_at: string | null
  insee_codes: string[]
  report_count: number
  report_count_30d: number
  last_report_at: string | null
  /** Comptes distincts ayant signalé. */
  account_count: number
  /** Dépôts sans compte : indédoublonnables, donc comptés à part. */
  anonymous_count: number
  with_photo_count: number
  confirmation_count: number
  waitlist_count: number
  top_categories: { category: string; count: number }[]
}

export function isOpen(commune: Pick<Commune, 'status'>): boolean {
  return commune.status === 'community'
}

export interface PipelineTotals {
  communes: number
  open: number
  reports: number
  waitlist: number
}

export function totals(communes: Commune[]): PipelineTotals {
  return {
    communes: communes.length,
    open: communes.filter(isOpen).length,
    reports: communes.reduce((sum, commune) => sum + commune.report_count, 0),
    waitlist: communes.reduce((sum, commune) => sum + commune.waitlist_count, 0),
  }
}

/** Part des signalements accompagnés d'une photo, en pourcentage entier. */
export function photoRate(commune: Commune): number | null {
  if (commune.report_count === 0) return null
  return Math.round((commune.with_photo_count / commune.report_count) * 100)
}

/**
 * Depuis combien de jours plus rien n'arrive.
 *
 * `null` quand la commune n'a jamais rien reçu — ce qui ne devrait pas
 * arriver, puisqu'elle entre dans ce tableau au premier signalement, mais
 * arrive si tous ses signalements ont été purgés.
 */
export function daysSinceLastReport(commune: Commune, now = new Date()): number | null {
  if (!commune.last_report_at) return null

  const elapsed = now.getTime() - new Date(commune.last_report_at).getTime()
  return Math.max(0, Math.floor(elapsed / 86_400_000))
}

/**
 * Ce qui manque pour qu'une ouverture ait du sens.
 *
 * Ce ne sont **pas** des interdits : le bouton reste disponible, et c'est
 * délibéré — une commune peut mériter d'être ouverte pour une raison qu'aucun
 * chiffre ne porte. Ce sont des objections, affichées dans la confirmation,
 * pour que la décision soit prise en les ayant lues.
 *
 * Les seuils disent la même chose chacun à leur façon : une page publique sans
 * matière donne l'image d'un service mort, et c'est pire que pas de page.
 */
export const OPENING_THRESHOLDS = {
  minReports: 5,
  minResidents: 3,
  staleDays: 120,
} as const

export function openingConcerns(commune: Commune, now = new Date()): string[] {
  const concerns: string[] = []

  if (commune.report_count < OPENING_THRESHOLDS.minReports) {
    concerns.push(
      `Seulement ${commune.report_count} signalement${commune.report_count > 1 ? 's' : ''} : la page publique sera presque vide.`
    )
  }

  // Les dépôts sans compte comptent pour un habitant chacun au maximum : on ne
  // peut pas les dédoublonner, donc on les traite comme le haut de fourchette.
  const residents = commune.account_count + commune.anonymous_count

  if (residents < OPENING_THRESHOLDS.minResidents) {
    concerns.push(
      `Au plus ${residents} habitant${residents > 1 ? 's' : ''} distinct${residents > 1 ? 's' : ''} ont signalé : c'est peut-être une seule personne.`
    )
  }

  const stale = daysSinceLastReport(commune, now)

  if (stale !== null && stale >= OPENING_THRESHOLDS.staleDays) {
    concerns.push(`Aucun signalement depuis ${stale} jours : la commune est inactive.`)
  }

  if (commune.with_photo_count === 0 && commune.report_count > 0) {
    concerns.push('Aucun signalement n’a de photo : le fonds est difficile à lire.')
  }

  return concerns
}

/**
 * La saisie qui déverrouille l'ouverture.
 *
 * Le nom exact de la commune, à recopier — la même protection que pour une
 * suppression, et pour la même raison : le geste ne se défait pas. La
 * comparaison ignore la casse et les espaces de bord, pas les accents : «
 * Senonches » n'est pas « senonches » par hasard, c'est le même mot ; «
 * Senonche » est une autre commune.
 */
export function confirms(typed: string, communeName: string): boolean {
  return typed.trim().toLocaleLowerCase('fr') === communeName.trim().toLocaleLowerCase('fr')
}
