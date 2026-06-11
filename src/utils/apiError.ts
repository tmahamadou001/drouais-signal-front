/**
 * Typed error thrown by useApi for all non-2xx responses.
 * Use `.code` for programmatic matching, `.message` for display.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Fallback French messages when the server doesn't send a readable message
const FALLBACK_MESSAGES: Record<string, string> = {
  file_too_large:       'Le fichier est trop volumineux (max 5 Mo).',
  invalid_file_type:    'Format non supporté. Utilisez JPG, PNG, WebP ou GIF.',
  out_of_bounds:        'La position est en dehors de la zone de signalement.',
  unauthorized:         'Vous devez être connecté pour effectuer cette action.',
  forbidden:            "Vous n'avez pas les droits pour effectuer cette action.",
  not_found:            'Ressource introuvable.',
  already_voted:        'Vous avez déjà voté pour ce signalement.',
  internal_error:       'Une erreur est survenue. Veuillez réessayer.',
  conflict:             'Cette ressource existe déjà.',
  validation_error:     'Les données saisies sont invalides.',
  bad_request:          'Requête invalide.',
  rate_limit:           'Trop de requêtes. Veuillez patienter avant de réessayer.',
  invalid_credentials:  'Email ou mot de passe incorrect.',
  email_not_confirmed:  'Veuillez confirmer votre adresse email avant de vous connecter.',
}

export function resolveApiErrorMessage(code: string, serverMessage?: string): string {
  // Server message takes priority — it's already in French and context-specific
  if (serverMessage && serverMessage !== code) return serverMessage
  return FALLBACK_MESSAGES[code] ?? `Erreur inattendue (${code}).`
}
