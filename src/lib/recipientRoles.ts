/**
 * À quel titre quelqu'un reçoit la synthèse hebdomadaire.
 *
 * Les libellés étaient les codes eux-mêmes : la pastille affichait
 * « vp_numerique ». Les teintes venaient de la palette brute de Tailwind
 * — bleu, violet, vert — sans rapport avec celles du reste du back-office.
 */
export interface RecipientRoleInfo {
  label: string
  classes: string
}

export const RECIPIENT_ROLES: Record<string, RecipientRoleInfo> = {
  elu:          { label: 'Élu',            classes: 'bg-brand-50 text-brand-700' },
  mairie:       { label: 'Mairie',         classes: 'bg-[#EDE9FB] text-[#4C3A9E]' },
  vp_numerique: { label: 'VP Numérique',   classes: 'bg-status-done-bg text-status-done-fg' },
  dsi:          { label: 'DSI',            classes: 'bg-status-progress-bg text-status-progress-fg' },
  autre:        { label: 'Autre',          classes: 'bg-status-pending-bg text-status-pending-fg' },
}

export const RECIPIENT_ROLE_KEYS = Object.keys(RECIPIENT_ROLES)

export function recipientRoleInfo(role: string): RecipientRoleInfo {
  return RECIPIENT_ROLES[role] ?? { label: role, classes: 'bg-status-pending-bg text-status-pending-fg' }
}
