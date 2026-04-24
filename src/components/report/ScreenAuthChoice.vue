<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useRouter } from 'vue-router'

const emit = defineEmits<{
  modeSelected: [mode: 'authenticated' | 'anonymous']
}>()

const router = useRouter()
const auth = useAuthStore()
const tenantStore = useTenantStore()
const showEmailStep = ref(false)
const email = ref('')
const emailError = ref('')

onMounted(() => {
  if (auth.isAuthenticated) {
    emit('modeSelected', 'authenticated')
  }
})

function selectAuthenticated() {
  if (auth.isAuthenticated) {
    emit('modeSelected', 'authenticated')
  } else {
    router.push({ name: 'login' })
  }
}

function validateEmail() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (email.value && !emailRegex.test(email.value)) {
    emailError.value = 'Email invalide'
    return false
  }
  emailError.value = ''
  return true
}

function continueAnonymous() {
  if (email.value && !validateEmail()) return
  emit('modeSelected', 'anonymous')
}

function skipEmail() {
  emit('modeSelected', 'anonymous')
}
</script>

<template>
  <div class=" bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">

      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-5">
          <svg viewBox="0 0 20 20" class="w-6 h-6" fill="white">
            <path d="M10 2 L17 5.5 V11 C17 15.5 14 19 10 20 C6 19 3 15.5 3 11 V5.5 Z"/>
            <circle cx="10" cy="9.5" r="2.5" fill="rgba(255,255,255,0.9)"/>
            <path d="M10 13 L10 15.5" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.9"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
          Comment souhaitez-vous signaler ?
        </h1>
        <p class="text-sm text-gray-500 leading-relaxed">
          Les deux options permettent de soumettre un signalement à {{ tenantStore.name }}.
        </p>
      </div>

      <!-- Step 1 — Choix du mode -->
      <div v-if="!showEmailStep" class="space-y-3">

        <!-- Carte connecté -->
        <button
          @click="selectAuthenticated"
          class="w-full bg-white border-2 border-primary rounded-2xl p-5
                 flex items-start gap-4 text-left hover:bg-blue-50
                 transition-colors group"
        >
          <div class="w-11 h-11 bg-primary-50 rounded-xl flex items-center
                      justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor"
                 stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z
                   M4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0
                   0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-base font-semibold text-gray-900">
                {{ auth.isAuthenticated ? 'Continuer connecté' : 'Se connecter' }}
              </span>
              <span class="text-xs font-medium text-primary bg-primary-50
                           px-2 py-0.5 rounded-full">
                Recommandé
              </span>
            </div>
            <p class="text-sm text-gray-500 leading-relaxed mb-3">
              Suivez vos signalements et recevez des notifications
              à chaque mise à jour.
            </p>
            <ul class="space-y-1.5">
              <li v-for="feat in [
                'Historique de vos signalements',
                'Notifications automatiques',
                'Participer aux votes',
              ]" :key="feat" class="flex items-center gap-2 text-xs text-gray-600">
                <svg class="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none"
                     stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
                {{ feat }}
              </li>
            </ul>
          </div>
          <svg class="w-5 h-5 text-primary flex-shrink-0 mt-0.5
                     group-hover:translate-x-0.5 transition-transform"
               fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </button>

        <!-- Séparateur -->
        <div class="flex items-center gap-3">
          <div class="flex-1 h-px bg-gray-200"/>
          <span class="text-xs text-gray-400 font-medium">ou</span>
          <div class="flex-1 h-px bg-gray-200"/>
        </div>

        <!-- Carte anonyme -->
        <button
          @click="showEmailStep = true"
          class="w-full bg-white border border-gray-200 rounded-2xl p-5
                 flex items-start gap-4 text-left hover:border-gray-300
                 hover:bg-gray-50 transition-colors group"
        >
          <div class="w-11 h-11 bg-gray-100 rounded-xl flex items-center
                      justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor"
                 stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25
                   2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25
                   2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-base font-semibold text-gray-900 mb-1">
              Continuer sans compte
            </p>
            <p class="text-sm text-gray-500 leading-relaxed mb-3">
              Signalez rapidement sans créer de compte.
              Un email optionnel suffit pour le suivi.
            </p>
            <ul class="space-y-1.5">
              <li class="flex items-center gap-2 text-xs text-gray-600">
                <svg class="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none"
                     stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
                Aucun compte requis
              </li>
              <li v-for="feat in [
                'Pas d\'historique ni de notifications',
                'Votes non disponibles',
              ]" :key="feat" class="flex items-center gap-2 text-xs text-gray-400">
                <svg class="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none"
                     stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
                {{ feat }}
              </li>
            </ul>
          </div>
          <svg class="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5
                     group-hover:translate-x-0.5 transition-transform"
               fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </button>
      </div>

      <!-- Step 2 — Email anonyme -->
      <div v-else>
        <button
          @click="showEmailStep = false"
          class="flex items-center gap-1.5 text-sm text-gray-500
                 hover:text-gray-700 mb-6 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor"
               stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
          Retour
        </button>

        <div class="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-1.5">
            Signalement anonyme
          </h2>
          <p class="text-sm text-gray-500 leading-relaxed mb-6">
            Ajoutez un email pour recevoir les mises à jour de votre
            signalement. Aucun compte ne sera créé.
          </p>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse email
              <span class="text-gray-400 font-normal">— optionnel</span>
            </label>
            <input
              v-model="email"
              type="email"
              placeholder="votre@email.fr"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl
                     text-sm text-gray-900 outline-none placeholder-gray-300
                     focus:border-primary focus:ring-2 focus:ring-primary/10
                     transition-all"
              @blur="validateEmail"
            />
            <p v-if="emailError" class="text-red-500 text-xs mt-1.5">
              {{ emailError }}
            </p>
          </div>

          <button
            @click="continueAnonymous"
            class="w-full bg-primary text-white font-semibold py-3
                   rounded-xl text-sm hover:bg-primary/90 transition-colors
                   mb-3"
          >
            Continuer sans compte
          </button>

          <button
            @click="skipEmail"
            class="w-full text-gray-400 text-sm py-2 hover:text-gray-600
                   transition-colors"
          >
            Continuer sans email
          </button>

          <div class="flex items-center justify-center gap-1.5 mt-5
                      pt-4 border-t border-gray-100">
            <svg class="w-3 h-3 text-gray-300" fill="none" stroke="currentColor"
                 stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25
                   2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25
                   2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
            <span class="text-xs text-gray-400">
              Email utilisé uniquement pour le suivi de ce signalement
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>