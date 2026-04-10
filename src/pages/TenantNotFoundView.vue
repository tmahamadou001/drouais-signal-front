<script setup lang="ts">
import { detectSlug } from '@/utils/detectSlug'

const slug = detectSlug()

const contactEmail = 'contact@onsignale.fr'
const contactSubject = encodeURIComponent(`Demande d'accès — ${slug}`)
const contactBody = encodeURIComponent(
  `Bonjour,\n\nJe souhaite obtenir des informations sur l'accès au service OnSignale pour la commune « ${slug} ».\n\nCordialement,`
)
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4">
    <div class="w-full max-w-md text-center">

      <!-- Icône -->
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white border border-neutral-200 shadow-sm mb-6">
        <svg viewBox="0 0 24 24" class="w-9 h-9 text-neutral-400" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 10.5h.008v.008H12V10.5z" stroke-width="2.5" />
          <line x1="4" y1="4" x2="20" y2="20" stroke-linecap="round" />
        </svg>
      </div>

      <!-- Logo OnSignale -->
      <div class="flex items-center justify-center gap-2 mb-6">
        <div class="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
          <svg viewBox="0 0 20 20" class="w-4 h-4 text-white" fill="currentColor">
            <path d="M10 2 L17 5.5 V11 C17 15.5 14 19 10 20 C6 19 3 15.5 3 11 V5.5 Z" />
          </svg>
        </div>
        <span class="font-display text-lg font-bold text-dark tracking-tight">
          On<span class="text-primary">Signale</span>
        </span>
      </div>

      <!-- Titre -->
      <h1 class="text-2xl font-display font-bold text-gray-900 mb-3">
        Cette ville n'est pas encore configurée
      </h1>

      <!-- Slug -->
      <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 mb-5">
        <span class="text-xs text-neutral-500 font-medium font-mono">{{ slug }}.onsignale.fr</span>
      </div>

      <!-- Description -->
      <p class="text-neutral-500 text-sm leading-relaxed mb-8">
        Le service OnSignale n'est pas encore actif pour cette commune.
        Si vous êtes un élu ou un agent territorial et souhaitez déployer
        OnSignale dans votre ville, contactez-nous.
      </p>

      <!-- CTA contact -->
      <a
        :href="`mailto:${contactEmail}?subject=${contactSubject}&body=${contactBody}`"
        class="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        Nous contacter
      </a>

      <!-- Lien site principal -->
      <p class="mt-6 text-xs text-neutral-400">
        En savoir plus sur
        <a href="https://onsignale.fr" class="underline hover:text-neutral-600 transition-colors">
          onsignale.fr
        </a>
      </p>
    </div>
  </div>
</template>
