/** Le travail d'équipe : ce que l'API rend (voir `server/src/services/*`). */

export interface DirectoryMember {
  userId: string
  firstName: string | null
  lastName: string | null
  /** « Prénom Nom », ou `null` quand aucun des deux n'est renseigné. */
  name: string | null
  role: 'admin' | 'agent' | 'observer'
  jobTitle: string | null
}

export interface TenantService {
  id: string
  name: string
  description: string | null
  color: string | null
  memberIds: string[]
  /** Les catégories que l'aiguillage lui envoie. */
  routedCategories: string[]
  /** Signalements ouverts qui lui sont rattachés. */
  reportCount: number
}

export interface RoutingRule {
  category: string
  assigneeId: string | null
  serviceId: string | null
}

export type ActivityKind = 'mention' | 'assigned' | 'citizen_reply'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  reportId: string | null
  reportTitle: string | null
  reportReference: string | null
  actorName: string | null
  excerpt: string | null
  readAt: string | null
  createdAt: string
}

export interface TeamEvent {
  id: string
  kind: 'auto_routed' | 'assigned' | 'unassigned' | 'service_changed' | 'planned' | 'unplanned' | 'reopened' | 'merged' | 'merged_into' | 'category_changed'
  createdAt: string
  actorName: string | null
  assigneeName: string | null
  serviceName: string | null
  /** `planned` : la date prévue, AAAA-MM-JJ. */
  plannedFor?: string | null
  /** `reopened` : le motif ; `planned` : la précision. */
  note?: string | null
  /** `merged` / `merged_into` : la référence de l'autre signalement ; `category_changed` : « ancienne → nouvelle ». */
  detail?: string | null
}

/** Ce que l'équipe voit d'un signalement en plus du public. */
export interface TeamView {
  assignee: { id: string; name: string | null } | null
  service: { id: string; name: string } | null
  assignedAt: string | null
  events: TeamEvent[]
  /** Ce que les habitants ont dit : toujours là, plus là, suivent, merci. */
  votes?: { toujours_la: number; plus_la: number; suivre: number; merci: number }
}

export interface Counters {
  mine: number
  unassigned: number
  /** « Réponse reçue » : l'habitant a répondu, personne n'a encore regardé. */
  replied: number
  /** « Précision demandée » : la question attend l'habitant. */
  waiting: number
}

export interface WorkloadAgent {
  userId: string
  name: string | null
  role: 'admin' | 'agent'
  services: string[]
  openCount: number
}

export interface InternalMessage {
  id: string
  author_id: string
  author_name: string | null
  content: string
  mentions: string[]
  created_at: string
}

/** Le périmètre de la liste : `mine`, `all`, `unassigned`, `external` ou `service:<id>`. */
export type Scope = string
