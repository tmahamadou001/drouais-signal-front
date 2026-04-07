<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const deferredPrompt = ref<any>(null)
const isIOS = ref(false)
const isAndroid = ref(false)
const isInstalled = ref(false)

function isInPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase()
  isIOS.value = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream
  isAndroid.value = /android/.test(ua)
}

onMounted(() => {
  detectPlatform()
  isInstalled.value = isInPWA() || localStorage.getItem('pwa-installed') === 'true'
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
  })
  
  window.addEventListener('appinstalled', () => {
    isInstalled.value = true
    localStorage.setItem('pwa-installed', 'true')
    deferredPrompt.value = null
  })
})

async function installAndroid() {
  if (!deferredPrompt.value) return
  
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  
  if (outcome === 'accepted') {
    isInstalled.value = true
    localStorage.setItem('pwa-installed', 'true')
  }
  
  deferredPrompt.value = null
}

function showIOSInstructions() {
  alert(
    'Pour installer OnSignale sur iOS :\n\n' +
    '1. Appuyez sur le bouton Partager ⬆️ en bas de votre navigateur Chrome ou Safari\n' +
    '2. Sélectionnez "Sur l\'écran d\'accueil"\n' +
    '3. Appuyez sur "Ajouter"'
  )
}

function handleInstall() {
  if (isAndroid.value && deferredPrompt.value) {
    installAndroid()
  } else if (isIOS.value) {
    showIOSInstructions()
  } else {
    alert(
      'Pour installer OnSignale :\n\n' +
      'Utilisez le menu de votre navigateur puis "Installer l\'application"'
    )
  }
}

const showButton = computed(() => {
  return !isInstalled.value
})

const buttonText = computed(() => {
  if (isIOS.value) return 'Installer sur iOS'
  if (isAndroid.value) return 'Installer l\'app'
  return 'Installer OnSignale'
})
</script>

<template>
  <button
    v-if="showButton"
    @click="handleInstall"
    class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
    {{ buttonText }}
  </button>
</template>
