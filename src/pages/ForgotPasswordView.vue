<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const email = ref('')
const emailSent = ref(false)

const isLoading = computed(() => authStore.loading)
const errorMessage = computed(() => authStore.error)

async function handleSubmit() {
  if (!email.value) return

  const result = await authStore.forgotPassword(email.value)
  if (result.success) {
    emailSent.value = true
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
        <p class="text-gray-500 mt-1 text-sm">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <!-- Confirmation envoi -->
        <div v-if="emailSent" class="text-center space-y-3 py-2">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span class="text-2xl">✉️</span>
          </div>
          <p class="text-sm text-gray-600">
            Un email de réinitialisation a été envoyé à
            <span class="font-medium text-gray-900">{{ email }}</span>
          </p>
          <p class="text-xs text-gray-400">Vérifiez votre boîte mail et vos spams.</p>
        </div>

        <!-- Formulaire -->
        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
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

          <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

          <button
            type="submit"
            :disabled="isLoading || !email"
            class="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
          >
            <span
              v-if="isLoading"
              class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            <span>{{ isLoading ? 'Envoi...' : 'Envoyer le lien' }}</span>
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
