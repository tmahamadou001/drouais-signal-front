import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { formatAuthError } from '@/types/auth'
import type { User, Session } from '@supabase/supabase-js'
import type { LoginCredentials, RegisterCredentials } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  // ─── State ────────────────────────────────────────────
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // ─── Getters ──────────────────────────────────────────
  const isAuthenticated = computed(() => !!user.value)

  const isAdmin = computed(() => user.value?.user_metadata?.role === 'admin')

  const isAgent = computed(
    () =>
      user.value?.user_metadata?.role === 'agent' ||
      user.value?.user_metadata?.role === 'admin'
  )

  const userRole = computed(() => user.value?.user_metadata?.role ?? 'citizen')

  const userEmail = computed(() => user.value?.email ?? '')

  const accessToken = computed(() => session.value?.access_token ?? null)

  // ─── Init ─────────────────────────────────────────────
  async function initialize(): Promise<void> {
    if (initialized.value) return

    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null
    } catch (err) {
      console.error('Auth init error:', err)
    } finally {
      initialized.value = true
    }

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
    })
  }

  // ─── Helpers internes ─────────────────────────────────
  function setLoading(val: boolean) {
    loading.value = val
    if (val) error.value = null
  }

  // ─── INSCRIPTION ──────────────────────────────────────
  async function register(
    credentials: RegisterCredentials
  ): Promise<{ success: boolean; error?: string }> {
    const role = 'citizen'
    if (credentials.password !== credentials.confirmPassword) {
      error.value = 'Les mots de passe ne correspondent pas'
      return { success: false, error: error.value }
    }

    if (credentials.password.length < 8) {
      error.value = 'Le mot de passe doit contenir au moins 8 caractères'
      return { success: false, error: error.value }
    }

    setLoading(true)

    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
        options: {
          data: {
            role,
            first_name: credentials.firstName?.trim() ?? '',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (err) {
        error.value = formatAuthError(err.message)
        return { success: false, error: error.value }
      }

      if (data.user && !data.session) {
        return {
          success: true,
          error: 'confirm_email',
        }
      }

      user.value = data.user
      session.value = data.session
      return { success: true }
    } catch (err: any) {
      error.value = formatAuthError(err.message)
      return { success: false, error: error.value }
    } finally {
      setLoading(false)
    }
  }

  // ─── CONNEXION ────────────────────────────────────────
  async function login(
    credentials: LoginCredentials
  ): Promise<{ success: boolean; error?: string }> {
    setLoading(true)

    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      })

      if (err) {
        error.value = formatAuthError(err.message)
        return { success: false, error: error.value }
      }

      user.value = data.user
      session.value = data.session
      return { success: true }
    } catch (err: any) {
      error.value = formatAuthError(err.message)
      return { success: false, error: error.value }
    } finally {
      setLoading(false)
    }
  }

  // ─── MOT DE PASSE OUBLIÉ ──────────────────────────────
  async function forgotPassword(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    setLoading(true)

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (err) {
        error.value = formatAuthError(err.message)
        return { success: false, error: error.value }
      }

      return { success: true }
    } catch (err: any) {
      error.value = formatAuthError(err.message)
      return { success: false, error: error.value }
    } finally {
      setLoading(false)
    }
  }

  // ─── RÉINITIALISER MOT DE PASSE ───────────────────────
  async function resetPassword(
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    setLoading(true)

    try {
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (err) {
        error.value = formatAuthError(err.message)
        return { success: false, error: error.value }
      }

      return { success: true }
    } catch (err: any) {
      error.value = formatAuthError(err.message)
      return { success: false, error: error.value }
    } finally {
      setLoading(false)
    }
  }

  // ─── DÉCONNEXION ──────────────────────────────────────
  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    user.value = null
    session.value = null
    error.value = null
  }

  // ─── CLEAR ERROR ──────────────────────────────────────
  function clearError(): void {
    error.value = null
  }

  return {
    // State
    user,
    session,
    loading,
    error,
    initialized,
    // Getters
    isAuthenticated,
    isAdmin,
    isAgent,
    userRole,
    userEmail,
    accessToken,
    // Actions
    initialize,
    register,
    login,
    forgotPassword,
    resetPassword,
    signOut,
    clearError,
  }
})
