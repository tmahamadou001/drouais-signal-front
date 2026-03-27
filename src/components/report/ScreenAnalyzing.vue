<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{
  previewUrl: string | null
}>()

const messages = [
  'Analyse de la photo...',
  'Identification du problème...',
  'Préparation du signalement...',
]

const currentMessageIndex = ref(0)
let intervalId: number | null = null

onMounted(() => {
  // Rotation des messages toutes les 2 secondes
  intervalId = window.setInterval(() => {
    currentMessageIndex.value = (currentMessageIndex.value + 1) % messages.length
  }, 2000)
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <div class="min-h-screen relative overflow-hidden">
    <!-- Photo en arrière-plan assombrie -->
    <div
      v-if="previewUrl"
      class="absolute inset-0 bg-cover bg-center"
      :style="{ backgroundImage: `url(${previewUrl})` }"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    </div>

    <!-- Contenu principal -->
    <div class="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
      <div class="w-full max-w-md">
        <!-- Card d'analyse -->
        <div class="bg-white rounded-ds-2xl p-8 shadow-2xl space-y-6 text-center">
          <!-- Icône animée -->
          <div class="flex justify-center">
            <div class="relative">
              <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center animate-pulse">
                <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <!-- Cercle animé autour -->
              <div class="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
            </div>
          </div>

          <!-- Titre -->
          <div class="space-y-2">
            <h2 class="text-2xl font-bold text-dark flex items-center justify-center gap-2">
              <span>✨</span>
              <span>Analyse en cours...</span>
            </h2>
            <p class="text-neutral-500 text-sm">
              L'IA identifie le type de problème
            </p>
          </div>

          <!-- Barre de progression indéterminée -->
          <div class="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-primary to-primary-400 rounded-full animate-progress" />
          </div>

          <!-- Message rotatif -->
          <div class="min-h-[24px]">
            <p class="text-sm text-neutral-600 font-medium transition-opacity duration-300">
              {{ messages[currentMessageIndex] }}
            </p>
          </div>
        </div>

        <!-- Message d'attente -->
        <p class="text-center text-white/80 text-sm mt-6">
          Cela prend généralement 2 à 5 secondes
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.animate-progress {
  animation: progress 1.5s ease-in-out infinite;
  width: 25%;
}

@keyframes ping {
  75%,
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>
