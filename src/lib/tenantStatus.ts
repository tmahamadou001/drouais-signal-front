/**
 * Le statut commercial d'une commune sur la plateforme.
 *
 * Les libellés étaient les codes eux-mêmes — la colonne affichait `trial`,
 * `suspended` — et les teintes venaient de la palette brute de Tailwind, sans
 * rapport avec celles du reste du back-office.
 */
export interface TenantStatusInfo {
  label: string
  icon: string
  classes: string
}

export const TENANT_STATUSES: Record<string, TenantStatusInfo> = {
  active:    { label: 'Actif',     icon: 'CircleCheck', classes: 'bg-status-done-bg text-status-done-fg' },
  trial:     { label: 'Essai',     icon: 'Hourglass',   classes: 'bg-status-progress-bg text-status-progress-fg' },
  demo:      { label: 'Démo',      icon: 'Presentation', classes: 'bg-brand-50 text-brand-700' },
  suspended: { label: 'Suspendu',  icon: 'Ban',         classes: 'bg-status-danger-bg text-status-danger' },
  prospect:  { label: 'Prospect',  icon: 'Handshake',   classes: 'bg-status-pending-bg text-status-pending-fg' },
}

/** Les statuts qu'un super-administrateur peut attribuer. */
export const ASSIGNABLE_TENANT_STATUSES = ['trial', 'active', 'demo', 'suspended']

export function tenantStatusInfo(status: string): TenantStatusInfo {
  return TENANT_STATUSES[status]
    ?? { label: status, icon: 'Circle', classes: 'bg-status-pending-bg text-status-pending-fg' }
}

/** Le plan d'abonnement, nommé plutôt que laissé en minuscules. */
export const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  agglo: 'Agglo',
  enterprise: 'Enterprise',
}

export function planLabel(plan: string): string {
  return PLAN_LABELS[plan] ?? plan
}
