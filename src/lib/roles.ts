/**
 * Les rôles du back-office, et ce que chacun a le droit de faire.
 *
 * Miroir de `server/src/middleware/roleGuard.ts` : le serveur décide, ceci ne
 * sert qu'à ne pas proposer un geste qu'il refusera. Une interface qui offre
 * un bouton menant à un 403 est pire qu'une interface qui ne l'offre pas.
 *
 * Le partage décrit le fonctionnement d'une mairie, pas une hiérarchie
 * abstraite :
 *
 *  - **observer** — *voir*. Consulter et exporter. Aucune écriture. Un élu, un
 *    stagiaire, à qui l'on ouvre la plateforme sans confier le traitement ;
 *  - **agent** — *traiter*. Faire avancer un statut, répondre à un habitant,
 *    confier à un service. Le technicien terrain ;
 *  - **admin** — *régler*. Les délais, les destinataires, les catégories,
 *    l'équipe, la suppression. Ce qui engage la commune ;
 *  - **super_admin** — la plateforme entière, toutes communes confondues.
 */

export type TeamRole = 'observer' | 'agent' | 'admin' | 'super_admin'

/** L'ordre des droits. Un rôle possède tout ce que les précédents possèdent. */
export const ROLE_ORDER: TeamRole[] = ['observer', 'agent', 'admin', 'super_admin']

export interface RoleInfo {
  label: string
  /** Ce que le rôle permet, en une phrase — de quoi choisir juste à l'invitation. */
  summary: string
  icon: string
  classes: string
}

export const ROLES: Record<TeamRole, RoleInfo> = {
  observer: {
    label: 'Observateur',
    summary: 'Consulte et exporte. Ne modifie rien.',
    icon: 'Eye',
    classes: 'bg-status-pending-bg text-status-pending-fg',
  },
  agent: {
    label: 'Agent',
    summary: 'Traite les signalements : statuts, réponses aux habitants, transmission aux services.',
    icon: 'Wrench',
    classes: 'bg-status-progress-bg text-status-progress-fg',
  },
  admin: {
    label: 'Administrateur',
    summary: 'Tout ce que fait un agent, plus les réglages, les catégories et l’équipe.',
    icon: 'Shield',
    classes: 'bg-brand-50 text-brand-700',
  },
  super_admin: {
    label: 'Super administrateur',
    summary: 'Accès à toutes les communes de la plateforme.',
    icon: 'ShieldCheck',
    classes: 'bg-[#EDE9FB] text-[#4C3A9E]',
  },
}

/** Les rôles qu'une commune peut attribuer — `super_admin` ne s'invite pas. */
export const ASSIGNABLE_ROLES: TeamRole[] = ['observer', 'agent', 'admin']

export function roleInfo(role: string): RoleInfo {
  return ROLES[role as TeamRole] ?? {
    label: role,
    summary: '',
    icon: 'Circle',
    classes: 'bg-status-pending-bg text-status-pending-fg',
  }
}

/** `role` atteint-il au moins `required` ? */
export function hasAtLeast(role: string | null, required: TeamRole): boolean {
  const held = ROLE_ORDER.indexOf(role as TeamRole)
  return held >= 0 && held >= ROLE_ORDER.indexOf(required)
}
