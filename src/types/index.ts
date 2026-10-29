// Report statuses
/**
 * `transmis` est arrivé avec la migration 034 : l'e-mail est parti au service
 * concerné, personne n'a encore répondu. Expédier n'est pas traiter.
 */
export type ReportStatus = 'en_attente' | 'transmis' | 'pris_en_charge' | 'resolu'

// Main report type — matches the "reports" table
export interface Report {
  id: string
  /**
   * La référence communiquée à l'habitant : `LAL-2026-00418`.
   *
   * Attribuée par la base à l'insertion (migration 032), jamais recalculée —
   * elle est dictée au téléphone et collée dans des e-mails.
   */
  reference: string
  title: string
  /** Slug canonique de la taxonomie nationale (migration 026). */
  category: string
  description: string | null
  photo_url: string | null
  lat: number
  lng: number
  address_approx: string | null
  status: ReportStatus
  user_id: string
  vote_count: number
  ai_assisted: boolean
  /**
   * D'où vient le signalement (migration 039).
   *
   * `agent` = saisi dans le back-office — un appel, un passage à l'accueil, un
   * constat de tournée. Il n'a **pas d'auteur** : personne à prévenir, personne
   * à qui répondre.
   *
   * Facultatif : un signalement rendu par une route plus ancienne ne le porte
   * pas, et l'absence se lit comme `citizen`, qui est le défaut en base.
   */
  source?: 'citizen' | 'agent'
  created_at: string
  updated_at: string
}

// Status history entry — matches the "status_history" table
export interface StatusHistoryEntry {
  id: string
  report_id: string
  old_status: ReportStatus
  new_status: ReportStatus
  agent_id: string | null
  /**
   * Le nom de l'agent, joint par le serveur (`services/statusHistoryService`).
   *
   * `null` quand l'auteur n'est pas un agent — un service extérieur agissant
   * par son lien, ou la plateforme — ou quand il a quitté la commune depuis.
   */
  agent_name?: string | null
  changed_at: string
  comment: string | null
}
