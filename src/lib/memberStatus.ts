/**
 * Le statut d'un membre de l'équipe, en trois états.
 *
 * `is_active` était un booléen et ne distinguait pas « invité il y a trois
 * semaines, n'a jamais ouvert son e-mail » de « membre actif depuis six
 * mois » : les deux s'affichaient « Actif », et un administrateur relançait à
 * l'aveugle ou pas du tout. Le serveur rend maintenant l'état réel, calculé
 * depuis la confirmation d'adresse et la dernière connexion.
 */
export type MemberStatus = 'invited' | 'active' | 'suspended'

export interface MemberStatusInfo {
  label: string
  icon: string
  classes: string
}

export const MEMBER_STATUSES: Record<MemberStatus, MemberStatusInfo> = {
  invited:   { label: 'Invité',    icon: 'MailQuestion', classes: 'bg-status-progress-bg text-status-progress-fg' },
  active:    { label: 'Actif',     icon: 'CircleCheck',  classes: 'bg-status-done-bg text-status-done-fg' },
  suspended: { label: 'Suspendu',  icon: 'Ban',          classes: 'bg-status-pending-bg text-status-pending-fg' },
}

export function memberStatusInfo(status: string): MemberStatusInfo {
  return MEMBER_STATUSES[status as MemberStatus]
    ?? { label: status, icon: 'Circle', classes: 'bg-status-pending-bg text-status-pending-fg' }
}

/** Jours écoulés depuis une date ISO, ou `null` si elle manque. */
function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const elapsed = Date.now() - Date.parse(iso)
  return Number.isFinite(elapsed) ? Math.floor(elapsed / 86_400_000) : null
}

/** Au-delà, une invitation en attente mérite qu'on la relance. */
const STALE_INVITE_DAYS = 7

/**
 * Cette invitation traîne-t-elle ?
 *
 * C'est la seule chose que la page peut signaler d'elle-même : personne ne
 * pense à vérifier qui n'a jamais répondu, et un compte qui n'existe pas est
 * un agent qui ne traite pas.
 */
export function isStaleInvite(member: { status: string; invited_at: string | null }): boolean {
  if (member.status !== 'invited') return false
  const days = daysSince(member.invited_at)
  return days !== null && days >= STALE_INVITE_DAYS
}

/**
 * « il y a 3 j », « aujourd'hui », « jamais ».
 *
 * Une date absolue demande un calcul mental pour répondre à la seule question
 * qu'on se pose : est-ce que ce compte sert encore ?
 */
export function lastSeen(iso: string | null): string {
  const days = daysSince(iso)
  if (days === null) return 'jamais'
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} j`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return 'il y a plus d’un an'
}
