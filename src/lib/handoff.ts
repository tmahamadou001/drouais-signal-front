import type { HandoffState } from '@/types/team'

/**
 * Dire où en est un signalement transmis à un intervenant extérieur.
 *
 * Un intervenant n'a pas de compte : on ne le voit pas dans l'équipe, et sans cette mention un signalement
 * que personne n'a en interne se lisait comme oublié alors qu'il était chez la régie.
 */

/** Le nom à afficher : celui réglé sur la catégorie, sinon ce qu'il est. */
export function handoffName(handoff: { serviceName: string | null }): string {
  return handoff.serviceName?.trim() || 'Intervenant extérieur'
}

const LABELS: Record<HandoffState, string> = {
  sent: 'Transmis, pas encore vu',
  acknowledged: 'Pris en compte',
  done: 'Terminé par l’intervenant',
  expired: 'Lien expiré, sans réponse',
}

export function handoffStateLabel(state: HandoffState): string {
  return LABELS[state]
}

/** La version courte, pour une cellule de tableau étroite : le libellé complet reste en infobulle. */
export function handoffShortLabel(state: HandoffState): string {
  return { sent: 'envoyé', acknowledged: 'vu', done: 'terminé', expired: 'expiré' }[state]
}

/** La couleur dit s'il faut agir : attendre (ambre), avancer (marine), fini (vert), relancer (rouge). */
export function handoffTone(state: HandoffState): string {
  return {
    sent: 'text-status-progress-fg',
    acknowledged: 'text-brand-700',
    done: 'text-status-done-fg',
    expired: 'text-status-danger',
  }[state]
}
