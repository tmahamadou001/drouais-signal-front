<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const success = ref(false)

const isLoading = computed(() => authStore.loading)
const errorMessage = computed(() => authStore.error)

const passwordsMatch = computed(
  () => confirmPassword.value.length === 0 || newPassword.value === confirmPassword.value
)

const passwordStrength = computed(() => {
  const pwd = newPassword.value
  if (pwd.length === 0) return null
  if (pwd.length < 8) return 'weak'
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 10) return 'strong'
  return 'medium'
})

onMounted(() => {
  // Vérifier qu'on a bien un token de reset dans l'URL
  const hash = window.location.hash
  if (!hash.includes('type=recovery')) {
    router.replace('/connexion')
  }
})

async function handleSubmit() {
  if (!newPassword.value || !confirmPassword.value) return

  if (!passwordsMatch.value) {
    authStore.error = 'Les mots de passe ne correspondent pas'
    return
  }

  if (newPassword.value.length < 8) {
    authStore.error = 'Le mot de passe doit contenir au moins 8 caractères'
    return
  }

  const result = await authStore.resetPassword(newPassword.value)

  if (result.success) {
    success.value = true
    setTimeout(() => {
      router.replace('/connexion')
    }, 3000)
  }
}
</script>

<template>
  <div class="bg-neutral-50 flex items-center justify-center p-16">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
        <p class="text-gray-500 mt-1 text-sm">Choisissez un nouveau mot de passe sécurisé</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <!-- Succès -->
        <div v-if="success" class="text-center space-y-3 py-2">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900">Mot de passe modifié !</h2>
          <p class="text-sm text-gray-600">
            Votre mot de passe a été changé avec succès.
            <br />
            Redirection vers la connexion...
          </p>
        </div>

        <!-- Formulaire -->
        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Nouveau mot de passe -->
          <div class="space-y-1">
            <label for="newPassword" class="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <div class="relative">
              <input
                id="newPassword"
                v-model="newPassword"
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

            <!-- Indicateur de force -->
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

          <!-- Confirmation -->
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

          <!-- Erreur -->
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
            :disabled="isLoading || !newPassword || !confirmPassword || !passwordsMatch"
            class="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
          >
            <span
              v-if="isLoading"
              class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            <span>{{ isLoading ? 'Modification...' : 'Changer le mot de passe' }}</span>
          </button>
        </form>

        <router-link
          to="/connexion"
          class="flex items-center justify-center w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Retour à la connexion
        </router-link>
      </div>
    </div>
  </div>
</template>
