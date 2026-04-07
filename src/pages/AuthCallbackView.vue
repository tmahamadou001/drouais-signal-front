<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const showPWABanner = ref(false)
const authProcessed = ref(false)
const pwaUrl = ref('')

function isInPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

function isFromEmail(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.get('from_email') === 'true'
}

function buildPWAUrl(): string {
  const fullUrl = encodeURIComponent(window.location.href)
  return `onsignale://auth?redirect=${fullUrl}`
}

function tryRedirectToPWA() {
  window.location.href = pwaUrl.value

  setTimeout(() => {
    showPWABanner.value = true
    handleAuthCallback()
  }, 1800)
}

async function handleAuthCallback() {
  if (authProcessed.value) return
  authProcessed.value = true

  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) throw error

    if (data.session) {
      const isAdmin = data.session.user?.user_metadata?.role === 'admin'
      router.replace(isAdmin ? '/admin' : '/')
    } else {
      router.replace('/connexion?error=auth_failed')
    }
  } catch (err) {
    console.error('Erreur auth callback:', err)
    router.replace('/connexion?error=auth_failed')
  }
}

function continueInBrowser() {
  showPWABanner.value = false
}

onMounted(async () => {
  if (isInPWA()) {
    await handleAuthCallback()
    return
  }

  if (isFromEmail()) {
    pwaUrl.value = buildPWAUrl()
    tryRedirectToPWA()
    return
  }

  await handleAuthCallback()
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
    <div v-if="!showPWABanner" class="text-center space-y-4">
      <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p class="text-sm text-neutral-500">
        Connexion en cours...
      </p>
    </div>

    <Transition name="slide-up">
      <div
        v-if="showPWABanner"
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-2xl rounded-t-2xl p-6 space-y-4 z-50"
      >
        <div class="flex items-center gap-3">
          <img
            src="/icons/icon-96.png"
            alt="OnSignale"
            class="w-12 h-12 rounded-xl shadow-sm flex-shrink-0"
          />
          <div>
            <p class="font-semibold text-dark">
              Ouvrir dans OnSignale
            </p>
            <p class="text-sm text-neutral-500">
              Vous avez l'app installée sur cet appareil
            </p>
          </div>
        </div>

        <a
          :href="pwaUrl"
          class="flex items-center justify-center w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
        >
          Ouvrir dans l'app →
        </a>

        <button
          @click="continueInBrowser"
          class="w-full py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          Continuer dans Safari
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
