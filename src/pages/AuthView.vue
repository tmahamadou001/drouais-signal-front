<script setup lang="ts">
/**
 * La connexion, reprise de l'export Claude Design.
 *
 * L'inscription libre n'existe pas : un agent est invité par l'administrateur
 * de sa commune, jamais auto-inscrit. C'est ce que dit l'encart du bas, qui
 * s'adresse à l'habitant égaré plutôt qu'à l'agent.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'
import AuthShell from '@/components/auth/AuthShell.vue'
import AuthField from '@/components/auth/AuthField.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const isLoading = computed(() => authStore.loading)
const errorMessage = computed(() => authStore.error)

/**
 * Où aller une fois connecté.
 *
 * `?redirect=` n'est suivi que s'il désigne l'administration : c'est le seul
 * espace du web, et une valeur venue de l'URL ne doit pas pouvoir envoyer
 * ailleurs.
 */
const redirectTo = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/admin') ? target : '/admin'
})

/** Posé par le garde du routeur quand le compte n'a pas accès. */
const accessDenied = computed(() => route.query.denied === '1')

/**
 * Le refus constaté après une connexion réussie.
 *
 * Il est posé explicitement, jamais déduit de `isAuthenticated && !isAdmin` :
 * `login()` ouvre la session **avant** d'aller chercher le rôle en base, si
 * bien que cette combinaison est vraie pendant toute la requête de rôle. Le
 * message « ce compte n'a pas accès » s'affichait donc une fraction de seconde
 * à chaque connexion normale, juste avant la redirection.
 */
const deniedAfterLogin = ref(false)

onMounted(() => {
  if (authStore.isAdmin) router.replace(redirectTo.value)
})

async function handleSubmit() {
  deniedAfterLogin.value = false

  if (!email.value || !password.value) return

  const result = await authStore.login({ email: email.value, password: password.value })
  if (!result.success) return

  // Le rôle est vérifié en base, pas dans le jeton : `login` l'a déjà chargé
  // quand il rend la main, donc le test ci-dessous porte sur une valeur sûre.
  if (authStore.isAdmin) {
    router.replace(redirectTo.value)
    return
  }

  deniedAfterLogin.value = true
}
</script>

<template>
  <AuthShell>
    <div class="flex flex-col gap-[7px]">
      <h1 class="text-[26px] font-bold leading-[1.2] tracking-[-0.01em] text-brand-900">Connexion</h1>
      <p class="text-[15px] leading-[1.5] text-muted">
        Accédez à l’espace d’administration.
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

      <AuthField
        id="password"
        v-model="password"
        label="MOT DE PASSE"
        icon="Lock"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="current-password"
        placeholder="••••••••"
      >
        <template #aside>
          <RouterLink
            to="/auth/forgot-password"
            class="whitespace-nowrap text-xs font-semibold leading-none text-brand-700 hover:underline"
          >
            Mot de passe oublié ?
          </RouterLink>
        </template>

        <template #trailing>
          <button
            type="button"
            class="flex flex-none items-center gap-[5px] whitespace-nowrap text-xs font-semibold leading-none text-brand-700"
            :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
            @click="showPassword = !showPassword"
          >
            <AppIcon :name="showPassword ? 'EyeOff' : 'Eye'" :size="16" :stroke-width="1.75" />
            {{ showPassword ? 'Masquer' : 'Afficher' }}
          </button>
        </template>
      </AuthField>

      <div
        v-if="errorMessage || accessDenied || deniedAfterLogin"
        class="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
      >
        <AppIcon name="CircleX" :size="16" class="mt-px flex-none text-status-danger" />
        <p class="text-[13px] leading-[1.4] text-red-700">
          {{ errorMessage || 'Ce compte n’a pas accès à l’administration de cette commune.' }}
        </p>
      </div>

      <button
        type="submit"
        :disabled="isLoading || !email || !password"
        class="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-brand-700 text-[15px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          v-if="isLoading"
          class="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
        <template v-else>
          Se connecter
          <AppIcon name="ArrowRight" :size="17" :stroke-width="2" />
        </template>
      </button>
    </form>

    <div class="flex items-start gap-[11px] rounded-xl border border-line bg-white px-4 py-3.5">
      <AppIcon name="Smartphone" :size="18" :stroke-width="1.75" class="mt-px flex-none text-brand-700" />
      <p class="text-[13px] leading-[1.5] text-muted">
        Vous êtes habitant ? Les signalements se font depuis l’application mobile OnSignale.
      </p>
    </div>

    <div class="flex items-center gap-3.5 whitespace-nowrap text-xs font-medium leading-none text-faint">
      <span>OnSignale — Signalement urbain citoyen</span>
      <span class="text-brand-100">·</span>
      <!-- Des liens absolus : ces pages ne sont plus des routes de
           l'application, mais des documents du site, servis sur l'apex. Un
           `RouterLink` tomberait sur la page 404 du sous-domaine de la
           commune. -->
      <a href="https://onsignale.fr/confidentialite" class="hover:underline">Confidentialité</a>
      <span class="text-brand-100">·</span>
      <a href="https://onsignale.fr/mentions-legales" class="hover:underline">Mentions légales</a>
    </div>
  </AuthShell>
</template>
