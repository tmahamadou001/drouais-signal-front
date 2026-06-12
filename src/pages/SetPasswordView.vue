<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTenantStore } from '@/stores/tenant'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const tenantStore = useTenantStore()
const authStore = useAuthStore()

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const status = ref<'loading' | 'form' | 'success' | 'error'>('loading')
const errorMessage = ref('')
const accessToken = ref<string | null>(null)

const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const formError = ref<string | null>(null)

onMounted(async () => {
  // Supabase redirige vers /set-password#access_token=xxx&type=invite
  const hash = window.location.hash.slice(1)
  const params = new URLSearchParams(hash)
  const token = params.get('access_token')
  const type = params.get('type')

  // Nettoie le hash immédiatement pour ne pas le laisser dans l'URL
  history.replaceState(null, '', window.location.pathname)

  if (!token || !['invite', 'recovery'].includes(type ?? '')) {
    errorMessage.value = 'Lien invalide ou expiré. Contactez votre administrateur pour recevoir un nouvel email d\'invitation.'
    status.value = 'error'
    return
  }

  accessToken.value = token
  status.value = 'form'
})

async function submit() {
  formError.value = null

  if (password.value.length < 8) {
    formError.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }
  if (password.value !== passwordConfirm.value) {
    formError.value = 'Les mots de passe ne correspondent pas.'
    return
  }

  submitting.value = true
  try {
    const slug = tenantStore.slug
    const response = await fetch(`${API_URL}/api/auth/set-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken.value}`,
        ...(slug ? { 'X-Tenant-Slug': slug } : {}),
      },
      body: JSON.stringify({ password: password.value }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message ?? 'Une erreur est survenue.')
    }

    // Révoque la session d'invitation — l'utilisateur doit se reconnecter normalement
    await supabase.auth.signOut()
    authStore.user = null
    authStore.session = null

    status.value = 'success'
    setTimeout(() => router.replace('/connexion'), 2500)
  } catch (err: any) {
    formError.value = err.message ?? 'Une erreur est survenue. Veuillez réessayer.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">

      <!-- Chargement -->
      <div v-if="status === 'loading'" class="text-center">
        <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>

      <!-- Erreur lien invalide -->
      <div v-else-if="status === 'error'" class="text-center space-y-4">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-gray-900">Lien invalide</h1>
        <p class="text-sm text-gray-500">{{ errorMessage }}</p>
        <router-link to="/" class="inline-block mt-2 text-sm text-blue-600 hover:underline">
          Retour à l'accueil
        </router-link>
      </div>

      <!-- Succès -->
      <div v-else-if="status === 'success'" class="text-center space-y-4">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-gray-900">Mot de passe créé !</h1>
        <p class="text-sm text-gray-500">Votre compte est maintenant actif. Connectez-vous pour accéder à votre espace.</p>
        <router-link
          to="/connexion"
          class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors mt-2"
        >
          Se connecter
        </router-link>
      </div>

      <!-- Formulaire -->
      <div v-else class="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-6">
        <div class="text-center">
          <div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-xl font-bold text-gray-900">Créer votre mot de passe</h1>
          <p class="text-sm text-gray-500 mt-1">Choisissez un mot de passe pour accéder à votre espace OnSignale.</p>
        </div>

        <form @submit.prevent="submit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="8 caractères minimum"
                autocomplete="new-password"
                class="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg v-if="showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
            <input
              v-model="passwordConfirm"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Répétez le mot de passe"
              autocomplete="new-password"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          <div v-if="formError" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {{ formError }}
          </div>

          <button
            type="submit"
            :disabled="submitting || !password || !passwordConfirm"
            class="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="submitting" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            {{ submitting ? 'Enregistrement…' : 'Créer mon mot de passe' }}
          </button>
        </form>
      </div>

    </div>
  </div>
</template>
