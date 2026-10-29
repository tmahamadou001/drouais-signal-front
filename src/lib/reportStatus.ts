import type { ReportStatus } from '@/types'

/**
 * Les statuts d'un signalement : leur ordre, leur habillage, et ce qu'on a le
 * droit d'en faire.
 *
 * La pastille était écrite deux fois — dans la table et dans la fiche — avec
 * les mêmes teintes recopiées à la main. La règle d'avancement l'était aussi.
 * Un statut ajouté (`transmis`) obligeait à retrouver chaque copie, et la
 * première oubliée affichait le slug brut à l'écran.
 *
 * L'ordre reflète celui du serveur (`server/src/lib/statusFlow.ts`) : c'est lui
 * qui fait autorité, celui-ci ne sert qu'à ne pas proposer un geste que le
 * serveur refusera.
 */
export const STATUS_ORDER: ReportStatus[] = ['en_attente', 'transmis', 'pris_en_charge', 'resolu']

/** Le statut au-delà duquel plus rien ne bouge. */
export const TERMINAL_STATUS: ReportStatus = 'resolu'

export interface StatusPill {
  label: string
  icon: string
  classes: string
}

export const STATUS_PILLS: Record<ReportStatus, StatusPill> = {
  en_attente:     { label: 'En attente',     icon: 'Clock',       classes: 'bg-status-pending-bg text-status-pending-fg' },
  transmis:       { label: 'Transmis',       icon: 'Send',        classes: 'bg-brand-50 text-brand-700' },
  pris_en_charge: { label: 'Pris en charge', icon: 'Wrench',      classes: 'bg-status-progress-bg text-status-progress-fg' },
  resolu:         { label: 'Résolu',         icon: 'CircleCheck', classes: 'bg-status-done-bg text-status-done-fg' },
}

export function statusPill(status: string): StatusPill {
  return STATUS_PILLS[status as ReportStatus] ?? { label: status, icon: 'Circle', classes: 'bg-canvas text-muted' }
}

export function statusLabel(status: string): string {
  return statusPill(status).label
}

/** Un signalement clos ne change plus de statut. */
export function isFinal(status: string): boolean {
  return status === TERMINAL_STATUS
}

/**
 * L'étape suivante, celle qui fait avancer d'un cran.
 *
 * `transmis` avance comme `en_attente` : l'e-mail est parti, personne n'a
 * encore répondu — un agent peut donc s'en saisir lui-même.
 */
export function nextStatus(status: string): ReportStatus | null {
  if (status === 'en_attente' || status === 'transmis') return 'pris_en_charge'
  if (status === 'pris_en_charge') return 'resolu'
  return null
}

/**
 * Les statuts vers lesquels on peut revenir depuis celui-ci.
 *
 * Tout ce qui précède, sauf depuis « Résolu » d'où l'on ne revient pas. Un
 * agent qui s'est trompé de ligne pouvait auparavant se corriger en supprimant
 * le signalement — donc en perdant l'historique et en laissant l'habitant sans
 * réponse.
 */
export function rollbackTargets(status: string): ReportStatus[] {
  if (isFinal(status)) return []
  const index = STATUS_ORDER.indexOf(status as ReportStatus)
  return index > 0 ? STATUS_ORDER.slice(0, index) : []
}
