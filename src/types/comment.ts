export interface ReportComment {
  id: string
  reportId: string
  authorType: 'agent' | 'citizen'
  authorId: string | null
  content: string
  photoUrl: string | null
  isResolutionPhoto: boolean
  /** Une précision demandée par la commune. */
  isQuestion?: boolean
  /** `email` : l'habitant a répondu en répondant à l'e-mail. */
  via?: 'app' | 'email'
  parentId: string | null
  reportStatusAtTime: string | null
  readByCitizen: boolean
  readByAgent: boolean
  createdAt: string
  // Jointure
  author?: {
    email: string
    user_metadata?: {
      first_name?: string
      last_name?: string
    }
  }
  replies?: ReportComment[]
}
