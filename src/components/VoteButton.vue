<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  reportId: string
  initialCount: number
  initialHasVoted: boolean
}

const props = defineProps<Props>()

const voteCount = ref(props.initialCount)
const hasVoted = ref(props.initialHasVoted)
const isLoading = ref(false)
const errorMessage = ref('')

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const buttonText = computed(() => {
  if (hasVoted.value) {
    return `▲ ${voteCount.value} vote${voteCount.value > 1 ? 's' : ''} — Vous avez soutenu ce signalement`
  }
  return `▲ ${voteCount.value} vote${voteCount.value > 1 ? 's' : ''}`
})

const buttonClass = computed(() => {
  const baseClasses = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  
  if (hasVoted.value) {
    return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`
  }
  return `${baseClasses} border-2 border-blue-600 text-blue-600 hover:bg-blue-50`
})

async function handleVote() {
  if (isLoading.value) return

  errorMessage.value = ''
  isLoading.value = true

  const previousCount = voteCount.value
  const previousHasVoted = hasVoted.value

  if (hasVoted.value) {
    voteCount.value = Math.max(0, voteCount.value - 1)
    hasVoted.value = false
  } else {
    voteCount.value += 1
    hasVoted.value = true
  }

  try {
    const method = previousHasVoted ? 'DELETE' : 'POST'
    const response = await fetch(`${API_URL}/api/reports/${props.reportId}/vote`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      if (data.error === 'already_voted') {
        errorMessage.value = 'Vous avez déjà voté pour ce signalement'
        hasVoted.value = true
      } else if (data.error === 'report_resolved') {
        errorMessage.value = 'Ce signalement est déjà résolu'
      } else if (data.error === 'rate_limit') {
        errorMessage.value = data.message || 'Trop de requêtes, réessayez plus tard'
      } else {
        errorMessage.value = 'Erreur lors du vote'
      }
      
      voteCount.value = previousCount
      hasVoted.value = previousHasVoted
    } else {
      voteCount.value = data.vote_count
    }
  } catch (error) {
    console.error('Erreur vote:', error)
    errorMessage.value = 'Erreur de connexion'
    
    voteCount.value = previousCount
    hasVoted.value = previousHasVoted
  } finally {
    isLoading.value = false
    
    if (errorMessage.value) {
      setTimeout(() => {
        errorMessage.value = ''
      }, 3000)
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <button
      :class="buttonClass"
      :disabled="isLoading"
      @click="handleVote"
    >
      <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
      <span v-else>{{ buttonText }}</span>
    </button>
    
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="errorMessage"
        class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md"
      >
        {{ errorMessage }}
      </div>
    </Transition>
  </div>
</template>
