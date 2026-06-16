<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const authStore = useAuthStore()
const status = ref<'loading' | 'success' | 'error'>('loading')

onMounted(async () => {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error || !data.session) {
      status.value = 'error'
      return
    }

    authStore.user = data.session.user
    authStore.session = data.session
    status.value = 'success'

    // setTimeout(() => {
    //   router.replace(authStore.isAdmin ? '/admin' : '/')
    // }, 2000)
  } catch {
    status.value = 'error'
  }
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
    <div class="text-center space-y-4 max-w-sm w-full">
      <!-- Loading -->
      <div v-if="status === 'loading'" class="space-y-3">
        <div
          class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"
        />
        <p class="text-gray-600 font-medium">Vérification en cours...</p>
      </div>

      <!-- Succès -->
      <div v-else-if="status === 'success'" class="space-y-3">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <AppIcon name="Check" :size="32" class="text-green-600" />
        </div>
        <h2 class="text-xl font-bold text-gray-900">Compte confirmé !</h2>
        <p class="text-gray-500 text-sm">Votre compte est activé. Vous pouvez maintenant faire votre premier signalement.</p>
        <router-link
          to="/signaler"
          class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors mt-2"
        >
          <AppIcon name="PlusCircle" :size="20" />
          Faire mon premier signalement
        </router-link>
        <router-link to="/" class="block text-sm text-gray-400 hover:text-gray-600 mt-1">
          Retour à l'accueil
        </router-link>
      </div>

      <!-- Erreur -->
      <div v-else class="space-y-4">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <span class="text-3xl">⚠️</span>
        </div>
        <h2 class="text-xl font-bold text-gray-900">Lien invalide</h2>
        <p class="text-gray-500 text-sm">Ce lien de confirmation est invalide ou a expiré.</p>
        <router-link
          to="/connexion"
          class="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Retour à la connexion
        </router-link>
      </div>
    </div>
  </div>
</template>
