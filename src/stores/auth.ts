import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  // --- Getters ---
  const isAdmin = computed(() => {
    return user.value?.user_metadata?.role === 'admin'
  })

  const accessToken = computed(() => {
    return session.value?.access_token ?? null
  })

  // --- Actions ---

  /** Called once at app start (and by the router guard). Restores session. */
  async function initialize(): Promise<void> {
    if (initialized.value) return

    loading.value = true

    try {
      // Get existing session from localStorage / URL (magic link callback)
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null

      // Listen for auth changes (sign in, sign out, token refresh)
      supabase.auth.onAuthStateChange((_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
      })
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  /** Send a magic link email via Supabase Auth */
  async function sendMagicLink(email: string): Promise<{ error: string | null }> {
    loading.value = true

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } finally {
      loading.value = false
    }
  }

  /** Sign out the current user */
  async function signOut(): Promise<void> {
    loading.value = true

    try {
      await supabase.auth.signOut()
      user.value = null
      session.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    user,
    session,
    initialized,
    loading,
    // Getters
    isAdmin,
    accessToken,
    // Actions
    initialize,
    sendMagicLink,
    signOut,
  }
})
