<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const confirmEmailSent = ref(false)

const isLoading = computed(() => authStore.loading)
const errorMessage = computed(() => authStore.error)

const passwordStrength = computed(() => {
  const pwd = password.value
  if (pwd.length === 0) return null
  if (pwd.length < 8) return 'weak'
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 10) return 'strong'
  return 'medium'
})

const passwordsMatch = computed(
  () => confirmPassword.value.length === 0 || password.value === confirmPassword.value
)

async function handleSubmit() {
  if (!email.value || !password.value || !confirmPassword.value) return

  if (!passwordsMatch.value) {
    authStore.error = 'Les mots de passe ne correspondent pas'
    return
  }

  const result = await authStore.register({
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  })

  if (result.success) {
    if (result.error === 'confirm_email') {
      confirmEmailSent.value = true
    } else {
      router.replace('/')
    }
  }
}
</script>

<template>
  <div class="bg-neutral-50 flex items-center justify-center p-8">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900 mt-4">Créer un compte</h1>
        <p class="text-gray-500 mt-1 text-sm">
          Suivez vos signalements en temps réel
        </p>
      </div>

      <!-- Email de confirmation envoyé -->
      <div
        v-if="confirmEmailSent"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-4"
      >
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Vérifiez votre email</h2>
          <p class="text-gray-500 text-sm mt-2">
            Un email de confirmation a été envoyé à
            <span class="font-medium text-gray-900">{{ email }}</span>
          </p>
          <p class="text-gray-400 text-xs mt-2">
            Cliquez sur le lien dans l'email pour activer votre compte.
          </p>
        </div>
        <router-link
          to="/connexion"
          class="block w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-center"
        >
          Retour à la connexion
        </router-link>
      </div>

      <!-- Formulaire d'inscription -->
      <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Email -->
          <div class="space-y-1">
            <label for="email" class="block text-sm font-medium text-gray-700">
              Adresse email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="vous@exemple.fr"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder-gray-400 text-base"
            />
          </div>

          <!-- Mot de passe -->
          <div class="space-y-1">
            <label for="password" class="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
                minlength="8"
                placeholder="8 caractères minimum"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder-gray-400 text-base pr-12"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>

            <!-- Indicateur de force du mot de passe -->
            <div v-if="passwordStrength" class="flex items-center gap-2">
              <div class="flex gap-1 flex-1">
                <div
                  class="h-1 flex-1 rounded-full transition-all"
                  :class="passwordStrength !== null ? 'bg-red-400' : 'bg-gray-200'"
                />
                <div
                  class="h-1 flex-1 rounded-full transition-all"
                  :class="
                    passwordStrength === 'medium' || passwordStrength === 'strong'
                      ? 'bg-yellow-400'
                      : 'bg-gray-200'
                  "
                />
                <div
                  class="h-1 flex-1 rounded-full transition-all"
                  :class="passwordStrength === 'strong' ? 'bg-green-400' : 'bg-gray-200'"
                />
              </div>
              <span
                class="text-xs"
                :class="{
                  'text-red-500': passwordStrength === 'weak',
                  'text-yellow-600': passwordStrength === 'medium',
                  'text-green-600': passwordStrength === 'strong',
                }"
              >
                {{
                  passwordStrength === 'weak'
                    ? 'Faible'
                    : passwordStrength === 'medium'
                    ? 'Moyen'
                    : 'Fort'
                }}
              </span>
            </div>
          </div>

          <!-- Confirmation mot de passe -->
          <div class="space-y-1">
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              placeholder="••••••••"
              :class="[
                'w-full px-4 py-3 rounded-xl border outline-none transition-all text-gray-900 placeholder-gray-400 text-base',
                !passwordsMatch
                  ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
              ]"
            />
            <p v-if="!passwordsMatch" class="text-xs text-red-500">
              Les mots de passe ne correspondent pas
            </p>
          </div>

          <!-- Erreur globale -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
          >
            <span class="text-red-500 text-sm flex-shrink-0">⚠️</span>
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

          <!-- Bouton -->
          <button
            type="submit"
            :disabled="isLoading || !email || !password || !confirmPassword || !passwordsMatch"
            class="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
          >
            <span
              v-if="isLoading"
              class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            <span>{{ isLoading ? 'Création du compte...' : 'Créer mon compte' }}</span>
          </button>
        </form>

        <!-- Séparateur -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200" />
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="bg-white px-3 text-gray-400">Déjà un compte ?</span>
          </div>
        </div>

        <router-link
          to="/connexion"
          class="flex items-center justify-center w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-base"
        >
          Se connecter
        </router-link>
      </div>
    </div>
  </div>
</template>
