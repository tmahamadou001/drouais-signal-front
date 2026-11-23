<script setup lang="ts">
/**
 * Le service ne peut pas répondre **pour l'instant**.
 *
 * Ce n'est pas « cette ville n'est pas configurée » : la commune existe, c'est la réponse qui manque — trop de
 * requêtes depuis cette adresse, ou une coupure. Dire à un agent que sa mairie n'existe pas, parce que le
 * serveur lui a demandé d'attendre une minute, était faux et alarmant.
 */
import { computed } from 'vue'
import BrandWordmark from '@/components/BrandWordmark.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const limited = computed(() => tenant.errorKind === 'rate_limited')

const retry = () => { void tenant.load() }
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4" data-testid="tenant-unavailable">
    <div class="w-full max-w-md text-center">
      <div class="mb-6 flex items-center justify-center gap-2">
        <BrandWordmark :height="20" tone="navy" />
      </div>

      <h1 class="mb-3 text-2xl font-bold text-gray-900">
        {{ limited ? 'Un instant, trop de requêtes' : 'Service momentanément indisponible' }}
      </h1>

      <p class="mb-8 text-sm leading-relaxed text-neutral-500" data-testid="tenant-unavailable-message">
        {{ limited
          ? 'Le service a demandé de patienter un instant. Réessayez dans une minute : vos données n’ont rien perdu.'
          : 'Nous n’arrivons pas à joindre le service. Vérifiez votre connexion, puis réessayez.' }}
      </p>

      <button
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        data-testid="tenant-retry"
        @click="retry"
      >
        <AppIcon name="RefreshCw" :size="16" />
        Réessayer
      </button>
    </div>
  </div>
</template>
