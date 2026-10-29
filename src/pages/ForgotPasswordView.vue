<script setup lang="ts">
/**
 * La demande de réinitialisation, reprise de l'export Claude Design.
 *
 * Le message de confirmation ne dit jamais si l'adresse existe — « si un compte
 * existe pour cette adresse ». Répondre « adresse inconnue » transformerait cet
 * écran en outil de vérification des adresses employées par la mairie.
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'
import AuthShell from '@/components/auth/AuthShell.vue'
import AuthField from '@/components/auth/AuthField.vue'

const authStore = useAuthStore()

const email = ref('')
const emailSent = ref(false)

const isLoading = computed(() => authStore.loading)
const errorMessage = computed(() => authStore.error)

/**
 * Le délai avant de pouvoir redemander un lien.
 *
 * Il protège la boîte du destinataire autant que le quota d'envoi : un bouton
 * « Renvoyer » sans attente invite à cliquer trois fois, et trois e-mails
 * identiques font douter de celui qui est arrivé.
 */
const RESEND_DELAY_S = 60
const countdown = ref(0)
let timer: number | null = null

function startCountdown() {
  countdown.value = RESEND_DELAY_S
  if (timer) clearInterval(timer)
  timer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const countdownLabel = computed(() => {
  const minutes = Math.floor(countdown.value / 60)
  const seconds = countdown.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

async function handleSubmit() {
  if (!email.value || countdown.value > 0) return

  const result = await authStore.forgotPassword(email.value)
  if (result.success) {
    emailSent.value = true
    startCountdown()
  }
}
</script>

<template>
  <AuthShell>
    <RouterLink
      to="/connexion"
      class="flex items-center gap-[7px] whitespace-nowrap text-[13px] font-semibold leading-none text-brand-700 hover:underline"
    >
      <AppIcon name="ArrowLeft" :size="16" :stroke-width="2" />
      Retour à la connexion
    </RouterLink>

    <div class="flex flex-col gap-[7px]">
      <h1 class="text-[26px] font-bold leading-[1.2] tracking-[-0.01em] text-brand-900">
        Mot de passe oublié
      </h1>
      <p class="text-[15px] leading-[1.5] text-muted">
        Indiquez votre adresse professionnelle : un lien de réinitialisation vous sera envoyé.
      </p>
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <AuthField
        id="email"
        v-model="email"
        label="ADRESSE E-MAIL"
        icon="Mail"
        type="email"
        autocomplete="email"
        placeholder="vous@mairie.fr"
      />

      <div
        v-if="errorMessage"
        class="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
      >
        <AppIcon name="CircleX" :size="16" class="mt-px flex-none text-status-danger" />
        <p class="text-[13px] leading-[1.4] text-red-700">{{ errorMessage }}</p>
      </div>

      <button
        type="submit"
        :disabled="isLoading || !email || countdown > 0"
        class="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-brand-700 text-[15px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          v-if="isLoading"
          class="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
        <template v-else>
          <AppIcon name="Send" :size="17" :stroke-width="2" />
          {{ emailSent ? 'Renvoyer le lien' : 'Envoyer le lien' }}
        </template>
      </button>
    </form>

    <div
      v-if="emailSent"
      class="flex flex-col gap-3 rounded-xl border border-line bg-white p-4"
    >
      <div class="flex items-center gap-2.5">
        <div class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-status-done-bg">
          <AppIcon name="MailCheck" :size="17" :stroke-width="1.75" class="text-status-success" />
        </div>
        <div class="text-sm font-semibold leading-[1.3] text-ink">Lien envoyé</div>
      </div>
      <p class="text-[13px] leading-[1.5] text-muted">
        Si un compte existe pour cette adresse, un lien vient d’être envoyé. Il est valable 1 heure.
      </p>
      <p class="whitespace-nowrap text-xs font-medium leading-none tabular-nums text-faint">
        {{ countdown > 0
          ? `Pas d’e-mail reçu ? Renvoyer dans ${countdownLabel}`
          : 'Pas d’e-mail reçu ? Vérifiez vos indésirables, ou renvoyez le lien.' }}
      </p>
    </div>

    <div class="flex items-start gap-[11px] text-[13px] leading-[1.5] text-muted">
      <AppIcon name="ShieldAlert" :size="17" :stroke-width="1.75" class="mt-px flex-none text-faint" />
      <p>Pour un compte super administrateur, la réinitialisation est tracée dans les logs d’audit.</p>
    </div>
  </AuthShell>
</template>
