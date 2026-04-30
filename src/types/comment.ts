export interface ReportComment {
  id: string
  reportId: string
  authorType: 'agent' | 'citizen'
  authorId: string
  content: string
  photoUrl: string | null
  isResolutionPhoto: boolean
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
