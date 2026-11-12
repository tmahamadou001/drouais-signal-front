/**
 * Le vocabulaire des actions d'audit : libellé, dessin, couleur.
 *
 * Une seule table plutôt que trois fonctions qui découpent la chaîne chacune de
 * leur côté : le libellé et la couleur d'une même action doivent bouger
 * ensemble, et un `action.includes('deleted')` teintait « suppression
 * multiple » comme « signalement supprimé » sans que personne l'ait décidé.
 *
 * Sortie de l'écran pour être testable : la liste doit suivre le type
 * `AuditAction` de `server/src/services/auditService.ts`, et quatre entrées y
 * manquaient — les deux gestes des services extérieurs s'affichaient en clair,
 * `service.completed`, dans la colonne d'un écran d'administration.
 */

export interface AuditActionInfo {
  label: string
  icon: string
  classes: string
}

/** Les teintes, nommées par ce qu'elles veulent dire et non par leur couleur. */
const TONE = {
  created:  'bg-status-done-bg text-status-done-fg',
  changed:  'bg-brand-50 text-brand-700',
  external: 'bg-status-progress-bg text-status-progress-fg',
  people:   'bg-[#EDE9FB] text-[#4C3A9E]',
  removed:  'bg-status-danger-bg text-[#B42222]',
  quiet:    'bg-status-pending-bg text-status-pending-fg',
} as const

export const AUDIT_ACTIONS: Record<string, AuditActionInfo> = {
  'auth.login':                { label: 'Connexion',              icon: 'LogIn',      classes: TONE.quiet },

  'user.created':              { label: 'Compte créé',            icon: 'UserPlus',   classes: TONE.created },
  'user.invited':              { label: 'Utilisateur invité',     icon: 'Mail',       classes: TONE.people },
  'user.role_changed':         { label: 'Rôle modifié',           icon: 'UserCog',    classes: TONE.people },
  'user.revoked':              { label: 'Accès révoqué',          icon: 'UserMinus',  classes: TONE.removed },
  /* La personne a supprimé son compte depuis l'application : les signalements
     restent, dépersonnalisés, et c'est la seule trace qui subsiste du geste. */
  'user.deleted':              { label: 'Compte supprimé',        icon: 'UserX',      classes: TONE.removed },

  'report.created':            { label: 'Signalement créé',       icon: 'Plus',       classes: TONE.created },
  'report.status_changed':     { label: 'Statut modifié',         icon: 'RefreshCw',  classes: TONE.changed },
  'report.service_notified':   { label: 'Service notifié',        icon: 'Send',       classes: TONE.external },
  'report.deleted':            { label: 'Signalement supprimé',   icon: 'Trash2',     classes: TONE.removed },
  'report.bulk_deleted':       { label: 'Suppression multiple',   icon: 'Trash2',     classes: TONE.removed },

  /**
   * Les gestes d'un service extérieur, par son lien de transmission.
   *
   * Teinte distincte des changements de statut faits depuis le back-office :
   * ce n'est pas un agent municipal qui a agi, et le journal d'audit existe
   * précisément pour que cette différence se voie.
   */
  'service.acknowledged':      { label: 'Service : prise en charge',  icon: 'Truck',       classes: TONE.external },
  'service.completed':         { label: 'Service : intervention faite', icon: 'CircleCheck', classes: TONE.created },

  'tenant.created':            { label: 'Commune créée',          icon: 'Building2',  classes: TONE.created },
  'tenant.status_changed':     { label: 'Statut commune',         icon: 'RefreshCw',  classes: TONE.changed },
  /* La bascule d'une prospect vers active, et ce qu'elle a produit : on la
     distingue du simple changement de statut, parce qu'elle publie un
     historique et prévient des habitants. */
  'tenant.launched':           { label: 'Commune lancée',         icon: 'Rocket',     classes: TONE.created },
  /* L'ouverture et la fermeture au public d'une commune sans mairie. Le geste
     le plus lourd de conséquences du back-office : il rend visible de tous ce
     qu'une commune avait reçu en silence, ou le retire. */
  'commune.opened':            { label: 'Commune ouverte au public', icon: 'Eye',     classes: TONE.external },
  'commune.closed':            { label: 'Commune refermée',       icon: 'EyeOff',     classes: TONE.removed },

  /* La modération d'une commune sans mairie : c'est nous qui répondons de ce
     qui y est publié, faute d'agents sur place. Chaque geste porte son motif,
     lisible dans le détail de la ligne. */
  'report.retracted':          { label: 'Signalement dépublié',   icon: 'EyeOff',     classes: TONE.removed },
  'report.restored':           { label: 'Signalement republié',   icon: 'Eye',        classes: TONE.created },
  'report.photo_removed':      { label: 'Photo retirée',          icon: 'ImageOff',   classes: TONE.removed },
  'tenant_config.updated':     { label: 'Config modifiée',        icon: 'Sliders',    classes: TONE.changed },
  'tenant_categories.updated': { label: 'Catégories modifiées',   icon: 'Tag',        classes: TONE.people },
}

/**
 * Le repli montre le code brut plutôt que rien.
 *
 * Un journal d'audit qui masque une action qu'il ne sait pas nommer est pire
 * qu'un journal qui affiche `service.completed` : la ligne doit exister, même
 * mal habillée.
 */
export function auditActionInfo(action: string): AuditActionInfo {
  return AUDIT_ACTIONS[action] ?? { label: action, icon: 'Circle', classes: TONE.quiet }
}
