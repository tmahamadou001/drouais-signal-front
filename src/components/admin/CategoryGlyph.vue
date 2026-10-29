<script setup lang="ts">
/**
 * La vignette de catégorie des tables d'administration.
 *
 * Le dessin vient de `lib/categories.ts`, seule table de correspondance du
 * client. Le `label` est transmis parce qu'il sert de repli quand le slug est
 * inconnu — une catégorie locale nommée par la mairie n'a pas d'entrée fixe.
 *
 * La vignette est uniformément bleu pâle sur glyphe bleu. Elle ne code aucune
 * information — l'ambre est réservé au statut « Pris en charge », et deux
 * couleurs qui veulent dire deux choses différentes sur la même ligne se
 * lisent comme une seule.
 */
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { categoryGlyph } from '@/lib/categories'

const props = defineProps<{ category: string; label?: string }>()

const glyph = computed(() => categoryGlyph(props.category, props.label))
</script>

<template>
  <div class="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-brand-50">
    <AppIcon :name="glyph" :size="18" :stroke-width="1.75" class="text-brand-700" />
  </div>
</template>
