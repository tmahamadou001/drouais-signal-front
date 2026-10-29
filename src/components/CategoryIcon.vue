<script setup lang="ts">
/**
 * La pastille de catégorie des fiches et des cartes de signalement.
 *
 * Même glyphe que les tables d'administration — il vient de `lib/categories.ts`
 * — mais dans la couleur que la commune a donnée à la catégorie, parce qu'ici
 * elle est seule sur la fiche et ne rivalise avec aucune autre.
 */
import { computed } from 'vue'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { categoryGlyph } from '@/lib/categories'
import AppIcon from '@/components/AppIcon.vue'

const props = withDefaults(defineProps<{
  category: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const { getCategoryColor, getCategoryLabel } = useTenantCategories()

const glyph = computed(() => categoryGlyph(props.category, getCategoryLabel(props.category)))
const color = computed(() => getCategoryColor(props.category))

const box = computed(() => ({
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
}[props.size]))

const glyphSize = computed(() => ({ sm: 16, md: 20, lg: 26 }[props.size]))
</script>

<template>
  <div
    class="rounded-ds-lg flex flex-shrink-0 items-center justify-center"
    :class="box"
    :style="{ backgroundColor: `${color}15` }"
  >
    <AppIcon :name="glyph" :size="glyphSize" :stroke-width="1.75" :style="{ color }" />
  </div>
</template>
