/**
 * La modération d'une commune ouverte au public sans mairie.
 *
 * Trois gestes, et leur poids n'est pas le même. Ce fichier tient ce qui se
 * raisonne — ce que chaque geste fait, ce qu'il demande, ce qu'on en dit — pour
 * que l'écran n'ait plus qu'à l'afficher, et pour que ce soit testable sans
 * monter un composant.
 */

export interface ModerationItem {
  id: string
  reference: string | null
  title: string
  description: string | null
  category: string
  status: string
  photo_url: string | null
  address_approx: string | null
  created_at: string
  is_published: boolean
  tenant: { id: string; slug: string; name: string }
}

export type ModerationAction = 'photo' | 'retract' | 'restore'

interface ActionCopy {
  /** Le chemin de l'API. */
  path: ModerationAction
  title: (item: ModerationItem) => string
  /** Ce qui se passe réellement, dit sans euphémisme. */
  body: string
  confirm: string
  /** `danger` pour ce qui soustrait au public, `primary` pour ce qui remet. */
  tone: 'danger' | 'primary'
  done: string
}

export const MODERATION_COPY: Record<ModerationAction, ActionCopy> = {
  /**
   * Le geste le plus fréquent et le plus léger. La photo est détruite — fichier
   * compris, pas seulement le lien — et le signalement continue d'exister.
   */
  photo: {
    path: 'photo',
    title: (item) => `Retirer la photo de « ${item.title} »`,
    body: 'La photo est définitivement supprimée, y compris du stockage. Le signalement, son texte et le suivi de son auteur restent en place. C’est irréversible.',
    confirm: 'Retirer la photo',
    tone: 'danger',
    done: 'Photo retirée.',
  },

  retract: {
    path: 'retract',
    title: (item) => `Dépublier « ${item.title} »`,
    body: 'Le signalement sort des listes, de la carte et de la recherche. Il reste visible de son auteur, et rien n’est supprimé : vous pourrez le republier.',
    confirm: 'Dépublier',
    tone: 'danger',
    done: 'Signalement dépublié.',
  },

  restore: {
    path: 'restore',
    title: (item) => `Republier « ${item.title} »`,
    body: 'Le signalement redevient visible de tous les habitants de la commune.',
    confirm: 'Republier',
    tone: 'primary',
    done: 'Signalement republié.',
  },
}

/**
 * Le motif est exigé, ici comme sur le serveur.
 *
 * Trois caractères, c'est peu — et c'est voulu : la barre n'est pas là pour
 * faire écrire, elle est là pour qu'un geste ne parte pas sans que son auteur
 * ait eu à dire pourquoi. Six mois plus tard, c'est la seule chose qui permette
 * de répondre à un habitant qui réclame.
 */
export function reasonAccepted(reason: string): boolean {
  return reason.trim().length >= 3
}
