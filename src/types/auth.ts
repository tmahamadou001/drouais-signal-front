export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  confirmPassword: string
  firstName?: string
}

export interface AuthState {
  user: import('@supabase/supabase-js').User | null
  session: import('@supabase/supabase-js').Session | null
  loading: boolean
  error: string | null
}

export type UserRole = 'admin' | 'agent' | 'citizen'

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect',
  'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
  'User already registered': 'Un compte existe déjà avec cet email',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
  'Too many requests': 'Trop de tentatives, réessayez dans quelques minutes',
  'signup_disabled': 'Les inscriptions sont temporairement désactivées',
  'weak_password': 'Le mot de passe est trop faible',
  'Invalid email': 'Adresse email invalide',
  'Email rate limit exceeded': 'Trop d\'emails envoyés, réessayez plus tard',
}

export function formatAuthError(message: string): string {
  return AUTH_ERROR_MESSAGES[message] ?? 'Une erreur est survenue, réessayez'
}
