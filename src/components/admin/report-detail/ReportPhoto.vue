<script setup lang="ts">
/**
 * La photo du signalement, en vignette carrée à gauche de l'identité.
 *
 * Petite délibérément : elle s'agrandit au clic, donc elle n'a pas à occuper
 * la largeur pour être consultable. Un bandeau pleine largeur a été essayé et
 * écarté — il poussait le titre et les métadonnées sous la ligne de
 * flottaison pour montrer en grand ce qu'un clic montre déjà mieux.
 *
 * Ce clic existait déjà, mais rien ne le disait — un `title` ne se découvre
 * qu'en s'arrêtant dessus par hasard. Le curseur de loupe et le voile au
 * survol l'annoncent avant l'essai.
 */
import AppIcon from '@/components/AppIcon.vue'

defineProps<{ photoUrl: string | null; alt: string }>()

const emit = defineEmits<{ zoom: [url: string] }>()
</script>

<template>
  <button
    v-if="photoUrl"
    class="group relative h-[152px] w-[152px] flex-none cursor-zoom-in overflow-hidden rounded-xl border border-line"
    title="Agrandir la photo"
    @click="emit('zoom', photoUrl)"
  >
    <img :src="photoUrl" :alt="alt" class="h-full w-full object-cover" />

    <span
      class="absolute inset-0 flex items-center justify-center bg-brand-900/0 transition-colors group-hover:bg-brand-900/35"
    >
      <span
        class="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 opacity-0 shadow-ds-lg transition-opacity group-hover:opacity-100"
      >
        <AppIcon name="Maximize2" :size="16" :stroke-width="2" class="text-brand-900" />
      </span>
    </span>
  </button>

  <!-- Pas de photo : le dire, plutôt qu'un cadre vide qu'on croit cassé. -->
  <div
    v-else
    class="flex h-[152px] w-[152px] flex-none flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-100 bg-canvas"
  >
    <AppIcon name="ImageOff" :size="26" :stroke-width="1.5" class="text-faint" />
    <p class="text-center text-xs font-medium leading-[1.3] text-muted">
      Aucune photo transmise
    </p>
  </div>
</template>
