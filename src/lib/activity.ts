import type { ActivityItem } from '@/types/team'

/**
 * Ce que dit une ligne du centre d'activité.
 *
 * Une phrase par nature, écrite du point de vue de celui qui la lit : « Marc
 * Leroy vous a mentionné », pas « mention de Marc Leroy ». Sans auteur nommé
 * (aiguillage automatique, ou un collègue qui a quitté l'équipe), la phrase
 * reste vraie plutôt que de désigner un inconnu.
 */
export function activityTitle(item: Pick<ActivityItem, 'kind' | 'actorName'>): string {
  switch (item.kind) {
    case 'mention':
      return `${item.actorName ?? 'Un collègue'} vous a mentionné`
    case 'assigned':
      return item.actorName
        ? `${item.actorName} vous a confié un signalement`
        : 'Un signalement vous a été confié'
    case 'citizen_reply':
      return 'Un habitant a répondu'
  }
}

/** L'icône Lucide de chaque nature. */
export function activityIcon(kind: ActivityItem['kind']): string {
  return { mention: 'AtSign', assigned: 'UserCheck', citizen_reply: 'MessageSquare' }[kind]
}

/** « il y a 5 min », « hier » — le temps écoulé, lisible dans une cloche. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000)

  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`

  const days = Math.floor(hours / 24)
  return days === 1 ? 'hier' : `il y a ${days} j`
}

/** Au-delà de neuf, le nombre exact n'aide plus : il y en a « beaucoup ». */
export const badgeLabel = (count: number): string => (count > 9 ? '9+' : String(count))
