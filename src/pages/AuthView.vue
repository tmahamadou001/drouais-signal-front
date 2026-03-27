<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const email = ref('')
const sent = ref(false)
const error = ref<string | null>(null)

async function handleSubmit() {
  if (!email.value.trim()) {
    error.value = 'Veuillez saisir votre adresse email.'
    return
  }

  error.value = null
  const result = await auth.sendMagicLink(email.value.trim())

  if (result.error) {
    error.value = result.error
  } else {
    sent.value = true
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-white rounded-ds-xl border border-neutral-200 shadow-ds-lg p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="w-14 h-14 bg-primary-50 rounded-ds-lg flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 class="text-2xl font-display font-bold text-dark">Connexion</h1>
          <p class="text-sm text-neutral-500 mt-2">
            Recevez un lien de connexion par email.<br>
            Pas de mot de passe nécessaire.
          </p>
        </div>

        <!-- Success state -->
        <div v-if="sent" class="text-center">
          <div class="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-dark mb-2">Email envoyé !</h2>
          <p class="text-sm text-neutral-500 mb-1">
            Un lien de connexion a été envoyé à
          </p>
          <p class="text-sm font-semibold text-dark mb-4">{{ email }}</p>
          <p class="text-xs text-neutral-400">
            Vérifiez votre boîte de réception et vos spams. Le lien expire dans 1 heure.
          </p>
          <button
            @click="sent = false; email = ''"
            class="mt-6 text-sm text-primary font-medium hover:underline"
          >
            Utiliser une autre adresse
          </button>
        </div>

        <!-- Form -->
        <div v-else>
          <div class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-dark mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="vous@exemple.fr"
                autocomplete="email"
                class="w-full px-4 py-2.5 rounded-ds border border-neutral-300 text-sm text-dark placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                @keydown.enter="handleSubmit"
              />
            </div>

            <!-- Error -->
            <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-ds px-3 py-2">
              {{ error }}
            </p>

            <button
              @click="handleSubmit"
              :disabled="auth.loading"
              class="w-full py-2.5 rounded-ds bg-primary text-white font-semibold text-sm hover:bg-primary-600 focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <template v-if="auth.loading">
                <span class="inline-flex items-center gap-2">
                  <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Envoi en cours…
                </span>
              </template>
              <template v-else>
                Recevoir le lien de connexion
              </template>
            </button>
          </div>

          <p class="text-center text-xs text-neutral-400 mt-6">
            En vous connectant, vous acceptez que vos signalements soient publiés de manière anonyme sur la carte.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
