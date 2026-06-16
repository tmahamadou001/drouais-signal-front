<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const isLoading = computed(() => authStore.loading)
const errorMessage = computed(() => authStore.error)

const redirectTo = computed(() => (route.query.redirect as string) ?? '/')

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.replace(authStore.isAdmin ? '/admin' : redirectTo.value)
  }
})

async function handleSubmit() {
  if (!email.value || !password.value) return

  const result = await authStore.login({
    email: email.value,
    password: password.value,
  })

  if (result.success) {
    router.replace(authStore.isAdmin ? '/admin' : redirectTo.value)
  }
}
</script>

<template>
  <div class="bg-neutral-50 flex items-center justify-center p-8">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900 mt-4">Connexion</h1>
        <p class="text-gray-500 mt-1 text-sm">
          Accédez à votre espace OnSignale
        </p>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
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
            <div class="flex items-center justify-between">
              <label for="password" class="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <router-link
                to="/auth/forgot-password"
                class="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mot de passe oublié ?
              </router-link>
            </div>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="••••••••"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900 placeholder-gray-400 text-base pr-12"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors"
                :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                <AppIcon v-if="showPassword" name="EyeOff" :size="20" />
                <AppIcon v-else name="Eye" :size="20" />
              </button>
            </div>
          </div>

          <!-- Erreur -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
          >
            <AppIcon name="XCircle" :size="16" class="text-red-500 flex-shrink-0" />
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

          <!-- Bouton connexion -->
          <button
            type="submit"
            :disabled="isLoading || !email || !password"
            class="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
          >
            <span
              v-if="isLoading"
              class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            <span>{{ isLoading ? 'Connexion...' : 'Se connecter' }}</span>
          </button>
        </form>

        <!-- Séparateur -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200" />
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="bg-white px-3 text-gray-400">Pas encore de compte ?</span>
          </div>
        </div>

        <!-- Lien inscription -->
        <router-link
          to="/auth/register"
          class="flex items-center justify-center w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-base"
        >
          Créer un compte
        </router-link>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-400 mt-6">
        OnSignale — Signalement urbain citoyen
      </p>
    </div>
  </div>
</template>
