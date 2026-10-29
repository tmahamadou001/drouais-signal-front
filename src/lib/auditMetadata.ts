/**
 * Les métadonnées d'un log d'audit, rendues lisibles.
 *
 * Elles étaient affichées telles qu'elles sortent de la base :
 * `{"new_status":"resolu","old_status":"pris_en_charge"}`, accolades et
 * guillemets compris, tronqué à soixante caractères. On y lisait qu'il s'était
 * passé quelque chose, jamais quoi.
 *
 * Le vocabulaire est fermé — il vient de `server/src/services/auditService.ts`
 * et des routes qui l'appellent. Une clé inconnue n'est pas une erreur : elle
 * s'affiche avec son nom d'origine, ce qui vaut mieux que de la cacher.
 */

export interface MetadataField {
  key: string
  label: string
  value: string
  /** Vrai pour ce qui mérite d'être vu sans déplier la ligne. */
  primary: boolean
}

const LABELS: Record<string, string> = {
  old_status:          'Ancien statut',
  new_status:          'Nouveau statut',
  report_title:        'Signalement',
  report_ids:          'Signalements',
  report_id:           'Signalement',
  count:               'Nombre',
  category:            'Catégorie',
  category_slugs:      'Catégories',
  categories_count:    'Nombre de catégories',
  is_anonymous:        'Sans compte',
  ai_assisted:         'Catégorisé par l’IA',
  has_photo:           'Photo jointe',
  comment:             'Commentaire',
  updated_fields:      'Champs modifiés',
  created_user_email:  'Compte créé',
  created_user_role:   'Rôle',
  new_role:            'Nouveau rôle',
  revoked_user_role:   'Rôle révoqué',
  tenant_name:         'Commune',
  first_name:          'Prénom',
  last_name:           'Nom',
  job_title:           'Fonction',
  method:              'Méthode',
  reason:              'Motif',
  // Écrit seulement quand c'en est un : un retour en arrière se distingue mal
  // d'une marche avant dans une suite de changements de statut.
  rollback:            'Retour en arrière',
  service_name:        'Service',
  service_emails:      'Destinataires',
}

/** Ce qui se lit d'un coup d'œil dans la colonne, sans déplier. */
const PRIMARY = new Set([
  'old_status', 'new_status', 'report_title', 'category', 'count',
  'new_role', 'revoked_user_role', 'created_user_email', 'tenant_name', 'reason',
  'rollback',
])

const STATUS_LABELS: Record<string, string> = {
  en_attente:     'En attente',
  transmis:       'Transmis au service',
  pris_en_charge: 'Pris en charge',
  resolu:         'Résolu',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super administrateur',
  admin:       'Administrateur',
  agent:       'Agent',
  observer:    'Observateur',
  citizen:     'Citoyen',
}

/** « old_status » → « Ancien statut ». Repli : la clé, lisible. */
export function fieldLabel(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (first) => first.toUpperCase())
}

/**
 * La valeur, dans la langue de l'écran.
 *
 * Un booléen se lit « oui » ou « non », pas « true ». Un identifiant complet
 * n'apprend rien à personne et mange la ligne : seul son début sert, pour
 * rapprocher deux entrées entre elles.
 */
export function fieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'

  if (typeof value === 'boolean') return value ? 'oui' : 'non'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'aucun'
    if (key.endsWith('_ids')) return `${value.length} élément${value.length > 1 ? 's' : ''}`
    return value.map((item) => fieldValue(key.replace(/s$/, ''), item)).join(', ')
  }

  if (typeof value === 'object') return JSON.stringify(value)

  const text = String(value)

  if (key.endsWith('status')) return STATUS_LABELS[text] ?? text
  if (key.endsWith('role')) return ROLE_LABELS[text] ?? text
  if (key.endsWith('_id') && text.length > 12) return `${text.slice(0, 8)}…`

  return text
}

export function describeMetadata(metadata: Record<string, unknown> | null | undefined): MetadataField[] {
  if (!metadata) return []

  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      label: fieldLabel(key),
      value: fieldValue(key, value),
      primary: PRIMARY.has(key),
    }))
    // Ce qui compte d'abord, le reste ensuite, sans changer l'ordre à
    // l'intérieur de chaque groupe — celui de l'enregistrement a un sens.
    .sort((left, right) => Number(right.primary) - Number(left.primary))
}
